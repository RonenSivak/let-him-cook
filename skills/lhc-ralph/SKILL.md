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

4. **Execution loop** — for each step in the plan:
   - If the plan has a **Bug Fix Classification**, keep the bug labels, severity, origin, defect surface, and fix strategy in the step prompt. The failing test must reproduce the reported wrong behavior, not merely cover the edited function.
   - **Write the failing test first.** Create or identify the test that encodes the acceptance criterion. Run it. Confirm it fails for the *right* reason (not a setup error). If the test passes before implementation, the test is wrong — rewrite it. For bug fixes, record the expected vs actual behavior from the reproduction.
   - Dispatch `Task(subagent_type="let-him-cook:executor", prompt=<step + file anchors + failing-test output + acceptance bits>)` for bounded edits.
   - Run the verification command(s) from the plan. Read the full output.
   - If verification fails, dispatch `Task(subagent_type="let-him-cook:debugger", …)` for root cause, then fix via `executor`. **Hard cap: 3 retries per step.** After 3 failed retries, STOP the step and surface the failure — do not attempt fix #4.
   - Record `steps[n].attempts` and `steps[n].verification` in the session state.

5. **Verify against the whole plan** — dispatch `Task(subagent_type="let-him-cook:verifier", …)` to gate each acceptance criterion against fresh evidence.

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
   - peer-review verdict, Review route, Counterpart coverage, and Counterpart failure when applicable
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
   ```

   No Next skill line — ralph is terminal. The user takes the diff from here (commit, PR, whatever).

<Final_Checklist>
- [ ] Plan file was read and used as the spec
- [ ] Every acceptance criterion has a corresponding test that was observed failing BEFORE implementation
- [ ] For bug fixes, the failing test or executable reproduction matched the reported wrong behavior before the fix
- [ ] Every acceptance criterion has a passing verification command (fresh run, not remembered)
- [ ] No step exceeded 3 retries
- [ ] Peer-review verdict is `approved` or `approved-with-changes` after fixes, with Review route, Counterpart coverage, and Counterpart failure recorded when applicable
- [ ] Execution artifact saved under `~/.lhc/artifacts/`
- [ ] Notepad entry appended
- [ ] State file under `~/.lhc/state/sessions/<session-id>/ralph.json` marks completion
</Final_Checklist>
