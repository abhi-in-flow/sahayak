/**
 * S2 / S2b string namespace. OWNERSHIP: the capture screens (S2 voice,
 * S2b text fallback). This file is owned by the capture-screen work;
 * no other file may edit it.
 *
 * Key prefix "s2." (used by both S2 and S2b). Error strings that mirror
 * D5 codes (E-02, E-04, E-06, E-07, E-08, E-16 and the E-04x2 / E-05
 * route note) match D5 5.1 verbatim, including the dash characters D5
 * uses: canonical D5 copy ships as-is and the separator review is
 * BUG-004, owned by the copy owner. Every string authored new for this
 * screen (labels, helpers, a11y announcements, primer copy) uses no
 * em/en dashes.
 *
 * hi is placeholder pending professional translation. Complete, not
 * correct. See BUG-008. Must satisfy S2Strings exactly
 * (compile-enforced).
 */

export interface S2Strings {
  /* ---- shared: headline, language pill, example chips -------------- */
  "s2.headline": string;
  "s2.languageChange": string;
  "s2.example1": string;
  "s2.example2": string;
  "s2.example3": string;

  /* ---- S2: mic capture (D3 S2 gesture rule P2-4) -------------------- */
  "s2.micIdle": string;
  "s2.micTapStop": string;
  "s2.micHoldStop": string;
  "s2.stop": string;

  /* ---- shared: transcript field and actions ------------------------- */
  "s2.fieldLabel": string;
  "s2.lowConfidence": string;
  "s2.confirm": string;
  "s2.confirmEmptyReason": string;
  "s2.rerecord": string;
  "s2.typeInstead": string;
  "s2.replaceAsk": string;
  "s2.replaceYes": string;
  "s2.replaceNo": string;
  "s2.tryAgain": string;

  /* ---- errors, mirroring D5 5.1 verbatim ---------------------------- */
  "s2.errorE02": string;
  "s2.errorE04": string;
  "s2.noteTyping": string;
  "s2.errorE06": string;
  "s2.errorE07": string;
  "s2.errorE08": string;
  "s2.errorE16": string;

  /* ---- S2b text fallback -------------------------------------------- */
  "s2.speakInstead": string;
  "s2.submit": string;
  "s2.guidance": string;

  /* ---- S2 permission primer (D3 S2 edge case, decision D2) ---------- */
  "s2.primerTitle": string;
  "s2.primerBody": string;
  "s2.primerContinue": string;
  "s2.primerClose": string;

  /* ---- S2 live-region announcements (D6 6.2) ------------------------ */
  "s2.a11yStarted": string;
  "s2.a11yStopped": string;
}

export const enS2: S2Strings = {
  "s2.headline": "Tell us what happened.",
  "s2.languageChange": "Change language",
  "s2.example1": "My father passed away last month",
  "s2.example2": "I need to claim my husband's pension",
  "s2.example3": "We need the death certificate",

  "s2.micIdle": "Speak your problem",
  "s2.micTapStop": "Tap to stop",
  "s2.micHoldStop": "Release to stop",
  "s2.stop": "Stop",

  "s2.fieldLabel": "Your words",
  "s2.lowConfidence": "Did we hear this right? You can fix it.",
  "s2.confirm": "Yes, that's right",
  "s2.confirmEmptyReason": "Say or type something first",
  "s2.rerecord": "Say it again",
  "s2.typeInstead": "Type instead",
  "s2.replaceAsk": "Replace what you wrote?",
  "s2.replaceYes": "Replace",
  "s2.replaceNo": "Keep",
  "s2.tryAgain": "Try again",

  "s2.errorE02": "We didn't hear anything. Try again.",
  "s2.errorE04": "We couldn't turn that into text. Try once more.",
  "s2.noteTyping": "Typing works just as well.",
  "s2.errorE06":
    "Microphone access was turned off. Your words so far are saved. Turn it back on in your browser settings to keep speaking.",
  "s2.errorE07": "We paused when you left. What you said is saved.",
  "s2.errorE08": "Say or type something first — a few words are enough.",
  "s2.errorE16":
    "This looks like a real ID number. Never enter real ID numbers here — this is a practice tool.",

  "s2.speakInstead": "Speak instead",
  "s2.submit": "That's my situation",
  "s2.guidance": "A sentence or two is enough.",

  "s2.primerTitle": "About the microphone",
  "s2.primerBody": "We use the mic only to hear your question. Nothing is recorded after.",
  "s2.primerContinue": "Continue",
  "s2.primerClose": "Close",

  "s2.a11yStarted": "Listening.",
  "s2.a11yStopped": "Stopped listening.",
};

