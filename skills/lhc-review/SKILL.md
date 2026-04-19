---
name: lhc-review
description: Routes a plan, diff, investigation, or conclusion to the counterpart model for mandatory peer review, and saves the verdict to ~/.lhc/artifacts/review-*.md. Use as the final gate before presenting an LHC artifact as approved. Does not modify the reviewed artifact or implement suggestions.
when_to_use: An existing LHC artifact (plan, diff, investigation, conclusion) needs counterpart-model sign-off before being presented as final.
---

# LHC Review

Final peer-review gate. Routes an input artifact to the counterpart model, captures the verdict, persists a review artifact. Never modifies the input. Never implements reviewer suggestions.

<Required_Reading>
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
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
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow review --source workflow --cwd "$PWD" --task "<input-path>" --peer-review-required
   ```

2. **Route by leader** — inside Claude Code (default):
   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode <mode> --cwd "$PWD" --prompt-file <input-path>
   ```
   Inside Codex:
   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader codex --mode <mode> --prompt-file <input-path>
   ```

3. **Capture and classify** the reviewer's output into a verdict.

4. **Save the review artifact** at `~/.lhc/artifacts/review-<slug>-<UTC-ISO>.md`. Include: input path, mode, leader, verdict, key findings (verbatim from reviewer where possible), residual risks, explicit "missing coverage" line if degraded.

5. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Input artifact was NOT modified
- [ ] Verdict classified exactly once
- [ ] Review artifact saved under `~/.lhc/artifacts/`
- [ ] If degraded, missing coverage is explicit
</Final_Checklist>
