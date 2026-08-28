/**
 * Task roster.
 *
 * ---------------------------------------------------------------------
 * INCOMPLETE BY NECESSITY. See BUG-009 (P0).
 *
 * The specification set references tasks T1 to T9 in 43 places but never
 * enumerates them. Only T1 is identifiable, from S6's example title and
 * Appendix A's CRS death-report schema. T2 to T9 have no name, department,
 * documents, fee, duration or official link anywhere in D1 to D7.
 *
 * They are NOT invented here. C4 requires every seeded office, link, fee
 * and duration to carry a source and a verification date, and D10 10.2
 * bans placeholder government content outright: seeded content is "real,
 * sourced and date-stamped per C4, or absent". A plausible-looking list of
 * eight fabricated government processes with invented official links is
 * precisely the failure mode both rules exist to prevent, and it would be
 * far more damaging here than an obviously incomplete list, because a
 * bereaved user may act on it.
 *
 * Consequences until the author supplies the roster:
 *   - S1's no-JS fallback renders the tasks that exist plus the national
 *     helpline route, not nine rows.
 *   - S5, S6 and the S3e browse journeys B1 to B6 cannot be completed.
 * ---------------------------------------------------------------------
 */

export interface TaskDefinition {
  code: string;
  /** Plain-language name, per S6: what it is and why it matters. */
  name: string;
  department: string;
  /** C4: official source link. Required. No task ships without one. */
  sourceUrl: string;
  /** C4: ISO date the source was last checked by a human. */
  lastVerified: string;
  /** Seeded state this content is scoped to. */
  state: string;
  /**
   * Appendix A wallet documents this task needs. Present only where a
   * spec names the set; tasks without one are never doc-gated rather
   * than guessed (C4). See documents.ts for the codes.
   */
  requiredDocuments?: readonly string[];
  /**
   * Sourced fee fact (offices.ts). Absent unless verified; S6 omits the
   * section rather than faking it (the BUG-009 convention).
   */
  fee?: { text: string; sourceUrl: string; lastVerified: string };
  /** Realistic processing range. Sourced or absent; a guess is banned. */
  timelineDays?: { min: number; max: number };
}

/**
 * T1 only. Its name follows S6's own example title, and its schema basis
 * is Appendix A ("models Assam; basis: CRS death-report form").
 */
export const TASKS: readonly TaskDefinition[] = [
  {
    code: "T1",
    name: "Death certificate, the document almost everything else needs",
    department: "Registrar of Births and Deaths",
    sourceUrl: "https://crsorgi.gov.in/",
    lastVerified: "2026-08-28",
    state: "Assam",
    // Appendix A names this exact wallet set for T1.
    requiredDocuments: ["DOC-MED", "DOC-ID-D", "DOC-ID-I", "DOC-ADDR"],
    // Sourced from GMC's official registration page (see offices.ts).
    fee: {
      text: "No fee if reported within 21 days. From day 22 to day 30 a late fee of Rs 2 applies.",
      sourceUrl:
        "https://gmc.assam.gov.in/information-services/registration-of-births-and-death",
      lastVerified: "2026-08-28",
    },
    // A certificate-issuance range was never sourced; timelineDays stays
    // absent and S6 omits the section rather than guessing (C4).
  },
];

/** D3 S1 specifies nine. Used to keep the shortfall visible in the UI. */
export const EXPECTED_TASK_COUNT = 9;

export const ROSTER_IS_COMPLETE = TASKS.length === EXPECTED_TASK_COUNT;
