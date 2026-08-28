/**
 * S6 string namespace (task detail). OWNERSHIP: the S6 workstream.
 * Key prefix "s6.".
 *
 * D5 error copy (E-18) ships verbatim from the catalog, dash characters
 * included; the separator review is BUG-004, owned by the copy owner.
 * Everything else authored here carries zero em/en dashes and no
 * middle-dot separators (D11 §1).
 */

export interface S6Strings {
  /** Section headings (authored; D3 names the sections, not the labels). */
  "s6.docsTitle": string;
  "s6.whereTitle": string;
  "s6.feeTitle": string;
  "s6.timelineTitle": string;
  "s6.rejectionTitle": string;

  /** Documents-needed checklist. */
  "s6.docHave": string;
  "s6.docAdd": string;

  /** Where: online portal and the physical office, both always. */
  "s6.onlineLabel": string;
  "s6.portalLink": string;
  "s6.officeLabel": string;
  "s6.mapLink": string;

  /** Fee (C6) and timeline. */
  "s6.feeNote": string;
  "s6.timeline": string;

  /** Common rejection reasons, 2-3 bullets. */
  "s6.reject1": string;
  "s6.reject2": string;
  "s6.reject3": string;

  /** CTA rule outcomes, evaluated in order (D3 S6). */
  "s6.docsMissingCta": string;
  "s6.practiceCta": string;
  "s6.officialCta": string;
  "s6.whereCta": string;

  /** Secondary and tertiary actions. */
  "s6.alreadyDone": string;
  "s6.needHelp": string;

  /** Completion flow (P1-3): two confirms, then the doc prompt. */
  "s6.confirmTitle": string;
  "s6.confirmYes": string;
  "s6.cancel": string;
  "s6.docPrompt": string;
  "s6.docPromptAdd": string;
  "s6.docPromptLater": string;

  /** Read-only completions. */
  "s6.doneRecord": string;
  "s6.doneRef": string;
  "s6.doneNoRef": string;
  "s6.preCompletedNote": string;

  /** Locked deep link (read-only + prominent path). */
  "s6.lockedNote": string;
  "s6.lockedGo": string;

  /** E-18, D5 verbatim. */
  "s6.errorE18": string;

  /** Disabled (offline) rows. */
  "s6.offlinePractice": string;

  /** N6 interstitial labels. */
  "s6.interTitle": string;
  "s6.interBody": string;
  "s6.interContinue": string;
  "s6.interStay": string;
  "s6.interClose": string;

  /** Announcement on completion (D6 6.2). */
  "s6.announceDone": string;

  /** Unknown task code deep link (e.g. /task/T2): honest not-found card. */
  "s6.notFoundTitle": string;
  "s6.notFoundBody": string;
  "s6.notFoundBack": string;
}

export const enS6: S6Strings = {
  "s6.docsTitle": "Documents needed",
  "s6.whereTitle": "Where to go",
  "s6.feeTitle": "Fee",
  "s6.timelineTitle": "How long it takes",
  "s6.rejectionTitle": "Why applications get rejected",

  "s6.docHave": "In your wallet",
  "s6.docAdd": "Add",

  "s6.onlineLabel": "Online",
  "s6.portalLink": "Open the official portal",
  "s6.officeLabel": "In person",
  "s6.mapLink": "Open in maps",

  "s6.feeNote": "Paid on the government site, not here.",
  "s6.timeline": "Usually {min} to {max} days",

  "s6.reject1": "The name or details do not match their records.",
  "s6.reject2": "The medical cause-of-death certificate is missing.",
  "s6.reject3": "Reported more than 21 days late.",

  "s6.docsMissingCta": "Add the missing documents first",
  "s6.practiceCta": "Start this step (practice)",
  "s6.officialCta": "Take me to the official site",
  "s6.whereCta": "Where to go",

  "s6.alreadyDone": "I've already done this",
  "s6.needHelp": "I need help with this",

  "s6.confirmTitle": "Mark \"{task}\" as done?",
  "s6.confirmYes": "Yes, it's done",
  "s6.cancel": "Cancel",
  "s6.docPrompt": "Do you have the {document}?",
  "s6.docPromptAdd": "Add it now",
  "s6.docPromptLater": "I'll add it later",

  "s6.doneRecord": "Completed on {date}",
  "s6.doneRef": "Ref {ack}",
  "s6.doneNoRef": "Completed. No practice reference was recorded.",
  "s6.preCompletedNote": "You told us this is already registered.",

  "s6.lockedNote": "This step needs {document} first",
  "s6.lockedGo": "Go to {task}",

  "s6.errorE18":
    "The official site isn't responding. The office address below works without it.",

  "s6.offlinePractice": "Practice submission needs a connection",

  "s6.interTitle": "Leaving Sahayak",
  "s6.interBody":
    "You're leaving this prototype and going to an official government site.",
  "s6.interContinue": "Continue",
  "s6.interStay": "Stay",
  "s6.interClose": "Close",

  "s6.announceDone": "{task} marked done.",

  "s6.notFoundTitle": "This step isn't in Sahayak",
  "s6.notFoundBody":
    "Only steps with sourced official content are listed in this prototype.",
  "s6.notFoundBack": "Go to your steps",
};

