---
name: lhc-ralph
description: Executes a plan saved at ~/.lhc/plans/ with an iterative implement-verify-fix loop, then gates on peer review. Use when a plan file exists and the user says "implement", "execute the plan", "ralph", or "run it". Refuses to run without a plan file.
when_to_use: The user has a saved plan and wants it implemented end-to-end with verification. Never runs without a plan file under `~/.lhc/plans/`.
---

# LHC Ralph

Executes a plan that already exists in `~/.lhc/plans/`. Iterates implement → verify → fix until acceptance criteria pass, then gates on peer review. Counterpart review is preferred; strict local fallback is allowed only when the counterpart cannot run.

<Iron_Law>
NO EXECUTION WITHOUT A PLAN FILE. Inventing the plan inline is forbidden. If no plan exists under `~/.lhc/plans/`, stop and tell the user to run `lhc-ralplan` first.

WRITE A FAILING TEST FIRST. For every acceptance criterion, write the test, run it, watch it fail, then implement. Verification that counts is test output — not the agent's belief the code is correct. Evidence: Anthropic SWE-bench scaffold prompt, CodePRM (ACL 2025), Superpowers RED-GREEN-REFACTOR, Huang et al. ICLR 2024 (intrinsic self-correction degrades without an oracle).

SAME FIX FAILS 3× = STOP. If the same step fails three times, the plan is wrong. Escalate to `architect` review or return to `lhc-ralplan`. Do not attempt fix #4. Track per-step failure count in `~/.lhc/state/sessions/<sid>/ralph.json:steps[n].attempts`. Prompts alone do not stop loops — the count is enforced here.

TESTS ARE ORACLES, NOT SUGGESTIONS. A passing test the agent wrote without first watching fail is not verification — it's confirmation bias. If reported pass rate exceeds 95% first-try on a non-trivial step, treat it as suspicious and re-verify against an independent reproduction.

PROMPT-LEVEL PROMISE GATE BEFORE SUCCESS. After the verifier runs, the verifier MUST emit a `<promise>` XML block listing exactly what was verified — acceptance criteria checked, tests run with their pass/fail status, manual checks performed. The assistant then re-reads the diff and the verifier output and confirms the promise is factually accurate before declaring success. If any item in the promise is overstated, vague, or unverifiable, declare `step-blocked` instead of `verified-pass`. Borrowed from `anthropics/claude-plugins-official` ralph-loop. The XML marker is intentional: it forces the verifier to commit to a literal claim that cannot be quietly walked back.

EXACTLY ONE RALPH SESSION PER REPO PER MOMENT. Before starting iteration, check `~/.lhc/state/sessions/<other-sid>/ralph.json` files for any session whose `cwd` matches the current `$PWD` AND whose `status` is `running`. If one exists, STOP and surface the collision — concurrent ralph sessions on the same repo race on file edits. The user resolves: stop the other session, or run elsewhere.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/handoff-protocol.md`
- `../shared/notepad-schema.md`
- `../shared/commit-trailers.md`
- `../shared/bug-fix-taxonomy.md`
- `../../docs/runtime-contract.md`
</Required_Reading>

<Use_When>
- A plan file exists under `~/.lhc/plans/` and the user wants it implemented.
- The user explicitly invokes `ralph`, `execute`, `run the plan`, or similar.
- The task needs verification evidence and a counterpart-review gate before being called done.
</Use_When>

<Do_Not_Use_When>
- No plan file exists — tell the user to invoke `lhc-ralplan` first.
- The work is trivial (one-line doc edit, simple rename) and doesn't need the ralph loop.
- The task is pure research or investigation — use `lhc-research` or `lhc-investigate`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST read the plan file and treat it as authoritative. The plan is the spec, not a suggestion.
- MUST NOT invent a plan inline. If there is no plan file, STOP and tell the user to invoke `lhc-ralplan` first.
- MUST persist per-session state under `~/.lhc/state/sessions/<session-id>/ralph.json`.
- MUST iterate implement → verify → fix until acceptance criteria pass or the loop hits a bound.
- MUST produce an execution artifact at `~/.lhc/artifacts/execute-<slug>-<UTC-ISO>.md` before declaring success.
- MUST require peer review before presenting the implementation as complete. If counterpart review cannot complete, MUST use the strict local fallback from `../shared/peer-review-governance.md` before returning degraded.
- External systems stay read-only unless the plan explicitly authorizes a write.
- MUST NOT silently extend the plan. If the plan is missing a step needed to succeed, stop and surface the gap.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow ralph --source workflow --cwd "$PWD" --task "<plan-path or user request>" --peer-review-required
   ```

2. **Resolve the plan file** in this order:
   1. If the caller referenced an explicit plan path, use it.
   2. Else pick the newest `~/.lhc/plans/*.md` whose slug matches the user's task tokens.
   3. Else pick the newest `~/.lhc/plans/ralplan-*.md`.
   4. If nothing matches, STOP: "No plan found under `~/.lhc/plans/`. Invoke `lhc-ralplan` first."

