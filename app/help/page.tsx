import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { requiredDocuments } from "@/app/_lib/documents";
import { HELPLINES, NATIONAL_GUIDANCE, SEED_LEGAL_AID, SEED_OFFICE } from "@/app/_lib/offices";
import { TASKS } from "@/app/_lib/tasks";
import { ChecklistActions } from "./_components/ChecklistActions";
import { MapLink } from "./_components/MapLink";
import { PhoneAction } from "./_components/PhoneAction";
import styles from "./page.module.css";

/**
 * S10 - Offline Path & Human Help (D3 S10; craft contract D12 4).
 *
 * Server Component shell; the only client islands are the three
 * affordances that need the browser: MapLink (offline state),
 * PhoneAction (tel: vs copy), ChecklistActions (print/share with the
 * E-22 silent print fallback). All content is bundled static from
 * offices.ts, so there is NO Loading state (no fetch anywhere) and no
 * Empty state: the state variant always has the seeded office, and the
 * national variant (entry c, national=1) always renders portal and
 * NALSA guidance, never a blank.
 *
 * Query parameters:
 *   locale        language (withLocale convention)
 *   task={code}   entry (b) from S6: state-scoped with task context;
 *                 drives the documents-to-carry list and the print title
 *   national=1    entry (c) from Q2: the national variant, no state
 *                 scope. Takes precedence when combined with task.
 *
 * Focus order (D6 6.1 S10): office block links (map, call/copy) ->
 * checklist print -> helplines -> legal-aid link. DOM order matches.
 */

const DOC_KEYS = {
  "DOC-MED": "doc.DOC-MED",
  "DOC-ID-D": "doc.DOC-ID-D",
  "DOC-ID-I": "doc.DOC-ID-I",
  "DOC-ADDR": "doc.DOC-ADDR",
  "DOC-DEATH": "doc.DOC-DEATH",
} as const satisfies { readonly [code: string]: keyof Strings };

function docLabel(locale: LocaleDefinition, code: string): string | undefined {
  const key = DOC_KEYS[code as keyof typeof DOC_KEYS];
  // An unknown document code renders nothing rather than an untranslated
  // English name (A7: labels are authored in the selected language).
  return key ? t(locale, key) : undefined;
}

/** Provenance trio (C4): source link + verification date as discrete
 *  lines, never a separator run. Citation links open directly; they are
 *  references, not navigations, so they do not interstitial (D12 3). */
