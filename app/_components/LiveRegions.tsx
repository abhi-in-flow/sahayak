/**
 * The two global live regions D6 6.2 requires.
 *
 * Every announcement in the product routes through one of these; screens
 * do not create their own. Mounted once in the root layout so that a
 * route change cannot destroy the region mid-announcement, which is the
 * usual cause of a message never reaching the screen reader.
 *
 * Announcement strings are localized. Screen-reader labels are authored
 * in the selected language, never English (A7).
 */
export function LiveRegions() {
  return (
    <>
      <div id="announce-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="announce-assertive" role="alert" aria-atomic="true" className="sr-only" />
    </>
  );
}
