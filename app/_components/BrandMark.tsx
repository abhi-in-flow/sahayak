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
}: {
  variant: "icon" | "full";
  /** Empty alt when the word Sahayak is already beside the mark. */
  decorative?: boolean;
  wordmark?: string;
}) {
  const alt = decorative ? "" : wordmark;

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
    <span className={styles.disc}>
      {/* eslint-disable-next-line @next/next/no-img-element -- see full variant */}
      <img src="/assets/logo.png" alt={alt} className={styles.icon} />
    </span>
  );
}
