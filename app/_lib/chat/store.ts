"use client";

import { STORAGE_KEYS } from "../storage/schema";

/**
 * Persisted chat sessions (T-LOCAL, `sbn.chat.v1.*`) as an external
 * store, mirroring ../journey/store.ts (cache + notify) and
 * ../storage/local.ts (SSR-safe storage access, silent degradation).
 *
 * Why an external store: the transcript is an external system that
 * changes under the app's feet (another tab, a sign-out clear). Reading
 * it in a mount effect and mirroring into state re-reads on every mount
 * and goes stale mid-session; useSyncExternalStore over an id-keyed
 * cache gives one referentially stable snapshot per session, a live
 * update path, and a safe server snapshot (localStorage has no
 * server-side read, so the screen renders its hero on the server and
 * resolves right after hydration - the OfflineChip pattern).
 *
 * Two write-visibility halves, and both are load-bearing:
 * - SAME TAB: the browser fires the `storage` event everywhere BUT the
 *   writing tab, so every mutator below invalidates the caches and
 *   notifies subscribers synchronously in the writing tab itself. A
 *   raw write bypassing this module would silently strand readers on a
 *   stale snapshot - the exact mechanism behind BUG-012, whose
 *   onMutate wiring in ../storage/local.ts is the precedent.
 * - OTHER TABS: subscribeChats also listens to the window `storage`
 *   event and invalidates on any `sbn.chat.*` key, the active pointer,
 *   or a whole-namespace clear (`event.key === null`).
 *
 * Writes are ID-ADDRESSED: mutators take the target session's id and
 * read THAT key fresh. Nothing ever derives a write target from the
 * active pointer, so appending to a fork can never touch an archived
 * session and a session deleted mid-flight is ignored, not resurrected.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  followUp?: string | null;
  citations?: { title: string; url?: string }[];
}

export interface ChatSession {
  version: 1;
  id: string;
  /** The `?q=` that opened a seeded session; forks compare against it. */
  seed?: string;
  /** Empty until the first user turn lands, which names the session. */
  title: string;
  turns: ChatTurn[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionMeta {
  id: string;
  title: string;
  updatedAt: string;
}

const CHAT_VERSION = 1;
const MAX_TURNS = 200;
const MAX_SESSIONS = 20;
const MAX_TEXT = 2000;
const MAX_CITATIONS = 5;
const TITLE_LENGTH = 60;
/** Sessions kept when a quota failure forces a prune before one retry. */
const QUOTA_KEEP = 10;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Safari private mode and some embedded webviews throw on access
    // rather than on write. Chats simply do not persist there; the
    // screen still works for the visit.
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* cache + notify                                                      */
/* ------------------------------------------------------------------ */

/** Parsed sessions by id; null caches a known-absent/corrupt session. */
const sessions = new Map<string, ChatSession | null>();
let activeCache: string | null | undefined;
let metaCache: ChatSessionMeta[] | undefined;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Drop every cached view of the chat namespace. Mutators run this and
 *  notify() synchronously - see the module header for why same-tab
 *  notification cannot wait for the storage event. */
function invalidate(): void {
  sessions.clear();
  activeCache = undefined;
  metaCache = undefined;
}

/* ------------------------------------------------------------------ */
/* validation (same posture as migrate() in ../storage/schema.ts)      */
/* ------------------------------------------------------------------ */

function isTurn(turn: unknown): turn is ChatTurn {
  if (!turn || typeof turn !== "object") return false;
  const candidate = turn as Partial<ChatTurn>;
  if (candidate.role !== "user" && candidate.role !== "assistant") return false;
  if (typeof candidate.text !== "string") return false;
  if (
    candidate.followUp !== undefined &&
    candidate.followUp !== null &&
    typeof candidate.followUp !== "string"
  ) {
    return false;
  }
  if (candidate.citations !== undefined && !Array.isArray(candidate.citations)) return false;
  return true;
}

/** A record failing any check reads as absent, never as partial. */
function validateSession(raw: unknown): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ChatSession>;
  if (candidate.version !== CHAT_VERSION) return null;
  if (typeof candidate.id !== "string" || !candidate.id) return null;
  if (typeof candidate.title !== "string") return null;
  if (!Array.isArray(candidate.turns) || !candidate.turns.every(isTurn)) return null;
  if (typeof candidate.createdAt !== "string" || typeof candidate.updatedAt !== "string") {
    return null;
  }
  return candidate as ChatSession;
}

