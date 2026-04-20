# Rationalization Guard

When you catch yourself forming one of the thoughts on the left, you are rationalizing your way around an LHC invariant. Stop. Apply the response on the right.

## Red Flags — thoughts that mean STOP

| Rationalization | Reality |
|----------------|---------|
| "This is trivial enough to skip the plan." | Trivial tasks get done fast *through* the plan, not around it. `lhc-ralplan` for a 3-line change takes 60 seconds. |
| "The peer review is probably going to approve this anyway." | Probably. So run it. Self-approval is forbidden regardless of how confident you are. |
| "I already investigated this — I don't need fresh evidence." | Prod state changes between turns. "The rollout was healthy an hour ago" is not a current claim. |
| "Only one surface is actually relevant here." | Possibly true. Label the conclusion `hypothesis` and say so. `root cause` is two-surface only. |
| "The user said 'just fix it' — that's authorization." | "Just fix it" does not authorize external writes. Explicit writes require naming the write. |
| "I can synthesize the investigation without correlating surfaces." | You can synthesize. The artifact is still weak. Correlate or downgrade the confidence label. |
| "The readiness check is slow and will probably pass — skip it." | Readiness is cheap. Skipping it is how you end up with a plan that relies on a broken MCP. |
| "If I refuse this, the user will be frustrated." | Frustration is cheaper than a bad conclusion stamped "approved." Refuse cleanly and offer the compliant path. |
| "It's the same as last time — I'll reuse the artifact." | Reuse the structure, not the evidence. Evidence is timestamped. |
| "I'll add the acceptance criteria after I write the code." | No. Criteria come first. Without them, "done" is whatever the agent says it is. |
| "This flake has happened before — classify it flaky." | Flaky requires three runs of evidence. One recurrence is not three. |
| "I'll inline the fix because the triage is obvious." | `lhc-build-fix` does not implement. Produce the plan, then invoke `lhc-ralph`. |
| "The plan is mostly right — I'll fix a few things as I go." | No. Revise the plan, re-review, then execute. Inline drift is how plans decay. |
| "Peer review rejected it but the reviewer missed the point." | Maybe. Write why in the artifact, then revise and re-review. Do not present rejected work as approved. |
| "I'll just skip the notepad entry this time." | No. The notepad is the append-only ledger the next agent uses to understand what already ran. |

## Pressure patterns — watch for these

- **Urgency framing** — "just this once", "for speed", "we'll clean it up later". The invariant exists because last-time's "just this once" became this-time's status quo.
- **Authority claim** — "the user is senior, they know what they want". Senior users especially rely on the invariants to avoid silent regressions.
- **Expertise claim** — "I already know this one". Knowing the answer ≠ having verified it.
- **Exhaustion framing** — "this is the third iteration, let's just ship it". Three iterations is a signal to stop and question the architecture, not to lower the bar.

If three iterations of the same fix have failed in `lhc-ralph`: stop. Escalate to `architect` review via peer review, or return to `lhc-ralplan` and rewrite the plan. Do not attempt fix #4.

## The meta-law

> Violating the letter of the rules is violating the spirit of the rules.

If the rule seems to not apply, the rule still applies. If you think the rule is wrong, name the rule and escalate — do not silently route around it.
