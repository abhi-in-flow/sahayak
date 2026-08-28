/**
 * S4 string namespace. OWNERSHIP: the confirm-understanding screen.
 * Key prefix "s4.".
 *
 * D3 S4 generates the summary FROM RECORDED ANSWERS, never re-inferred
 * from the transcript, so every recorded fact maps to exactly one clause
 * key and one chip key here. Where a string is canonical D3 copy it ships
 * verbatim, including its dash characters (the separator review is
 * BUG-004, owned by the copy owner); everything else this file authors
 * carries zero em/en dashes (D11 §1).
 */

export interface S4Strings {
  /** Screen heading, authored (D3 specifies no heading; the summary is the content). */
  "s4.heading": string;

  /* ---- one clause per recorded fact (D3 S4: generated from answers) -- */
  "s4.fact.registered.yes": string;
  "s4.fact.registered.no": string;
  "s4.fact.state.assam": string;
  "s4.fact.state.maharashtra": string;
  "s4.fact.work.company": string;
  "s4.fact.work.retired": string;
  "s4.fact.work.self": string;
  /** {list} is the joined asset phrases (s4.asset.*). */
  "s4.fact.assets": string;
  "s4.fact.assets.none": string;
  "s4.asset.bank": string;
  "s4.asset.house": string;
  "s4.asset.land": string;
  "s4.fact.relationship.son": string;
  "s4.fact.relationship.daughter": string;
  "s4.fact.relationship.spouse": string;
  "s4.fact.relationship.other": string;
  /** {thing} is the unsure topic (s4.thing.*). */
  "s4.fact.unsure": string;
  "s4.thing.registered": string;
  "s4.thing.work": string;
  "s4.thing.assets": string;
  "s4.thing.relationship": string;
  /** D3 S4 Empty row, verbatim: the all-answers-unsure summary. */
  "s4.summary.allUnsure": string;
  /** List joiner for asset / unsure-topic lists. */
  "s4.listAnd": string;

  /* ---- editable chips (D10 10.9: accent tint + pencil; unsure dashed) */
  "s4.chip.registered.yes": string;
  "s4.chip.registered.no": string;
  "s4.chip.state.assam": string;
  "s4.chip.state.maharashtra": string;
  "s4.chip.work.company": string;
  "s4.chip.work.retired": string;
  "s4.chip.work.self": string;
  "s4.chip.assets.bank": string;
  "s4.chip.assets.house": string;
  "s4.chip.assets.land": string;
  "s4.chip.assets.none": string;
  "s4.chip.relationship.son": string;
  "s4.chip.relationship.daughter": string;
  "s4.chip.relationship.spouse": string;
  "s4.chip.relationship.other": string;
  "s4.chip.unsure.registered": string;
  "s4.chip.unsure.work": string;
  "s4.chip.unsure.assets": string;
  "s4.chip.unsure.relationship": string;
  /** D3 S4, verbatim including its dash. */
  "s4.chip.unsure.caption": string;
  "s4.chip.change": string;

  /* ---- consequence preview and the Updated delta (D3 S4, verbatim).
          The One variants exist because the canonical "{n} things"
          template renders "1 things" at n = 1; pluralisation is a
          rendering concern, not a copy change. Flagged for the copy
          owner alongside BUG-004's separator review. ---- */
  "s4.consequence": string;
  "s4.consequenceOne": string;
  "s4.updated.pill": string;
  "s4.updated.delta": string;
  "s4.updated.deltaOne": string;

  /* ---- actions ------------------------------------------------------ */
  "s4.cta.confirm": string;
  "s4.cta.wrong": string;
  "s4.back": string;
  /** Speaker control label (A5 read-aloud). */
  "s4.speak": string;
}

export const enS4: S4Strings = {
  "s4.heading": "Is this right?",

  "s4.fact.registered.yes": "You told us the death has been registered.",
  "s4.fact.registered.no": "You told us the death has not been registered yet.",
  "s4.fact.state.assam": "They lived in Assam.",
  "s4.fact.state.maharashtra": "They lived in Maharashtra.",
  "s4.fact.work.company": "They worked at a company.",
  "s4.fact.work.retired": "They were retired.",
  "s4.fact.work.self": "They worked for themselves.",
  "s4.fact.assets": "There is {list} in their name.",
  "s4.fact.assets.none": "They did not own a bank account, house or land.",
  "s4.asset.bank": "a bank account",
  "s4.asset.house": "a house",
  "s4.asset.land": "land",
  "s4.fact.relationship.son": "You are their son.",
  "s4.fact.relationship.daughter": "You are their daughter.",
  "s4.fact.relationship.spouse": "You are their spouse.",
  "s4.fact.relationship.other": "You are their family.",
  "s4.fact.unsure": "You were not sure about {thing}.",
  "s4.thing.registered": "whether the death is registered",
  "s4.thing.work": "the work they did",
  "s4.thing.assets": "what they owned",
  "s4.thing.relationship": "how you are related",
  "s4.summary.allUnsure":
    "You told us you're not sure about most of this, so we've included everything that might apply.",
  "s4.listAnd": "and",

  "s4.chip.registered.yes": "Registered: yes",
  "s4.chip.registered.no": "Registered: not yet",
  "s4.chip.state.assam": "Lived in Assam",
  "s4.chip.state.maharashtra": "Lived in Maharashtra",
  "s4.chip.work.company": "Worked at a company",
  "s4.chip.work.retired": "Was retired",
  "s4.chip.work.self": "Was self-employed",
  "s4.chip.assets.bank": "Bank account",
  "s4.chip.assets.house": "House",
  "s4.chip.assets.land": "Land",
  "s4.chip.assets.none": "Nothing in their name",
  "s4.chip.relationship.son": "Son",
  "s4.chip.relationship.daughter": "Daughter",
  "s4.chip.relationship.spouse": "Spouse",
  "s4.chip.relationship.other": "Other family",
  "s4.chip.unsure.registered": "Registration",
  "s4.chip.unsure.work": "Their work",
  "s4.chip.unsure.assets": "What they owned",
  "s4.chip.unsure.relationship": "Relationship",
  "s4.chip.unsure.caption": "not sure — we've included this just in case.",
  "s4.chip.change": "Change this answer",

  "s4.consequence": "This means {n} things to do, across {m} offices.",
  "s4.consequenceOne": "This means one thing to do, across {m} offices.",
  "s4.updated.pill": "Updated",
  "s4.updated.delta": "This now means {n} things to do (was {p}).",
  "s4.updated.deltaOne": "This now means one thing to do (was {p}).",

  "s4.cta.confirm": "Yes, show me what to do",
  "s4.cta.wrong": "Something's wrong",
  "s4.back": "Back",
  "s4.speak": "Hear this summary",
};

