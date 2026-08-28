/**
 * Route through the global live regions (D6 6.2). Screens never create
 * their own aria-live containers; the regions are mounted once in the
 * root layout so a route change cannot destroy one mid-announcement.
 */
export function announce(text: string, assertive = false): void {
  if (typeof document === "undefined") return;
  const region = document.getElementById(
    assertive ? "announce-assertive" : "announce-polite",
  );
  if (!region) return;
  // Clear first: re-announcing identical text requires the DOM change.
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = text;
  });
}
