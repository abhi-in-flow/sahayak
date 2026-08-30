"use client";

import { SelectCardGroup, type SelectCardItem } from "../SelectCard";
import styles from "../../steps.module.css";

/**
 * Step 1 — language. Selecting a tile updates the draft and the URL's
 * locale parameter, so the server re-renders the remaining steps in the
 * chosen language immediately: the flow switches language under the
 * user's feet without leaving onboarding.
 */
export function StepLanguage({
  tiles,
  value,
  onSelect,
  strings,
}: {
  tiles: readonly { code: string; endonym: string }[];
  value: string | null;
  onSelect: (code: string) => void;
  strings: { helper: string };
}) {
  const items: SelectCardItem[] = tiles.map((tile) => ({
    value: tile.code,
    label: tile.endonym,
  }));
  return (
    <>
      <SelectCardGroup
        name="onboard-language"
        items={items}
        value={value}
        onChange={onSelect}
        lang={(item) => item.value}
      />
      <p className={styles.helper}>{strings.helper}</p>
    </>
  );
}