export const hiS6: S6Strings = {
  "s6.docsTitle": "ज़रूरी दस्तावेज़",
  "s6.whereTitle": "कहाँ जाना है",
  "s6.feeTitle": "शुल्क",
  "s6.timelineTitle": "इसमें कितना समय लगता है",
  "s6.rejectionTitle": "आवेदन क्यों लौटाए जाते हैं",

  "s6.docHave": "आपके वॉलेट में है",
  "s6.docAdd": "जोड़ें",

  "s6.onlineLabel": "ऑनलाइन",
  "s6.portalLink": "सरकारी पोर्टल खोलें",
  "s6.officeLabel": "सीधे दफ़्तर जाकर",
  "s6.mapLink": "नक्शे में खोलें",

  "s6.feeNote": "शुल्क सरकारी साइट पर जमा होता है, यहाँ नहीं।",
  "s6.timeline": "आमतौर पर {min} से {max} दिन",

  "s6.reject1": "नाम या जानकारी उनके रिकॉर्ड से मेल नहीं खाती।",
  "s6.reject2": "मृत्यु का मेडिकल कारण प्रमाणपत्र नहीं लगा है।",
  "s6.reject3": "21 दिन से ज़्यादा देर से दर्ज कराया गया।",

  "s6.docsMissingCta": "पहले बचे हुए दस्तावेज़ जोड़ें",
  "s6.practiceCta": "यह चरण शुरू करें (अभ्यास)",
  "s6.officialCta": "मुझे सरकारी साइट पर ले जाएँ",
  "s6.whereCta": "कहाँ जाना है",

  "s6.alreadyDone": "मैंने यह पहले ही कर लिया है",
  "s6.needHelp": "मुझे इसमें मदद चाहिए",

  "s6.confirmTitle": "\"{task}\" को पूरा हुआ मार्क करें?",
  "s6.confirmYes": "हाँ, हो गया",
  "s6.cancel": "रद्द करें",
  "s6.docPrompt": "क्या आपके पास {document} है?",
  "s6.docPromptAdd": "अभी जोड़ें",
  "s6.docPromptLater": "बाद में जोड़ूँगा",

  "s6.doneRecord": "{date} को पूरा हुआ",
  "s6.doneRef": "संदर्भ {ack}",
  "s6.doneNoRef": "पूरा हुआ। कोई अभ्यास संदर्भ दर्ज नहीं है।",
  "s6.preCompletedNote": "आपने बताया था कि यह दर्ज हो चुका है।",

  "s6.lockedNote": "इस चरण के लिए पहले {document} चाहिए",
  "s6.lockedGo": "{task} पर जाएँ",

  "s6.errorE18":
    "सरकारी साइट नहीं खुल रही। नीचे दफ़्तर का पता बिना इंटरनेट के भी काम आता है।",

  "s6.offlinePractice": "अभ्यास फॉर्म भेजने के लिए कनेक्शन चाहिए",

  "s6.interTitle": "सहायक छोड़ रहे हैं",
  "s6.interBody":
    "आप यह प्रोटोटाइप छोड़कर एक सरकारी वेबसाइट पर जा रहे हैं।",
  "s6.interContinue": "जारी रखें",
  "s6.interStay": "यहीं रहें",
  "s6.interClose": "बंद करें",

  "s6.announceDone": "{task} पूरा हुआ मार्क हुआ।",

  "s6.notFoundTitle": "यह चरण सहायक में नहीं है",
  "s6.notFoundBody":
    "इस प्रोटोटाइप में केवल सत्यापित सरकारी जानकारी वाले चरण ही सूचीबद्ध हैं।",
  "s6.notFoundBack": "अपने चरणों पर जाएँ",
};
