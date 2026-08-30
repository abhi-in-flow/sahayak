import { describe, expect, it } from "vitest";
import {
  defaultFollowUp,
  languageName,
  localizeFollowUp,
  looksEnglish,
  toVoiceLocale,
  ttsSpeaker,
} from "./sarvamLang";

describe("toVoiceLocale", () => {
  it("keeps full BCP-47 tags", () => {
    expect(toVoiceLocale("kn-IN")).toBe("kn-IN");
    expect(toVoiceLocale("hi-IN")).toBe("hi-IN");
    expect(toVoiceLocale("as-IN")).toBe("as-IN");
  });

  it("maps short leftovers", () => {
    expect(toVoiceLocale("hi")).toBe("hi-IN");
    expect(toVoiceLocale("en")).toBe("en-IN");
    expect(toVoiceLocale("mr")).toBe("mr-IN");
  });

  it("defaults unknown codes to English, not Hindi", () => {
    expect(toVoiceLocale("xx")).toBe("en-IN");
    expect(toVoiceLocale(undefined)).toBe("en-IN");
  });
});

describe("ttsSpeaker", () => {
  it("picks the recommended male voice", () => {
    expect(ttsSpeaker("en-IN")).toBe("ratan");
    expect(ttsSpeaker("mr-IN")).toBe("ratan");
    expect(ttsSpeaker("kn-IN")).toBe("shubh");
    expect(ttsSpeaker("hi-IN")).toBe("shubh");
  });
});

describe("defaultFollowUp", () => {
  it("asks the district question in the selected language", () => {
    expect(defaultFollowUp("kn-IN")).toMatch(/ಜಿಲ್ಲೆ/);
    expect(defaultFollowUp("mr-IN")).toMatch(/जिल्ह्या/);
    expect(defaultFollowUp("as-IN")).toMatch(/জিলা/);
    expect(languageName("as-IN")).toBe("Assamese");
  });
});

describe("localizeFollowUp", () => {
  it("replaces an English model question when Kannada is selected", () => {
    expect(localizeFollowUp("Which district is the notice from?", "kn-IN")).toBe(
      defaultFollowUp("kn-IN"),
    );
    expect(looksEnglish("Which district is this for?")).toBe(true);
    expect(looksEnglish("ಇದು ಯಾವ ಜಿಲ್ಲೆ ಅಥವಾ ನಗರಕ್ಕೆ?")).toBe(false);
  });
});
