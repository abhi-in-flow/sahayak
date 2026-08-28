/**
 * The document set, per Appendix A (T1 form schema, models Assam).
 *
 * "All samples watermarked; sample ID numbers use the format
 * SAMPLE-XXXX, which deliberately fails every real-ID pattern."
 * Every seeded number anywhere in the product must keep that property;
 * the realId matcher rejects real Aadhaar/PAN/16-digit shapes at entry.
 *
 * OWNERSHIP: orchestrator (D12 §1). Screens read this module; they do
 * not redefine document codes or requirements.
 */

export interface DocumentType {
  code: string;
  /** Plain-language name, in the S6/S7 register. */
  name: string;
  /**
   * Appendix A wallet source documents are seeded samples; DOC-DEATH is
   * the practice output document S8 auto-adds (P1-3). Nothing here is a
   * real document and nothing is presented as one (C3).
   */
  isSample: boolean;
}

export const DOC_TYPES: readonly DocumentType[] = [
  {
    code: "DOC-MED",
    name: "Medical Cause of Death Certificate",
    isSample: true,
  },
  {
    code: "DOC-ID-D",
    name: "Their ID proof",
    isSample: true,
  },
  {
    code: "DOC-ID-I",
    name: "Your ID proof",
    isSample: true,
  },
  {
    code: "DOC-ADDR",
    name: "Address proof",
    isSample: true,
  },
  {
    code: "DOC-DEATH",
    name: "Death Certificate (practice)",
    isSample: true,
  },
];

export function docTypeName(code: string): string {
  return DOC_TYPES.find((doc) => doc.code === code)?.name ?? code;
}

/**
 * Which documents each task needs, for the S6 checklist, S7 coverage
 * and the S8 entry precondition. Appendix A is the source for T1's set;
 * the practice Death Certificate is T1's OUTPUT, not an input, so it is
 * not a requirement.
 *
 * Roster caveat (BUG-009): tasks beyond T1 have no sourced requirement
 * set and appear nowhere in this map; readiness for them is never
 * claimed.
 */
export const TASK_DOC_REQUIREMENTS: Readonly<Record<string, readonly string[]>> = {
  T1: ["DOC-MED", "DOC-ID-D", "DOC-ID-I", "DOC-ADDR"],
};

export function requiredDocuments(taskCode: string): readonly string[] {
  return TASK_DOC_REQUIREMENTS[taskCode] ?? [];
}

/** Sample ID numbers deliberately fail every real-ID pattern (Appendix A). */
export function sampleIdNumber(docCode: string): string {
  return `SAMPLE-${docCode.replace("DOC-", "").padEnd(4, "X").slice(0, 4)}`;
}

/**
 * Pre-fill values Appendix A maps from each source document. These are
 * demo values for the seeded samples; a real upload never gets read
 * (D3 S7: no OCR of identity documents, hard constraint P3), so the
 * pre-fill from a user-supplied image is left empty for the user to
 * fill in.
 */
export const DOC_SAMPLE_PREFILL: Readonly<Record<string, Record<string, string>>> = {
  "DOC-MED": { sex: "male", age: "67", place: "Guwahati Medical College Hospital", dateOfDeath: "2026-07-18" },
  "DOC-ID-D": { theirName: "Bhubaneswar Das", theirId: "SAMPLE-IDDX" },
  "DOC-ID-I": { yourName: "Anil Das" },
  "DOC-ADDR": { yourAddress: "House 14, RG Baruah Road, Guwahati, Assam 781005" },
};
