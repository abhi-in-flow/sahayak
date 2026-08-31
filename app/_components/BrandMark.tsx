import styles from "./BrandMark.module.css";

/**
 * Product mark. The PNGs ship on a black plate with near-black type, so
 * the lockup is rebuilt here: icon on a light plate plus a CSS wordmark.
 * Not a government emblem (D3 S1; D10 DP-2).
 */
export function BrandMark({
  variant,
  decorative = false,
  wordmark = "Sahayak",
  size,
}: {
  variant: "icon" | "full";
  /** Empty alt when the word Sahayak is already beside the mark. */
  decorative?: boolean;
  wordmark?: string;
  /** Square edge for the icon disc; unset keeps the 48px default. */
  size?: number;
}) {
  const alt = decorative ? "" : wordmark;
  const iconStyle = size === undefined ? undefined : { width: size, height: size };

  if (variant === "full") {
    return (
      <div className={styles.band}>
        {/* eslint-disable-next-line @next/next/no-img-element -- baked plate; next/image is not needed */}
        <img src="/assets/logo.png" alt={alt} className={styles.fullIcon} />
        <p className={styles.word} aria-hidden={decorative || undefined}>
          {wordmark}
        </p>
      </div>
    );
  }

  return (
    <span className={styles.disc} style={iconStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element -- see full variant */}
      <img src="/assets/logo.png" alt={alt} className={styles.icon} style={iconStyle} />
    </span>
  );
}
