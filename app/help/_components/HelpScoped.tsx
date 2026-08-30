"use client";

import { useEffect, useState, type ReactNode } from "react";
import { readState } from "@/app/_lib/storage/local";

/**
 * Assam is the only state with a sourced office and DLSA listing (C4).
 * Other onboard states must not see Guwahati facts as if they were local.
 */
export function HelpScoped({
  assam,
  other,
}: {
  assam: ReactNode;
  other: ReactNode;
}) {
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    setState(readState() ?? "other");
  }, []);

  if (state === null) return null;
  return <>{state === "assam" ? assam : other}</>;
}
