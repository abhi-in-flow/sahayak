import type { LucideIcon } from "lucide-react";
import styles from "./IconDisc.module.css";

/**
 * Shared diagram primitive: a tinted circle holding one lucide glyph.
 * One visual voice for every node in a process diagram (friction discs,
 * step discs, quiet avatars), instead of each screen re-deriving the
 * disc from raw CSS.
 *
 * Always aria-hidden: every call site sits behind real text that carries
 * the meaning (DP-4), so the disc only ever adds the colour channel.
 * Tones are fixed token pairs (DECISION-007) — accent for active steps,
 * done for satisfied states, err for friction, neutral for quiet figures.
 */
export function IconDisc({
  icon: Icon,
  tone,
  size = 40,
}: {
  icon: LucideIcon;
  tone: "accent" | "done" | "err" | "neutral";
  size?: number;
}) {
  return (
    <span
      className={`${styles.disc} ${styles[tone]}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.45)} strokeWidth={2} />
    </span>
  );
}
