"use client";

import { SelectCardGroup, type SelectCardItem } from "../SelectCard";
import styles from "../../steps.module.css";

/**
 * Step 2 — region. The one step that cannot be skipped: StateGate
 * bounces the whole product to /onboard until a state exists, because
 * journeys, offices and the RAG filter are all scoped by it.
 */
export function StepRegion({
  options,
  value,
  onSelect,
  strings,
}: {
  options: readonly { id: "assam" | "maharashtra" | "karnataka" | "other" }[];
  value: string | null;
  onSelect: (region: "assam" | "maharashtra" | "karnataka" | "other") => void;
  strings: {
    question: string;
    helper: string;
    assam: string;
    maharashtra: string;
    karnataka: string;
    other: string;
  };
}) {
  const labels = {
    assam: strings.assam,
    maharashtra: strings.maharashtra,
    karnataka: strings.karnataka,
    other: strings.other,
  };
  const items: SelectCardItem[] = options.map((option) => ({
    value: option.id,
    label: labels[option.id],
  }));
  return (
    <>
      <p className={styles.helper}>{strings.helper}</p>
      <SelectCardGroup
        name="onboard-region"
        items={items}
        value={value}
        onChange={(value) => onSelect(value as "assam" | "maharashtra" | "karnataka" | "other")}
      />
    </>
  );
}
