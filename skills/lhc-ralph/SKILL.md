---
name: lhc-ralph
description: Persistent execution loop that implements a saved plan from ~/.lhc/plans/ with verification and peer review.
pipeline: [lhc-ralplan, lhc-ralph, lhc-review]
next-skill: lhc-review
handoff: ~/.lhc/artifacts/execute-*.md
---

# LHC Ralph

Executes a plan that already exists in `~/.lhc/plans/`. Iterates implement → verify → fix until acceptance criteria pass, then gates on peer review. Refuses to run without a plan file.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../../docs/runtime-contract.md`

<Use_When>
- The user has a saved plan in `~/.lhc/plans/` and wants it implemented.
- The `lhc-ralplan` skill ran earlier and left a plan in `~/.lhc/plans/`.
- The task needs verification evidence and a counterpart-review gate before being called done.
</Use_When>

<Do_Not_Use_When>
- No plan file exists — run the `lhc-ralplan` skill first.
- The work is trivial and doesn't need the ralph loop — do it directly.
- The task is pure research or investigation — use `lhc-research` or `lhc-investigate`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST read the plan file and treat it as authoritative. The plan is the spec, not a suggestion.
- MUST NOT invent a plan inline; if there is no plan file, STOP and instruct the user.
- MUST persist workflow state under `~/.lhc/state/sessions/<session-id>/ralph.json`.
- MUST continue iterating until acceptance criteria pass or the user cancels.
- MUST produce an execution artifact at `~/.lhc/artifacts/execute-<slug>-<UTC-ISO>.md` before declaring success.
- MUST require peer review before presenting the implementation as complete.
- External systems stay read-only unless the plan explicitly authorizes a write.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow ralph --source workflow --cwd "$PWD" --task "<plan-path or user request>" --peer-review-required
   ```

2. **Resolve the plan file**
   - If the user referenced an explicit plan path, use it.
   - Else pick the newest `~/.lhc/plans/*.md` whose slug matches the user's task tokens.
   - Else pick the newest `~/.lhc/plans/ralplan-*.md`.
   - If nothing matches, STOP and tell the user: "No plan found under `~/.lhc/plans/`. Run the `lhc-ralplan` skill first."

3. **Run readiness and ensure runtime** (if not already done by the command):

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js >/dev/null
   ```

4. **Execution loop**

   For each step in the plan:
   - implement
   - run the verification command(s) from the plan
   - if verification fails, fix and retry (bounded to 5 retries per step)
   - record results

   Use LHC subagents where appropriate:
   `Task(subagent_type="let-him-cook:executor", …)` for bounded edits,
   `Task(subagent_type="let-him-cook:verifier", …)` for the final gate.

5. **Peer review the final diff**

   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode code-review --cwd "$PWD" --prompt-file <(git diff | head -400)
   ```

   Capture the verdict.

6. **Write the execution artifact**

   Path: `~/.lhc/artifacts/execute-<slug>-<UTC-ISO>.md`. Include:
   - link to the plan file
   - files touched
   - verification commands run + truncated output
   - peer-review verdict
   - residual gaps

7. **Append to notepad**

   ```bash
   printf -- "- %s  ralph  %s  %s  plan=%s  artifact=%s\n" "$(date -u +%FT%TZ)" "<slug>" "$PWD" "<plan-path>" "<artifact-path>" >> ~/.lhc/notepad.md
   ```

8. **Report and STOP**

<Final_Checklist>
- [ ] Plan file was read and used as the spec
- [ ] Every acceptance criterion has a passing verification command
- [ ] Peer-review verdict is `approved` (or `approved-with-changes` after fixes)
- [ ] Execution artifact saved under `~/.lhc/artifacts/`
- [ ] Notepad entry appended
- [ ] State file under `~/.lhc/state/sessions/<session-id>/ralph.json` marks completion
</Final_Checklist>
