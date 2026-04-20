---
name: lhc-ralplan
description: Produces a peer-reviewed plan artifact at ~/.lhc/plans/ralplan-*.md for substantial Wix internal engineering work. Use when the user says "plan this", "ralplan", "design before we code", or describes a change broad enough that jumping into code would cause rework. Does not implement, edit source files, or invoke executor skills.
when_to_use: The user wants an up-front plan for a non-trivial Wix change, or the change touches multiple files/services/owners, or the change needs explicit acceptance criteria and peer review before code is written.
---

# LHC RALPlan

Substantial plans that need internal research, repo context, and a durable local artifact before any code is touched. This skill PRODUCES a plan file and STOPS. It never implements.

<Iron_Law>
NO PLAN IS APPROVED WITHOUT COUNTERPART PEER REVIEW. A plan with `peer_review: pending` is a draft, not a plan. Saving the file is not sign-off.

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
</Required_Reading>

<Use_When>
- The user says: "plan this", "let's plan", "ralplan", "design this", "before we code".
- The change touches multiple files, services, or ownership boundaries.
- The task needs explicit acceptance criteria, verification steps, and peer review before implementation.
</Use_When>

<Do_Not_Use_When>
- A plan file already exists under `~/.lhc/plans/` and the user wants to execute — use `lhc-ralph`.
- The work is a single focused fix with obvious scope — skip planning, let the caller implement directly.
- The user is asking a research question — use `lhc-research`.
- The user is investigating a prod issue — use `lhc-investigate`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST write the plan to `~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md` before stopping.
- MUST NOT edit, create, or delete any file outside of `~/.lhc/`.
- MUST NOT invoke `lhc-ralph`, `lhc-team`, or any execution skill from within this skill.
- MUST route the plan to counterpart peer review via `scripts/peer-review.sh` before marking it approved.
- If the user says "just implement it", refuse and tell them to invoke `lhc-ralph` after the plan is saved.
- If required MCPs are missing, hard-stop unless the user explicitly says to continue in degraded mode in the same turn.
- A plan must be executable as-written. Stub language ("TBD", "TODO", "implement later", "TBD by team") is a plan failure — revise instead.
- Every acceptance criterion must be concrete and testable (90%+). Every claim about existing code must cite a file path (80%+).
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow ralplan --source workflow --cwd "$PWD" --task "<user request>" --peer-review-required
   ```

2. **Run readiness**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js ralplan --json
   ```

3. **Ensure runtime**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js >/dev/null
   ```

4. **Ground the plan in evidence** — dispatch subagents in parallel when lanes are independent:
   - `Task(subagent_type="let-him-cook:internal-docs-researcher", …)` for docs-schema
   - `Task(subagent_type="let-him-cook:repo-cartographer", …)` for octocode / repo archaeology
   - `Task(subagent_type="let-him-cook:framework-standards-reviewer", …)` for convention checks
   - `Task(subagent_type="let-him-cook:architect", …)` for boundary review when the change is structural

   **Optional ticket context (READ-ONLY)**: if the user references a Jira ticket (or one is obvious from the request), pull it in via `jira` → `get-issues` and use the description / acceptance criteria as primary requirements input for the plan. Cite the ticket key in the plan's ADR "Drivers" block. Do NOT call `create-issue`, `comment-on-issue`, `transition-issue`, or any other mutating jira tool.

4a. **Standards brief** — if the plan will modify source files (not docs/config only), invoke `Skill("let-him-cook:lhc-standards")` with the target files and feature area. The brief will be saved at `~/.lhc/artifacts/standards-<slug>-<UTC-ISO>.md` and MUST be referenced from the plan's *Implementation steps* section. `lhc-ralph` reads the brief during execution; `lhc-review` reads it during review. Skip this step for doc-only or config-only plans.

5. **Write the plan file** at `~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md`. Required sections:
   - Title + one-paragraph goal
   - Acceptance criteria (numbered, testable, concrete)
   - **Standards brief link** (when step 4a ran): reference the artifact path so `lhc-ralph` and `lhc-review` read the same contract
   - Implementation steps (each with file paths; no stubs; reference standards brief per-file guidance where applicable)
   - Risks + mitigations
   - Verification commands (copy-pasteable)
   - ADR block: Decision, Drivers, Alternatives considered, Why chosen, Consequences, Follow-ups

6. **Peer review** — route the plan to the counterpart model. Use Claude Code's background-bash pattern (see `../shared/peer-review-governance.md`) because plan reviews typically take 60-180s:
   ```
   Bash(
     command: "sh \"$CLAUDE_PLUGIN_ROOT\"/scripts/peer-review.sh --leader claude --mode plan --cwd \"$PWD\" --prompt-file <plan-path>",
     run_in_background: true,
     timeout: 600000
   )
   → then poll with BashOutput(bash_id) every 10-20s until the "## Verdict" section appears.
   ```
   Capture the `[peer-review] ... log=<path>` line from stderr; that's your recovery trail if BashOutput stops streaming.
   If rejected, revise and re-review up to 3 times. If still rejected, save the latest plan, record the verdict, and stop.

7. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/write-notepad.js \
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
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   - Next skill: let-him-cook:lhc-ralph
   - Pass to next skill:
       plan=<plan-path>
       standards-brief=<brief-path>   (if applicable)
   ```

   Do NOT invoke `lhc-ralph` yourself — the user decides when to execute.

<Final_Checklist>
- [ ] Plan file exists under `~/.lhc/plans/`
- [ ] Acceptance criteria are numbered, testable, concrete (90%+)
- [ ] File paths cited on 80%+ of claims about existing code
- [ ] All risks have a mitigation
- [ ] Peer-review verdict recorded in the plan file
- [ ] ADR section present
- [ ] No stub language ("TBD", "TODO", "implement later") anywhere in the plan
- [ ] No source file in the working repo was modified
- [ ] Notepad entry appended
</Final_Checklist>
