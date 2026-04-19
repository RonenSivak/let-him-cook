---
name: lhc-review
description: Mandatory counterpart-model review gate for plans, diffs, investigations, and conclusions. Produces a review artifact and STOPS.
pipeline: [lhc-review]
next-skill: none
handoff: ~/.lhc/artifacts/review-*.md
---

# LHC Review

Final review gate. Routes an input artifact to the counterpart model, captures the verdict, and persists a review artifact. Never modifies the input. Never implements reviewer suggestions.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`

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
- If the counterpart CLI is missing, mark verdict `degraded` and still save the artifact.
- MUST save the review artifact at `~/.lhc/artifacts/review-<slug>-<UTC-ISO>.md` before stopping.
</Execution_Policy>

## Default Counterpart Route

1. **Initialize workflow state**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow review --source workflow --cwd "$PWD" --task "<input-path>" --peer-review-required
   ```

2. **Route by leader**

   Inside Claude Code (leader = claude):

   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode <mode> --cwd "$PWD" --prompt-file <input-path>
   ```

   Inside Codex (leader = codex):

   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader codex --mode <mode> --prompt-file <input-path>
   ```

3. **Capture and classify** the reviewer's output into a verdict.

4. **Save the review artifact**

   ```
   ~/.lhc/artifacts/review-<slug>-<UTC-ISO>.md
   ```

   Include: input path, mode, leader, verdict, key findings (verbatim from reviewer where possible), residual risks, explicit "missing coverage" line if degraded.

5. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Input artifact was not modified
- [ ] Verdict classified exactly once
- [ ] Review artifact saved under `~/.lhc/artifacts/`
- [ ] If degraded, missing coverage is explicit
</Final_Checklist>
