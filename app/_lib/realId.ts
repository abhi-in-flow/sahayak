/**
 * E-16 real-ID guard (P6). D3 S2 validation: "if content matches Aadhaar
 * (12 contiguous digits), PAN (`AAAAA9999A`), or 16-digit card pattern,
 * Confirm disables and E-16 shows inline; fires on input, cleared when
 * pattern removed. Validation fires on change (Confirm gating) - never
 * blocks typing."
 *
 * Pure and deliberately cheap: it runs on every keystroke of the capture
 * fields (S2, S2b). Contiguity is literal for Aadhaar, so separators
 * defeat it; the 16-digit card pattern covers the spaced/hyphenated card
 * formats that the contiguous rule would otherwise miss, and a 16-digit
 * run is always caught by the 12-digit rule first.
 *
 * PAN is matched case-insensitively: the format is uppercase in law but
 * users type in lowercase, and a hard block should err toward catching a
 * real ID rather than toward convenience.
 */

const AADHAAR = /\d{12}/;
const PAN = /[a-z]{5}\d{4}[a-z]/i;
const CARD_16 = /\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}/;

export function matchesRealId(text: string): boolean {
  return AADHAAR.test(text) || PAN.test(text) || CARD_16.test(text);
}
