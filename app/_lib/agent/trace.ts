export interface DebugField {
  label: string;
  value: string;
}

export interface AgentDebugStep {
  id: string;
  title: string;
  status: "ok" | "skip" | "error";
  ms: number;
  summary: string;
  fields: DebugField[];
}

export interface AgentDebugTrace {
  version: 1;
  startedAt: string;
  elapsedMs: number;
  steps: AgentDebugStep[];
}

export function nowMs(): number {
  return Date.now();
}

export function field(label: string, value: unknown): DebugField {
  if (value === undefined || value === null || value === "") {
    return { label, value: "—" };
  }
  if (typeof value === "string") return { label, value };
  return { label, value: JSON.stringify(value, null, 2) };
}

export function makeStep(
  id: string,
  title: string,
  started: number,
  rest: Omit<AgentDebugStep, "id" | "title" | "ms">,
): AgentDebugStep {
  return { id, title, ms: Math.max(0, Date.now() - started), ...rest };
}
