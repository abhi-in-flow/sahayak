import type { BaseStrings } from "../types";

/**
 * Base strings: global chrome, S1, status chips and the two globally
 * mounted errors. Screen namespaces live in their own modules beside
 * this file; en.ts and hi.ts compose them.
 *
 * Where a string corresponds to a D5 code, D5 is the single source of
 * truth and the value here must match it, not the reverse (BUG-004 is
 * the known open review on separators; canonical D5 copy ships verbatim
 * until that review lands).
 */

export const enBase: BaseStrings = {
  "chrome.disclosure": "Independent project. Not a government website.",
  "chrome.whatsReal": "What's real and what's mocked",
  "chrome.skipToContent": "Skip to the main content",

  "s1.wordmark": "Sahayak",
  "s1.headline": "Tell us what happened, in your own words.",
  "s1.micCta": "Speak your problem",
  "s1.typeInstead": "Type instead",
  "s1.trustStrip": "We never ask for Aadhaar, PAN, OTP or payment.",
  "s1.continueTitle": "Continue where you left off",
  "s1.continueDescriptor": "{done} of {total} steps done",
  "s1.backToQuestion": "Back to your question",
  "s1.audioPreviewLabel": "Hear this language spoken",
  "s1.audioGreeting": "Hello, I am Sahayak. Tell me what happened.",
  "s1.noJsHeading": "The steps most people need",
  "s1.noJsIntro":
    "This list works without JavaScript. Each step links to the official government page for it.",

  "stub.title": "Not built yet",
  "stub.note":
    "This screen is specified in the next specification batch and has not been built.",
  "stub.back": "Go back",

  "status.doNow": "Do now",
  "status.locked": "Locked",
  "status.lockedNeeds": "needs {document}",
  "status.inProgress": "In progress",
  "status.done": "Done",
  "status.mayNotApply": "May not apply to you",
  "status.noLongerNeeded": "No longer needed",

  "error.E01": "Audio unavailable right now.",
  "error.O01":
    "You're offline. Reading works; practice submission and voice need a connection.",
  "offline.reconnected": "You're back online.",
};

export const hiBase: BaseStrings = {
  "chrome.disclosure": "स्वतंत्र परियोजना। यह सरकारी वेबसाइट नहीं है।",
  "chrome.whatsReal": "क्या असली है और क्या अभ्यास",
  "chrome.skipToContent": "मुख्य सामग्री पर जाएँ",

  "s1.wordmark": "सहायक",
  "s1.headline": "अपने शब्दों में बताइए कि क्या हुआ।",
  "s1.micCta": "अपनी समस्या बोलिए",
  "s1.typeInstead": "टाइप करें",
  "s1.trustStrip": "हम आधार, पैन, ओटीपी या भुगतान कभी नहीं माँगते।",
  "s1.continueTitle": "जहाँ छोड़ा था वहीं से जारी रखें",
  "s1.continueDescriptor": "{total} में से {done} चरण पूरे",
  "s1.backToQuestion": "अपने प्रश्न पर वापस जाएँ",
  "s1.audioPreviewLabel": "यह भाषा बोलकर सुनिए",
  "s1.audioGreeting": "नमस्ते! मैं सहायक हूँ। बताइए, क्या हुआ?",
  "s1.noJsHeading": "अधिकतर लोगों को जिन चरणों की ज़रूरत होती है",
  "s1.noJsIntro":
    "यह सूची बिना जावास्क्रिप्ट के काम करती है। हर चरण उसके आधिकारिक सरकारी पृष्ठ से जुड़ा है।",

  "stub.title": "अभी नहीं बना है",
  "stub.note": "यह स्क्रीन अगले विनिर्देश बैच में निर्दिष्ट है और अभी नहीं बनी है।",
  "stub.back": "वापस जाएँ",

  "status.doNow": "अभी करें",
  "status.locked": "बंद है",
  "status.lockedNeeds": "{document} की आवश्यकता है",
  "status.inProgress": "चल रहा है",
  "status.done": "पूरा हुआ",
  "status.mayNotApply": "आप पर लागू नहीं हो सकता",
  "status.noLongerNeeded": "अब आवश्यक नहीं",

  "error.E01": "ऑडियो अभी उपलब्ध नहीं है।",
  "error.O01":
    "आप ऑफ़लाइन हैं। पढ़ना काम करता है; अभ्यास सबमिशन और आवाज़ के लिए कनेक्शन चाहिए।",
  "offline.reconnected": "आप फिर से ऑनलाइन हैं।",
};
