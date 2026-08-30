import type { LocaleDefinition } from "./types";
import { en } from "./en";

/** Kannada tile. Chrome is English placeholders; voice uses kn-IN. */
export const kn: LocaleDefinition = {
  ...en,
  code: "kn-IN",
  endonym: "ಕನ್ನಡ",
  strings: {
    ...en.strings,
    "s2.example1": "ನಮಗೆ ಮರಣ ಪ್ರಮಾಣಪತ್ರ ಬೇಕು",
    "s2.example2": "ನನ್ನ ಬಳಿ ಬಾಕಿಜಾಯಿ ನೋಟಿಸ್ ಇದೆ",
    "s2.example3": "ನನಗೆ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಬೇಕು",
  },
};
