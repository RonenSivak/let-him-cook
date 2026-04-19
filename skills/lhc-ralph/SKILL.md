---
name: lhc-ralph
description: Executes a plan saved at ~/.lhc/plans/ with an iterative implement-verify-fix loop, then gates on peer review. Use when a plan file exists and the user says "implement", "execute the plan", "ralph", or "run it". Refuses to run without a plan file.
when_to_use: The user has a saved plan and wants it implemented end-to-end with verification. Never runs without a plan file under `~/.lhc/plans/`.
---

# LHC Ralph

Executes a plan that already exists in `~/.lhc/plans/`. Iterates implement → verify → fix until acceptance criteria pass, then gates on counterpart peer review.

<Required_Reading>
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
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
- MUST require peer review before presenting the implementation as complete.
- External systems stay read-only unless the plan explicitly authorizes a write.
- MUST NOT silently extend the plan. If the plan is missing a step needed to succeed, stop and surface the gap.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow ralph --source workflow --cwd "$PWD" --task "<plan-path or user request>" --peer-review-required
   ```

2. **Resolve the plan file** in this order:
   1. If the caller referenced an explicit plan path, use it.
   2. Else pick the newest `~/.lhc/plans/*.md` whose slug matches the user's task tokens.
   3. Else pick the newest `~/.lhc/plans/ralplan-*.md`.
   4. If nothing matches, STOP: "No plan found under `~/.lhc/plans/`. Invoke `lhc-ralplan` first."

3. **Ensure runtime**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js >/dev/null
   ```

4. **Execution loop** — for each step in the plan:
   - Dispatch `Task(subagent_type="let-him-cook:executor", prompt=<step + file anchors + acceptance bits>)` for bounded edits.
   - Run the verification command(s) from the plan.
   - If verification fails, dispatch `Task(subagent_type="let-him-cook:debugger", …)` for root cause, then fix via `executor`. Bound to 5 retries per step.
   - Record results per step.

5. **Verify against the whole plan** — dispatch `Task(subagent_type="let-him-cook:verifier", …)` to gate each acceptance criterion against fresh evidence.

6. **Peer review the final diff**
   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode code-review --cwd "$PWD" --prompt-file <(git diff | head -400)
   ```

7. **Write the execution artifact** at `~/.lhc/artifacts/execute-<slug>-<UTC-ISO>.md`. Include:
   - link to the plan file
   - files touched (paths)
   - verification commands run + truncated output
   - peer-review verdict
   - residual gaps

8. **Append to notepad**
   ```bash
   printf -- "- %s  ralph  %s  %s  plan=%s  artifact=%s\n" "$(date -u +%FT%TZ)" "<slug>" "$PWD" "<plan-path>" "<artifact-path>" >> ~/.lhc/notepad.md
   ```

9. **Report and STOP.**

<Final_Checklist>
- [ ] Plan file was read and used as the spec
- [ ] Every acceptance criterion has a passing verification command
- [ ] Peer-review verdict is `approved` or `approved-with-changes` after fixes
- [ ] Execution artifact saved under `~/.lhc/artifacts/`
- [ ] Notepad entry appended
- [ ] State file under `~/.lhc/state/sessions/<session-id>/ralph.json` marks completion
</Final_Checklist>
