# AGENTS.md

## Agent skills

### Public repo

The deploy clone is `abhi-in-flow/sahayak` (public). Production is the Vercel project `incrementingcoders-projects/sahayak-main`.

### Issue tracker

Issues live in GitHub Issues on `kunMythos/sahayak` (private), managed via the `gh` CLI. Detailed conventions live in the local-only `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (defaults kept). Detailed conventions live in the local-only `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root, created lazily by `/domain-modeling` when terms or decisions actually get resolved. Detailed conventions live in the local-only `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