function readSession(id: string): ChatSession | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(STORAGE_KEYS.chatPrefix + id);
  if (!raw) return null;
  try {
    return validateSession(JSON.parse(raw));
  } catch {
    // Corrupt record: treat as absent rather than rendering half of it.
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* read path                                                           */
/* ------------------------------------------------------------------ */

/**
 * The session's cached snapshot. A null id returns null - a primitive,
 * so it is its own frozen value and stays Object.is-stable for
 * useSyncExternalStore without any caching.
 */
export function getChatSnapshot(id: string | null): ChatSession | null {
  if (!id) return null;
  if (sessions.has(id)) return sessions.get(id) ?? null;
  const session = readSession(id);
  sessions.set(id, session);
  return session;
}

/**
 * Server snapshot. Null is a primitive, so this module-level constant
 * path is referentially stable across every call and never touches
 * storage during SSR or the hydration render.
 */
export function getChatsServerSnapshot(): null {
  return null;
}

/** Newest first. Cached until the next invalidation. */
export function getChatMetaSnapshot(): ChatSessionMeta[] {
  if (metaCache !== undefined) return metaCache;
  const store = storage();
  if (!store) {
    metaCache = [];
    return metaCache;
  }
  const found: ChatSessionMeta[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key || !key.startsWith(STORAGE_KEYS.chatPrefix)) continue;
    const session = readSession(key.slice(STORAGE_KEYS.chatPrefix.length));
    if (session) {
      found.push({ id: session.id, title: session.title, updatedAt: session.updatedAt });
    }
  }
  found.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  metaCache = found;
  return metaCache;
}

function readActiveId(): string | null {
  const store = storage();
  if (!store) return null;
  const id = store.getItem(STORAGE_KEYS.chatActive);
  if (!id) return null;
  // Dangling pointer self-heal: the named session is gone (another
  // tab's delete, a partial clear), so this reads as "no active" and
  // the dead pointer is removed instead of tripping every later read.
  if (!store.getItem(STORAGE_KEYS.chatPrefix + id)) {
    store.removeItem(STORAGE_KEYS.chatActive);
    return null;
  }
  return id;
}

export function getActiveId(): string | null {
  if (activeCache === undefined) activeCache = readActiveId();
  return activeCache;
}

/**
 * Subscribe for React. Same-tab writes arrive through the mutators'
 * synchronous invalidate+notify; other tabs' writes arrive here.
 */
export function subscribeChats(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }
  const onStorage = (event: StorageEvent) => {
    // key === null means localStorage.clear() - the sign-out path's
    // whole-namespace wipe is covered by that arm.
    if (
      event.key === null ||
      event.key === STORAGE_KEYS.chatActive ||
      event.key.startsWith(STORAGE_KEYS.chatPrefix)
    ) {
      invalidate();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/* ------------------------------------------------------------------ */
/* write path                                                          */
/* ------------------------------------------------------------------ */

function sessionKey(id: string): string {
  return STORAGE_KEYS.chatPrefix + id;
}

function writeSession(session: ChatSession): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(sessionKey(session.id), JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/** Collect matching keys FIRST, then remove: localStorage key
 *  enumeration re-indexes as items are deleted, so deleting inside the
 *  enumeration loop skips every other key. */
function collectChatKeys(store: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && key.startsWith(STORAGE_KEYS.chatPrefix)) keys.push(key);
  }
  return keys;
}

/** Delete the oldest sessions until at most `keep` remain (oldest by
 *  updatedAt; ties read in storage order). Collect-then-delete. */
function pruneOldest(keep: number): void {
  const store = storage();
  if (!store) return;
  const metas: ChatSessionMeta[] = [];
  for (const key of collectChatKeys(store)) {
    const session = readSession(key.slice(STORAGE_KEYS.chatPrefix.length));
    if (session) metas.push({ id: session.id, title: session.title, updatedAt: session.updatedAt });
  }
  metas.sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0));
  const doomed = metas.slice(0, Math.max(0, metas.length - keep));
  for (const meta of doomed) store.removeItem(sessionKey(meta.id));
}

/**
 * Write, and on quota failure prune the oldest sessions and retry
 * once. A second failure gives up silently: the turn stays in memory
 * for this visit and the next successful write re-persists history.
 */
