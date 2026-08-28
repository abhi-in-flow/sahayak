import type { Strings } from "@/app/_lib/i18n";
import { matchesRealId } from "@/app/_lib/realId";

/**
 * The Appendix A T1 schema, as code. D3 S8 renders each step as the
 * view; this module is the single list of what the four steps hold,
 * what each field requires, and where pre-fill comes from, so the
 * screen never hardcodes a field id twice.
 *
 * String-free where possible: validation returns i18n KEYS, and the
 * screen translates them, keeping this module unit-testable and the
 * copy in the s8 namespace only.
 */

export type FieldId =
  | "theirName"
  | "sex"
  | "age"
  | "theirId"
  | "dateOfDeath"
  | "placeKind"
  | "placeName"
  | "district"
  | "yourName"
  | "relationship"
  | "yourAddress"
  | "yourPhone";

export type FieldKind = "text" | "number" | "date" | "tel" | "multiline" | "radio" | "select";

export interface FieldDef {
  id: FieldId;
  kind: FieldKind;
  labelKey: keyof Strings;
  whyKey: keyof Strings;
  /**
   * Whether a field accepts per-field dictation. Radios, selects and
   * the date picker have native controls; everything textual is
   * dictatable (D3 S8: voice input where a field accepts dictation).
   */
  dictatable: boolean;
  counter?: { max: number; showAt: number };
}

export const FIELD_DEFS: Readonly<Record<FieldId, FieldDef>> = {
  theirName: {
    id: "theirName",
    kind: "text",
    labelKey: "s8.f.theirName",
    whyKey: "s8.why.theirName",
    dictatable: true,
  },
  sex: {
    id: "sex",
    kind: "radio",
    labelKey: "s8.f.sex",
    whyKey: "s8.why.sex",
    dictatable: false,
  },
  age: {
    id: "age",
    kind: "number",
    labelKey: "s8.f.age",
    whyKey: "s8.why.age",
    dictatable: true,
  },
  theirId: {
    id: "theirId",
    kind: "text",
    labelKey: "s8.f.theirId",
    whyKey: "s8.why.theirId",
    dictatable: true,
    counter: { max: 20, showAt: 15 },
  },
  dateOfDeath: {
    id: "dateOfDeath",
    kind: "date",
    labelKey: "s8.f.dateOfDeath",
    whyKey: "s8.why.dateOfDeath",
    dictatable: false,
  },
  placeKind: {
    id: "placeKind",
    kind: "radio",
    labelKey: "s8.f.placeKind",
    whyKey: "s8.why.placeKind",
    dictatable: false,
  },
  placeName: {
    id: "placeName",
    kind: "text",
    labelKey: "s8.f.placeName",
    whyKey: "s8.why.placeName",
    dictatable: true,
  },
  district: {
    id: "district",
    kind: "select",
    labelKey: "s8.f.district",
    whyKey: "s8.why.district",
    dictatable: false,
  },
  yourName: {
    id: "yourName",
    kind: "text",
    labelKey: "s8.f.yourName",
    whyKey: "s8.why.yourName",
    dictatable: true,
  },
  relationship: {
    id: "relationship",
    kind: "select",
    labelKey: "s8.f.relationship",
    whyKey: "s8.why.relationship",
    dictatable: false,
  },
  yourAddress: {
    id: "yourAddress",
    kind: "multiline",
    labelKey: "s8.f.yourAddress",
    whyKey: "s8.why.yourAddress",
    dictatable: true,
    counter: { max: 200, showAt: 150 },
  },
  yourPhone: {
    id: "yourPhone",
    kind: "tel",
    labelKey: "s8.f.yourPhone",
    whyKey: "s8.why.yourPhone",
    dictatable: true,
  },
};

export interface OptionDef {
  value: string;
  labelKey: keyof Strings;
}

export const SEX_OPTIONS: readonly OptionDef[] = [
  { value: "male", labelKey: "s8.opt.male" },
  { value: "female", labelKey: "s8.opt.female" },
  { value: "other", labelKey: "s8.opt.other" },
];

export const PLACE_OPTIONS: readonly OptionDef[] = [
  { value: "hospital", labelKey: "s8.opt.hospital" },
  { value: "home", labelKey: "s8.opt.home" },
  { value: "elsewhere", labelKey: "s8.opt.elsewhere" },
];

/** Appendix A step 3: Spouse / Son / Daughter / Parent / Other. */
export const RELATIONSHIP_OPTIONS: readonly OptionDef[] = [
  { value: "spouse", labelKey: "s8.rel.spouse" },
  { value: "son", labelKey: "s8.rel.son" },
  { value: "daughter", labelKey: "s8.rel.daughter" },
  { value: "parent", labelKey: "s8.rel.parent" },
  { value: "other", labelKey: "s8.rel.other" },
];

/** The step is the view (D12 §4 reading; see the S8 module header). */
export const STEP_FIELDS: readonly (readonly FieldId[])[] = [
  ["theirName", "sex", "age", "theirId"],
  ["dateOfDeath", "placeKind", "placeName", "district"],
  ["yourName", "relationship", "yourAddress", "yourPhone"],
  [],
];

export const STEP_COUNT = 4;

export const REVIEW_GROUPS: readonly { step: number; fields: readonly FieldId[] }[] = [
  { step: 1, fields: STEP_FIELDS[0] },
  { step: 2, fields: STEP_FIELDS[1] },
  { step: 3, fields: STEP_FIELDS[2] },
];

