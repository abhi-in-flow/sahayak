/**
 * S9 string namespace (progress / resume dashboard). OWNERSHIP: the S9
 * workstream. Key prefix "s9.".
 *
 * D5 copy (E-19, E-20) ships verbatim from the catalog. Metadata never
 * joins with a middle dot (D11 §1): the sync line renders "Saved to
 * this device" and "Backed up as {number}" as separate spans. Authored
 * strings carry zero em/en dashes.
 */

export interface S9Strings {
  "s9.heading": string;
  /** Literal count that always accompanies the ring (DP-4). */
  "s9.progress": string;

  /** The single "Next" card, mirroring the S5 Do-now treatment. */
  "s9.doFirst": string;
  "s9.openTask": string;
  "s9.openCompleted": string;

  "s9.completedTitle": string;
  "s9.waitingTitle": string;
  "s9.waitingMock": string;
  "s9.expected": string;

  /** Sync status line (two spans, never a dot join). */
  "s9.syncSaved": string;
  "s9.syncBacked": string;
  "s9.syncUnsynced": string;
  "s9.syncOffline": string;
  "s9.saveList": string;
  /** E-19, D5 verbatim, replaces the line when a push fails. */
  "s9.errorE19": string;

  /** Device-2 note on doc-gated tasks (P1-7). */
  "s9.deviceNote": string;

  "s9.changeAnswers": string;
  "s9.fullJourney": string;
  "s9.share": string;
  "s9.shareTitle": string;

  /** Long absence, non-blocking. */
  "s9.updatedNote": string;

  /** M-1 announcement (D6 6.2). */
  "s9.unlock": string;

  /** No-journey interstitial, then S1. */
  "s9.emptyInterstitial": string;

  /** E-20 restore card, D5 verbatim plus the two escapes. */
  "s9.errorE20": string;
  "s9.tryAgain": string;
  "s9.startFresh": string;

  /** Single-item journey switcher placeholder (out of build scope). */
  "s9.journeyLabel": string;
  /** The switcher's one option label: the current journey, named plainly
   *  (never the raw journey id, which is a UUID, not a user-facing fact). */
  "s9.journeyCurrent": string;

  /** Restore loading. */
  "s9.restoring": string;
}

export const enS9: S9Strings = {
  "s9.heading": "Where things stand",
  "s9.progress": "{done} of {n} done",

  "s9.doFirst": "Do this first",
  "s9.openTask": "Open the task",
  "s9.openCompleted": "View details",

  "s9.completedTitle": "Completed",
  "s9.waitingTitle": "Waiting",
  "s9.waitingMock": "Practice submission",
  "s9.expected": "Expected in {min} to {max} days",

  "s9.syncSaved": "Saved to this device",
  "s9.syncBacked": "Backed up as {number}",
  "s9.syncUnsynced": "Not backed up yet",
  "s9.syncOffline": "Will back up when you're online",
  "s9.saveList": "Save this list",
  "s9.errorE19": "Saved on this device. We'll back it up when we can.",

  "s9.deviceNote":
    "Documents stay on the device they were added to. Add them here to continue.",

  "s9.changeAnswers": "Change my answers",
  "s9.fullJourney": "Full journey view",
  "s9.share": "Share or print",
  "s9.shareTitle": "My progress from Sahayak",

  "s9.updatedNote": "Some steps were updated since you last checked",

  "s9.unlock": "{task} is now unlocked.",

  "s9.emptyInterstitial": "Nothing saved yet. Let's start.",

  "s9.errorE20": "We couldn't fetch your saved progress.",
  "s9.tryAgain": "Try again",
  "s9.startFresh": "Start fresh instead",

  "s9.journeyLabel": "Journey",
  "s9.journeyCurrent": "This journey",

  "s9.restoring": "Getting your saved progress…",
};

export const hiS9: S9Strings = {
  "s9.heading": "काम कहाँ तक पहुँचा है",
  "s9.progress": "{n} में से {done} पूरे",

  "s9.doFirst": "सबसे पहले यह करें",
  "s9.openTask": "काम खोलें",
  "s9.openCompleted": "जानकारी देखें",

  "s9.completedTitle": "पूरे हुए",
  "s9.waitingTitle": "इंतज़ार में",
  "s9.waitingMock": "अभ्यास भेजा गया",
  "s9.expected": "अनुमान {min} से {max} दिन",

  "s9.syncSaved": "इस डिवाइस पर सेव है",
  "s9.syncBacked": "{number} नंबर से बैकअप है",
  "s9.syncUnsynced": "अभी बैकअप नहीं है",
  "s9.syncOffline": "ऑनलाइन आने पर बैकअप हो जाएगा",
  "s9.saveList": "यह सूची सेव करें",
  "s9.errorE19": "इस डिवाइस पर सेव है। जैसे ही हो पाएगा, बैकअप ले लेंगे।",

  "s9.deviceNote":
    "दस्तावेज़ उसी डिवाइस पर रहते हैं जहाँ जोड़े गए थे। आगे बढ़ने के लिए उन्हें यहाँ जोड़ें।",

  "s9.changeAnswers": "मेरे जवाब बदलें",
  "s9.fullJourney": "पूरा रास्ता देखें",
  "s9.share": "शेयर करें या प्रिंट करें",
  "s9.shareTitle": "सहायक से मेरी प्रगति",

  "s9.updatedNote": "आपके देखे कुछ चरण अपडेट हुए हैं",

  "s9.unlock": "{task} अब खुल गया है।",

  "s9.emptyInterstitial": "अभी कुछ सेव नहीं है। चलिए शुरू करें।",

  "s9.errorE20": "आपकी सेव की गई प्रगति नहीं मिल पाई।",
  "s9.tryAgain": "फिर से कोशिश करें",
  "s9.startFresh": "नए सिरे से शुरू करें",

  "s9.journeyLabel": "यात्रा",
  "s9.journeyCurrent": "यह यात्रा",

  "s9.restoring": "आपकी सेव की गई प्रगति लाई जा रही है…",
};
