import { describe, expect, it } from "vitest";
import { exampleAliasChunks, mergeExampleAliases, reuseSnapshot, topicRelevant } from "./retrieve";

describe("example aliases", () => {
  it("finds bakijai even when the query is a notice, not a clearance form", () => {
    const hits = exampleAliasChunks("I have a bakijai notice");
    expect(hits.map((hit) => hit.id)).toContain("bakijai-clearance");
  });

  it("finds income certificate and death certificate chips", () => {
    expect(exampleAliasChunks("I need an income certificate")[0]?.id).toBe("income-certificate-assam");
    expect(exampleAliasChunks("We need the death certificate")[0]?.id).toBe("t1-death-cert");
    expect(exampleAliasChunks("ನಮಗೆ ಮರಣ ಪ್ರಮಾಣಪತ್ರ ಬೇಕು")[0]?.id).toBe("t1-death-cert");
    expect(exampleAliasChunks("आम्हाला मृत्यू प्रमाणपत्र हवे आहे")[0]?.id).toBe("t1-death-cert");
  });

  it("prepends the alias seed when state-filtered hits missed it", () => {
    const merged = mergeExampleAliases(
      [{ id: "mh-1", title: "Other", url: "", fetchedAt: "", text: "x", score: 0.2 }],
      "I have a bakijai notice",
      5,
    );
    expect(merged[0]?.id).toBe("bakijai-clearance");
    expect(merged.some((hit) => hit.title === "Other")).toBe(false);
  });

  it("drops building-permit rows from a death-certificate query", () => {
    expect(
      topicRelevant(
        { title: "Apply for erection of new building", text: "Municipal building permission" },
        "We need the death certificate",
      ),
    ).toBe(false);
    expect(
      topicRelevant(
        { title: "Death certificate (Assam, T1)", text: "Registrar of Births and Deaths" },
        "We need the death certificate",
      ),
    ).toBe(true);
  });

  it("reuses the death seed on a skip without calling the directory", () => {
    const reused = reuseSnapshot(
      [],
      "Kamrup Metropolitan",
      "We need the death certificate",
      { action: "skip", english: "", topic: "death" },
      5,
    );
    expect(reused[0]?.id).toBe("t1-death-cert");
  });
});
