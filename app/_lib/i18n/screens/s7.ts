/**
 * S7 string namespace (document wallet). OWNERSHIP: the S7 workstream.
 * Key prefix "s7.".
 *
 * D5 error copy (E-14, E-15, E-16, E-17) ships verbatim from the
 * catalog, dash characters included (BUG-004 owns the separator
 * review). Everything else authored here carries zero em/en dashes.
 */

export interface S7Strings {
  "s7.heading": string;
  /** Coverage summary; the reuse SVG is aria-hidden behind it (DP-4). */
  "s7.coverage": string;
  "s7.empty": string;

  /** Add actions, per needed document. */
  "s7.add": string;
  "s7.addCamera": string;
  "s7.addGallery": string;
  "s7.useSample": string;
  /** Camera viewfinder shutter. */
  "s7.capture": string;

  /** Card status chips (local set; not StatusChip semantics). */
  "s7.chipHave": string;
  "s7.chipNeed": string;
  "s7.chipSample": string;
  "s7.failedChip": string;

  /** "used by" list naming every consuming task. */
  "s7.usedBy": string;

  /** C3/P3 mock-data notice, global and per-card. */
  "s7.mockNotice": string;

  /** Upload in flight. */
  "s7.preparing": string;
  "s7.cancelUpload": string;

  /** D5 verbatim. */
  "s7.errorE14": string;
  "s7.errorE15": string;
  "s7.errorE16": string;
  "s7.errorE17": string;
  "s7.retry": string;

  /** Removal confirm (destructive; never reverts completion, P2-8). */
  "s7.removeTitle": string;
  "s7.removeBody": string;
  "s7.remove": string;
  "s7.keep": string;
  "s7.completedNote": string;

  /** Positive confirmation after an add. */
  "s7.added": string;
  "s7.addedAlso": string;
  "s7.addedAlsoOne": string;

  /** Exit shown when an add newly satisfies a task. */
  "s7.continueTo": string;

  /** Optional label field, max 60 chars, E-16 guarded. */
  "s7.labelLabel": string;
  "s7.labelHelper": string;

  /** Preview sheet. */
  "s7.previewTitle": string;
  "s7.previewClose": string;

  /** Watermark wording, D10 10.8 (hyphen, not em-dash). */
  "s7.watermark": string;
}

export const enS7: S7Strings = {
  "s7.heading": "Your documents",
  "s7.coverage":
    "You have {h} of {t} documents. These unlock {u} of {n} steps.",
  "s7.empty": "Add one document here and it works for every step that needs it.",

  "s7.add": "Add",
  "s7.addCamera": "Camera capture",
  "s7.addGallery": "Gallery",
  "s7.useSample": "Use sample document",
  "s7.capture": "Take photo",

  "s7.chipHave": "Have it",
  "s7.chipNeed": "Need it",
  "s7.chipSample": "Sample loaded",
  "s7.failedChip": "Didn't save",

  "s7.usedBy": "Needed for: {tasks}",

  "s7.mockNotice":
    "Prototype uploads are stored in your browser only and are not sent anywhere.",

  "s7.preparing": "Preparing your document…",
  "s7.cancelUpload": "Cancel",

  "s7.errorE14": "That didn't save. Try again.",
  "s7.errorE15":
    "Camera is off. You can pick from your gallery or use a sample document.",
  "s7.errorE16":
    "This looks like a real ID number. Never enter real ID numbers here — this is a practice tool.",
  "s7.errorE17":
    "Your device storage for this app is full. Remove a document to add another.",
  "s7.retry": "Try again",

  "s7.removeTitle": "Remove {document}?",
  "s7.removeBody": "Steps that need it will show as waiting again.",
  "s7.remove": "Remove",
  "s7.keep": "Keep",
  "s7.completedNote":
    "Completed earlier. Removing the document doesn't undo this.",

  "s7.added": "Added.",
  "s7.addedAlso":
    "Added. This also completes the document step for {k} other tasks.",
  "s7.addedAlsoOne":
    "Added. This also completes the document step for 1 other task.",

  "s7.continueTo": "Continue to {task}",

  "s7.labelLabel": "Label (optional)",
  "s7.labelHelper": "A note to yourself, up to 60 characters.",

  "s7.previewTitle": "Preview",
  "s7.previewClose": "Close",

  "s7.watermark": "SAMPLE - NOT A REAL DOCUMENT",
};

export const hiS7: S7Strings = {
  "s7.heading": "आपके दस्तावेज़",
  "s7.coverage":
    "आपके पास {t} में से {h} दस्तावेज़ हैं। इनसे {n} में से {u} चरण खुलते हैं।",
  "s7.empty":
    "यहाँ एक दस्तावेज़ जोड़िए, वही हर उस चरण के काम आएगा जिसे उसकी ज़रूरत है।",

  "s7.add": "जोड़ें",
  "s7.addCamera": "कैमरे से लें",
  "s7.addGallery": "गैलरी से चुनें",
  "s7.useSample": "नमूना दस्तावेज़ इस्तेमाल करें",
  "s7.capture": "तस्वीर लें",

  "s7.chipHave": "आपके पास है",
  "s7.chipNeed": "चाहिए",
  "s7.chipSample": "नमूना जोड़ा गया",
  "s7.failedChip": "सेव नहीं हुआ",

  "s7.usedBy": "इन चरणों में लगेगा: {tasks}",

  "s7.mockNotice":
    "प्रोटोटाइप के अपलोड सिर्फ़ आपके ब्राउज़र में सुरक्षित रहते हैं और कहीं नहीं भेजे जाते।",

  "s7.preparing": "आपका दस्तावेज़ तैयार हो रहा है…",
  "s7.cancelUpload": "रद्द करें",

  "s7.errorE14": "वह सेव नहीं हुआ। फिर से कोशिश करें।",
  "s7.errorE15":
    "कैमरा बंद है। आप गैलरी से चुन सकते हैं या नमूना दस्तावेज़ इस्तेमाल कर सकते हैं।",
  "s7.errorE16":
    "यह किसी असली आईडी नंबर जैसा दिखता है। यहाँ असली आईडी नंबर कभी न डालें — यह एक अभ्यास टूल है।",
  "s7.errorE17":
    "इस ऐप के लिए आपके डिवाइस की स्टोरेज भर गई है। दूसरा दस्तावेज़ जोड़ने के लिए एक हटाएँ।",
  "s7.retry": "फिर से कोशिश करें",

  "s7.removeTitle": "{document} हटाएँ?",
  "s7.removeBody": "जिन चरणों को इसकी ज़रूरत है, वे फिर से इंतज़ार में दिखेंगे।",
  "s7.remove": "हटाएँ",
  "s7.keep": "रखें",
  "s7.completedNote":
    "पहले पूरा हो चुका है। दस्तावेज़ हटाने से यह पूरा हुआ नहीं रहता।",

  "s7.added": "जुड़ गया।",
  "s7.addedAlso":
    "जुड़ गया। इससे {k} अन्य कामों का दस्तावेज़ वाला चरण भी पूरा हो जाएगा।",
  "s7.addedAlsoOne":
    "जुड़ गया। इससे 1 अन्य काम का दस्तावेज़ वाला चरण भी पूरा हो जाएगा।",

  "s7.continueTo": "{task} पर जारी रखें",

  "s7.labelLabel": "नाम (वैकल्पिक)",
  "s7.labelHelper": "अपने लिए एक नोट, ज़्यादा से ज़्यादा 60 अक्षर।",

  "s7.previewTitle": "झलक",
  "s7.previewClose": "बंद करें",

  "s7.watermark": "नमूना - असली दस्तावेज़ नहीं",
};
