import { Suspense } from "react";
import { PracticeFlow } from "../../_components/PracticeFlow";

/**
 * S8, the guided MOCK submission (T1, Appendix A schema).
 *
 * Route: /practice/[code]/[step] with step in 1..4, and the result at
 * step "done" (D12 §2). One page serves the whole tree; the client
 * component reads the segments with useParams, so Next 16's Promise
 * params in Server wrappers never need awaiting here. useSearchParams
 * requires a Suspense boundary during prerender, as everywhere.
 */
export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeFlow />
    </Suspense>
  );
}
