"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardState } from "@/app/_lib/storage/schema";
import { withLocale } from "@/app/_lib/nav";
import { writeLocale, writeOnboarded, writeState } from "@/app/_lib/storage/local";
import styles from "./page.module.css";

const STATES: { id: OnboardState; labelKey: "assam" | "maharashtra" | "karnataka" | "other" }[] = [
  { id: "assam", labelKey: "assam" },
  { id: "maharashtra", labelKey: "maharashtra" },
  { id: "karnataka", labelKey: "karnataka" },
  { id: "other", labelKey: "other" },
];

export function OnboardFlow({
  localeCode,
  tiles,
  strings,
}: {
  localeCode: string;
  tiles: { code: string; endonym: string }[];
  strings: {
    lang: string;
    state: string;
    helper: string;
    assam: string;
    maharashtra: string;
    karnataka: string;
    other: string;
    continue: string;
  };
}) {
  const router = useRouter();
  const [lang, setLang] = useState(localeCode);
  const [state, setState] = useState<OnboardState | null>(null);

  function finish() {
    if (!state) return;
    writeLocale(lang);
    writeState(state);
    writeOnboarded();
    router.replace(withLocale("/", lang));
  }

  const labels = {
    assam: strings.assam,
    maharashtra: strings.maharashtra,
    karnataka: strings.karnataka,
    other: strings.other,
  };

  return (
    <div className={styles.stack}>
      <section>
        <h2 className={styles.section}>{strings.lang}</h2>
        <ul className={styles.tiles}>
          {tiles.map((tile) => (
            <li key={tile.code}>
              <button
                type="button"
                lang={tile.code}
                className={tile.code === lang ? `${styles.tile} ${styles.tileOn}` : styles.tile}
                onClick={() => setLang(tile.code)}
              >
                {tile.endonym}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={styles.section}>{strings.state}</h2>
        <p className={styles.helper}>{strings.helper}</p>
        <ul className={styles.tiles}>
          {STATES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={state === item.id ? `${styles.tile} ${styles.tileOn}` : styles.tile}
                onClick={() => setState(item.id)}
              >
                {labels[item.labelKey]}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className={`${styles.cta} pressable`} disabled={!state} onClick={finish}>
        {strings.continue}
      </button>
    </div>
  );
}
