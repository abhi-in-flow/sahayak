import type { Metadata, Viewport } from "next";
import { Anek_Latin, Anek_Devanagari } from "next/font/google";
import { DEFAULT_LOCALE, t } from "@/app/_lib/i18n";
import { LiveRegions } from "@/app/_components/LiveRegions";
import { OfflineChip } from "@/app/_components/OfflineChip";
import { ServiceWorker } from "@/app/_components/ServiceWorker";
import { TabBar } from "@/app/_components/TabBar";
import "./globals.css";

/**
 * Anek, per DECISION-006. One variable superfamily across nine Indian
 * scripts plus Latin, so adding a language is a translation task rather
 * than a type redesign. Self-hosted by next/font, which also removes the
 * render-blocking Google Fonts request: S1 budgets 1.5s to tappable on 3G.
 *
 * Nastaliq is NOT loaded here. It is a separate metric system with its own
 * line-height tokens (see tokens.css) and is loaded only when an RTL
 * locale is enabled.
 */
const anekLatin = Anek_Latin({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-anek-latin",
  display: "swap",
});

const anekDevanagari = Anek_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-anek-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sahayak",
  description:
    "Voice-first guidance for Indian government processes. Independent project, not a government website.",
};

export const viewport: Viewport = {
  // No maximum-scale and no user-scalable=no: A2 requires 200% scaling.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The root locale is the server-side default. S1 pre-highlights a tile
  // from Accept-Language but never auto-advances (D3 S1 edge case), and a
  // stored locale is applied client-side from T-LOCAL once hydrated.
  const locale = DEFAULT_LOCALE;

  return (
    <html
      lang={locale.code}
      dir={locale.dir}
      data-script={locale.script}
      className={`${anekLatin.variable} ${anekDevanagari.variable}`}
    >
      <body>
        <LiveRegions />
        <ServiceWorker />
        {/* O-01 is global: every screen has a Disabled (offline) row in D3. */}
        <OfflineChip
          offlineMessage={t(locale, "error.O01")}
          reconnectedMessage={t(locale, "offline.reconnected")}
        />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
