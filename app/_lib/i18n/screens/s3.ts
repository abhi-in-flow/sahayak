/**
 * S3 / S3e string namespace. OWNERSHIP: the clarification screens.
 * Key prefix "s3." (S3 loop and S3e fallback). Question pool option
 * labels live here; the engine in _lib/journey/compute.ts is
 * string-free and returns ids only, so every option id below matches
 * QUESTIONS in that file exactly.
 *
 * Canonical D3/D5 copy ships VERBATIM, including its long dashes: the
 * separator review is BUG-004, owned by the copy owner, and D11 1
 * explicitly carves canonical copy out of the no-dash rule. Strings
 * THIS file authors carry no em/en dashes (the Hindi renderings of
 * dashed canonical sentences use sentence breaks instead).
 *
 * Hindi is placeholder-quality pending professional translation
 * (BUG-008): complete rather than correct.
 */

export interface S3Strings {
  /* ---- S3 loop chrome ---------------------------------------------- */
  /** Interpolates {n} and {total}. D3 S3: "Question {n} of {expected}". */
  "s3.progress": string;
  "s3.back": string;
  /** Speaker control that replays the question audio (A5, both modes). */
  "s3.speaker": string;
  "s3.notSure": string;
  /** sr-only label for the thinking dots (D3 S3 Loading; D11 4). */
  "s3.thinking": string;
  /** Q4 multi-select submit (D3 S3 Validation). */
  "s3.next": string;
  /** Visible reason under the disabled Next control, never a silent grey. */
  "s3.nextHint": string;

  /* ---- voice answer -------------------------------------------------- */
  "s3.micIdle": string;
  /** D3 S2 gesture rule (P2-4) labels, reused on S3's mic. */
  "s3.micTapStop": string;
  "s3.micHoldStop": string;
  /** D3 S3: the one "Did you mean..." re-render prompt. */
  "s3.didYouMean": string;
  /** D5 5.1 E-09 verbatim. */
  "s3.e09": string;

  /* ---- E-03 retry card (D5 5.1 verbatim) ----------------------------- */
  "s3.e03.message": string;
  "s3.e03.retry": string;
  "s3.e03.browse": string;

  /* ---- question texts (<= 15 words, D3 S3) --------------------------- */
  "s3.q.registered": string;
  "s3.q.state": string;
  "s3.q.work": string;
  "s3.q.assets": string;
  "s3.q.relationship": string;

  /* ---- option labels; ids match compute.ts QUESTIONS exactly --------- */
  "s3.opt.registered.yes": string;
  "s3.opt.registered.no": string;
  "s3.opt.state.assam": string;
  "s3.opt.state.maharashtra": string;
  "s3.opt.state.karnataka": string;
  /** Q2's honesty exit; opens the coverage sheet (not an answer). */
  "s3.opt.state.absent": string;
  "s3.opt.work.company": string;
  "s3.opt.work.retired": string;
  "s3.opt.work.self": string;
  "s3.opt.assets.bank": string;
  "s3.opt.assets.house": string;
  "s3.opt.assets.land": string;
  "s3.opt.assets.none": string;
  "s3.opt.relationship.son": string;
  "s3.opt.relationship.daughter": string;
  "s3.opt.relationship.spouse": string;
  "s3.opt.relationship.other": string;

  /* ---- Q2 coverage sheet (canonical D3 S3 edge-case copy) ------------ */
  "s3.state.caption": string;
  "s3.sheet.body": string;
  "s3.sheet.help": string;
  "s3.sheet.goBack": string;
  "s3.sheet.close": string;

  /* ---- S3e: Not Understood / Human Fallback (canonical D3 S3e) ------- */
  "s3.unresolved.headline": string;
  "s3.unresolved.heard": string;
  "s3.unresolved.startOver": string;
  "s3.unresolved.browse": string;
  "s3.unresolved.person": string;
  /** Browse card anatomy (D3 S3e): title, "{n} steps", "See the steps".
   *  The departments count is omitted while the roster cannot compute it
   *  (BUG-009). */
  "s3.unresolved.seeSteps": string;
  "s3.unresolved.steps": string;
  "s3.unresolved.b1": string;
  "s3.unresolved.b2": string;
  "s3.unresolved.b3": string;
  "s3.unresolved.b4": string;
  "s3.unresolved.b5": string;
  "s3.unresolved.b6": string;
}

