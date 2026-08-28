import type { LocaleDefinition } from "./types";
import { hiBase } from "./screens/base";
import { hiS2 } from "./screens/s2";
import { hiS3 } from "./screens/s3";
import { hiS4 } from "./screens/s4";
import { hiS5 } from "./screens/s5";
import { hiSH1 } from "./screens/sh1";

/**
 * Hindi. Every key in Strings is present, which is what allows this tile
 * to be enabled at all (D3 S1). Removing a string here is a compile error,
 * not a silent English fallback.
 *
 * Note for review: these strings are placeholders pending professional
 * translation. They are complete rather than correct. See BUG-008.
 */
export const hi: LocaleDefinition = {
  code: "hi-IN",
  endonym: "हिन्दी",
  dir: "ltr",
  script: "devanagari",
  dateFormat: "DD-MM-YYYY",
  strings: {
    ...hiBase,
    ...hiS2,
    ...hiS3,
    ...hiS4,
    ...hiS5,
    ...hiSH1,
  },
};