function Provenance({
  locale,
  sourceUrl,
  lastVerified,
  state,
}: {
  locale: LocaleDefinition;
  sourceUrl: string;
  lastVerified: string;
  state?: string;
}) {
  return (
    <div className={styles.provenance}>
      <p className={styles.metaLine}>
        {t(locale, "meta.source")}{" "}
        <a className={styles.sourceLink} href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {sourceUrl}
        </a>
      </p>
      <p className={styles.metaLine}>
        {t(locale, "meta.verified")} {lastVerified}
      </p>
      {state ? <p className={styles.metaLine}>{t(locale, "meta.state")} {state}</p> : null}
    </div>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const locale = findLocale(firstValue(query.locale)) ?? DEFAULT_LOCALE;

  const national = firstValue(query.national) === "1";
  const taskCode = firstValue(query.task);
  // An unknown task code is not valid S6 context; the screen falls back
  // to the plain state variant rather than inventing a carry list (C4).
  const task = taskCode ? TASKS.find((entry) => entry.code === taskCode) : undefined;
  const docs = task ? requiredDocuments(task.code) : [];

  // Only sourced entries render. Today that is one state-scope entry and
  // zero national-scope entries (C4: no number is invented to fill the
  // national variant; the portal and NALSA stand in as guidance there).
  const helplines = HELPLINES.filter((entry) => entry.scope === (national ? "national" : "state"));

  const checklistTitle = task
    ? t(locale, "s10.checklistFor", { task: task.name })
    : t(locale, "s10.checklistTitle");

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SEED_OFFICE.mapQuery)}`;

  // The share payload, assembled on the server so the strings stay in
  // the selected language and the island receives one plain string.
  const checklistLines: string[] = [checklistTitle];
  if (national) {
    checklistLines.push(
      `${t(locale, "s10.nationalPortal")}: ${NATIONAL_GUIDANCE.portalName}`,
      NATIONAL_GUIDANCE.portalUrl,
      `${t(locale, "s10.nationalLegal")}: ${NATIONAL_GUIDANCE.legalAidName}`,
      NATIONAL_GUIDANCE.legalAidUrl,
      t(locale, "s10.boundary"),
      `${t(locale, "meta.verified")} ${NATIONAL_GUIDANCE.lastVerified}`,
    );
  } else {
    checklistLines.push(SEED_OFFICE.name, ...SEED_OFFICE.addressLines);
    if (task && docs.length > 0) {
      checklistLines.push(t(locale, "s10.carryFor", { task: task.name }));
      for (const code of docs) {
        const label = docLabel(locale, code);
        if (label) checklistLines.push(`- ${label}`);
      }
    }
    for (const entry of helplines) {
      checklistLines.push(`${entry.name}: ${entry.number}`);
    }
    checklistLines.push(SEED_LEGAL_AID.name, ...SEED_LEGAL_AID.addressLines);
    if (SEED_LEGAL_AID.phone) checklistLines.push(SEED_LEGAL_AID.phone);
    checklistLines.push(
      `${t(locale, "meta.source")} ${SEED_OFFICE.sourceUrl}`,
      `${t(locale, "meta.verified")} ${SEED_OFFICE.lastVerified}`,
    );
  }
  const checklistText = checklistLines.join("\n");

  return (
    <>
      {/* The print-only checklist lives OUTSIDE .screenOnly so printing
          hides all screen chrome and yields exactly one page. */}
      <div className={styles.screenOnly}>
        <SkipLink locale={locale} />
        <DisclosureBanner locale={locale} />
        <div className="shell">
          <main id="main" className={styles.main}>
            <h1 className={styles.heading}>
              {t(locale, national ? "s10.generalHeading" : "s10.heading")}
            </h1>

            {national ? (
              <>
                {/* National variant (entry c): no state scope, so no
                    office, carry list or state helplines render. */}
                <section className={styles.card} aria-labelledby="s10-portal">
                  <h2 id="s10-portal" className={styles.subHeading}>
                    {t(locale, "s10.nationalPortal")}
                  </h2>
                  <p className={styles.entryName}>{NATIONAL_GUIDANCE.portalName}</p>
                  <a
                    className={styles.externalLink}
                    href={NATIONAL_GUIDANCE.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {NATIONAL_GUIDANCE.portalUrl}
                  </a>
                  <Provenance
                    locale={locale}
                    sourceUrl={NATIONAL_GUIDANCE.portalUrl}
                    lastVerified={NATIONAL_GUIDANCE.lastVerified}
                  />
                </section>

                {/* HELPLINES has no scope "national" entries today (C4).
                    The filter above is real code, not a special case; if
                    a verified national number lands in offices.ts it
                    renders here. Until then the portal and NALSA are the
                    guidance, and no number is fabricated. */}

                <ChecklistActions
                  printLabel={t(locale, "s10.printCta")}
                  shareLabel={t(locale, "s10.share")}
                  checklistText={checklistText}
                />

                <section className={styles.card} aria-labelledby="s10-national-legal">
                  <h2 id="s10-national-legal" className={styles.subHeading}>
                    {t(locale, "s10.legalTitle")}
                  </h2>
                  <p className={styles.body}>{t(locale, "s10.legalBody")}</p>
                  <p className={styles.entryName}>{NATIONAL_GUIDANCE.legalAidName}</p>
                  <a
                    className={styles.externalLink}
                    href={NATIONAL_GUIDANCE.legalAidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(locale, "s10.nationalLegal")}
                  </a>
                  <p className={styles.boundary}>{t(locale, "s10.boundary")}</p>
                  <Provenance
                    locale={locale}
                    sourceUrl={NATIONAL_GUIDANCE.legalAidUrl}
                    lastVerified={NATIONAL_GUIDANCE.lastVerified}
                  />
                </section>
              </>
            ) : (
              <>
                {/* Office block. Full address is server-rendered text and
                    stays visible in every state, including offline. */}
                <section className={styles.card} aria-labelledby="s10-office">
                  <h2 id="s10-office" className={styles.subHeading}>
                    {t(locale, "s10.officeTitle")}
                  </h2>
                  <p className={styles.entryName}>{SEED_OFFICE.name}</p>
                  <address className={styles.address}>
                    {SEED_OFFICE.addressLines.map((line) => (
                      <span key={line} className={styles.addressLine}>
                        {line}
                      </span>
                    ))}
                  </address>
                  {/* SEED_OFFICE.hours is absent (C4): hours render only
                      from sourced data, so the line is omitted here
                      rather than invented. */}
                  <MapLink
                    href={mapUrl}
                    label={t(locale, "s10.mapLink")}
                    offlineReason={t(locale, "s10.mapOffline")}
                  />
                  <Provenance
                    locale={locale}
                    sourceUrl={SEED_OFFICE.sourceUrl}
                    lastVerified={SEED_OFFICE.lastVerified}
                    state={SEED_OFFICE.state}
                  />
                </section>

                {/* Documents to carry, only with a real task context
                    (entry b from S6) whose requirement set is sourced. */}
                {task && docs.length > 0 ? (
                  <section className={styles.card} aria-labelledby="s10-carry">
                    <h2 id="s10-carry" className={styles.subHeading}>
                      {t(locale, "s10.carryTitle")}
                    </h2>
                    <p className={styles.carryFor}>
                      {t(locale, "s10.carryFor", { task: task.name })}
                    </p>
                    <ul className={styles.docList}>
                      {docs.map((code) => {
                        const label = docLabel(locale, code);
                        return label ? <li key={code}>{label}</li> : null;
                      })}
                    </ul>
                  </section>
                ) : null}

                {/* D6 6.1: the checklist print anchor sits between the
                    office block and the helplines. */}
                <ChecklistActions
                  printLabel={t(locale, "s10.printCta")}
                  shareLabel={t(locale, "s10.share")}
                  checklistText={checklistText}
                />

                <section className={styles.card} aria-labelledby="s10-helplines">
                  <h2 id="s10-helplines" className={styles.subHeading}>
                    {t(locale, "s10.helplines")}
                  </h2>
                  <ul className={styles.plainList}>
                    {helplines.map((entry) => (
                      <li key={entry.number} className={styles.entry}>
                        <p className={styles.entryName}>{entry.name}</p>
                        <PhoneAction
                          number={entry.number}
                          callLabel={t(locale, "s10.call", { number: entry.number })}
                          copyLabel={t(locale, "s10.copy")}
                          copiedLabel={t(locale, "s10.copied")}
                        />
                        <Provenance
                          locale={locale}
                          sourceUrl={entry.sourceUrl}
                          lastVerified={entry.lastVerified}
                        />
                      </li>
                    ))}
                  </ul>
                </section>

                <section className={styles.card} aria-labelledby="s10-legal">
                  <h2 id="s10-legal" className={styles.subHeading}>
                    {t(locale, "s10.legalTitle")}
                  </h2>
                  <p className={styles.body}>{t(locale, "s10.legalBody")}</p>
                  <p className={styles.entryName}>{SEED_LEGAL_AID.name}</p>
                  <address className={styles.address}>
                    {SEED_LEGAL_AID.addressLines.map((line) => (
                      <span key={line} className={styles.addressLine}>
                        {line}
                      </span>
                    ))}
                  </address>
                  {/* SEED_LEGAL_AID.phone is optional (C4); the same
                      non-telephony fallback applies as for helplines. */}
                  {SEED_LEGAL_AID.phone ? (
                    <PhoneAction
                      number={SEED_LEGAL_AID.phone}
                      callLabel={t(locale, "s10.call", { number: SEED_LEGAL_AID.phone })}
                      copyLabel={t(locale, "s10.copy")}
                      copiedLabel={t(locale, "s10.copied")}
                    />
                  ) : null}
                  {/* C5 boundary statement, rendered prominently. */}
                  <p className={styles.boundary}>{t(locale, "s10.boundary")}</p>
                  <Provenance
                    locale={locale}
                    sourceUrl={SEED_LEGAL_AID.sourceUrl}
                    lastVerified={SEED_LEGAL_AID.lastVerified}
                  />
                </section>
              </>
            )}
          </main>
          <GlobalFooter locale={locale} />
        </div>
      </div>

      {/* Printable one-page checklist (D3 S10 edge case: the
          highest-value artefact for a low-literacy office visit).
          Server-rendered entirely in the selected language. */}
      <div className={styles.printSheet}>
        <h1 className={styles.printTitle}>{checklistTitle}</h1>
        {national ? (
          <>
            <div className={styles.printBlock}>
              <p className={styles.printName}>{t(locale, "s10.nationalPortal")}</p>
              <p>{NATIONAL_GUIDANCE.portalName}</p>
              <p>{NATIONAL_GUIDANCE.portalUrl}</p>
            </div>
            <div className={styles.printBlock}>
              <p className={styles.printName}>{t(locale, "s10.nationalLegal")}</p>
              <p>{NATIONAL_GUIDANCE.legalAidName}</p>
              <p>{NATIONAL_GUIDANCE.legalAidUrl}</p>
            </div>
            <div className={styles.printBlock}>
              <p>{t(locale, "s10.boundary")}</p>
            </div>
            <div className={styles.printMeta}>
              <p>
                {t(locale, "meta.source")} {NATIONAL_GUIDANCE.portalUrl}
              </p>
              <p>
                {t(locale, "meta.verified")} {NATIONAL_GUIDANCE.lastVerified}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={styles.printBlock}>
              <p className={styles.printName}>{SEED_OFFICE.name}</p>
              {SEED_OFFICE.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {task && docs.length > 0 ? (
              <div className={styles.printBlock}>
                <p className={styles.printName}>{t(locale, "s10.carryTitle")}</p>
                <p>{t(locale, "s10.carryFor", { task: task.name })}</p>
                <ul className={styles.printList}>
                  {docs.map((code) => {
                    const label = docLabel(locale, code);
                    return label ? <li key={code}>{label}</li> : null;
                  })}
                </ul>
              </div>
            ) : null}
            {helplines.length > 0 ? (
              <div className={styles.printBlock}>
                <p className={styles.printName}>{t(locale, "s10.helplines")}</p>
                {helplines.map((entry) => (
                  <p key={entry.number}>
                    {entry.name}: {entry.number}
                  </p>
                ))}
              </div>
            ) : null}
            <div className={styles.printBlock}>
              <p className={styles.printName}>{SEED_LEGAL_AID.name}</p>
              {SEED_LEGAL_AID.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {SEED_LEGAL_AID.phone ? <p>{SEED_LEGAL_AID.phone}</p> : null}
            </div>
            <div className={styles.printMeta}>
              <p>
                {t(locale, "meta.source")} {SEED_OFFICE.sourceUrl}
              </p>
              <p>
                {t(locale, "meta.verified")} {SEED_OFFICE.lastVerified}
              </p>
              <p>
                {t(locale, "meta.state")} {SEED_OFFICE.state}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
