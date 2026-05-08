---
name: lhc-ralplan
description: Produces a peer-reviewed plan artifact at ~/.lhc/plans/ralplan-*.md for substantial Wix internal engineering work. Use when the user says "plan this", "ralplan", "design before we code", or describes a change broad enough that jumping into code would cause rework. Does not implement, edit source files, or invoke executor skills.
when_to_use: The user wants an up-front plan for a non-trivial Wix change, or the change touches multiple files/services/owners, or the change needs explicit acceptance criteria and peer review before code is written.
---

# LHC RALPlan

Substantial plans that need internal research, repo context, and a durable local artifact before any code is touched. This skill PRODUCES a plan file and STOPS. It never implements.

<Iron_Law>
NO PLAN IS APPROVED WITHOUT PEER REVIEW. Counterpart review via `peer-review.sh` is preferred. If the counterpart is unavailable, the separate-context `strict-peer-reviewer` fallback must run and the plan must record degraded counterpart coverage. A plan with `peer_review: pending` is a draft, not a plan. Saving the file is not sign-off.

NO STUB LANGUAGE. "TBD", "TODO", "similar to above", "implement later" are plan failures. Revise or stop.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/handoff-protocol.md`
- `../shared/subagent-catalog.md`
- `../shared/notepad-schema.md`
- `../shared/feature-type-taxonomy.md`
- `../shared/bug-fix-taxonomy.md`
</Required_Reading>

<Use_When>
- The user says: "plan this", "let's plan", "ralplan", "design this", "before we code".
- The change touches multiple files, services, or ownership boundaries.
- The task needs explicit acceptance criteria, verification steps, and peer review before implementation.
- The task is a code-changing bug fix routed from `lhc-interview`; use a small regression-first plan even when the code scope is focused.
</Use_When>

<Do_Not_Use_When>
- A plan file already exists under `~/.lhc/plans/` and the user wants to execute — use `lhc-ralph`.
- The work is a trivial typo/doc edit with no feature or bug-fix semantics — skip planning, let the caller implement directly.
- The user is asking a research question — use `lhc-research`.
- The user is investigating a prod issue — use `lhc-investigate`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST write the plan to `~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md` before stopping.
- MUST NOT edit, create, or delete any file outside of `~/.lhc/`.
- MUST NOT invoke `lhc-ralph`, `lhc-team`, or any execution skill from within this skill.
- MUST route the plan to counterpart peer review via `scripts/peer-review.sh` before marking it approved. If counterpart review cannot complete, MUST use the strict local fallback from `../shared/peer-review-governance.md` before returning degraded.
- If the user says "just implement it", refuse and tell them to invoke `lhc-ralph` after the plan is saved.
- If required MCPs are missing, hard-stop unless the user explicitly says to continue in degraded mode in the same turn.
- A plan must be executable as-written. Stub language ("TBD", "TODO", "implement later", "TBD by team") is a plan failure — revise instead.
- Every acceptance criterion must be concrete and testable (90%+). Every claim about existing code must cite a file path (80%+).
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow ralplan --source workflow --cwd "$PWD" --task "<user request>" --peer-review-required
   ```

2. **Run readiness**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/check-readiness.js ralplan --json
   ```

3. **Ensure runtime**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/ensure-runtime.js >/dev/null
   ```

3a. **Feature Type Classification** — if the requested change is a feature, classify it before evidence gathering using `../shared/feature-type-taxonomy.md`:
   ```
   Feature labels: <primary label>[, <secondary label>...]
   Audience: <audience values>
   Layers: <layer values>
   Feature routing rationale: <why these labels imply this planning path>
   Feature planning implications: <acceptance criteria, risk, standards, and verification consequences>
   ```

   Use the classification to decide what evidence and verification the plan needs. Examples:
   - Auth, permissions, billing, privacy, governance, and enterprise labels require explicit security/privacy/compliance criteria.
   - Notifications, integrations, background jobs, reliability, and observability labels require retry, idempotency, monitoring, and failure-mode criteria.
   - Search, reporting, import, and performance labels require data-volume, pagination/indexing, and performance criteria.
   - UI, onboarding, localization/accessibility, and mobile labels require accessibility, responsive, loading/empty/error state, and device/locale criteria.
   - Migration, configuration, and feature lifecycle labels require rollout, rollback, and compatibility criteria.

