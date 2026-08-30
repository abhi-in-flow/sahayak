"use client";

import { useState } from "react";
import type { AgentDebugTrace } from "@/app/_lib/agent/trace";
import styles from "./AgentDebug.module.css";

export interface DebugTurn {
  question: string;
  trace: AgentDebugTrace;
}

export function AgentDebug({ turns }: { turns: DebugTurn[] }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(turns, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  if (!open) {
    return (
      <div className={styles.dock}>
        <div className={styles.head}>
          <p className={styles.title}>LLM debug</p>
          <div className={styles.tools}>
            <button type="button" onClick={() => setOpen(true)}>
              Show
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className={styles.dock} aria-label="LLM debug">
      <div className={styles.head}>
        <p className={styles.title}>
          LLM debug · {turns.length} {turns.length === 1 ? "turn" : "turns"}
        </p>
        <div className={styles.tools}>
          <button type="button" onClick={() => void copyAll()}>
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Hide
          </button>
        </div>
      </div>
      <div className={styles.body}>
        {turns.length === 0 ? (
          <p className={styles.empty}>Send a message to log each step: input, query writer, retrieve, reply, parse.</p>
        ) : (
          turns.map((turn, index) => (
            <section key={`${turn.trace.startedAt}-${index}`} className={styles.turn}>
              <p className={styles.turnHead}>
                Turn {index + 1} · {turn.trace.elapsedMs}ms · {turn.question}
              </p>
              {turn.trace.steps.map((step) => (
                <article key={step.id} className={styles.step}>
                  <div className={styles.stepTitle}>
                    <span className={styles[step.status]}>{step.status}</span>
                    <span>{step.title}</span>
                    <span className={styles.ms}>{step.ms}ms</span>
                  </div>
                  <p className={styles.summary}>{step.summary}</p>
                  <dl>
                    {step.fields.map((row) => (
                      <div key={`${step.id}-${row.label}`} className={styles.field}>
                        <dt>{row.label}</dt>
                        <dd>
                          <pre>{row.value}</pre>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
