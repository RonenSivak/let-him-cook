# Iron Laws

Every LHC skill enforces an **Iron Law** — a single, non-negotiable invariant that defines "done." Violating the letter of the law is violating the spirit of the law. These are not guidelines.

## Global laws (apply to every skill)

- **No self-approval in the same context.** The producing agent never signs off on its own output. Counterpart-model peer review is required for plans, investigations, diffs, and incident conclusions. `peer-review.sh` is the preferred mechanism. If the counterpart CLI is missing, token/quota-limited, rate-limited, timed out, crashed, or returned an unparseable verdict, a separate-context strict fallback may satisfy the gate while recording `counterpart_coverage=degraded`.
- **No premature low confidence.** Workflows that emit `Confidence: high|medium|low` must apply `confidence-escalation-policy.md`. `medium` or `low` is allowed only after reasonable evidence paths were exhausted or blocked paths were recorded.
- **No silent degraded mode.** If readiness reports `blocked`, either stop and print the install checklist, or require the user to explicitly opt into degraded mode in the same turn. Missing coverage must be named in the artifact.
- **No external writes by default.** Jira, Slack, Grafana, PR comments, and DevEx write-side actions are forbidden unless the user explicitly requests the specific write in the current session. Vague wording ("handle it", "finish it", "take care of it") does not authorize writes.
- **Fresh evidence, not remembered evidence.** "The tests passed last time" is not verification. "The build is green" without a `gh run view` or a fresh devex query is not verification.
- **Every artifact is saved before stopping.** Skills that produce plans, investigations, research, or reviews must persist under `~/.lhc/` before the final reply.

## Per-skill laws

| Skill | Iron Law |
|-------|----------|
| `lhc-ralplan` | NO PLAN IS APPROVED WITHOUT PEER REVIEW. Counterpart review via `peer-review.sh` is preferred; the strict separate-context fallback may satisfy the gate when the counterpart cannot complete a parseable verdict, with `counterpart_coverage=degraded` recorded. A plan with `peer_review: pending` is a draft, not a plan. |
| `lhc-ralph` | NO EXECUTION WITHOUT A PLAN FILE. Inventing the plan inline is forbidden. If no plan exists, stop and route to `lhc-ralplan`. |
| `lhc-investigate` | NO CONCLUSION WITHOUT AT LEAST TWO CORRELATED SURFACES AND PEER REVIEW. Single-surface conclusions are labeled `hypothesis`, not `root cause`. |
| `lhc-build-fix` | NO FIX RECOMMENDATION WITHOUT ROOT CAUSE EVIDENCE. "Probably flaky" requires three runs of evidence before a `flaky-test` classification. |
| `lhc-research` | NO CLAIM WITHOUT A SOURCE. Every non-trivial claim cites a doc URL, repo path, or PR ref. Speculation is labeled speculation. |
| `lhc-review` | NO MODIFICATION OF THE REVIEWED ARTIFACT. The reviewer never edits the input. The verdict is recorded verbatim. |
| `lhc-team` | NO LANE MAY SPAWN LANES. Fan-out is flat; the coordinator is the only integrator. |
| `lhc-interview` | NO IMPLEMENTATION INSIDE INTERVIEW. Interview classifies and routes. It never plans, researches, investigates, or writes code. |
| `lhc-status` | READ-ONLY. Never modifies `~/.lhc/` except via the idempotent bootstrap script. |

## When a law is in tension with a user request

If the user explicitly asks you to break a law ("just skip peer review", "don't save the artifact", "I know there's no plan, just write the code"):

1. Refuse by default.
2. Explain which law blocks it and why.
3. Offer the compliant alternative (e.g. "run `lhc-ralplan` first — 30 seconds").
4. Proceed only if the user repeats the request in the same turn with an explicit waiver.

Compliant alternatives beat waivers. A 30-second plan beats a cowboy edit every time.
