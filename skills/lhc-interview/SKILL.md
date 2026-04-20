---
name: lhc-interview
description: Classifies a vague Wix internal engineering request, runs readiness, and routes to the right LHC skill. Use when the request is ambiguous ("help with this", "what should I do"), or when the user explicitly says "interview" or "help me pick a workflow". Does not implement, research, plan, or investigate.
when_to_use: The request is ambiguous and could map to multiple LHC workflows. Never runs if the workflow is already obvious.
---

# LHC Interview

Intake surface for broad or ambiguous Wix internal engineering requests. Classifies, checks readiness, and tells the user which LHC skill to invoke next. Never implements.

<Iron_Law>
NO IMPLEMENTATION INSIDE INTERVIEW. This skill classifies and routes. It never plans, researches, investigates, or edits files.

ONE CLARIFYING QUESTION MAX. If you need more than one question to classify, the user's request is not actually LHC-shaped — say so and offer the plain Claude Code path.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/wix-tool-surfaces.md`
</Required_Reading>

<Use_When>
- The user's request is vague and could map to multiple workflows.
- You genuinely cannot tell whether to plan, investigate, research, or triage.
- The user explicitly says "interview" or "help me pick a workflow".
</Use_When>

<Do_Not_Use_When>
- The workflow is obvious from the request — go straight to it.
- The user already named a workflow ("plan this", "research this") — invoke that skill directly.
</Do_Not_Use_When>

<Execution_Policy>
- MUST NOT implement, edit source files, or invoke any skill other than the readiness scripts.
- MUST produce a one-block classification output and stop.
- MAY ask at most one clarifying question via `AskUserQuestion` before classifying.
- If readiness is blocked, MUST print the install checklist. MUST NOT proceed to the next skill unless the user explicitly says to continue in degraded mode in the same turn.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow interview --source workflow --cwd "$PWD" --task "<user request>"
   ```

2. **Classify** the request into exactly one of:

   | Workflow | Skill | Use when |
   |----------|-------|----------|
   | investigate | `lhc-investigate` | prod issue, logs, metrics, request-ID RCA |
   | build-fix | `lhc-build-fix` | failing PR build, CI, release, rollout |
   | research | `lhc-research` | "how does X work at Wix", schema/docs questions |
   | standards | `lhc-standards` | "what's the right pattern here", coding-convention guidance before a diff |
   | ralplan | `lhc-ralplan` | substantial change needing an upfront plan |
   | ralph | `lhc-ralph` | user has a saved plan and wants to implement |
   | team | `lhc-team` | task splits into independent parallel lanes |
   | review | `lhc-review` | final peer-review gate on a plan, diff, or conclusion |

3. **Detect context clues** — cwd/repo, PR/build/Jira IDs, service/artifact names in the request.

4. **Run readiness**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js <workflow> --json
   ```

5. **Output the hand-off block and STOP**:
   ```
   LHC Interview
   - Classified as: <workflow>
   - Readiness: <ready|blocked|degraded>
   - Context clues: <short list>
   - Cwd: <pwd>
   - Next: invoke `Skill("let-him-cook:<skill-name>")`
   ```

<Final_Checklist>
- [ ] Classification recorded in the session state file
- [ ] Readiness reported honestly (no silent degraded mode)
- [ ] No source file touched
- [ ] User told exactly which skill to invoke next
</Final_Checklist>
