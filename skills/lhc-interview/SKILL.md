---
name: lhc-interview
description: Classifies a vague Wix internal engineering request, runs readiness, and routes to the right LHC skill. Use when the request is ambiguous ("help with this", "what should I do"), or when the user explicitly says "interview" or "help me pick a workflow". Does not implement, research, plan, or investigate.
when_to_use: The request is ambiguous and could map to multiple LHC workflows. Never runs if the workflow is already obvious.
---

# LHC Interview

Intake surface for broad or ambiguous Wix internal engineering requests. Classifies, checks readiness, and tells the user which LHC skill to invoke next. Never implements.

<Iron_Law>
NO IMPLEMENTATION INSIDE INTERVIEW. This skill classifies and routes. It never plans, researches, investigates, or edits files.

INTERVIEW NAMES THE DOWNSTREAM SKILL VIA THE HANDOFF; IT NEVER INVOKES OTHER SKILLS. The user (or the host) takes the handoff and decides whether to invoke the named next skill. Auto-invoking another skill from inside interview defeats the JIT-routing purpose and is forbidden.

ONE CLARIFYING QUESTION MAX. If you need more than one question to classify, the user's request is not actually LHC-shaped — say so and offer the plain Claude Code path.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/handoff-protocol.md`
- `../shared/wix-tool-surfaces.md`
- `../shared/research-intent-taxonomy.md`
- `../shared/feature-type-taxonomy.md`
- `../shared/bug-fix-taxonomy.md`
</Required_Reading>

<Use_When>
- The user's request is vague, ambiguous, or unclear ("help with this", "what should I do", "I'm not sure where to start") and could map to multiple workflows.
- You genuinely cannot tell whether to plan, investigate, research, or triage.
- The user has not named a specific LHC skill but the request is clearly Wix engineering work.
- The user explicitly says "interview" or "help me pick a workflow".
</Use_When>

<Do_Not_Use_When>
- The workflow is obvious from the request — go straight to it.
- The user already named a workflow ("plan this", "research this") — invoke that skill directly.
</Do_Not_Use_When>

