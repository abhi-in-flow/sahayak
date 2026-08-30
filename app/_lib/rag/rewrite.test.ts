import { describe, expect, it } from "vitest";
import { planRetrievalSync } from "./rewrite";

describe("planRetrievalSync", () => {
  it("maps Kannada death-certificate speech to an English directory query", () => {
    expect(planRetrievalSync("ನಮಗೆ ಮರಣ ಪ್ರಮಾಣಪತ್ರ ಬೇಕು")).toEqual({
      action: "search",
      english: "death certificate",
      topic: "death",
    });
  });

  it("skips Weaviate when the follow-up is only a place name", () => {
    expect(planRetrievalSync("Kamrup Metropolitan", "We need the death certificate", true)).toEqual({
      action: "skip",
      english: "",
      topic: "death",
    });
  });

  it("searches again when a follow-up names a different service", () => {
    expect(planRetrievalSync("I need bakijai clearance", "We need the death certificate", true)).toEqual({
      action: "search",
      english: "bakijai clearance",
      topic: "bakijai",
    });
  });

  it("leaves unknown first-turn speech for the model path", () => {
    expect(planRetrievalSync("I need a ration card")).toBeNull();
  });
});
