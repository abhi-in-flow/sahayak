/**
 * S10 string namespace (offline path and human help). OWNERSHIP: the
 * S10 workstream. Key prefix "s10.".
 *
 * All content is bundled static; there is no Loading state. Authored
 * strings carry zero em/en dashes; D5's E-22 is a behaviour
 * substitution (silent print fallback), not a string.
 */

export interface S10Strings {
  /** State-scoped variant heading, and the entry-(c) national variant. */
  "s10.heading": string;
  "s10.generalHeading": string;

  "s10.officeTitle": string;
  "s10.hours": string;
  "s10.mapLink": string;
  "s10.mapOffline": string;

  /** Documents to carry, for the originating task when known. */
  "s10.carryTitle": string;
  "s10.carryFor": string;

  /** Helplines: tap-to-call, with the non-telephony Copy affordance. */
  "s10.helplines": string;
  "s10.call": string;
  "s10.copy": string;
  "s10.copied": string;

  /** Legal-aid routing and the boundary statement (C5). */
  "s10.legalTitle": string;
  "s10.legalBody": string;
  "s10.boundary": string;

  /** Printable one-page checklist, plus its share affordance. E-22
   *  (share sheet unavailable) is a silent print fallback, not a string. */
  "s10.printCta": string;
  "s10.share": string;
  "s10.checklistTitle": string;
  "s10.checklistFor": string;

  /** National variant content labels. */
  "s10.nationalPortal": string;
  "s10.nationalLegal": string;
}

export const enS10: S10Strings = {
  "s10.heading": "Where to get help in person",
  "s10.generalHeading": "General help. Your state's details aren't covered yet.",

  "s10.officeTitle": "Nearest office",
  "s10.hours": "Hours",
  "s10.mapLink": "Open in maps",
  "s10.mapOffline": "Maps needs a connection. The full address is above.",

  "s10.carryTitle": "Documents to carry",
  "s10.carryFor": "For {task}, carry:",

  "s10.helplines": "Helplines",
  "s10.call": "Call {number}",
  "s10.copy": "Copy number",
  "s10.copied": "Copied",

  "s10.legalTitle": "Free legal help",
  "s10.legalBody":
    "For questions about your rights, the District Legal Services Authority is the right office. Their help is free.",
  "s10.boundary": "We explain the process. We don't give legal advice.",

  "s10.printCta": "Print the checklist",
  "s10.share": "Share the checklist",
  "s10.checklistTitle": "My office-visit checklist",
  "s10.checklistFor": "Checklist for {task}",

  "s10.nationalPortal": "Official portal",
  "s10.nationalLegal": "National Legal Services Authority",
};

export const hiS10: S10Strings = {
  "s10.heading": "कहाँ से आमने-सामने मदद मिलेगी",
  "s10.generalHeading": "सामान्य मदद। आपके राज्य की जानकारी अभी शामिल नहीं है।",

  "s10.officeTitle": "सबसे नज़दीकी दफ़्तर",
  "s10.hours": "समय",
  "s10.mapLink": "नक्शे में खोलें",
  "s10.mapOffline": "नक्शे के लिए कनेक्शन चाहिए। पूरा पता ऊपर दिया है।",

  "s10.carryTitle": "साथ ले जाने के दस्तावेज़",
  "s10.carryFor": "{task} के लिए साथ रखें:",

  "s10.helplines": "हेल्पलाइन नंबर",
  "s10.call": "{number} पर कॉल करें",
  "s10.copy": "नंबर कॉपी करें",
  "s10.copied": "कॉपी हो गया",

  "s10.legalTitle": "मुफ़्त कानूनी मदद",
  "s10.legalBody":
    "अपने अधिकारों के सवालों के लिए ज़िला विधिक सेवा प्राधिकरण सही दफ़्तर है। उनकी मदद मुफ़्त है।",
  "s10.boundary": "हम प्रक्रिया समझाते हैं। हम कानूनी सलाह नहीं देते।",

  "s10.printCta": "चेकलिस्ट प्रिंट करें",
  "s10.share": "चेकलिस्ट शेयर करें",
  "s10.checklistTitle": "दफ़्तर जाने की मेरी चेकलिस्ट",
  "s10.checklistFor": "{task} की चेकलिस्ट",

  "s10.nationalPortal": "सरकारी पोर्टल",
  "s10.nationalLegal": "राष्ट्रीय विधिक सेवा प्राधिकरण",
};