<Execution_Policy>
- MUST NOT implement, edit source files, or invoke any skill other than the readiness scripts.
- MUST produce a one-block classification output and stop.
- MAY ask at most one clarifying question via `AskUserQuestion` before classifying.
- If readiness is blocked, MUST print the install checklist. MUST NOT proceed to the next skill unless the user explicitly says to continue in degraded mode in the same turn.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow interview --source workflow --cwd "$PWD" --task "<user request>"
   ```

2. **Classify** the request into exactly one of:

   | Workflow | Skill | Use when |
   |----------|-------|----------|
   | investigate | `lhc-investigate` | prod issue, logs, metrics, request-ID RCA |
   | build-fix | `lhc-build-fix` | failing PR build, CI, release, rollout |
   | research | `lhc-research` | programmer research where the next action is understanding, source-backed recommendation, prior-art discovery, or internal context; labels include `learn_concept`, `internal_best_practice`, `codebase_understanding`, `design_decision`, `rfc_review`, `compare_options`, `verify_correctness`, `integration_research`, `migration_upgrade`, `testing_strategy`, `planning_estimation`, `documentation_communication` |
   | standards | `lhc-standards` | "what's the right pattern here", coding-convention guidance before a diff |
   | ralplan | `lhc-ralplan` | substantial change needing an upfront plan |
   | ralph | `lhc-ralph` | user has a saved plan and wants to implement |
   | team | `lhc-team` | task splits into independent parallel lanes |
   | review | `lhc-review` | final peer-review gate on a plan, diff, or conclusion |

   Use `../shared/research-intent-taxonomy.md` to classify programmer research by intended post-research action. Do not route to `lhc-research` when the user already wants a code-changing plan (`lhc-ralplan`), live production RCA (`lhc-investigate`), build triage (`lhc-build-fix`), or final peer review (`lhc-review`).

   ## Feature Type Classification

   If the request asks to build, add, implement, design, plan, migrate, or improve a feature, classify the capability first using `../shared/feature-type-taxonomy.md`:
   - Feature labels: primary label plus any secondary labels that materially change risk or verification.
   - Audience: who the feature is for.
   - Layers: where the feature lives.
   - Feature routing rationale: why the labels imply the selected workflow.

   Route feature requests after classification:
   - Code-changing feature or substantial product/platform change -> `lhc-ralplan`.
   - Feature research without an immediate code-changing plan -> `lhc-research` and pass both research intent and feature labels.
   - Live production symptom -> `lhc-investigate`, even if the eventual fix is `reliability_resilience`, `observability_operations`, or `performance_scalability`.
   - Build/CI/release failure -> `lhc-build-fix`.
   - Existing reviewed plan ready for implementation -> `lhc-ralph`.

   ## Bug Fix Classification

   If the request asks to fix, debug, repair, stop a regression, make broken behavior work again, or explain a failure before fixing it, classify the bug first using `../shared/bug-fix-taxonomy.md`:
   - Bug labels: primary label plus any secondary labels that materially change risk, ownership, or verification.
   - Severity: user/data/security/money/availability impact.
   - Origin: why it likely appeared now, or `unknown` when evidence is not available yet.
   - Defect surface: where the defect appears to live.
   - Fix strategy: the likely class of remediation.
   - Bug routing rationale: why the labels imply the selected workflow.

   Route bug-fix requests after classification:
   - Live production symptom, request ID, logs, metrics, traces, on-call page, or incident -> `lhc-investigate`; labels are hypotheses until evidence proves root cause.
   - Build/CI/release/rollout failure -> `lhc-build-fix`; keep the build bucket separate from bug labels.
   - Any code-changing bug fix that is not a live production investigation or build/release triage -> `lhc-ralplan`, even when focused; the plan can be small, but it must preserve the reproduction and regression oracle.
   - Existing reviewed bug-fix plan ready for execution -> `lhc-ralph`.
   - Source-backed explanation of a historical or non-live bug pattern without immediate code change -> `lhc-research` with research intent `debug_issue`.

3. **Detect context clues** — cwd/repo, PR/build/Jira IDs, service/artifact names in the request.

4. **Run readiness**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/check-readiness.js <workflow> --json
   ```

5. **Output the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: interview
   - Cwd: <pwd>
   - Classification: <workflow>
   - Feature labels: <primary label>[, <secondary label>...]   (if feature request)
   - Audience: <audience values>                               (if feature request)
   - Layers: <layer values>                                    (if feature request)
   - Feature routing rationale: <why this route fits>           (if feature request)
   - Bug labels: <primary label>[, <secondary label>...]       (if bug-fix request)
   - Severity: <severity values>                               (if bug-fix request)
   - Origin: <origin values or unknown>                         (if bug-fix request)
   - Defect surface: <surface values>                           (if bug-fix request)
   - Fix strategy: <strategy values>                            (if bug-fix request)
   - Bug routing rationale: <why this route fits>               (if bug-fix request)
   - Readiness: <ready|blocked|degraded>
   - Context clues: <short list — PR numbers, service names, request IDs>
   - Next skill: let-him-cook:lhc-<workflow>
   - Pass to next skill:
       cwd=<pwd>
       feature-labels=<labels>      (if feature request)
       audience=<audience>          (if feature request)
       layers=<layers>              (if feature request)
       bug-labels=<labels>           (if bug-fix request)
       severity=<severity>           (if bug-fix request)
       origin=<origin>               (if bug-fix request)
       defect-surface=<surface>      (if bug-fix request)
       fix-strategy=<strategy>       (if bug-fix request)
       context-clues=<short list>
   ```

   The `Pass to next skill` block makes the context machine-parseable so the next skill can pick it up without re-classifying.

<Final_Checklist>
- [ ] Classification recorded in the session state file
- [ ] Feature labels, audience, layers, and routing rationale recorded when the request is a feature
- [ ] Bug labels, severity, origin, defect surface, fix strategy, and routing rationale recorded when the request is a bug fix
- [ ] Readiness reported honestly (no silent degraded mode)
- [ ] No source file touched
- [ ] User told exactly which skill to invoke next
</Final_Checklist>
