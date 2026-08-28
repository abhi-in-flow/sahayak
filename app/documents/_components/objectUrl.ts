"use client";

import { useEffect, useState } from "react";

/**
 * Object URL for a stored blob, revoked on unmount and on every replace
 * (D12 §4 S7: "object URL, revoked on unmount"). Keyed by blob identity,
 * so a re-fetched wallet record swaps the URL and frees the old one.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return url;
}