function persist(session: ChatSession, keepOnQuota: number): boolean {
  if (writeSession(session)) return true;
  pruneOldest(keepOnQuota);
  return writeSession(session);
}

function setActivePointer(id: string | null): void {
  const store = storage();
  if (!store) return;
  if (id) store.setItem(STORAGE_KEYS.chatActive, id);
  else store.removeItem(STORAGE_KEYS.chatActive);
}

/** Keep only the newest MAX_SESSIONS by updatedAt. */
function pruneOldSessions(): void {
  pruneOldest(MAX_SESSIONS);
}

/** Run after any session-creating write lands. */
function afterCreate(): void {
  pruneOldSessions();
  invalidate();
  notify();
}

/** The active session's id, creating an empty one when none exists.
 *  The title stays empty until the first user turn names it. */
export function ensureActiveChat(): string | null {
  const active = getActiveId();
  if (active) return active;
  const store = storage();
  if (!store) return null;
  const now = new Date().toISOString();
  const session: ChatSession = {
    version: CHAT_VERSION,
    id: crypto.randomUUID(),
    title: "",
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
  if (!persist(session, QUOTA_KEEP)) return null;
  setActivePointer(session.id);
  afterCreate();
  return session.id;
}

/**
 * Seed entry (`?q=`) AND fork-from-archive: a hard reload with the same
 * `?q=` resumes the session it opened (active.seed matches), while a
 * genuinely new ask - or any send from an archived chat - forks a fresh
 * session with the seed as its first user turn.
 */
export function openSeed(seed: string): string | null {
  const active = getActiveId();
  if (active) {
    const session = getChatSnapshot(active);
    if (session && session.seed === seed) return active;
  }
  const store = storage();
  if (!store) return null;
  const now = new Date().toISOString();
  const session: ChatSession = {
    version: CHAT_VERSION,
    id: crypto.randomUUID(),
    seed: seed.slice(0, MAX_TEXT),
    title: seed.slice(0, TITLE_LENGTH),
    turns: [{ role: "user", text: seed.slice(0, MAX_TEXT) }],
    createdAt: now,
    updatedAt: now,
  };
  if (!persist(session, QUOTA_KEEP)) return null;
  setActivePointer(session.id);
  afterCreate();
  return session.id;
}

/**
 * Append to ONE named session. Reads that session's key fresh rather
 * than trusting the cache, so a concurrent tab's writes are merged
 * with, not clobbered by, this append.
 */
export function appendTurn(sessionId: string, turn: ChatTurn): void {
  const store = storage();
  if (!store) return;
  const raw = store.getItem(sessionKey(sessionId));
  if (!raw) return; // deleted mid-flight: ignore, never resurrect
  let session: ChatSession | null;
  try {
    session = validateSession(JSON.parse(raw));
  } catch {
    session = null;
  }
  if (!session) return;
  const clean: ChatTurn = {
    role: turn.role,
    text: turn.text.slice(0, MAX_TEXT),
    followUp: turn.followUp ?? null,
    ...(turn.citations ? { citations: turn.citations.slice(0, MAX_CITATIONS) } : {}),
  };
  const next: ChatSession = {
    ...session,
    // The first user turn names the session.
    title: session.title || (turn.role === "user" ? clean.text.slice(0, TITLE_LENGTH) : session.title),
    turns: [...session.turns, clean].slice(-MAX_TURNS), // cap keeps the NEWEST
    updatedAt: new Date().toISOString(),
  };
  persist(next, QUOTA_KEEP);
  invalidate();
  notify();
}

export function setActiveChat(id: string | null): void {
  setActivePointer(id);
  invalidate();
  notify();
}

export function deleteChat(id: string): void {
  const store = storage();
  if (!store) return;
  store.removeItem(sessionKey(id));
  if (getActiveId() === id) setActivePointer(null);
  invalidate();
  notify();
}

/** Remove every chat session and the active pointer, and nothing else:
 *  `sbn.journey.v1`, `sbn.locale`, `sbn.state`, `sbn.savekey` and
 *  friends must survive a "delete all chats". Wired from the sign-out
 *  handlers and the past-chats sheet's delete-all row. */
export function clearChats(): void {
  const store = storage();
  if (!store) return;
  const keys = collectChatKeys(store);
  for (const key of keys) store.removeItem(key);
  store.removeItem(STORAGE_KEYS.chatActive);
  invalidate();
  notify();
}