// Placeholder pending professional translation. Complete, not correct.
// See BUG-008. Must satisfy S2Strings exactly (compile-enforced).
export const hiS2: S2Strings = {
  "s2.headline": "बताइए क्या हुआ।",
  "s2.languageChange": "भाषा बदलें",
  "s2.example1": "मेरे पिता का पिछले महीने निधन हो गया",
  "s2.example2": "मुझे अपने पति की पेंशन का दावा करना है",
  "s2.example3": "हमें मृत्यु प्रमाणपत्र चाहिए",

  "s2.micIdle": "अपनी समस्या बोलिए",
  "s2.micTapStop": "रोकने के लिए टैप करें",
  "s2.micHoldStop": "रोकने के लिए छोड़ें",
  "s2.stop": "रोकें",

  "s2.fieldLabel": "आपके शब्द",
  "s2.lowConfidence": "क्या हमने आपकी बात ठीक से सुनी? आप इसे ठीक कर सकते हैं।",
  "s2.confirm": "हाँ, यही सही है",
  "s2.confirmEmptyReason": "पहले कुछ बोलिए या टाइप करें",
  "s2.rerecord": "फिर से बोलिए",
  "s2.typeInstead": "टाइप करें",
  "s2.replaceAsk": "जो आपने लिखा है उसे बदल दें?",
  "s2.replaceYes": "बदलें",
  "s2.replaceNo": "रखें",
  "s2.tryAgain": "फिर कोशिश करें",

  "s2.errorE02": "हमें कुछ नहीं सुनाई दिया। फिर से कोशिश करें।",
  "s2.errorE04": "हम उसे टेक्स्ट में नहीं बदल सके। एक बार फिर कोशिश करें।",
  "s2.noteTyping": "टाइप करना भी उतना ही अच्छा रहता है।",
  "s2.errorE06":
    "माइक्रोफ़ोन की अनुमति बंद कर दी गई थी। आपके बोले गए शब्द सुरक्षित हैं। बोलना जारी रखने के लिए इसे ब्राउज़र सेटिंग्स में दोबारा चालू करें।",
  "s2.errorE07": "जब आप गए थे तब हमने रोक दिया था। आपने जो कहा वह सुरक्षित है।",
  "s2.errorE08": "पहले कुछ बोलिए या टाइप करें — कुछ शब्द ही काफी हैं।",
  "s2.errorE16":
    "यह किसी असली आईडी नंबर जैसा दिखता है। यहाँ असली आईडी नंबर कभी न डालें — यह एक अभ्यास टूल है।",

  "s2.speakInstead": "बोलकर बताएँ",
  "s2.submit": "यही मेरी स्थिति है",
  "s2.guidance": "एक या दो वाक्य काफी हैं।",

  "s2.primerTitle": "माइक्रोफ़ोन के बारे में",
  "s2.primerBody": "हम माइक से सिर्फ़ आपका सवाल सुनते हैं। इसके बाद कुछ भी रिकॉर्ड नहीं होता।",
  "s2.primerContinue": "आगे बढ़ें",
  "s2.primerClose": "बंद करें",

  "s2.a11yStarted": "सुन रहे हैं।",
  "s2.a11yStopped": "सुनना बंद कर दिया।",
};
