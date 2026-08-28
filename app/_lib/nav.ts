/**
 * Navigation helpers. Screens are locale-aware through the `locale`
 * query parameter, which every internal link carries so a Server
 * Component can resolve the language without reading T-LOCAL
 * (localStorage has no server-side read).
 */
export function withLocale(href: string, locale: string | undefined): string {
  if (!locale) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("locale")) params.set("locale", locale);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