export const ALL_FIELDS: readonly FieldId[] = [
  ...STEP_FIELDS[0],
  ...STEP_FIELDS[1],
  ...STEP_FIELDS[2],
];

export function stepTitleKey(step: number): keyof Strings {
  return `s8.step${step}Title` as keyof Strings;
}

export function isFormStep(step: string): step is "1" | "2" | "3" | "4" {
  return step === "1" || step === "2" || step === "3" || step === "4";
}

/**
 * S8 ships T1 only. Another mock flow adds its code here and its schema
 * beside this one; the guards and the CTA rule (D3 S6) stay generic.
 */
export const MOCK_FLOW_CODES: ReadonlySet<string> = new Set(["T1"]);

/* ------------------------------------------------------------------ */
/* pre-fill sources (Appendix A; wallet samples only, never OCR, P3)   */
/* ------------------------------------------------------------------ */

/** Wallet source document per field. DOC_SAMPLE_PREFILL keys match these. */
export const SOURCE_DOC: Readonly<Partial<Record<FieldId, string>>> = {
  theirName: "DOC-ID-D",
  theirId: "DOC-ID-D",
  sex: "DOC-MED",
  age: "DOC-MED",
  placeName: "DOC-MED",
  dateOfDeath: "DOC-MED",
  yourName: "DOC-ID-I",
  yourAddress: "DOC-ADDR",
};

/**
 * Answer pre-fill. The Socratic relationship vocabulary (compute.ts) is
 * narrower than Appendix A's list: "parent" has no recorded source and
 * "unknown" pre-fills nothing (an unsure answer never becomes a fact).
 * The SH1 phone mapping is out of scope; the phone field stays empty.
 */
export function mapAnswerValue(value: string): string | null {
  if (value === "spouse" || value === "son" || value === "daughter" || value === "other") {
    return value;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* validation: on blur, guidance phrasing, keys only                    */
/* ------------------------------------------------------------------ */

export type ErrKey =
  | "s8.v.required"
  | "s8.v.nameLen"
  | "s8.v.age"
  | "s8.v.phone"
  | "s8.v.addressLen"
  | "s8.v.idLen"
  | "s8.v.dateFuture"
  | "s8.errorE16";

const NAME_FIELDS: ReadonlySet<FieldId> = new Set(["theirName", "yourName", "placeName"]);

function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Per-field validation (D3 S8: fires on blur). `values` is the whole
 * draft because placeName's requirement depends on placeKind.
 * E-16 is the hard block: it never sanitises, it rejects, and it clears
 * only when the pattern is removed (P6).
 */
export function validateField(
  id: FieldId,
  value: string,
  values: Readonly<Record<string, string>>,
): ErrKey | null {
  const trimmed = value.trim();

  // E-16 fires on input for the ID field, ahead of every other rule.
  if (id === "theirId" && matchesRealId(trimmed)) return "s8.errorE16";

  const required =
    id === "placeName" ? values.placeKind !== "home" : id !== "theirId" && id !== "yourPhone";
  if (required && trimmed === "") return "s8.v.required";
  if (trimmed === "") return null; // optional and empty

  if (NAME_FIELDS.has(id) && (trimmed.length < 2 || trimmed.length > 100)) {
    return "s8.v.nameLen";
  }
  if (id === "theirId" && trimmed.length > 20) return "s8.v.idLen";
  if (id === "age") {
    const age = Number(trimmed);
    if (!Number.isFinite(age) || !Number.isInteger(age) || age < 0 || age > 120) {
      return "s8.v.age";
    }
  }
  if (id === "yourAddress" && (trimmed.length < 10 || trimmed.length > 200)) {
    return "s8.v.addressLen";
  }
  if (id === "yourPhone" && !/^\d{10}$/.test(trimmed)) return "s8.v.phone";
  if (id === "dateOfDeath") {
    const date = parseIsoDate(trimmed);
    if (!date || date.getTime() > startOfToday().getTime()) return "s8.v.dateFuture";
  }
  return null;
}

/**
 * Non-blocking date guidance (Appendix A): older than a year needs a
 * magistrate order. It never blocks the step, so it is not an ErrKey.
 */
export function isDateOld(value: string): boolean {
  if (value.trim() === "") return false;
  const date = parseIsoDate(value.trim());
  if (!date) return false;
  const cutoff = startOfToday();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return date.getTime() < cutoff.getTime();
}

/**
 * The date guidance example is GENERATED from the locale's dateFormat
 * token (D6 6.4): "DD-MM-YYYY" produces "05-01-2026". No hardcoded
 * example date exists anywhere.
 */
export function dateExampleFromFormat(format: string): string {
  return format
    .replace(/DD/g, "05")
    .replace(/MM/g, "01")
    .replace(/YYYY/g, "2026")
    .replace(/YY/g, "26");
}

/** PRACTICE-AS-{6 digits}; generated once per draft (P2-7). */
export function makeAckNumber(): string {
  return `PRACTICE-AS-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

/** Where an error-summary link and the initial focus land per field. */
export function focusTargetId(id: FieldId): string {
  const def = FIELD_DEFS[id];
  if (def.kind === "radio") {
    const first =
      id === "sex" ? SEX_OPTIONS[0] : id === "placeKind" ? PLACE_OPTIONS[0] : RELATIONSHIP_OPTIONS[0];
    return `f-${id}-${first.value}`;
  }
  return `f-${id}`;
}
