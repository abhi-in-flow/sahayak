import type { LocaleDefinition } from "./types";
import { enBase } from "./screens/base";
import { enS2 } from "./screens/s2";
import { enS3 } from "./screens/s3";
import { enS4 } from "./screens/s4";
import { enS5 } from "./screens/s5";
import { enSH1 } from "./screens/sh1";

/**
 * Canonical English. D3 gives copy strings in English and D5 owns every
 * error string; where a string here corresponds to a D5 code, D5 wins
 * and this file must be corrected to match rather than the reverse.
 */
export const en: LocaleDefinition = {
  code: "en-IN",
  endonym: "English",
  dir: "ltr",
  script: "latin",
  dateFormat: "DD-MM-YYYY",
  strings: {
    ...enBase,
    ...enS2,
    ...enS3,
    ...enS4,
    ...enS5,
    ...enSH1,
  },
};
