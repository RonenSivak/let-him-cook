---
name: lhc-interview
description: Classify a broad Wix internal engineering request, run readiness, and route to the right LHC workflow. Does not implement or research.
pipeline: [lhc-interview]
next-skill: dynamic
handoff: ~/.lhc/state/sessions/<session-id>/interview.json
---

# LHC Interview

Intake surface for broad or ambiguous Wix internal engineering requests. This skill classifies, checks readiness, and tells the user which `/let-him-cook:*` command to run next. It never implements, never investigates, never plans.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/wix-tool-surfaces.md`

<Use_When>
- The user's request is vague and could map to multiple workflows.
- You genuinely don't know whether to plan, investigate, research, or triage.
- The user explicitly says "interview" or "help me pick a workflow".
</Use_When>

<Do_Not_Use_When>
- The workflow is obvious from the request — go straight to that workflow.
- The user already named a workflow ("plan this", "research this") — run that workflow directly.
</Do_Not_Use_When>

<Execution_Policy>
- MUST NOT implement, edit source files, or call any skill other than readiness scripts.
- MUST produce a one-block classification output and stop.
- MAY ask at most one clarifying question via `AskUserQuestion` before classifying.
- If readiness is blocked, MUST print the install checklist and only proceed to the next command if the user explicitly says to continue in degraded mode.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow interview --source workflow --cwd "$PWD" --task "<user request>"
   ```

2. **Classify** the request into one of: `investigate`, `build-fix`, `research`, `ralplan`, `ralph`, `team`, `review`.

3. **Detect context clues** from cwd/repo, PR/build/Jira IDs, service/artifact names.

4. **Run readiness**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js <workflow> --json
   ```

5. **Output the hand-off block and STOP**

   ```
   LHC Interview
   - Classified as: <workflow>
   - Readiness: <ready|blocked|degraded>
   - Context clues: <short list>
   - Cwd: <pwd>
   - Next: run `/let-him-cook:<command>` "<task>"
   ```

<Final_Checklist>
- [ ] Classification recorded in the session state file
- [ ] Readiness reported honestly (no silent degraded mode)
- [ ] No source file touched
- [ ] User told exactly which command to run next
</Final_Checklist>
