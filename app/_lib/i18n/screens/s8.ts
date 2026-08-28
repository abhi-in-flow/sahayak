/**
 * S8 string namespace (guided mock submission, Appendix A schema).
 * OWNERSHIP: the S8 workstream. Key prefix "s8.".
 *
 * Validation copy is phrased as guidance, never blame (D3 S8); the
 * real-ID guard is E-16 and ships verbatim from D5. Date guidance uses
 * the locale's {date_format}; no hardcoded example date exists anywhere
 * (D6 6.4). All authored strings carry zero em/en dashes.
 */

export interface S8Strings {
  /** The loud, unmissable mock banner (C3, D10 10.8). */
  "s8.mockBanner": string;

  "s8.stepOf": string;
  "s8.step1Title": string;
  "s8.step2Title": string;
  "s8.step3Title": string;
  "s8.step4Title": string;

  /* ---- step 1: about the person who passed away --------------------- */
  "s8.f.theirName": string;
  "s8.why.theirName": string;
  "s8.f.sex": string;
  "s8.why.sex": string;
  "s8.opt.male": string;
  "s8.opt.female": string;
  "s8.opt.other": string;
  "s8.f.age": string;
  "s8.why.age": string;
  "s8.f.theirId": string;
  "s8.why.theirId": string;

  /* ---- step 2: about the death --------------------------------------- */
  "s8.f.dateOfDeath": string;
  "s8.why.dateOfDeath": string;
  "s8.f.placeKind": string;
  "s8.why.placeKind": string;
  "s8.opt.hospital": string;
  "s8.opt.home": string;
  "s8.opt.elsewhere": string;
  "s8.f.placeName": string;
  "s8.why.placeName": string;
  "s8.f.district": string;
  "s8.why.district": string;
  "s8.districtPlaceholder": string;
  /** Appendix A's relationship select opens with no default selection. */
  "s8.relationshipPlaceholder": string;

  /* ---- step 3: about you ---------------------------------------------- */
  "s8.f.yourName": string;
  "s8.why.yourName": string;
  "s8.f.relationship": string;
  "s8.why.relationship": string;
  "s8.rel.spouse": string;
  "s8.rel.son": string;
  "s8.rel.daughter": string;
  "s8.rel.parent": string;
  "s8.rel.other": string;
  "s8.f.yourAddress": string;
  "s8.why.yourAddress": string;
  "s8.f.yourPhone": string;
  "s8.why.yourPhone": string;

  /* ---- pre-fill badges (both editable, edits win) ---------------------- */
  "s8.prefillWallet": string;
  "s8.prefillAnswers": string;

  /* ---- navigation and cancel ------------------------------------------- */
  "s8.next": string;
  "s8.back": string;
  "s8.submit": string;
  "s8.cancel": string;
  "s8.cancelTitle": string;
  "s8.cancelKeep": string;
  "s8.cancelDiscard": string;

  /* ---- validation, on blur, guidance phrasing --------------------------- */
  "s8.v.required": string;
  "s8.v.nameLen": string;
  "s8.v.age": string;
  "s8.v.phone": string;
  "s8.v.addressLen": string;
  "s8.v.dateFuture": string;
  "s8.v.dateOld": string;
  "s8.v.dateExample": string;
  "s8.errorE16": string;
  "s8.errorSummary": string;
  "s8.errorSummaryOne": string;
  /** Optional deceased ID field: over the 20-character maximum. */
  "s8.v.idLen": string;

  /* ---- submit window ----------------------------------------------------- */
  "s8.submitting": string;
  /**
   * Per-field dictation. Error notes carry D5-verbatim wording (E-02,
   * E-04, E-05) under S8 keys so the screen stays self-contained; the
   * separator review stays with the copy owner (BUG-004).
   */
  "s8.voiceStop": string;
  "s8.voiceEmpty": string;
  "s8.voiceFailed": string;
  "s8.voiceDenied": string;
  "s8.voiceUnavailable": string;
  /** E-17 verbatim: the auto-add cannot write the wallet. */
  "s8.storageError": string;