export const enS3: S3Strings = {
  "s3.progress": "Question {n} of {total}",
  "s3.back": "Back",
  "s3.speaker": "Hear this question again",
  "s3.notSure": "I'm not sure",
  "s3.thinking": "Thinking",
  "s3.next": "Next",
  "s3.nextHint": "Choose at least one to continue.",

  "s3.micIdle": "Answer with your voice",
  "s3.micTapStop": "Tap to stop",
  "s3.micHoldStop": "Release to stop",
  "s3.didYouMean": "Did you mean…",
  "s3.e09": "Tap the closest one.",

  "s3.e03.message": "This is taking longer than usual.",
  "s3.e03.retry": "Try again",
  "s3.e03.browse": "Browse common situations instead",

  "s3.q.registered": "Has the death been registered yet?",
  "s3.q.state": "Which state did they live in?",
  "s3.q.work": "What kind of work did they do?",
  "s3.q.assets": "Which of these were in their name? Choose all that apply.",
  "s3.q.relationship": "How are you related to them?",

  "s3.opt.registered.yes": "Yes",
  "s3.opt.registered.no": "No",
  "s3.opt.state.assam": "Assam",
  "s3.opt.state.maharashtra": "Maharashtra",
  "s3.opt.state.karnataka": "Karnataka",
  "s3.opt.state.absent": "My state isn't here",
  "s3.opt.work.company": "Worked at a company",
  "s3.opt.work.retired": "Was retired",
  "s3.opt.work.self": "Worked for themselves",
  "s3.opt.assets.bank": "Bank account",
  "s3.opt.assets.house": "House",
  "s3.opt.assets.land": "Land",
  "s3.opt.assets.none": "None of these",
  "s3.opt.relationship.son": "Son",
  "s3.opt.relationship.daughter": "Daughter",
  "s3.opt.relationship.spouse": "Husband or wife",
  "s3.opt.relationship.other": "Other relative",

  // Canonical D3 copy verbatim; the long dash is the spec's own (BUG-004).
  "s3.state.caption": "More states coming — for now we cover Assam and Maharashtra.",
  "s3.sheet.body":
    "We only cover Assam and Maharashtra right now. We can still show you who to contact.",
  "s3.sheet.help": "Where to get help",
  "s3.sheet.goBack": "Go back",
  "s3.sheet.close": "Close",

  "s3.unresolved.headline": "We couldn't work out exactly what you need.",
  "s3.unresolved.heard": "Here's what we heard:",
  "s3.unresolved.startOver": "Start over with different words",
  "s3.unresolved.browse": "Browse common situations",
  "s3.unresolved.person": "Talk to a person",
  "s3.unresolved.seeSteps": "See the steps",
  "s3.unresolved.steps": "{n} steps",
  // B1-B6 titles verbatim from the D3 S3e browse table.
  "s3.unresolved.b1": "My husband or wife passed away — they worked at a company",
  "s3.unresolved.b2": "My husband or wife passed away — they were retired",
  "s3.unresolved.b3": "My parent passed away — they owned land or a house",
  "s3.unresolved.b4": "My parent passed away — they worked for themselves",
  "s3.unresolved.b5": "Someone in my family passed away — I just need the death certificate",
  "s3.unresolved.b6": "I'm not sure — show me everything",
};

