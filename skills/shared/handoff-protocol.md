# Handoff Protocol

Every LHC skill ends by printing a **structured handoff message** that names the artifact(s) it produced and the suggested next skill. The downstream user (or the next skill invocation in the same session) uses the handoff to locate prior context without re-deriving it.

The problem this solves: if `lhc-ralplan` finishes with "now run `lhc-ralph`", the user has to remember the plan path. When interview says "use `lhc-investigate`", the classification context is lost. The handoff block makes the context explicit and copy-pasteable.

## The template

Every handoff is a fenced block with this exact shape:

```
LHC HANDOFF
- Completed: <workflow-name>
- Slug: <kebab-slug>
- Cwd: <absolute-path>
- Artifact: <absolute-path>            # every LHC skill produces one
- Plan: <absolute-path>                # when applicable (ralph, team, review-of-plan)
- Verdict: approved|approved-with-changes|rejected|degraded  # when peer-review ran
- Confidence: high|medium|low          # when applicable (investigate, research, standards)
- Classification: <workflow-or-bucket> # interview workflow or build-fix bucket
- Feature labels: <labels>             # when feature-type classification ran
- Audience: <audience values>          # when feature-type classification ran
- Layers: <layer values>               # when feature-type classification ran
- Bug labels: <labels>                 # when bug-fix classification ran
- Severity: <severity values>          # when bug-fix classification ran
- Origin: <origin values or unknown>   # when bug-fix classification ran
- Defect surface: <surface values>     # when bug-fix classification ran
- Fix strategy: <strategy values>      # when bug-fix classification ran
- Next skill: let-him-cook:<name>      # when there is a natural next step
- Pass to next skill:
    artifact=<path>
    plan=<path>                         # if applicable
    feature-labels=<labels>             # if applicable
    audience=<audience values>          # if applicable
    layers=<layer values>               # if applicable
    bug-labels=<labels>                 # if applicable
    severity=<severity values>          # if applicable
    origin=<origin values or unknown>   # if applicable
    defect-surface=<surface values>     # if applicable
    fix-strategy=<strategy values>      # if applicable
    verdict=<verdict>                   # if applicable
```

Field rules:

- **Always include** `Completed`, `Slug`, `Cwd`, `Artifact`.
- Include `Plan` when the skill was triggered by or produced a plan file.
- Include `Verdict` when peer review ran in this skill.
- Include `Confidence` when the skill emits a confidence rating (investigate, research, standards).
- Include `Classification` for `lhc-interview` routing decisions and `lhc-build-fix` buckets.
- Include `Feature labels`, `Audience`, and `Layers` when `lhc-interview` or `lhc-ralplan` classified a feature request.
- Include `Bug labels`, `Severity`, `Origin`, `Defect surface`, and `Fix strategy` when `lhc-interview`, `lhc-ralplan`, `lhc-build-fix`, or `lhc-investigate` classified a bug-fix request or symptom.
- Include `Next skill` + `Pass to next skill` only when there is a natural next step. For terminal skills (where "done" is the expected outcome), omit these two lines.

## Example (lhc-ralplan → lhc-ralph)

```
LHC HANDOFF
- Completed: ralplan
- Slug: auth-token-refresh
- Cwd: /Users/ronen/src/identity-service
- Artifact: ~/.lhc/plans/ralplan-auth-token-refresh-2026-04-20T14-23-05Z.md
- Standards brief: ~/.lhc/artifacts/standards-auth-token-refresh-2026-04-20T14-23-05Z.md
- Verdict: approved
- Next skill: let-him-cook:lhc-ralph
- Pass to next skill:
    plan=~/.lhc/plans/ralplan-auth-token-refresh-2026-04-20T14-23-05Z.md
    standards-brief=~/.lhc/artifacts/standards-auth-token-refresh-2026-04-20T14-23-05Z.md
```

## Example (lhc-build-fix → lhc-ralplan)

```
LHC HANDOFF
- Completed: build-fix
- Slug: payments-rollout-503
- Cwd: /Users/ronen/src/payments
- Artifact: ~/.lhc/artifacts/build-fix-payments-rollout-503-2026-04-20T15-02-44Z.md
- Classification: code
- Bug labels: deployment_release_bug, api_contract_bug
- Severity: blocking
- Origin: regression
- Defect surface: backend/domain, deployment
- Fix strategy: rollout/rollback, logic change
- Verdict: approved
- Next skill: let-him-cook:lhc-ralplan
- Pass to next skill:
    triage-artifact=~/.lhc/artifacts/build-fix-payments-rollout-503-2026-04-20T15-02-44Z.md
    bug-labels=deployment_release_bug,api_contract_bug
    severity=blocking
    origin=regression
    defect-surface=backend/domain,deployment
    fix-strategy=rollout/rollback,logic change
```

## Example (terminal — lhc-research)

```
LHC HANDOFF
- Completed: research
- Slug: session-token-refresh-pattern
- Cwd: /Users/ronen/src/identity-service
- Artifact: ~/.lhc/artifacts/research-session-token-refresh-pattern-2026-04-20T12-00-00Z.md
- Confidence: high
```

No next skill line when the question is answered; the user can decide whether to plan from here.

## Example (lhc-interview → classified skill)

```
LHC HANDOFF
- Completed: interview
- Cwd: /Users/ronen/src/payments
- Classification: build-fix
- Readiness: ready
- Context clues: PR #84523 build failing, devex link mentioned
- Next skill: let-him-cook:lhc-build-fix
- Pass to next skill:
    cwd=/Users/ronen/src/payments
    context-clues=PR #84523 build failing
```

Interview does not save an artifact under `~/.lhc/artifacts/` (classification is transient), so the handoff substitutes the classification + context clues for an artifact path.

## Why a block, not prose

Machine-parseable structure. A future caller — human or agent — can grep the terminal scrollback for `LHC HANDOFF` and pick out `Artifact:` on its own line. Prose like "I saved the plan to some-path and you should run lhc-ralph next" loses under compaction.

## When NOT to print a handoff

- The workflow errored out before producing an artifact. Print the error and the reason, not a handoff block. The user should not copy-paste the handoff if there's nothing to hand off.
- The workflow was a read-only snapshot (`lhc-status`). Print the snapshot and recommend a next skill inline.
- The workflow was user-aborted. Acknowledge the abort and stop.