  /* ---- result screen ------------------------------------------------------ */
  "s8.doneHeading": string;
  "s8.ackLabel": string;
  "s8.ackNote": string;
  "s8.resultNextTitle": string;
  "s8.resultNextBody": string;
  "s8.resultKeepTitle": string;
  "s8.resultKeepBody": string;
  "s8.autoAdd": string;
  "s8.viewWallet": string;
  "s8.backToTask": string;
  /** D6 6.2 result announcement, verbatim pattern. */
  "s8.announceDone": string;

  /** Voice input affordance per field. */
  "s8.voiceLabel": string;
}

export const enS8: S8Strings = {
  "s8.mockBanner": "Practice mode. Nothing is submitted to any government system.",

  "s8.stepOf": "Step {s} of 4",
  "s8.step1Title": "About the person who passed away",
  "s8.step2Title": "About the death",
  "s8.step3Title": "About you",
  "s8.step4Title": "Review and submit",

  "s8.f.theirName": "Their full name",
  "s8.why.theirName": "The certificate must match their records exactly.",
  "s8.f.sex": "Sex",
  "s8.why.sex": "Registration records ask for this.",
  "s8.opt.male": "Male",
  "s8.opt.female": "Female",
  "s8.opt.other": "Other",
  "s8.f.age": "Age when they passed away",
  "s8.why.age": "Used to check the medical record matches.",
  "s8.f.theirId": "Their ID number (optional)",
  "s8.why.theirId": "Optional here. The real office may ask for ID.",

  "s8.f.dateOfDeath": "Date of death",
  "s8.why.dateOfDeath": "Sets which office and deadline apply.",
  "s8.f.placeKind": "Where did it happen",
  "s8.why.placeKind": "Decides who reports it.",
  "s8.opt.hospital": "Hospital",
  "s8.opt.home": "At home",
  "s8.opt.elsewhere": "Somewhere else",
  "s8.f.placeName": "Name of the hospital or place",
  "s8.why.placeName": "Goes on the record.",
  "s8.f.district": "District and registration office",
  "s8.why.district": "Each district has its own registrar.",
  "s8.districtPlaceholder": "Choose a district",
  "s8.relationshipPlaceholder": "Choose your relationship",

  "s8.f.yourName": "Your full name",
  "s8.why.yourName": "You are the person reporting.",
  "s8.f.relationship": "Your relationship to them",
  "s8.why.relationship": "Decides what proof you'll need later.",
  "s8.rel.spouse": "Spouse",
  "s8.rel.son": "Son",
  "s8.rel.daughter": "Daughter",
  "s8.rel.parent": "Parent",
  "s8.rel.other": "Other",
  "s8.f.yourAddress": "Your address",
  "s8.why.yourAddress": "The certificate is delivered here.",
  "s8.f.yourPhone": "Your phone number (optional)",
  "s8.why.yourPhone": "The office may call about the certificate.",

  "s8.prefillWallet": "filled from your documents",
  "s8.prefillAnswers": "filled from your answers",

  "s8.next": "Next",
  "s8.back": "Back",
  "s8.submit": "Submit (practice)",
  "s8.cancel": "Cancel",
  "s8.cancelTitle": "Stop this practice form?",
  "s8.cancelKeep": "Keep my draft",
  "s8.cancelDiscard": "Discard the draft",

  "s8.v.required": "Please fill this in to continue.",
  "s8.v.nameLen": "Between 2 and 100 characters, please.",
  "s8.v.age": "A number between 0 and 120, please.",
  "s8.v.phone": "10 digits, please, or leave it empty.",
  "s8.v.addressLen": "Between 10 and 200 characters, please.",
  "s8.v.dateFuture": "Dates can't be in the future.",
  "s8.v.dateOld": "Older than a year needs a magistrate order. Ask at the office.",
  "s8.v.dateExample": "Dates are written like {example}.",
  "s8.errorE16":
    "This looks like a real ID number. Never enter real ID numbers here — this is a practice tool.",
  "s8.errorSummary": "{count} things need a look",
  "s8.errorSummaryOne": "1 thing needs a look",
  "s8.v.idLen": "Up to 20 characters, please.",

  "s8.submitting": "Submitting your practice form…",
  "s8.voiceStop": "Stop",
  "s8.voiceEmpty": "We didn't hear anything. Try again.",
  "s8.voiceFailed": "We couldn't turn that into text. Try once more.",
  "s8.voiceDenied": "Typing works just as well.",
  "s8.voiceUnavailable": "Speech isn't available in this browser. You can type your answer.",
  "s8.storageError":
    "Your device storage for this app is full. Remove a document to add another.",

  "s8.doneHeading": "Done",
  "s8.ackLabel": "Practice number",
  "s8.ackNote": "PRACTICE- numbers are not real references.",
  "s8.resultNextTitle": "What happens next in the real world",
  "s8.resultNextBody":
    "The registrar checks the details and issues the certificate. The office tells you when it is ready.",
  "s8.resultKeepTitle": "What to keep",
  "s8.resultKeepBody":
    "Keep your acknowledgement and the documents you used. The office may ask for them.",
  "s8.autoAdd": "A practice Death Certificate has been added to your documents",
  "s8.viewWallet": "View in wallet",
  "s8.backToTask": "Back to the task",
  "s8.announceDone": "Done. Practice number {ack}.",

  "s8.voiceLabel": "Speak the answer",
};

