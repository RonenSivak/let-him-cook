---
name: lhc-review
description: Routes a plan, diff, investigation, or conclusion to the counterpart model for mandatory peer review, and saves the verdict to ~/.lhc/artifacts/review-*.md. Use as the final gate before presenting an LHC artifact as approved. Does not modify the reviewed artifact or implement suggestions.
when_to_use: An existing LHC artifact (plan, diff, investigation, conclusion) needs counterpart-model sign-off before being presented as final.
---

# LHC Review

Final peer-review gate. Routes an input artifact to the counterpart model, captures the verdict, persists a review artifact. Never modifies the input. Never implements reviewer suggestions.

<Iron_Law>
NO MODIFICATION OF THE REVIEWED ARTIFACT. The reviewer records the verdict; it does not edit the input. Applying reviewer suggestions is the user's call, not this skill's.

NO SELF-APPROVAL. If the counterpart CLI is missing, the verdict is `degraded` — not `approved`. Missing coverage must be named in the review artifact.

TWO-STAGE REVIEW FOR DIFFS. For `code-review` mode, run two distinct passes: (1) **spec-compliance** — does the diff satisfy every acceptance criterion in the plan? (2) **code-quality** — is the diff correct, idiomatic, and minimal? These are separate invocations of `peer-review.sh` with focused prompts. Evidence: Superpowers' two-stage pattern (spec then quality), Huang et al. ICLR 2024 on narrowly-scoped review instructions outperforming open-ended critique.

GROUND IN EVIDENCE, NOT OPINION. The review artifact records what the reviewer said verbatim plus which executable evidence was consulted (test runs, diff context, plan acceptance criteria). Free-form "looks good" is not a verdict.

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
</Required_Reading>

<Use_When>
- A plan is drafted and needs external sign-off before execution.
- A diff is ready and needs second-model code review.
- An investigation has a conclusion that needs a second pair of eyes.
- Any workflow artifact needs the mandatory peer-review gate before being presented as final.
</Use_When>

<Do_Not_Use_When>
- The input doesn't exist yet — run the producing workflow first.
- The user wants suggestions applied automatically — this skill only records the verdict.
</Do_Not_Use_When>

<Execution_Policy>
- MUST NOT modify the reviewed artifact.
- MUST capture the verdict as one of `approved`, `approved-with-changes`, `rejected`, `degraded`.
- If the counterpart CLI is missing, mark the verdict `degraded` and still save the artifact.
- MUST save the review artifact at `~/.lhc/artifacts/review-<slug>-<UTC-ISO>.md` before stopping.
- MUST NOT implement any reviewer suggestion — that is the user's decision.
</Execution_Policy>

## Default Counterpart Route

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow review --source workflow --cwd "$PWD" --task "<input-path>" --peer-review-required
   ```

2. **Route by leader** — use the background-bash pattern (see `../shared/peer-review-governance.md`); reviews typically take 30-180s.

   Inside Claude Code (default):
   ```
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode <mode> --cwd \"$PWD\" --prompt-file <input-path>",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput(bash_id) every 10-20s until "## Verdict" appears.
   ```

   Inside Codex, the equivalent uses `shell` with `&` + `tail -f` on the log path.

   `peer-review.sh` mirrors all reviewer output to `~/.lhc/logs/peer-review/<mode>-<UTC>.log` and prints `[peer-review] streaming to: <path>` to stderr on start. **Surface that path to the user immediately** so they can `tail -f` it while the counterpart thinks. Set `LHC_PEER_REVIEW_NO_LOG=1` only if a caller needs pristine stdout.

   **For live streaming of the counterpart's output into the chat**, launch `peer-review.sh` with `run_in_background: true` and attach the `Monitor` tool to the log file, e.g.:
   ```
   tail -F <log-path> | grep -E --line-buffered "thinking|tool_use|error|verdict|approved|rejected|^#"
   ```
   Prefer this pattern for long reviews (>30s) or when the user has asked to see the reviewer's reasoning. For quick reviews, the default foreground call is fine and the log path is enough.

3. **For `code-review` mode, run two stages** (one call each, scoped prompts):
   - **Stage 1 — Spec compliance.** Prompt the counterpart with: the plan's acceptance criteria + the diff + a checklist asking "for each criterion N, does the diff satisfy it? Cite file:line evidence. If unmet, flag." Record verdict.
   - **Stage 2 — Code quality + standards compliance.** Prompt the counterpart with: the diff + the standards brief (`~/.lhc/artifacts/standards-<slug>-<UTC-ISO>.md`, if one exists) + a checklist asking "(a) correctness, minimality, test coverage against acceptance criteria; (b) adherence to the brief's Applied Rulings; (c) any violation of the brief's Non-negotiables (security, a11y, Wix SDK). Call out smells." Record verdict. If no standards brief exists and the change modifies source files, note this as a gap in the review artifact — it is a missed gate, not an automatic block.
   - The overall verdict is `approved` only if both stages are `approved` or `approved-with-changes`.

   For non-diff modes (`plan`, `investigation`, `conclusion`, `analysis`) a single pass is sufficient.

4. **Capture and classify** the reviewer's output(s) into a verdict.

5. **Save the review artifact** at `~/.lhc/artifacts/review-<slug>-<UTC-ISO>.md`. Include: input path, mode, leader, per-stage verdicts (if two-stage), overall verdict, key findings (verbatim from reviewer where possible), residual risks, explicit "missing coverage" line if degraded.

6. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow review --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<review-artifact-path>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```

7. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: review
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <review-artifact-path>
   - Reviewed input: <input-artifact-path>
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   ```

   Review is terminal — the user decides what to do with the verdict (revise and re-review, proceed to execute, abandon).

<Final_Checklist>
- [ ] Input artifact was NOT modified
- [ ] For `code-review`: both spec-compliance and code-quality stages ran and have recorded verdicts
- [ ] Verdict classified (overall = strongest shared level)
- [ ] Review artifact saved under `~/.lhc/artifacts/`
- [ ] If degraded, missing coverage is explicit
</Final_Checklist>
