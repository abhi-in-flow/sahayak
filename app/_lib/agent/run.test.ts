import { describe, expect, it } from "vitest";
import {
  buildReplyMessages,
  isBlockingFollowUp,
  snapshotTasks,
  spokenFromModel,
  tasksWhenIntentClear,
} from "./run";

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

describe("buildReplyMessages", () => {
  it("puts the snapshot in system and prior turns as a message list", () => {
    const messages = buildReplyMessages({
      language: "English",
      followUpExample: "Which district or city is this for?",
      snapshot: "- Death certificate (Assam, T1) (https://crsorgi.gov.in/): Registrar facts",
      history: [
        { role: "user", content: "We need the death certificate" },
        { role: "assistant", content: "Which district or city is this for?" },
      ],
      question: "Guwahati",
      firstTurn: false,
    });
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("Death certificate (Assam, T1)");
    expect(messages[0]?.content).not.toContain("Guwahati");
    expect(messages.slice(1)).toEqual([
      { role: "user", content: "We need the death certificate" },
      { role: "assistant", content: "Which district or city is this for?" },
      { role: "user", content: "Guwahati" },
    ]);
  });

  it("sends only system plus the latest user message on the first turn", () => {
    const messages = buildReplyMessages({
      language: "Kannada",
      followUpExample: "ಇದು ಯಾವ ಜಿಲ್ಲೆ ಅಥವಾ ನಗರಕ್ಕೆ?",
      snapshot: "(none)",
      history: [],
      question: "ನಮಗೆ ಮರಣ ಪ್ರಮಾಣಪತ್ರ ಬೇಕು",
      firstTurn: true,
    });
    expect(messages.map((row) => row.role)).toEqual(["system", "user"]);
    expect(messages[1]?.content).toBe("ನಮಗೆ ಮರಣ ಪ್ರಮಾಣಪತ್ರ ಬೇಕು");
    expect(messages[0]?.content).toContain("first user message");
  });
});

describe("spokenFromModel", () => {
  it("does not treat a TASKS-only model reply as a failed call", () => {
    expect(
      spokenFromModel("FOLLOWUP: NONE\nTASKS:\n- Apply for death certificate | https://crsorgi.gov.in/ | CRS", [
        { title: "Apply for death certificate", detail: "CRS", url: "https://crsorgi.gov.in/" },
      ]),
    ).toBe("The official next step is Apply for death certificate.");
  });
});

describe("snapshotTasks", () => {
  const cites = [{ title: "Death certificate (Assam, T1)", url: "https://crsorgi.gov.in/" }];

  it("drops a Bakijai example that is not in the snapshot", () => {
    const tasks = snapshotTasks(
      [
        {
          title: "Apply for Bakijai clearance",
          detail: "Sewa Setu",
          url: "https://sewasetu.assam.gov.in/site/service-apply/issuance-of-bakijai-clearance-certificate",
        },
      ],
      cites,
      null,
      false,
    );
    expect(tasks[0]?.url).toBe("https://crsorgi.gov.in/");
    expect(tasks[0]?.title).toBe("Death certificate (Assam, T1)");
  });
});
