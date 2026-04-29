# Wix Context Graph — Canonical Hop Sequence

LHC investigations and build-fix triages traverse the same hop sequence across Wix's internal MCPs. This file is the single source of truth for the canonical ordering, so reviewers and executors share one description of the path. It consolidates patterns already implicit in `lhc-investigate` and `lhc-build-fix`.

Every hop is **read-only**. See `read-only-governance.md` and `iron-laws.md` for the invariant; this file does not relax it.

## Hop sequence

| # | Hop | MCP / surface | What it resolves |
|---|-----|---------------|------------------|
| 1 | Request ID → log line | `root-cause` | Maps a request ID, trace ID, or correlation ID to the originating log line, the responding service, and the immediate downstream calls. |
| 2 | Log line → service | `root-cause`, `grafana-datasource` | Confirms which service emitted the log; resolves service name from log labels and metric tags. |
| 3 | Service → owner | `devex` | Resolves the service's owning team, on-call rotation, and code repository. |
| 4 | Owner / service → repo | `octocode` | Locates the repository on `wix-private`. Lets investigators read source, recent PRs, and ownership files (`OWNERS`, `CODEOWNERS`). |
| 5 | Repo → recent deploys | `devex` | Lists releases/deploys for the service in the relevant time window. Enables "did this break with the most recent deploy" questions. |
| 6 | Repo + deploys → CI status | `devex` | Surfaces build/test/release status for the service's recent changes; flags red builds, stuck rollouts, or skipped tests. |
| 7 | Service → on-call / context | `devex` (read-only) and optional `slack`/`jira` (read-only) | Names the on-call engineer and surfaces any open incident threads or Jira tickets. **No Slack posts. No Jira mutations.** Only read access; the human investigator decides whether to escalate. |

## When to skip a hop

- **No request ID available?** Start at hop 2 (service name) or hop 3 (owner) using whatever the user provided (service name, repo URL, dashboard link).
- **No service-name yet?** Start at hop 4 (repo). Often a Jira ticket or build-fix task names the repo first; service comes after.
- **Hop 6 (CI status) only?** Common for `lhc-build-fix` — the request is "why is my build red", and hops 1-5 are unnecessary. Run hop 6 directly. If hop 6 surfaces a service-level regression instead of a CI flake, escalate to the full sequence.
- **Read-only Jira/Slack are optional context** in hop 7. Skip them when the user has not consented to reading customer/internal communication content. The hop sequence does not require them; they enrich it.

## Read-only invariants

- Every hop above maps to a **read-only** MCP call. No write side-effects, regardless of the surface.
- Even hop 7's "name the on-call engineer" is read; LHC does not page anyone, post in incident channels, or transition Jira tickets. Per `read-only-governance.md` §"Forbidden by default", external writes require an explicit user authorization in the current turn.
- The hop sequence is documentation, not enforcement. Skills that use it (`lhc-investigate`, `lhc-build-fix`) MUST honor the iron-law that conclusions require at least two correlated surfaces (see `iron-laws.md` §"per-skill laws" for `lhc-investigate`).

## Worked examples

**Example 1 — Production 503 caught in pager.**

A Wix engineer is paged at 02:14 UTC because Grafana's `wix-payments-svc` 5xx rate crossed the alert threshold. The investigator opens `lhc-investigate` with the alert page as the user prompt.

1. Hop 1 — extract the request ID from the alert page (`req-id=abc123…`); resolve it to the originating log line.
2. Hop 2 — confirm `wix-payments-svc` emitted the log; cross-check the Grafana panel that fired.
3. Hop 3 — DevEx surfaces the owning team (`payments-platform`) and the on-call (`@alice`).
4. Hop 4 — octocode locates `wix-private/payments-svc` and the latest commit on `main`.
5. Hop 5 — DevEx lists deploys: a release went out at 02:09 UTC, five minutes before the alert.
6. Hop 6 — DevEx CI status: the release's post-deploy canary failed silently because the canary threshold was lowered last week.
7. Hop 7 — confirm `@alice` is on call; observe the active incident channel; do **not** post.

The artifact records "regression introduced by deploy at 02:09" with at least two correlated surfaces (logs + deploys + CI canary). Conclusion is gated on peer review.

**Example 2 — Red PR build with no production symptom.**

A developer asks `lhc-build-fix` why their PR build is red. The graph entry point is hop 6, not hop 1. There is no request ID; the prompt is "PR #84523 is failing".

1. Hop 6 — DevEx CI status surfaces the failing job: `vitest` red on `tests/api/checkout.test.ts`.
2. Hop 4 — octocode reads the failing test and the PR's diff; the test references a removed export.
3. Hop 5 *(skip)* — no deploy needed; the failure is local to the PR.
4. Hop 7 *(skip)* — no on-call escalation; the developer owns the fix.

Conclusion routes to `lhc-ralplan` (small bug-fix plan) rather than continuing the investigation.

## Anti-patterns

- **Skipping hop 1 because the request ID is "obvious".** A request ID is cheap; treat it as the canonical identifier even when the symptom seems clear. Skipping hop 1 is the first step toward a single-surface conclusion.
- **Conflating hops 4 and 5.** "Recent commits" (hop 4 — repo state) is not the same as "recent deploys" (hop 5 — production rollout). A merged commit that has not deployed cannot have caused a live production symptom.
- **Walking the graph backwards by default.** `lhc-build-fix` enters at hop 6 — that is intentional. Forcing hops 1–5 first when the prompt is a PR build failure is wasted work and obscures the actual signal (the failing CI job).
- **Treating hop 7 as escalation.** Hop 7 names the on-call engineer; it does not page them. Paging is a write action covered by `read-only-governance.md` and requires explicit user authorization.
- **Mixing the graph with code-change hypotheses.** The graph traverses surfaces; conclusions about *why* the symptom appeared and *what to fix* belong in the investigation artifact, not in the graph hops themselves.

## Why this exists as a separate doc

`lhc-investigate` and `lhc-build-fix` previously each described their own version of the hop sequence inline. Two consequences:

- The descriptions drifted (`lhc-build-fix` started at hop 6, `lhc-investigate` started at hop 1, but neither acknowledged the other's entry point).
- Reviewers had to read two SKILL.md files to know what hop sequence to expect, instead of one shared reference.

This file consolidates the sequence so future investigations cite a single source. New hops or new MCPs added to the sequence should be added here first, then referenced from the consuming skills.

## Cross-references

- `skills/shared/wix-tool-surfaces.md` — full list of LHC's Wix MCPs and their read-only contracts.
- `skills/shared/read-only-governance.md` — what counts as a write, when explicit consent is required.
- `skills/shared/iron-laws.md` — invariants that apply to every hop's interpretation.
- `skills/lhc-investigate/SKILL.md` — invokes this hop sequence for production investigations.
- `skills/lhc-build-fix/SKILL.md` — typically enters at hop 6 and escalates to hop 1-5 only when CI evidence points to a service-level regression.