3b. **Bug Fix Classification** — if the requested change fixes broken behavior, classify it before evidence gathering using `../shared/bug-fix-taxonomy.md`:
   ```
   Bug labels: <primary label>[, <secondary label>...]
   Severity: <severity values>
   Origin: <origin values or unknown>
   Defect surface: <surface values>
   Fix strategy: <strategy values>
   Bug routing rationale: <why these labels imply this planning path>
   Bug verification implications: <regression, data repair, rollout, observability, and review consequences>
   ```

   Use the classification to decide what evidence and verification the plan needs. Examples:
   - Every bug-fix plan requires a reproduction path, expected vs actual behavior, and a regression test or executable check that fails before the fix.
   - Data, database, migration, billing, and analytics labels require an explicit data repair/reconciliation decision.
   - Auth, permission, security, privacy, abuse, and governance labels require security/privacy/compliance acceptance criteria.
   - Concurrency, distributed systems, cache, integration, notification, and workflow labels require idempotency, ordering, retry, and duplicate-processing criteria.
   - Performance, resource leak, and scalability labels require benchmark/profile/load evidence or an explicit lighter-check rationale.
   - UI, UX, accessibility, localization, and device labels require user-visible state, viewport, keyboard, locale, browser, or device criteria.
   - Build, config, deploy, compatibility, and regression labels require environment/version/release-window evidence.

4. **Ground the plan in evidence** — dispatch subagents in parallel when lanes are independent:
   - `Task(subagent_type="let-him-cook:internal-docs-researcher", …)` for docs-schema
   - `Task(subagent_type="let-him-cook:repo-cartographer", …)` for octocode / repo archaeology
   - `Task(subagent_type="let-him-cook:framework-standards-reviewer", …)` for convention checks
   - `Task(subagent_type="let-him-cook:architect", …)` for boundary review when the change is structural

   **Optional ticket context (READ-ONLY)**: if the user references a Jira ticket (or one is obvious from the request), pull it in via `jira` → `get-issues` and use the description / acceptance criteria as primary requirements input for the plan. Cite the ticket key in the plan's ADR "Drivers" block. Do NOT call `create-issue`, `comment-on-issue`, `transition-issue`, or any other mutating jira tool.

4a. **Standards brief** — if the plan will modify source files (not docs/config only), invoke `Skill("let-him-cook:lhc-standards")` with the target files, feature area, feature labels from step 3a, and bug labels from step 3b when present. The brief will be saved at `~/.lhc/artifacts/standards-<slug>-<UTC-ISO>.md` and MUST be referenced from the plan's *Implementation steps* section. `lhc-ralph` reads the brief during execution; `lhc-review` reads it during review. Skip this step for doc-only or config-only plans.

