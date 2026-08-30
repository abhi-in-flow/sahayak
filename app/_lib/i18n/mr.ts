import type { LocaleDefinition } from "./types";
import { en } from "./en";

/** Marathi tile. Chrome is English placeholders; voice uses mr-IN. */
export const mr: LocaleDefinition = {
  ...en,
  code: "mr-IN",
  endonym: "मराठी",
  script: "devanagari",
  strings: {
    ...en.strings,
    "s2.example1": "आम्हाला मृत्यू प्रमाणपत्र हवे आहे",
    "s2.example2": "माझ्याकडे बाकीजाई नोटीस आहे",
    "s2.example3": "मला उत्पन्न प्रमाणपत्र हवे आहे",
  },
};
