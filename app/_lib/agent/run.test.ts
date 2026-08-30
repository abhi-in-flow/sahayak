import { describe, expect, it } from "vitest";
import { isBlockingFollowUp, tasksWhenIntentClear } from "./run";

describe("tasksWhenIntentClear", () => {
  const draft = [{ title: "Bakijai clearance", detail: "Sewa Setu", url: "https://example.test" }];

  it("hides tasks while a follow-up is still open", () => {
    expect(tasksWhenIntentClear("Which district is the notice from?", draft)).toEqual([]);
  });

  it("keeps tasks only when follow-up is none", () => {
    expect(tasksWhenIntentClear(null, draft)).toEqual(draft);
  });
});

describe("isBlockingFollowUp", () => {
  it("keeps district and already-applied questions", () => {
    expect(isBlockingFollowUp("Which district is the notice from?")).toBe(true);
    expect(isBlockingFollowUp("Have you already applied on Sewa Setu?")).toBe(true);
  });

  it("drops invented extra questions after intent is known", () => {
    expect(isBlockingFollowUp("Have you already contacted the Bakijai office?")).toBe(false);
  });

  it("keeps the stock Kannada district question", () => {
    expect(isBlockingFollowUp("ಇದು ಯಾವ ಜಿಲ್ಲೆ ಅಥವಾ ನಗರಕ್ಕೆ?")).toBe(true);
  });
});
