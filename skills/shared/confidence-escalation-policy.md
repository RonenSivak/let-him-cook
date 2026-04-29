# Confidence Escalation Policy

Use this policy whenever an LHC workflow emits `Confidence: high|medium|low`.
The goal is not to force high confidence. The goal is to make sure lower
confidence is returned only after the workflow has exhausted the reasonable
evidence paths for that task and named what still blocks certainty.

## Core Rule

Do not return `medium` or `low` because the first pass felt thin. Before a
workflow emits less than `high`, it must run the relevant exhaustion ladder
below or record why a required rung was unavailable.

Never inflate confidence. If evidence is contradictory, missing, stale, or
unavailable, keep the lower label and explain the blocker.

## Required Artifact Fields

Any artifact with a confidence rating must include:

```markdown
## Confidence
high | medium | low

## Evidence Coverage
- Required source families: <docs/code/logs/metrics/releases/tests/etc.>
- Consulted source families: <what was actually checked>
- Independent cross-check: <second source, reviewer, execution result, or none>

## Exhaustion Ledger
- Attempted: <source/tool/query/path>
  Result: <found/empty/blocked/conflicting>
  Follow-up: <what was done next or why it stopped>

## Confidence Blockers
- <"none" for high, otherwise the exact reason confidence stayed below high>

## Next Evidence That Would Raise Confidence
- <tool/query/person/test/data source that would change the rating>
```

If the workflow cannot write these fields because it is only printing a compact
handoff, the saved artifact still must contain them.

## Global Exhaustion Ladder

Run these before settling below `high`:

1. **Classify the request.** Use the workflow taxonomy first: research intent,
   feature type, bug type, build bucket, or investigation symptom.
2. **Name the proving source families.** Decide what evidence would prove the
   claim for this classification.
3. **Check the primary source family.** Use the highest-authority source first:
   internal docs/policies for standards, repo code for behavior, logs/metrics
   for production facts, tests/build output for execution claims.
4. **Run one independent cross-check.** Prefer a different source family or a
   strict reviewer/subagent in a separate context.
5. **Resolve conflicts.** If sources disagree, look for recency, ownership,
   deploy order, or authoritative policy. Do not average conflicts into high
   confidence.
6. **Record blocked paths.** Missing MCP, absent CLI, rate limit, auth failure,
   token exhaustion, empty search result, and unavailable owner input are
   evidence facts. Put them in the ledger.

## Workflow Thresholds

### Research

`high` requires a primary source plus either an independent supporting source or
an explicitly exhausted negative search across the relevant source families.

Before returning `medium` or `low`, research must try the source family implied
by `research-intent-taxonomy.md` and at least one alternate family:

- docs or schema
- repo/code search and PR history
- RFC/ADR/proposal text
- official external docs for third-party dependencies
- Jira/Slack read-only prior-art search when available and relevant
- live data surfaces only when the question depends on current production truth

### Investigation

`high` requires at least two correlated production or release surfaces and no
material unresolved contradiction. Peer-review coverage is reported separately:
counterpart review is preferred, strict local fallback is acceptable when the
counterpart CLI or quota is unavailable, and missing all review coverage keeps
the conclusion degraded even if the evidence itself is strong.

Before returning `medium` or `low`, investigation must attempt the relevant
combination of request RCA, Grafana/dashboard query, raw datasource query,
release/build/devex correlation, ownership, and read-only Jira/Slack context
when available.

### Standards

`high` requires authoritative ecosystem guidance and enough repo evidence to
represent the touched area. The default target is 10 signal files, but small
repos or narrow packages can still be `high` if all relevant files/configs were
exhausted and the artifact says so.

Before returning `medium` or `low`, standards must attempt nearby-file sampling,
repo config, recent commits for the touched paths, and ecosystem/internal-docs
lookup. If one side is thin, list exactly which side and why.

### Review

Peer review confidence is a coverage statement, not approval theater.

- `counterpart` route: best coverage when the opposite host CLI completes.
- `strict-local-fallback` route: acceptable fallback when the counterpart CLI is
  missing, token/quota-limited, rate-limited, timed out, crashed, or returned an
  unparseable verdict.
- `degraded-none` route: no independent reviewer completed. The artifact cannot
  be presented as approved.

The strict local fallback must be a separate subagent/role with review-only
authority, not the producing agent re-reading its own output.

## Decision Rules

- `high`: required evidence families were consulted or explicitly exhausted,
  independent cross-check did not find blockers, and confidence blockers are
  `none`.
- `medium`: at least one important source family is thin, blocked, stale, or
  conflicting, but the remaining evidence supports a likely conclusion.
- `low`: evidence is single-surface, mostly unavailable, materially conflicting,
  or the claim depends on an unverified assumption.

## Anti-Cheating Rules

- Do not call an answer high because the user asked for high confidence.
- Do not hide missing tools behind a confident summary.
- Do not use a local fallback reviewer to pretend counterpart coverage happened.
- Do not downgrade forever without trying alternate sources. Exhaust, then label.
- Do not ask the user to resolve an evidence gap until local read-only options
  and available subagents have been tried.
