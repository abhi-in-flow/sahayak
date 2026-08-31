import type { LocaleDefinition } from "../i18n";
import { t } from "../i18n";
import type { FirstRunCarouselStrings } from "@/app/_components/FirstRunCarousel";

/**
 * Resolves the first-run intro explainer's strings for one locale. Pages
 * call this once and pass the plain object down (the i18n convention:
 * client components never receive a LocaleDefinition), mirroring
 * voiceRailStrings for the VoiceRail.
 */
export function guideStrings(locale: LocaleDefinition): FirstRunCarouselStrings {
  return {
    skipLabel: t(locale, "s1.guide.skip"),
    nextLabel: t(locale, "onboard.continue"),
    backLabel: t(locale, "onboard.back"),
    dismissLabel: t(locale, "s1.guide.dismiss"),
    slideOf: t(locale, "onboard.stepOf"),
    scene1Title: t(locale, "s1.guide.1.title"),
    scene1Body: t(locale, "s1.guide.1.body"),
    n1Label: t(locale, "s1.guide.1.n1"),
    n2Label: t(locale, "s1.guide.1.n2"),
    n3Label: t(locale, "s1.guide.1.n3"),
    scene2Title: t(locale, "s1.guide.2.title"),
    scene2Body: t(locale, "s1.guide.2.body"),
    scene2In: t(locale, "s1.guide.2.in"),
    scene2Mid: t(locale, "s1.guide.2.mid"),
    scene2Out: t(locale, "s1.guide.2.out"),
    scene3Title: t(locale, "s1.guide.3.title"),
    step1Title: t(locale, "s1.guide.3.step1.title"),
    step1Body: t(locale, "s1.guide.3.step1.body"),
    step2Title: t(locale, "s1.guide.3.step2.title"),
    step2Body: t(locale, "s1.guide.3.step2.body"),
    step3Title: t(locale, "s1.guide.3.step3.title"),
    step3Body: t(locale, "s1.guide.3.step3.body"),
  };
}