export const hiS8: S8Strings = {
  "s8.mockBanner": "अभ्यास मोड। किसी सरकारी सिस्टम में कुछ भी नहीं भेजा जाता।",

  "s8.stepOf": "चरण {s} / 4",
  "s8.step1Title": "जिनका देहांत हुआ, उनके बारे में",
  "s8.step2Title": "मृत्यु के बारे में",
  "s8.step3Title": "आपके बारे में",
  "s8.step4Title": "जाँचें और भेजें",

  "s8.f.theirName": "उनका पूरा नाम",
  "s8.why.theirName": "प्रमाणपत्र पर उनके रिकॉर्ड से बिल्कुल मेल होना चाहिए।",
  "s8.f.sex": "लिंग",
  "s8.why.sex": "रजिस्ट्रेशन रिकॉर्ड यह पूछते हैं।",
  "s8.opt.male": "पुरुष",
  "s8.opt.female": "महिला",
  "s8.opt.other": "अन्य",
  "s8.f.age": "देहांत के समय उम्र",
  "s8.why.age": "मेडिकल रिकॉर्ड से मिलान करने के लिए।",
  "s8.f.theirId": "उनका आईडी नंबर (वैकल्पिक)",
  "s8.why.theirId": "यहाँ ज़रूरी नहीं। असली दफ़्तर आईडी माँग सकता है।",

  "s8.f.dateOfDeath": "मृत्यु की तारीख",
  "s8.why.dateOfDeath": "इससे तय होता है कि कौन सा दफ़्तर और समय-सीमा लागू होगी।",
  "s8.f.placeKind": "यह कहाँ हुआ",
  "s8.why.placeKind": "इससे तय होता है कि सूचना कौन देगा।",
  "s8.opt.hospital": "अस्पताल",
  "s8.opt.home": "घर पर",
  "s8.opt.elsewhere": "कहीं और",
  "s8.f.placeName": "अस्पताल या जगह का नाम",
  "s8.why.placeName": "रिकॉर्ड में दर्ज होता है।",
  "s8.f.district": "ज़िला और रजिस्ट्रेशन दफ़्तर",
  "s8.why.district": "हर ज़िले का अपना रजिस्ट्रार होता है।",
  "s8.districtPlaceholder": "ज़िला चुनें",
  "s8.relationshipPlaceholder": "अपना रिश्ता चुनें",

  "s8.f.yourName": "आपका पूरा नाम",
  "s8.why.yourName": "आप ही सूचना दे रहे हैं।",
  "s8.f.relationship": "उनसे आपका रिश्ता",
  "s8.why.relationship": "इससे तय होता है कि आगे कौन सा प्रमाण चाहिए।",
  "s8.rel.spouse": "जीवनसाथी",
  "s8.rel.son": "बेटा",
  "s8.rel.daughter": "बेटी",
  "s8.rel.parent": "माता-पिता",
  "s8.rel.other": "अन्य",
  "s8.f.yourAddress": "आपका पता",
  "s8.why.yourAddress": "प्रमाणपत्र यहीं भेजा जाएगा।",
  "s8.f.yourPhone": "आपका फ़ोन नंबर (वैकल्पिक)",
  "s8.why.yourPhone": "दफ़्तर प्रमाणपत्र के बारे में फ़ोन कर सकता है।",

  "s8.prefillWallet": "आपके दस्तावेज़ों से भरा गया",
  "s8.prefillAnswers": "आपके जवाबों से भरा गया",

  "s8.next": "आगे",
  "s8.back": "पीछे",
  "s8.submit": "भेजें (अभ्यास)",
  "s8.cancel": "रद्द करें",
  "s8.cancelTitle": "यह अभ्यास फॉर्म रोकें?",
  "s8.cancelKeep": "मेरा ड्राफ़्ट रखें",
  "s8.cancelDiscard": "ड्राफ़्ट हटा दें",

  "s8.v.required": "आगे बढ़ने के लिए कृपया यह भरें।",
  "s8.v.nameLen": "कृपया 2 से 100 अक्षरों के बीच लिखें।",
  "s8.v.age": "कृपया 0 से 120 के बीच कोई संख्या लिखें।",
  "s8.v.phone": "कृपया 10 अंक लिखें, या खाली छोड़ दें।",
  "s8.v.addressLen": "कृपया 10 से 200 अक्षरों के बीच लिखें।",
  "s8.v.dateFuture": "तारीख आज से आगे नहीं हो सकती।",
  "s8.v.dateOld": "एक साल से पुरानी मृत्यु के लिए मजिस्ट्रेट का आदेश चाहिए। दफ़्तर से पूछें।",
  "s8.v.dateExample": "तारीखें ऐसे लिखी जाती हैं: {example}।",
  "s8.errorE16":
    "यह किसी असली आईडी नंबर जैसा दिखता है। यहाँ असली आईडी नंबर कभी न डालें — यह एक अभ्यास टूल है।",
  "s8.errorSummary": "{count} चीज़ें देखनी हैं",
  "s8.errorSummaryOne": "1 चीज़ देखनी है",
  "s8.v.idLen": "कृपया 20 या उससे कम अक्षर लिखें।",

  "s8.submitting": "आपका अभ्यास फॉर्म भेजा जा रहा है…",
  "s8.voiceStop": "रोकें",
  "s8.voiceEmpty": "हमें कुछ नहीं सुनाई दिया। फिर से कोशिश करें।",
  "s8.voiceFailed": "हम उसे टेक्स्ट में नहीं बदल सके। एक बार फिर कोशिश करें।",
  "s8.voiceDenied": "टाइप करना भी उतना ही अच्छा रहता है।",
  "s8.voiceUnavailable": "इस ब्राउज़र में बोलने की सुविधा नहीं है। आप जवाब टाइप कर सकते हैं।",
  "s8.storageError":
    "इस ऐप के लिए आपके डिवाइस की स्टोरेज भर गई है। दूसरा दस्तावेज़ जोड़ने के लिए एक हटाएँ।",

  "s8.doneHeading": "हो गया",
  "s8.ackLabel": "अभ्यास नंबर",
  "s8.ackNote": "PRACTICE- नंबर असली संदर्भ नहीं हैं।",
  "s8.resultNextTitle": "असल दुनिया में आगे क्या होता है",
  "s8.resultNextBody":
    "रजिस्ट्रार जानकारी जाँचकर प्रमाणपत्र बनाता है। दफ़्तर बताता है कि वह कब तैयार होगा।",
  "s8.resultKeepTitle": "क्या संभाल कर रखें",
  "s8.resultKeepBody":
    "अपनी पावती और इस्तेमाल किए दस्तावेज़ रख लें। दफ़्तर उन्हें माँग सकता है।",
  "s8.autoAdd": "एक अभ्यास मृत्यु प्रमाणपत्र आपके दस्तावेज़ों में जोड़ दिया गया है",
  "s8.viewWallet": "वॉलेट में देखें",
  "s8.backToTask": "काम पर वापस जाएँ",
  "s8.announceDone": "हो गया। अभ्यास नंबर {ack}।",

  "s8.voiceLabel": "जवाब बोलें",
};
