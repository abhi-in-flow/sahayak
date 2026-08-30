import { describe, expect, it } from "vitest";
import { spokenReply } from "./speak";

describe("spokenReply", () => {
  it("does not say the follow-up twice when the reply already asked it", () => {
    const reply = "A bakijai notice is a recovery case. Which district is the notice from?";
    const followUp = "Which district is the notice from?";
    expect(spokenReply(reply, followUp)).toBe(reply);
  });

  it("appends the follow-up only when the reply did not ask it", () => {
    expect(spokenReply("Here is the official listing.", "Which city is this for?")).toBe(
      "Here is the official listing. Which city is this for?",
    );
  });

  it("does not speak a second question when the wording differs", () => {
    const reply = "A bakijai notice is a recovery case. Which district is the notice from?";
    expect(spokenReply(reply, "Which district or city is this for?")).toBe(reply);
  });
});