3. **Ensure runtime**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/ensure-runtime.js >/dev/null
   ```

3a. **Concurrent-session collision check** — before iterating, scan other session state files for an in-flight ralph on the same `$PWD`:
   ```bash
   for sid in ~/.lhc/state/sessions/*/ralph.json; do
     [ -f "$sid" ] || continue
     other_cwd=$(node -e "const f=require('$sid');console.log(f.cwd||'')")
     other_status=$(node -e "const f=require('$sid');console.log(f.status||'')")
     if [ "$other_cwd" = "$PWD" ] && [ "$other_status" = "running" ] && [ "$sid" != "$HOME/.lhc/state/sessions/$LHC_SESSION_ID/ralph.json" ]; then
       echo "BLOCKED: another ralph session is in flight on this repo: $sid"
       exit 1
     fi
   done
   ```
   If a collision is detected, STOP and surface the other session's path. The user decides whether to terminate the other session (rare — usually means a stuck terminal) or run elsewhere. Do not proceed; concurrent file edits race.

4. **Execution loop** — for each step in the plan:
   - If the plan has a **Bug Fix Classification**, keep the bug labels, severity, origin, defect surface, and fix strategy in the step prompt. The failing test must reproduce the reported wrong behavior, not merely cover the edited function.
   - **Write the failing test first.** Create or identify the test that encodes the acceptance criterion. Run it. Confirm it fails for the *right* reason (not a setup error). If the test passes before implementation, the test is wrong — rewrite it. For bug fixes, record the expected vs actual behavior from the reproduction.
   - Dispatch `Task(subagent_type="let-him-cook:executor", prompt=<step + file anchors + failing-test output + acceptance bits>)` for bounded edits.
   - Run the verification command(s) from the plan. Read the full output.
   - If verification fails, dispatch `Task(subagent_type="let-him-cook:debugger", …)` for root cause, then fix via `executor`. **Hard cap: 3 retries per step.** After 3 failed retries, STOP the step and surface the failure — do not attempt fix #4.
   - Record `steps[n].attempts` and `steps[n].verification` in the session state.

5. **Verify against the whole plan** — dispatch `Task(subagent_type="let-him-cook:verifier", …)` to gate each acceptance criterion against fresh evidence.

5a. **Promise gate** — the verifier subagent MUST end its response with a `<promise>` block in this exact shape:

   ```text
   <promise>
   acceptance_criteria_verified:
     - criterion_1: <satisfied|partially|unmet> via <test path or command>
     - criterion_2: <satisfied|partially|unmet> via <test path or command>
   tests_run: <count>
   tests_passing: <count>
   tests_failing: <count>
   manual_checks: <count and one-line description each, or "none">
   regression_test_for_bug: <path or "n/a"> (required when the plan has a Bug Fix Classification)
   confidence: high|medium|low
   </promise>
   ```

   After the verifier returns, the coordinating agent re-reads the diff and the verifier's tool output and confirms each line of the promise is factually true:
   - Every cited test path exists and the verifier's reported pass/fail status matches the actual run output.
   - The `tests_passing + tests_failing` count equals `tests_run`.
   - For bug fixes, `regression_test_for_bug` points at a real failing-then-passing test that reproduces the reported wrong behavior.
   - No `acceptance_criteria_verified` entry is `unverifiable` or vague.

   If any check fails, the step is marked `verifier-overstated` and the loop returns to fix-mode (counts toward the per-step retry cap). A verifier that overstates twice in a row triggers an architect review — the plan is likely wrong, not the implementation. The promise gate is borrowed from `anthropics/claude-plugins-official` ralph-loop; the XML marker is intentional because it forces the verifier to commit to a literal, parseable claim that cannot be quietly walked back.

5b. **Simplification polish — orchestrator decides whether to run.** The orchestrator (NOT the user) evaluates the diff against the auto-trigger rules below; if any rule fires, dispatch `Task(subagent_type="let-him-cook:code-simplifier", prompt=<diff + standards-brief reference>)`. The agent emits `keep` / `consider` / `nit`-priority before/after blocks for clarity-only changes (nested ternaries, redundancy the diff introduced, misleading names, comments that restate the code). Behavior must be `preserved` for every suggestion; any suggestion that changes observable behavior is dropped, not applied.

   **Auto-trigger rules** — run the simplifier when ANY of:
   - source-file additions in the diff exceed 200 lines
   - the diff introduces 3+ new functions / methods / classes
   - the diff contains nested ternaries, dense one-liner functional chains, or comments that restate the code (detectable patterns)
   - the plan classification flagged the change as touching readability-sensitive areas (e.g. shared library, monorepo public package)

   **Skip when**: doc-only diff, config-only diff, generated-file-only diff, OR the user said "skip simplification" / "no polish pass" / equivalent in plain language in the same turn (the orchestrator records the override quote in the artifact).

   Application policy:
   - **`keep`-priority suggestions are NOT auto-applied.** They are surfaced in the execution artifact under a `## Simplification suggestions` section. The user decides whether to apply them.
   - The artifact records the suggestion list verbatim so the user can `Edit` apply them manually without re-deriving.
   - Suggestions do NOT count toward the per-step retry cap. They are post-correctness polish, not fix iterations.
   - If the simplifier returns zero `keep`-priority suggestions, the section reads "no simplifications recommended" and the loop continues.

6. **Peer review the final diff** — use the background-bash pattern (see `../shared/peer-review-governance.md`); diff reviews typically take 60-180s:
   ```
   git diff | head -400 > /tmp/lhc-ralph-diff.txt
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode code-review --cwd \"$PWD\" --prompt-file /tmp/lhc-ralph-diff.txt",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput until "## Verdict" appears.
   ```
   If counterpart review fails because the CLI is missing, out of tokens, rate-limited, timed out, crashed before a verdict, or returned an unparseable verdict, run the strict local fallback from `../shared/peer-review-governance.md`. For `code-review`, pass the plan acceptance criteria plus diff to fallback stage 1 and the diff plus standards brief to fallback stage 2. Record `Review route: strict-local-fallback`, `Counterpart coverage: degraded`, and `Counterpart failure: <missing cli|token limit|rate limit|timeout|crash|unparseable verdict>`.
   If strict local fallback also cannot run, record `Verdict: degraded`, `Review route: degraded-none`, `Counterpart coverage: degraded`, and the exact `Counterpart failure`.

7. **Write the execution artifact** at `~/.lhc/artifacts/execute-<slug>-<UTC-ISO>.md`. Include:
   - link to the plan file
   - bug labels, severity, origin, defect surface, and fix strategy when the plan contains a Bug Fix Classification
   - files touched (paths)
   - failing-test / reproduction output observed before the fix for each bug-fix acceptance criterion
   - verification commands run + truncated output
   - **verifier promise** verbatim (the `<promise>` block from step 5a)
   - **promise verification result** — list each promise line and whether the coordinating agent confirmed it (`confirmed` / `overstated: <what was wrong>`)
   - **simplification suggestions** (when step 5b ran) — list of `keep` / `consider` / `nit`-priority before/after blocks; "no simplifications recommended" when the simplifier returned zero entries; otherwise `Simplification stance: skipped (<auto-trigger reason or user override quote>)` capturing the orchestrator's decision
   - peer-review verdict, Review route, Counterpart coverage, and Counterpart failure when applicable
   - **stop reason** — exactly one of:
     - `verified-pass` — every step verified, peer-review approved.
     - `verified-with-changes` — every step verified, peer-review returned `approved-with-changes`.
     - `step-attempts-exhausted` — at least one step hit the 3-retry cap; loop stopped per Iron Law.
     - `verifier-overstated` — promise gate failed twice for the same step; architect escalation triggered.
     - `plan-blocker` — plan was missing a step needed for success; surfaced gap and stopped (per Execution_Policy).
     - `peer-review-rejected` — counterpart or strict fallback returned `rejected`; not retried.
     - `concurrent-session` — another ralph session was in flight on this repo (step 3a collision).
     - `manual-cancel` — user aborted.
     - `degraded-no-coverage` — verdict is degraded because peer-review and strict fallback both unavailable.
   - residual gaps

8. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow ralph --slug "<slug>" --cwd "$PWD" \
     --kv plan="<plan-path>" --kv artifact="<artifact-path>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```

9. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: ralph
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <execute-artifact-path>
   - Plan: <plan-path>
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   - Stop reason: <verified-pass|verified-with-changes|step-attempts-exhausted|verifier-overstated|plan-blocker|peer-review-rejected|concurrent-session|manual-cancel|degraded-no-coverage>
   ```

   No Next skill line — ralph is terminal. The user takes the diff from here (commit, PR, whatever).

<Final_Checklist>
- [ ] Plan file was read and used as the spec
- [ ] Concurrent-session collision check ran; no in-flight ralph on this `$PWD` from another session
- [ ] Every acceptance criterion has a corresponding test that was observed failing BEFORE implementation
- [ ] For bug fixes, the failing test or executable reproduction matched the reported wrong behavior before the fix
- [ ] Every acceptance criterion has a passing verification command (fresh run, not remembered)
- [ ] Verifier emitted a `<promise>` block; every line was confirmed against fresh tool output before declaring success
- [ ] No step exceeded 3 retries
- [ ] Peer-review verdict is `approved` or `approved-with-changes` after fixes, with Review route, Counterpart coverage, and Counterpart failure recorded when applicable
- [ ] Stop reason recorded in the artifact and the handoff block
- [ ] Execution artifact saved under `~/.lhc/artifacts/`
- [ ] Notepad entry appended
- [ ] State file under `~/.lhc/state/sessions/<session-id>/ralph.json` marks completion
</Final_Checklist>
