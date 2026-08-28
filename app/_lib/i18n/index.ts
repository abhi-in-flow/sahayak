import type { LocaleDefinition, Strings } from "./types";
import { en } from "./en";
import { hi } from "./hi";

export type { LocaleDefinition, Strings, ScriptClass } from "./types";

/**
 * The locale registry.
 *
 * D3 S1: "Partially translated language = hidden tile, never
 * fallback-to-English." A locale reaches this array only by satisfying
 * LocaleDefinition, which requires every key in Strings. Completeness is
 * therefore a compile-time property, and ENABLED_LOCALES is safe to render
 * directly as the S1 tile list.
 */
export const ENABLED_LOCALES: readonly LocaleDefinition[] = [en, hi];

export const DEFAULT_LOCALE = en;

/**
 * CONVENTION: never pass a LocaleDefinition to a Client Component.
 *
 * Props of a Client Component are serialised into the RSC flight payload,
 * so handing one the locale object inlines the ENTIRE string table into
 * the HTML of every page that renders it. Measured on S1 with only two
 * small locales, that was 1,231 wasted bytes, and the table grows with
 * every screen from S2 to S11.
 *
 * S1 budgets 1.5 s to tappable on 3G (D3 S1 Loading) and the cost lands on
 * first paint, so this matters more here than it would on a desktop app.
 *
 * Server Components may take the locale freely: their props are never
 * serialised. Client Components take the specific strings they need, as
 * plain strings. See OfflineChip for the pattern.
 */

export function findLocale(code: string | undefined): LocaleDefinition | undefined {
  if (!code) return undefined;
  return ENABLED_LOCALES.find((l) => l.code === code);
}

/**
 * Resolve the tile to pre-highlight on S1.
 *
 * D3 S1 edge case: "Unsupported device locale -> English tile
 * pre-highlighted, never auto-advance." Pre-highlighting is a visual hint
 * only; it never selects, and it never navigates.
 */
export function preferredLocale(acceptLanguage: string | undefined): LocaleDefinition {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const tags = acceptLanguage.split(",").map((part) => part.split(";")[0]!.trim().toLowerCase());
  for (const tag of tags) {
    const exact = ENABLED_LOCALES.find((l) => l.code.toLowerCase() === tag);
    if (exact) return exact;
    const base = tag.split("-")[0];
    const byLanguage = ENABLED_LOCALES.find((l) => l.code.toLowerCase().split("-")[0] === base);
    if (byLanguage) return byLanguage;
  }
  return DEFAULT_LOCALE;
}

/**
 * Interpolate {named} placeholders.
 *
 * Deliberately does not accept a fallback string: a missing key is a
 * programming error and must surface loudly in development rather than
 * rendering an empty element or an English word in a Hindi sentence.
 */
export function t(
  locale: LocaleDefinition,
  key: keyof Strings,
  vars?: Record<string, string | number>,
): string {
  const template = locale.strings[key];
  if (template === undefined) {
    throw new Error(`Missing string "${key}" for locale "${locale.code}"`);
  }
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
