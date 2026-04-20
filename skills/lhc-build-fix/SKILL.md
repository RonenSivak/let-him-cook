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

4. **Classify** into exactly one of: `code` / `flaky-test` / `release` / `ownership` / `infra`.

5. **Save the triage artifact** at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`. Include classification, evidence per surface, owning team, recommended next action.

6. **Route the next action**:
   - `code`: invoke `Skill("let-him-cook:lhc-ralplan")` to produce a plan, then STOP.
   - `flaky-test`: open a follow-up for the owning team, STOP.
   - `release`: tell the user to route to the release owner, STOP.
   - `ownership`: list top candidate owners with evidence, STOP.
   - `infra`: route to DevEx/SRE, STOP.

7. **Peer review** the triage conclusion via `peer-review.sh --mode analysis`.

8. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/write-notepad.js \
     --workflow build-fix --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>" --kv classification="<code|flaky-test|release|ownership|infra>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```
   Then STOP.

<Final_Checklist>
- [ ] Classification is exactly one bucket
- [ ] If flaky, evidence spans at least 3 runs
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Peer-review verdict recorded
- [ ] Builds were NOT retriggered (unless explicitly authorized)
- [ ] No repo file was modified in this skill
</Final_Checklist>
