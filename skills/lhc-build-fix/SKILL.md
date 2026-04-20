---
name: lhc-build-fix
description: Triages failing Wix builds, PR checks, and releases using DevEx and repo archaeology, then hands off to lhc-ralplan when a code fix is needed. Use when a CI job, PR build, release, or rollout is failing, or the user says "why is my build red". Does not implement inline or retrigger builds.
when_to_use: A build, CI job, release, or rollout is failing and needs classification and ownership; or a PR build is red and the user wants to know why.
---

# LHC Build Fix

CI failures, PR build failures, release failures, rollout anomalies. Classifies the root cause. If a code fix is warranted, hands off to `lhc-ralplan` — never implements inline.

<Iron_Law>
NO FIX RECOMMENDATION WITHOUT ROOT-CAUSE EVIDENCE. "Probably flaky" is not a classification. A `flaky-test` label requires at least three runs of evidence.

NO INLINE FIX FROM INSIDE BUILD-FIX. If a code change is needed, produce a plan via `lhc-ralplan` and stop. This skill classifies; it does not implement.

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
- `../shared/wix-tool-surfaces.md`
</Required_Reading>

<Use_When>
- A PR build, CI job, release, or rollout is failing.
- The user asks "why is my build red" or "why did the rollout fail".
- Ownership is ambiguous and needs a DevEx + octocode correlation.
</Use_When>

<Do_Not_Use_When>
- The user has a plan and wants to implement it — use `lhc-ralph`.
- The failure is a prod incident (not a build) — use `lhc-investigate`.
- The question is "what's the right pattern" — use `lhc-research`.
</Do_Not_Use_When>

<Execution_Policy>
- External systems stay read-only. MUST NOT retrigger builds unless the user explicitly asks in the same turn.
- MUST classify the failure into exactly one bucket: code / flaky-test / release / ownership / infra.
- MUST save the triage artifact at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`.
- MUST NOT edit repo files from inside this skill.
- If a code fix is warranted, invoke `Skill("let-him-cook:lhc-ralplan")` to produce a plan, then STOP. Never inline the fix.
- A "flaky" label requires at least 3 runs of evidence — otherwise it's a code failure awaiting proof.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow build-fix --source workflow --cwd "$PWD" --task "<failure>" --peer-review-required
   ```

2. **Run readiness**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js build-fix --json
   ```

3. **Gather evidence in parallel** when independent:
   - `Task(subagent_type="let-him-cook:build-release-operator", …)` for devex + octocode classification
   - `Task(subagent_type="let-him-cook:repo-cartographer", …)` for repo/PR archaeology

   **Optional owner-channel correlation (READ-ONLY)**: once DevEx returns the owning team, `code_owners_for_path` typically surfaces a Slack channel. Use `slack` → `search-messages` / `get_channel_history` on that channel to check whether the failure has already been reported, acknowledged, or hand-waved as known-flaky. This is signal for the classification bucket, not a substitute for DevEx run evidence. Do NOT call `post_message`, `reply_to_thread`, `schedule_message`, or any other mutating slack tool.

4. **Classify** into exactly one of: `code` / `flaky-test` / `release` / `ownership` / `infra`.

5. **Save the triage artifact** at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`. Include classification, evidence per surface, owning team, recommended next action.

6. **Route the next action**:
   - `code`: invoke `Skill("let-him-cook:lhc-ralplan")` to produce a plan, then STOP.
   - `flaky-test`: open a follow-up for the owning team, STOP.
   - `release`: tell the user to route to the release owner, STOP.
   - `ownership`: list top candidate owners with evidence, STOP.
   - `infra`: route to DevEx/SRE, STOP.

7. **Peer review** the triage conclusion — use the background-bash pattern (see `../shared/peer-review-governance.md`):
   ```
   Bash(
     command: "sh \"$CLAUDE_PLUGIN_ROOT\"/scripts/peer-review.sh --leader claude --mode analysis --cwd \"$PWD\" --prompt-file <triage-artifact-path>",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput until "## Verdict" appears.
   ```

8. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/write-notepad.js \
     --workflow build-fix --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>" --kv classification="<code|flaky-test|release|ownership|infra>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```

9. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: build-fix
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <triage-artifact-path>
   - Classification: <code|flaky-test|release|ownership|infra>
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   - Next skill: let-him-cook:lhc-ralplan         (only if classification=code)
   - Pass to next skill:
       triage-artifact=<triage-artifact-path>
   ```

   For non-code classifications, omit the last two lines and state the routing recommendation inline (release → release owner, infra → DevEx/SRE, etc.).

<Final_Checklist>
- [ ] Classification is exactly one bucket
- [ ] If flaky, evidence spans at least 3 runs
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Peer-review verdict recorded
- [ ] Builds were NOT retriggered (unless explicitly authorized)
- [ ] No repo file was modified in this skill
</Final_Checklist>