4b. **Clarification gate** — after evidence is gathered and before the plan is written, walk the **gate triggers** below. If any trigger fires, STOP, surface clarifying questions to the user via `AskUserQuestion`, and do NOT continue to step 5 until the user has answered (in this turn or a follow-up). Borrowed from `anthropics/claude-plugins-official` feature-dev — Phase 3 hard-blocks before design specifically because plans built on ambiguous inputs produce confident-looking but load-bearing-wrong artifacts that waste a peer-review cycle and an execution cycle.

   **Gate triggers (any one is sufficient to block):**

   1. **Classification is ambiguous** — feature labels split between two primary labels, or bug labels split between two primary buckets, AND the planning implications materially diverge (different acceptance criteria, different verification path). One example: "auth bug vs session-management bug" — the regression test is different.
   2. **Acceptance criteria are not derivable from evidence** — the user request, the Jira ticket (when attached), and the gathered evidence do not yet pin down what "done" looks like for at least one substantial part of the change.
   3. **Two materially different design directions were considered** in evidence-gathering and the choice changes the file scope, the test scope, or which standards rulings apply. Do NOT silently pick one.
   4. **Required context is missing** — the user referred to something the agent could not locate (e.g. "do it like X service does it" but X service was not found in `repo-cartographer`'s output, or "match the new ADR" but no ADR was returned by `internal-docs-researcher`).
   5. **External-write authorization is implied but not given** — the request reads like it expects writes to Jira / Slack / Grafana / GitHub but the user did not explicitly authorize a specific write in this turn. Ask which writes (if any) the plan should call out as required steps the user will perform after the plan is approved.

   **Gate output (when triggered):**

   Surface a numbered list of clarifying questions, each in the form:

   ```
   Q<N>. <one-sentence ambiguity statement, with the two or three options the user can pick from>
         Why this matters: <how the answer changes the plan>
         If unanswered: <what default would be applied — but the gate prefers answers, not defaults>
   ```

   Use `AskUserQuestion` to surface the top 1–4 questions interactively. Save the questions to a working file at `~/.lhc/state/sessions/<sid>/ralplan-clarify.md` so the gate can re-trigger across turns without losing context.

   **Gate non-triggers (do NOT block):**

   - The diff scope is small and entirely derivable from the user's one-line request.
   - The classification is unambiguous and the evidence directly supports the acceptance criteria.
   - The user already answered every gate question in the same turn (re-running the gate after the answer should pass).

   **No fishing for ambiguity.** Do NOT invent questions to seem thorough. If every gate trigger is genuinely false, skip the gate and proceed. Three or fewer questions is the target; more than four means evidence-gathering was insufficient — go back to step 4 instead.

5. **Write the plan file** at `~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md`. Required sections:
   - Title + one-paragraph goal
   - **Feature Type Classification** (when the request is a feature):
     ```
     Feature labels: <primary label>[, <secondary label>...]
     Audience: <audience values>
     Layers: <layer values>
     Feature routing rationale: <why this is the right planning path>
     Feature planning implications: <acceptance criteria, risk, standards, and verification consequences>
     ```
   - **Bug Fix Classification** (when the request is a bug fix):
     ```
     Bug labels: <primary label>[, <secondary label>...]
     Severity: <severity values>
     Origin: <origin values or unknown>
     Defect surface: <surface values>
     Fix strategy: <strategy values>
     Bug routing rationale: <why this is the right planning path>
     Bug verification implications: <regression, data repair, rollout, observability, and review consequences>
     ```
   - Acceptance criteria (numbered, testable, concrete)
   - **Standards brief link** (when step 4a ran): reference the artifact path so `lhc-ralph` and `lhc-review` read the same contract
   - Implementation steps (each with file paths; no stubs; reference standards brief per-file guidance where applicable)
   - Risks + mitigations
   - Verification commands (copy-pasteable)
   - ADR block: Decision, Drivers, Alternatives considered, Why chosen, Consequences, Follow-ups

6. **Peer review** — route the plan to the counterpart model. Use Claude Code's background-bash pattern (see `../shared/peer-review-governance.md`) because plan reviews typically take 60-180s.

   **Adversarial mode is decided by the orchestrator, not the user.** The LLM evaluates the auto-trigger rules below against the plan's classification and content, then either prepends the **Adversarial overlay for plans** block to a separate `<adversarial-prompt-path>` or runs the standard plan review. The orchestrator records the decision and reasoning in the artifact's Peer Review section (`Review stance: adversarial (<reason>)` or `Review stance: standard`).

   **Auto-trigger rules** — adversarial mode activates when ANY of:
   - feature labels include `auth`, `permissions`, `billing`, `privacy`, `governance`, `enterprise` (security/compliance plans)
   - bug labels include `data_corruption`, `security_bug`, `auth_bug`, `privacy_bug`, `migration_bug`, `concurrency_bug`, `distributed_system_bug`
   - severity is `blocking` or `critical`
   - the plan touches money flows, user-data export/deletion, or rollout-irreversible migrations
   - the plan introduces a new abstraction or boundary (new package, new service, new public API surface)
   - the clarification gate fired in step 4b (ambiguity in the request usually means the chosen design is one of several reasonable readings — pressure-test it)
   - the plan has 8+ implementation steps OR touches 5+ packages (large blast radius)

   **User override (natural language only, no CLI flags).** If in the same turn the user explicitly says "skip the adversarial review", "don't pressure-test this", or equivalent, the orchestrator records `Review stance: standard (user override: <quote>)` and runs the standard review. If the user explicitly asks "review this adversarially" or "challenge the design", the orchestrator activates adversarial mode and records `Review stance: adversarial (user override: <quote>)`. No flags are exposed; intent is interpreted from natural language in the same turn.

   ```
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode plan --cwd \"$PWD\" --prompt-file <plan-path-or-adversarial-prompt-path>",
     run_in_background: true,
     timeout: 600000
   )
   → then poll with BashOutput(bash_id) every 10-20s until the "## Verdict" section appears.
   ```

   Capture the `[peer-review] ... log=<path>` line from stderr; that's your recovery trail if BashOutput stops streaming.
   If counterpart review fails because the CLI is missing, out of tokens, rate-limited, timed out, crashed before a verdict, or returned an unparseable verdict, run the strict local fallback from `../shared/peer-review-governance.md` and record `Review route: strict-local-fallback`, `Counterpart coverage: degraded`, and `Counterpart failure: <missing cli|token limit|rate limit|timeout|crash|unparseable verdict>`.
   If strict local fallback also cannot run, record `Verdict: degraded`, `Review route: degraded-none`, `Counterpart coverage: degraded`, and the exact `Counterpart failure`.
   If rejected, revise and re-review up to 3 times. If still rejected, save the latest plan, record the verdict, and stop.
   Append a final **Peer Review** section to the plan with verdict, Review route, Counterpart coverage, Counterpart failure when applicable, key findings, and **`Review stance: standard` or `Review stance: adversarial (<auto-trigger reason or user override quote>)`**.

   ### Adversarial overlay for plans

   When adversarial mode is active, the prompt-file passed to `peer-review.sh` is the plan content with this block prepended verbatim:

   ```text
   Adversarial stance for plan review:
   You are reviewing this plan as a skeptic, not a checker. Pressure-test the
   design choices, not just the spec coverage. For each non-trivial choice:
   - Why this approach and not the obvious alternative? Is the alternative
     cited in the ADR's "Alternatives considered" block, or silently skipped?
   - What invariant or constraint makes this choice load-bearing? Is that
     invariant actually true in the rest of the codebase the plan touches?
   - Where does the plan add complexity that the acceptance criteria did not
     require?
   - What edge case or failure mode is the plan confident about that has no
     verification command or test?
   - Which acceptance criterion will be the first thing the executor cuts
     when ralph hits the 3-retry cap?

   Surface findings as [major] when the design choice has a material downside
   the plan appears to have missed, [minor] when there is a defensible
   alternative worth considering, and [nit] when it is a genuine matter of
   taste. Do NOT use [blocker] in adversarial mode unless the design choice
   causes incident-level harm — otherwise adversarial findings inflate
   severity past usefulness.

   Pattern borrowed from openai/codex-plugin-cc's adversarial-review command,
   adapted to plans rather than diffs.
   ```

7. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow ralplan --slug "<slug>" --cwd "$PWD" \
     --kv plan="<plan-path>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```

8. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: ralplan
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <plan-path>
   - Standards brief: <brief-path>    (if step 4a ran)
   - Feature labels: <primary label>[, <secondary label>...]   (if step 3a ran)
   - Audience: <audience values>                               (if step 3a ran)
   - Layers: <layer values>                                    (if step 3a ran)
   - Bug labels: <primary label>[, <secondary label>...]       (if step 3b ran)
   - Severity: <severity values>                               (if step 3b ran)
   - Origin: <origin values or unknown>                         (if step 3b ran)
   - Defect surface: <surface values>                           (if step 3b ran)
   - Fix strategy: <strategy values>                            (if step 3b ran)
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   - Next skill: let-him-cook:lhc-ralph
   - Pass to next skill:
       plan=<plan-path>
       standards-brief=<brief-path>   (if applicable)
       feature-labels=<labels>         (if applicable)
       audience=<audience>             (if applicable)
       layers=<layers>                 (if applicable)
       bug-labels=<labels>              (if applicable)
       severity=<severity>              (if applicable)
       origin=<origin>                  (if applicable)
       defect-surface=<surface>         (if applicable)
       fix-strategy=<strategy>          (if applicable)
   ```

   Do NOT invoke `lhc-ralph` yourself — the user decides when to execute.

<Final_Checklist>
- [ ] Plan file exists under `~/.lhc/plans/`
- [ ] Clarification gate ran; either no triggers fired, or every triggered question was answered before the plan was written
- [ ] Feature labels, audience, layers, routing rationale, and planning implications recorded when the request is a feature
- [ ] Bug labels, severity, origin, defect surface, fix strategy, routing rationale, and verification implications recorded when the request is a bug fix
- [ ] Bug-fix acceptance criteria include reproduction, expected vs actual behavior, and a regression oracle
- [ ] Acceptance criteria are numbered, testable, concrete (90%+)
- [ ] File paths cited on 80%+ of claims about existing code
- [ ] All risks have a mitigation
- [ ] Peer-review verdict recorded in the plan file
- [ ] Peer Review section records Review route, Counterpart coverage, and Counterpart failure when applicable
- [ ] ADR section present
- [ ] No stub language ("TBD", "TODO", "implement later") anywhere in the plan
- [ ] No source file in the working repo was modified
- [ ] Notepad entry appended
</Final_Checklist>