// Placeholder pending professional translation. Complete, not correct.
// See BUG-008. Must satisfy S4Strings exactly (compile-enforced).
export const hiS4: S4Strings = {
  "s4.heading": "क्या यह सही है?",

  "s4.fact.registered.yes": "आपने बताया कि मृत्यु पंजीकृत हो चुकी है।",
  "s4.fact.registered.no": "आपने बताया कि मृत्यु का पंजीकरण अभी नहीं हुआ है।",
  "s4.fact.state.assam": "वे असम में रहते थे।",
  "s4.fact.state.maharashtra": "वे महाराष्ट्र में रहते थे।",
  "s4.fact.work.company": "वे कंपनी में काम करते थे।",
  "s4.fact.work.retired": "वे सेवानिवृत्त हो चुके थे।",
  "s4.fact.work.self": "वे अपना काम स्वयं करते थे।",
  "s4.fact.assets": "उनके नाम पर {list} है।",
  "s4.fact.assets.none": "उनके नाम पर बैंक खाता, मकान या ज़मीन नहीं थी।",
  "s4.asset.bank": "एक बैंक खाता",
  "s4.asset.house": "एक मकान",
  "s4.asset.land": "ज़मीन",
  "s4.fact.relationship.son": "आप उनके बेटे हैं।",
  "s4.fact.relationship.daughter": "आप उनकी बेटी हैं।",
  "s4.fact.relationship.spouse": "आप उनके जीवनसाथी हैं।",
  "s4.fact.relationship.other": "आप उनके परिवार के सदस्य हैं।",
  "s4.fact.unsure": "आप {thing} को लेकर निश्चित नहीं थे।",
  "s4.thing.registered": "पंजीकरण",
  "s4.thing.work": "उनके काम",
  "s4.thing.assets": "उनकी संपत्ति",
  "s4.thing.relationship": "आपके रिश्ते",
  "s4.summary.allUnsure":
    "आपने बताया कि आप इसमें से ज़्यादातर बातों को लेकर निश्चित नहीं हैं, इसलिए हमने वह सब शामिल किया है जो लागू हो सकता है।",
  "s4.listAnd": "और",

  "s4.chip.registered.yes": "पंजीकृत: हाँ",
  "s4.chip.registered.no": "पंजीकृत: अभी नहीं",
  "s4.chip.state.assam": "असम में रहते थे",
  "s4.chip.state.maharashtra": "महाराष्ट्र में रहते थे",
  "s4.chip.work.company": "कंपनी में काम",
  "s4.chip.work.retired": "सेवानिवृत्त",
  "s4.chip.work.self": "स्वरोज़गार",
  "s4.chip.assets.bank": "बैंक खाता",
  "s4.chip.assets.house": "मकान",
  "s4.chip.assets.land": "ज़मीन",
  "s4.chip.assets.none": "नाम पर कुछ नहीं",
  "s4.chip.relationship.son": "बेटे",
  "s4.chip.relationship.daughter": "बेटी",
  "s4.chip.relationship.spouse": "जीवनसाथी",
  "s4.chip.relationship.other": "अन्य परिवार",
  "s4.chip.unsure.registered": "पंजीकरण",
  "s4.chip.unsure.work": "उनका काम",
  "s4.chip.unsure.assets": "उनकी संपत्ति",
  "s4.chip.unsure.relationship": "रिश्ता",
  "s4.chip.unsure.caption": "पक्का नहीं — हमने इसे फिर भी शामिल किया है।",
  "s4.chip.change": "यह जवाब बदलें",

  "s4.consequence": "इसका मतलब है {n} काम, {m} दफ़्तरों में।",
  "s4.consequenceOne": "इसका मतलब है 1 काम, {m} दफ़्तरों में।",
  "s4.updated.pill": "अपडेट हुआ",
  "s4.updated.delta": "अब इसका मतलब है {n} काम (पहले {p} थे)।",
  "s4.updated.deltaOne": "अब इसका मतलब है 1 काम (पहले {p} थे)।",

  "s4.cta.confirm": "हाँ, दिखाइए क्या करना है",
  "s4.cta.wrong": "कुछ ग़लत है",
  "s4.back": "वापस",
  "s4.speak": "यह सारांश सुनिए",
};
