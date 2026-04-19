---
name: lhc-ralplan
description: Produce a peer-reviewed plan artifact in ~/.lhc/plans/ for substantial Wix internal engineering work. Does not implement.
pipeline: [lhc-ralplan, lhc-review, lhc-ralph]
next-skill: lhc-ralph
handoff: ~/.lhc/plans/ralplan-*.md
---

# LHC RALPlan

Substantial plans that need internal research, repo context, and a durable local artifact before any code is touched. This skill PRODUCES a plan file and STOPS. It never implements.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/subagent-catalog.md`

<Use_When>
- The user says "plan this", "let's plan", "ralplan", or describes work broad enough that jumping into code would cause rework.
- The change touches multiple files, services, or ownership boundaries.
- The task needs explicit acceptance criteria, verification steps, and peer review before implementation.
</Use_When>

<Do_Not_Use_When>
- The user has a plan file already and wants to implement — use `lhc-ralph` instead.
- The work is a single focused fix with obvious scope — skip planning.
- The user is asking a research question — use `lhc-research`.
- The user is investigating a prod issue — use `lhc-investigate`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST write the plan to `~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md` before stopping.
- MUST NOT edit, create, or delete any file outside of `~/.lhc/`.
- MUST NOT invoke `lhc-ralph`, `lhc-team`, or any execution skill.
- MUST route the plan to counterpart review via `scripts/peer-review.sh` before marking it approved.
- If the user says "just implement it", refuse and tell them to invoke the `lhc-ralph` skill after the plan is saved.
- If required MCPs are missing, hard-stop unless the user explicitly says to continue in degraded mode.
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

4. **Ground the plan**
   - local repo context (grep, read)
   - `docs-schema` for internal contracts
   - `octocode` for repo/PR archaeology
   - `devex` when service, rollout, or ownership context matters

   Dispatch subagents in parallel when lanes are independent:
   `Task(subagent_type="let-him-cook:internal-docs-researcher", …)`,
   `Task(subagent_type="let-him-cook:repo-cartographer", …)`,
   `Task(subagent_type="let-him-cook:framework-standards-reviewer", …)`.

5. **Write the plan file**

   Path: `~/.lhc/plans/ralplan-<slug>-<UTC-ISO>.md`. Include:
   - Title + one-paragraph goal
   - Acceptance criteria (testable, concrete)
   - Implementation steps (with file paths where known)
   - Risks and mitigations
   - Verification steps (commands the executor will run)
   - ADR block: Decision, Drivers, Alternatives, Why chosen, Consequences, Follow-ups

6. **Peer review**

   When running inside Claude Code, route to Codex:

   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode plan --cwd "$PWD" --prompt-file <plan-path>
   ```

   When running inside Codex, route to Claude:

   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader codex --mode plan --prompt-file <plan-path>
   ```

   Capture the verdict. If rejected, revise and re-review up to 3 times.

7. **Append to notepad**

   ```bash
   printf -- "- %s  ralplan  %s  %s  plan=%s\n" "$(date -u +%FT%TZ)" "<slug>" "$PWD" "<plan-path>" >> ~/.lhc/notepad.md
   ```

8. **Report and STOP**

   Print the plan path, peer-review verdict, and tell the user to invoke the `lhc-ralph` skill (passing the plan path) when they're ready to execute. Do not implement. Do not invoke `lhc-ralph` from this skill.

<Final_Checklist>
- [ ] Plan file exists under `~/.lhc/plans/`
- [ ] Acceptance criteria are testable (90%+ concrete)
- [ ] File/line references included where known (80%+ claims)
- [ ] All risks have mitigations
- [ ] Peer-review verdict recorded in the plan file
- [ ] ADR section included
- [ ] No source file in the working repo was modified
- [ ] Notepad entry appended
</Final_Checklist>
