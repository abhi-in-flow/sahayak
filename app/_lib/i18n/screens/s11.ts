/**
 * S11 string namespace ("What's real and what's mocked here").
 * OWNERSHIP: the S10+S11 workstream. Key prefix "s11.".
 *
 * The nine rows ship the D3 S11 copy; dash characters in canonical
 * copy are rewritten per D11 §1 (the separator review stays with
 * BUG-004). Status chips are a local fact-status set, not StatusChip.
 */

export interface S11Strings {
  "s11.title": string;
  "s11.back": string;

  /* ---- rows: label, status chip, note -------------------------------- */
  "s11.row1.label": string;
  "s11.row1.note": string;
  "s11.row2.label": string;
  "s11.row2.note": string;
  "s11.row3.label": string;
  "s11.row3.note": string;
  "s11.row4.label": string;
  "s11.row4.note": string;
  "s11.row5.label": string;
  "s11.row5.note": string;
  "s11.row6.label": string;
  "s11.row6.note": string;
  "s11.row7.label": string;
  "s11.row7.note": string;
  "s11.row8.label": string;
  "s11.row8.note": string;
  "s11.row9.label": string;
  "s11.row9.note": string;

  /* ---- fact-status chip labels ---------------------------------------- */
  "s11.st.real": string;
  "s11.st.practice": string;
  "s11.st.sample": string;
  "s11.st.static": string;
  "s11.st.na": string;
}

export const enS11: S11Strings = {
  "s11.title": "What's real and what's mocked here",
  "s11.back": "Go back",

  "s11.row1.label": "Understanding your words (intent engine)",
  "s11.row1.note": "A live model interprets what you say",
  "s11.row2.label": "Voice-to-text",
  "s11.row2.note": "Runs while you speak",
  "s11.row3.label": "Government submissions",
  "s11.row3.note": "Nothing is ever sent to any government system",
  "s11.row4.label": "Acknowledgement numbers",
  "s11.row4.note": "PRACTICE- numbers are not real references",
  "s11.row5.label": "Login code (OTP)",
  "s11.row5.note": "Always 0000; no SMS is sent",
  "s11.row6.label": "Your documents",
  "s11.row6.note": "Sample data, on your device only. Never uploaded anywhere",
  "s11.row7.label": "Office addresses and helplines",
  "s11.row7.note": "Source and verification date shown on each",
  "s11.row8.label": "Fees and timelines",
  "s11.row8.note": "From official sources, dated",
  "s11.row9.label": "Payments",
  "s11.row9.note": "Fees are paid on official sites only",

  "s11.st.real": "Real",
  "s11.st.practice": "Practice only",
  "s11.st.sample": "Sample data",
  "s11.st.static": "Real, static",
  "s11.st.na": "Not handled",
};

export const hiS11: S11Strings = {
  "s11.title": "यहाँ क्या असली है और क्या नकली",
  "s11.back": "वापस जाएँ",

  "s11.row1.label": "आपकी बात समझना (इंटेंट इंजन)",
  "s11.row1.note": "आप जो कहते हैं, उसे एक जीवंत मॉडल समझता है",
  "s11.row2.label": "आवाज़ से टेक्स्ट",
  "s11.row2.note": "आपके बोलते समय चलता है",
  "s11.row3.label": "सरकारी सिस्टम में भेजना",
  "s11.row3.note": "किसी सरकारी सिस्टम में कभी कुछ नहीं भेजा जाता",
  "s11.row4.label": "पावती नंबर",
  "s11.row4.note": "PRACTICE- नंबर असली संदर्भ नहीं हैं",
  "s11.row5.label": "लॉगिन कोड (ओटीपी)",
  "s11.row5.note": "हमेशा 0000; कोई एसएमएस नहीं जाता",
  "s11.row6.label": "आपके दस्तावेज़",
  "s11.row6.note": "नमूना डेटा, सिर्फ़ आपके डिवाइस पर। कहीं अपलोड नहीं होते",
  "s11.row7.label": "दफ़्तर के पते और हेल्पलाइन",
  "s11.row7.note": "हर एक का स्रोत और जाँच की तारीख दी गई है",
  "s11.row8.label": "शुल्क और समय-सीमा",
  "s11.row8.note": "सरकारी स्रोतों से, तारीख के साथ",
  "s11.row9.label": "भुगतान",
  "s11.row9.note": "शुल्क सिर्फ़ सरकारी साइटों पर जमा होता है",

  "s11.st.real": "असली",
  "s11.st.practice": "सिर्फ़ अभ्यास",
  "s11.st.sample": "नमूना डेटा",
  "s11.st.static": "असली, स्थिर",
  "s11.st.na": "शामिल नहीं",
};
