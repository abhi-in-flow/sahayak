import type { LocaleDefinition } from "./types";
import { en } from "./en";

/** Assamese tile. Chrome is English placeholders; voice uses as-IN. */
export const as: LocaleDefinition = {
  ...en,
  code: "as-IN",
  endonym: "অসমীয়া",
  strings: {
    ...en.strings,
    "s2.example1": "আমাক মৃত্যু প্ৰমাণপত্ৰ লাগে",
    "s2.example2": "মোৰ ওচৰত বাকিজাই নোটিচ আছে",
    "s2.example3": "মোক আয় প্ৰমাণপত্ৰ লাগে",
  },
};
