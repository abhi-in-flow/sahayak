/**
 * Seeded static content for S6 ("Where") and S10 (offline path).
 *
 * C4 rule in force: every office, number, fee and link here is real,
 * carries its official source URL and the date a human last verified
 * it, or it is absent. Fields left undefined render nowhere; the S6/S10
 * renderers treat every field as optional. Inventing a plausible-looking
 * government fact is the exact failure C4 and D10 §10.2 exist to
 * prevent.
 *
 * Verified 2026-08-28 against the sources listed per entry.
 */

export interface OfficeEntry {
  name: string;
  addressLines: string[];
  district: string;
  state: string;
  mapQuery: string;
  hours?: string;
  sourceUrl: string;
  lastVerified: string;
}

export interface HelplineEntry {
  name: string;
  number: string;
  scope: "state" | "national";
  sourceUrl: string;
  lastVerified: string;
}

export interface LegalAidEntry {
  name: string;
  addressLines: string[];
  phone?: string;
  sourceUrl: string;
  lastVerified: string;
}

export interface FeeFact {
  /** Shown in S6's fee section; must state the amount AND its condition. */
  text: string;
  sourceUrl: string;
  lastVerified: string;
}

/**
 * The registrar office for the seeded journey (Guwahati, Kamrup
 * Metropolitan). Source: GMC's official registration page and branch
 * list; the registrar sits in the GMC Market branch and certificates
 * are issued from GMC offices.
 */
export const SEED_OFFICE: OfficeEntry = {
  name: "Registrar of Births and Deaths, Guwahati Municipal Corporation",
  addressLines: ["GMC Market branch office", "Guwahati, Kamrup Metropolitan, Assam 781001"],
  district: "Kamrup Metropolitan",
  state: "Assam",
  mapQuery: "Guwahati Municipal Corporation office",
  sourceUrl: "https://gmc.assam.gov.in/information-services/registration-of-births-and-death",
  lastVerified: "2026-08-28",
};

/**
 * Sourced fee fact for T1 (Assam). Only the verified part of the GMC
 * schedule is stated; the rest of the schedule was not verified and is
 * not paraphrased here.
 */
export const T1_FEE: FeeFact = {
  text: "No fee if reported within 21 days. From day 22 to day 30 a late fee of Rs 2 applies.",
  sourceUrl: "https://gmc.assam.gov.in/information-services/registration-of-births-and-death",
  lastVerified: "2026-08-28",
};

/** Legal-aid routing, framed as the destination for rights questions. */
export const SEED_LEGAL_AID: LegalAidEntry = {
  name: "District Legal Services Authority, Kamrup Metropolitan",
  addressLines: ["District and Sessions Judge Office Campus", "Panbazar, Guwahati, Assam 781001"],
  phone: "6901281635",
  sourceUrl: "https://aslsa.assam.gov.in/contact-us",
  lastVerified: "2026-08-28",
};

/**
 * Helplines. The DLSA number is the ASLSA-published contact for Kamrup
 * Metro. No national toll-free number is listed that could not be
 * verified today; the national CRS portal stands in as national
 * guidance for entry (c).
 */
export const HELPLINES: readonly HelplineEntry[] = [
  {
    name: "Legal aid, Kamrup Metropolitan",
    number: "6901281635",
    scope: "state",
    sourceUrl: "https://aslsa.assam.gov.in/contact-us",
    lastVerified: "2026-08-28",
  },
];

/** National guidance for S10 entry (c), where no state scope applies. */
export const NATIONAL_GUIDANCE = {
  portalName: "Civil Registration System portal",
  portalUrl: "https://crsorgi.gov.in/",
  legalAidName: "National Legal Services Authority (NALSA)",
  legalAidUrl: "https://nalsa.gov.in/",
  lastVerified: "2026-08-28",
};

/**
 * Assam districts for S8's registration-office select. District names
 * are stable public geography; the office mapping per district is NOT
 * verified and is deliberately absent.
 */
export const ASSAM_DISTRICTS: readonly string[] = [
  "Bajali",
  "Baksa",
  "Barpeta",
  "Biswanath",
  "Bongaigaon",
  "Cachar",
  "Charaideo",
  "Chirang",
  "Darrang",
  "Dhemaji",
  "Dhubri",
  "Dibrugarh",
  "Dima Hasao",
  "Goalpara",
  "Golaghat",
  "Hailakandi",
  "Hojai",
  "Jorhat",
  "Kamrup",
  "Kamrup Metropolitan",
  "Karbi Anglong",
  "Karimganj",
  "Kokrajhar",
  "Lakhimpur",
  "Majuli",
  "Morigaon",
  "Nagaon",
  "Nalbari",
  "Sivasagar",
  "Sonitpur",
  "South Salmara Mankachar",
  "Tamulpur",
  "Tinsukia",
  "Udalguri",
  "West Karbi Anglong",
];

export function districtsForState(state: string | null): readonly string[] {
  // Two seeded states were assumed (O-D2); only Assam has sourced
  // content. Maharashtra journeys render the Assam list narrowed to
  // nothing rather than a fabricated list, so the select stays honest.
  if (state === null || state === "assam") return ASSAM_DISTRICTS;
  return [];
}
