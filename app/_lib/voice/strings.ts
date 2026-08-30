import type { LocaleDefinition } from "../i18n";
import { t } from "../i18n";
import type { VoiceRailStrings } from "@/app/_components/VoiceRail";

/**
 * Resolves the VoiceRail's chrome strings for one locale. Pages call
 * this once and pass the plain object down (the i18n convention: client
 * components never receive a LocaleDefinition), so each corridor screen
 * composes the rail with one call instead of fourteen t() lookups.
 */
export function voiceRailStrings(locale: LocaleDefinition): VoiceRailStrings {
  return {
    micIdle: t(locale, "rail.micIdle"),
    micTapStop: t(locale, "rail.micTapStop"),
    micHoldStop: t(locale, "rail.micHoldStop"),
    cancel: t(locale, "rail.cancel"),
    listening: t(locale, "rail.listening"),
    transcribing: t(locale, "rail.transcribing"),
    thinking: t(locale, "rail.thinking"),
    speaking: t(locale, "rail.speaking"),
    listenAgain: t(locale, "rail.listenAgain"),
    typeToggle: t(locale, "rail.typeToggle"),
    readAloud: t(locale, "rail.readAloud"),
    steps: {
      speak: t(locale, "rail.step.speak"),
      clarify: t(locale, "rail.step.clarify"),
      confirm: t(locale, "rail.step.confirm"),
      plan: t(locale, "rail.step.plan"),
    },
  };
}
