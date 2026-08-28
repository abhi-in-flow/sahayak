/**
 * S7 reuse visualisation: document nodes left, task nodes right,
 * satisfied links `--accent-700`, hollow links `--line-600` (D10
 * §10.10, the one hand-authored vector in the product; D3: no graph
 * library).
 *
 * Decorative by design: `aria-hidden`, and the coverage summary
 * sentence above it states the same fact in words (DP-4). Satisfied
 * nodes fill `--accent-100`; hollow ones keep a dashed `--line-600`
 * outline, matching the product's dashed-means-uncertain shape channel.
 * With the T1-only roster this draws 4 doc nodes to 1 task node.
 */

export interface ReuseGraphNode {
  satisfied: boolean;
}

export interface ReuseGraphLink {
  /** Index into docs. */
  doc: number;
  /** Index into tasks. */
  task: number;
  satisfied: boolean;
}

export interface ReuseGraphProps {
  docs: ReuseGraphNode[];
  tasks: ReuseGraphNode[];
  links: ReuseGraphLink[];
}

const WIDTH = 320;
const DOC_X = 4;
const DOC_W = 88;
const DOC_H = 30;
const ROW = 44;
const TOP = 8;
const TASK_X = 228;
const TASK_W = 88;
const TASK_H = 40;
const TASK_GAP = 12;

export function ReuseGraph({ docs, tasks, links }: ReuseGraphProps) {
  // Nothing to reuse means nothing to draw; the sentence stands alone.
  if (docs.length === 0 || tasks.length === 0) return null;

  const docBlock = (docs.length - 1) * ROW + DOC_H;
  const taskBlock = (tasks.length - 1) * (TASK_H + TASK_GAP) + TASK_H;
  const height = TOP * 2 + Math.max(docBlock, taskBlock);
  // Task nodes stack as one block, centred on the doc column.
  const taskTop = (height - taskBlock) / 2;
  const taskCYs = tasks.map(
    (_, index) => taskTop + index * (TASK_H + TASK_GAP) + TASK_H / 2,
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      {links.map((link) => {
        const docCY = TOP + link.doc * ROW + DOC_H / 2;
        const taskCY = taskCYs[link.task];
        return (
          <path
            key={`${link.doc}-${link.task}`}
            // The first control pair leaves the doc node; the second
            // arrives horizontally into the task node.
            d={`M ${DOC_X + DOC_W} ${docCY} C 160 ${docCY}, 168 ${taskCY}, ${TASK_X} ${taskCY}`}
            fill="none"
            stroke={link.satisfied ? "var(--accent-700)" : "var(--line-600)"}
            strokeWidth={link.satisfied ? 2.5 : 1.5}
            strokeDasharray={link.satisfied ? undefined : "4 4"}
          />
        );
      })}

      {docs.map((doc, index) => (
        <rect
          key={`doc-${index}`}
          x={DOC_X}
          y={TOP + index * ROW}
          width={DOC_W}
          height={DOC_H}
          rx={8}
          fill={doc.satisfied ? "var(--accent-100)" : "var(--surface)"}
          stroke={doc.satisfied ? "var(--accent-700)" : "var(--line-600)"}
          strokeWidth={1.5}
          strokeDasharray={doc.satisfied ? undefined : "4 4"}
        />
      ))}

      {tasks.map((task, index) => (
        <rect
          key={`task-${index}`}
          x={TASK_X}
          y={taskTop + index * (TASK_H + TASK_GAP)}
          width={TASK_W}
          height={TASK_H}
          rx={8}
          fill={task.satisfied ? "var(--accent-100)" : "var(--surface)"}
          stroke={task.satisfied ? "var(--accent-700)" : "var(--line-600)"}
          strokeWidth={task.satisfied ? 2 : 1.5}
          strokeDasharray={task.satisfied ? undefined : "4 4"}
        />
      ))}
    </svg>
  );
}
