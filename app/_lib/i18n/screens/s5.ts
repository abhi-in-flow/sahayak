/**
 * S5 string namespace. OWNERSHIP: the journey-map screen.
 * Key prefix "s5.".
 *
 * Canonical D3/D5 copy ships verbatim (including its dash characters;
 * the separator review is BUG-004, owned by the copy owner). Strings
 * authored here carry zero em/en dashes (D11 §1). One deliberate
 * deviation, ruled by D11 §1: D3's diff banner copy "{a} steps added,
 * {r} removed · See what changed" is split into two keys so the middle
 * dot never renders as a separator; the fragments are unchanged.
 */

export interface S5Strings {
  /** Header, D3 S5 verbatim. headingOne exists for n = 1, where the
   *  canonical "{n} things" template would render "1 things"; flagged
   *  for the copy owner with BUG-004's review. */
  "s5.heading": string;
  "s5.headingOne": string;
  /** Progress text that always accompanies the ring (DP-4), D3 verbatim. */
  "s5.progress": string;
  "s5.doFirst": string;
  /** C3 honesty chip. D10 10.8 renders it "Prototype - mock data"; the
   *  dash form is BUG-004's to settle. */
  "s5.honestyChip": string;
  "s5.honestySnapshot": string;

  /* ---- banner family (D11 §3) --------------------------------------- */
  /** D3 S5, verbatim. */
  "s5.manualBanner": string;
  "s5.manualChange": string;
  /** D3 fragment "{a} steps added, {r} removed" (separator dropped, D11 §1). */
  "s5.diff.summary": string;
  "s5.diff.seeChanged": string;
  /** D3 expander formats, verbatim. */
  "s5.diff.added": string;
  "s5.diff.removed": string;
  /** Authored: the banner's dismiss control (D3 leaves the label open). */
  "s5.diff.dismiss": string;
  /** {reason} causes for the diff expander. */
  "s5.reason.registered": string;
  "s5.reason.generic": string;

  /* ---- task cards ---------------------------------------------------- */
  /** D3 S5 Disabled (offline), verbatim. */
  "s5.offlineSubmit": string;
  /** D3 S5 archived note, verbatim. */
  "s5.archivedNote": string;
  /** D3/D4 §4.4, verbatim. */
  "s5.preCompletedNote": string;
  /** Official snapshot URL, shown once (not also as the title). */
  "s5.openOfficial": string;
  "s5.remove": string;
  "s5.removeConfirm": string;

  /* ---- voice corridor (S5 mounts the rail; D10 10.9) ------------------ */
  /** Read-aloud control for the whole checklist. Playback drives the
   *  rail's speaking state; E-01 failure reuses the base "error.E01". */
  "s5.listenPlan": string;
  /** The rail's "plan" segment detail; always the ProgressRing's own
   *  numbers, so the segment and the header count never disagree. */
  "s5.railDetail": string;

  /* ---- actions and states -------------------------------------------- */
  "s5.changeAnswers": string;
  "s5.askAgain": string;
  "s5.saveList": string;
  "s5.share": string;
  "s5.shareTitle": string;
  "s5.complete.title": string;
  "s5.complete.body": string;
  "s5.back": string;
  /** E-21, D5 verbatim. */
  "s5.notice.e21": string;
}

export const enS5: S5Strings = {
  "s5.heading": "{n} things to do",
  "s5.headingOne": "1 thing to do",
  "s5.progress": "{done} of {n} done",
  "s5.doFirst": "Do this first",
  "s5.honestyChip": "Prototype - mock data",
  "s5.honestySnapshot": "Steps from our saved directory. We do not submit anything.",

  "s5.manualBanner": "Based on a common situation — check it fits you",
  "s5.manualChange": "Change",
  "s5.diff.summary": "{added} steps added, {removed} removed",
  "s5.diff.seeChanged": "See what changed",
  "s5.diff.added": "+ {task} (added because {reason})",
  "s5.diff.removed": "– {task} (moved to 'No longer needed')",
  "s5.diff.dismiss": "Dismiss",
  "s5.reason.registered": "you told us about the registration",
  "s5.reason.generic": "of your answers",

  "s5.offlineSubmit": "Practice submission needs a connection",
  "s5.archivedNote": "Completed earlier — no longer part of your journey",
  "s5.preCompletedNote": "You told us this is already registered",
  "s5.openOfficial": "Open official page",
  "s5.remove": "Remove",
  "s5.removeConfirm": "Remove this step from your list?",

  "s5.listenPlan": "Listen to the plan",
  "s5.railDetail": "{done} of {n}",
  "s5.changeAnswers": "Change my answers",
  "s5.askAgain": "Ask again",
  "s5.saveList": "Save this list",
  "s5.share": "Share or print",
  "s5.shareTitle": "My steps from Sahayak",
  "s5.complete.title": "All steps done",
  "s5.complete.body":
    "You finished every step on your list. Share or print it as your record.",
  "s5.back": "Back",
  "s5.notice.e21": "That step isn't part of your journey.",
};

// Placeholder pending professional translation. Complete, not correct.
// See BUG-008. Must satisfy S5Strings exactly (compile-enforced).
export const hiS5: S5Strings = {
  "s5.heading": "{n} काम करने हैं",
  "s5.headingOne": "1 काम करना है",
  "s5.progress": "{n} में से {done} पूरे",
  "s5.doFirst": "सबसे पहले यह करें",
  "s5.honestyChip": "प्रोटोटाइप - नकली डेटा",
  "s5.honestySnapshot": "चरण हमारी सेव निर्देशिका से हैं। हम कुछ जमा नहीं करते।",

  "s5.manualBanner": "एक आम स्थिति के आधार पर — जाँचिए कि यह आप पर फ़िट होता है या नहीं",
  "s5.manualChange": "बदलें",
  "s5.diff.summary": "{added} चरण जोड़े गए, {removed} हटाए गए",
  "s5.diff.seeChanged": "देखिए क्या बदला",
  "s5.diff.added": "+ {task} ({reason} के कारण जोड़ा गया)",
  "s5.diff.removed": "– {task} ('अब आवश्यक नहीं' में चला गया)",
  "s5.diff.dismiss": "हटाएँ",
  "s5.reason.registered": "आपने पंजीकरण के बारे में बताया",
  "s5.reason.generic": "आपके जवाबों की वजह से",

  "s5.offlineSubmit": "अभ्यास सबमिशन के लिए कनेक्शन चाहिए",
  "s5.archivedNote": "पहले पूरा हुआ — अब आपकी यात्रा का हिस्सा नहीं है",
  "s5.preCompletedNote": "आपने हमें बताया था कि यह पहले से पंजीकृत है",
  "s5.openOfficial": "आधिकारिक पृष्ठ खोलें",
  "s5.remove": "हटाएँ",
  "s5.removeConfirm": "इस चरण को अपनी सूची से हटाएँ?",

  "s5.listenPlan": "योजना सुनें",
  "s5.railDetail": "{n} में से {done}",
  "s5.changeAnswers": "मेरे जवाब बदलें",
  "s5.askAgain": "फिर पूछें",
  "s5.saveList": "यह सूची सेव करें",
  "s5.share": "शेयर करें या प्रिंट करें",
  "s5.shareTitle": "सहायक से मेरे कदम",
  "s5.complete.title": "सारे चरण पूरे",
  "s5.complete.body":
    "आपनी सूची के सारे चरण पूरे कर लिए। इसे अपने रिकॉर्ड के रूप में शेयर करें या प्रिंट करें।",
  "s5.back": "वापस",
  "s5.notice.e21": "वह चरण आपकी यात्रा का हिस्सा नहीं है।",
};