// Placeholder pending professional translation. Complete, not correct.
// See BUG-008. Must satisfy S3Strings exactly (compile-enforced).
// Authored strings here carry no em/en dashes: canonical sentences that
// ship with one in English are broken into sentences in Hindi.
export const hiS3: S3Strings = {
  "s3.progress": "प्रश्न {total} में से {n}",
  "s3.back": "वापस",
  "s3.speaker": "यह प्रश्न फिर से सुनिए",
  "s3.notSure": "मुझे यकीन नहीं है",
  "s3.thinking": "सोच रहे हैं",
  "s3.next": "आगे बढ़ें",
  "s3.nextHint": "जारी रखने के लिए कम से कम एक चुनें।",

  "s3.micIdle": "आवाज़ में जवाब दें",
  "s3.micTapStop": "रोकने के लिए टैप करें",
  "s3.micHoldStop": "रोकने के लिए छोड़ें",
  "s3.didYouMean": "क्या आपका मतलब इनमें से किसी से था?",
  "s3.e09": "सबसे नज़दीकी विकल्प चुनें।",

  "s3.e03.message": "इसमें आम से ज़्यादा समय लग रहा है।",
  "s3.e03.retry": "फिर कोशिश करें",
  "s3.e03.browse": "इसके बजाय आम स्थितियाँ देखें",

  "s3.q.registered": "क्या मृत्यु दर्ज कराई जा चुकी है?",
  "s3.q.state": "वे किस राज्य में रहते थे?",
  "s3.q.work": "वे किस तरह का काम करते थे?",
  "s3.q.assets": "इनमें से क्या उनके नाम पर था? जो लागू हों सब चुनें।",
  "s3.q.relationship": "आप उनके क्या लगते हैं?",

  "s3.opt.registered.yes": "हाँ",
  "s3.opt.registered.no": "नहीं",
  "s3.opt.state.assam": "असम",
  "s3.opt.state.maharashtra": "महाराष्ट्र",
  "s3.opt.state.karnataka": "कर्नाटक",
  "s3.opt.state.absent": "मेरा राज्य यहाँ नहीं है",
  "s3.opt.work.company": "कंपनी में काम करते थे",
  "s3.opt.work.retired": "सेवानिवृत्त थे",
  "s3.opt.work.self": "अपना काम स्वयं करते थे",
  "s3.opt.assets.bank": "बैंक खाता",
  "s3.opt.assets.house": "मकान",
  "s3.opt.assets.land": "ज़मीन",
  "s3.opt.assets.none": "इनमें से कुछ नहीं",
  "s3.opt.relationship.son": "बेटा",
  "s3.opt.relationship.daughter": "बेटी",
  "s3.opt.relationship.spouse": "पति या पत्नी",
  "s3.opt.relationship.other": "कोई और रिश्तेदार",

  "s3.state.caption": "और राज्य आ रहे हैं। फिलहाल हम असम और महाराष्ट्र दोनों को कवर करते हैं।",
  "s3.sheet.body":
    "फिलहाल हम केवल असम और महाराष्ट्र को कवर करते हैं। फिर भी हम बता सकते हैं कि आप किससे संपर्क करें।",
  "s3.sheet.help": "कहाँ मदद मिलेगी",
  "s3.sheet.goBack": "वापस जाएँ",
  "s3.sheet.close": "बंद करें",

  "s3.unresolved.headline": "हमें यह ठीक-ठीक समझ नहीं आया कि आपको क्या चाहिए।",
  "s3.unresolved.heard": "हमने यह सुना था:",
  "s3.unresolved.startOver": "नए शब्दों के साथ फिर से शुरू करें",
  "s3.unresolved.browse": "आम स्थितियाँ देखें",
  "s3.unresolved.person": "किसी इंसान से बात करें",
  "s3.unresolved.seeSteps": "चरण देखिए",
  "s3.unresolved.steps": "{n} चरण",
  "s3.unresolved.b1": "मेरे पति या पत्नी का निधन हो गया, वे कंपनी में काम करते थे",
  "s3.unresolved.b2": "मेरे पति या पत्नी का निधन हो गया, वे सेवानिवृत्त थे",
  "s3.unresolved.b3": "मेरे माता या पिता का निधन हो गया, उनके नाम पर ज़मीन या मकान था",
  "s3.unresolved.b4": "मेरे माता या पिता का निधन हो गया, वे अपना काम स्वयं करते थे",
  "s3.unresolved.b5": "मेरे परिवार में किसी का निधन हुआ, मुझे बस मृत्यु प्रमाणपत्र चाहिए",
  "s3.unresolved.b6": "मुझे यकीन नहीं है, मुझे सब कुछ दिखाइए",
};
