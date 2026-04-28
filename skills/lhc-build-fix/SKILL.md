---
name: lhc-build-fix
description: Triages failing Wix builds, PR checks, and releases using DevEx and repo archaeology, then hands off to lhc-ralplan when a code fix is needed. Use when a CI job, PR build, release, or rollout is failing, or the user says "why is my build red". Does not implement inline or retrigger builds.
when_to_use: A build, CI job, release, or rollout is failing and needs classification and ownership; or a PR build is red and the user wants to know why.
---

# LHC Build Fix

CI failures, PR build failures, release failures, rollout anomalies. Classifies the root cause. If a code fix is warranted, hands off to `lhc-ralplan` — never implements inline.

<Iron_Law>
NO FIX RECOMMENDATION WITHOUT ROOT-CAUSE EVIDENCE. "Probably flaky" is not a classification. A `flaky-test` label requires at least three runs of evidence.

NO INLINE FIX FROM INSIDE BUILD-FIX. If a code change is needed, save and peer-review the triage, then hand off to `lhc-ralplan`. This skill classifies; it does not implement or plan inline.

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
- `../shared/bug-fix-taxonomy.md`
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
- MUST classify the failure into exactly one build bucket: code / flaky-test / release / ownership / infra.
- MUST classify the defect shape using `../shared/bug-fix-taxonomy.md` when evidence is sufficient; otherwise record `Bug labels: unknown` with the evidence needed to classify.
- MUST save the triage artifact at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`.
- MUST NOT edit repo files from inside this skill.
- If a code fix is warranted, print a handoff to `lhc-ralplan` after the triage artifact is saved and peer-reviewed. Never inline the fix or skip the review gate.
- A "flaky" label requires at least 3 runs of evidence — otherwise it's a code failure awaiting proof.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow build-fix --source workflow --cwd "$PWD" --task "<failure>" --peer-review-required
   ```

2. **Run readiness**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/check-readiness.js build-fix --json
   ```

3. **Gather evidence in parallel** when independent:
   - `Task(subagent_type="let-him-cook:build-release-operator", …)` for devex + octocode classification
   - `Task(subagent_type="let-him-cook:repo-cartographer", …)` for repo/PR archaeology

   **Optional owner-channel correlation (READ-ONLY)**: once DevEx returns the owning team, `code_owners_for_path` typically surfaces a Slack channel. Use `slack` → `search-messages` / `get_channel_history` on that channel to check whether the failure has already been reported, acknowledged, or hand-waved as known-flaky. This is signal for the classification bucket, not a substitute for DevEx run evidence. Do NOT call `post_message`, `reply_to_thread`, `schedule_message`, or any other mutating slack tool.

4. **Classify** into exactly one build bucket: `code` / `flaky-test` / `release` / `ownership` / `infra`.

4a. **Bug Fix Classification** — classify the wrong behavior using `../shared/bug-fix-taxonomy.md`:
   ```
   Bug labels: <primary label>[, <secondary label>...] or unknown
   Severity: <severity values>
   Origin: <origin values or unknown>
   Defect surface: <surface values>
   Fix strategy: <strategy values>
   Bug routing rationale: <why this remains build-fix or hands off to ralplan>
   Bug verification implications: <regression, environment, dependency, release, or flakiness evidence needed>
   ```

   Keep this separate from the build bucket. For example, a `flaky-test` bucket can still carry `test_flakiness_bug`, `time_timezone_bug`, or `concurrency_race_bug` labels; a `code` bucket can carry `build_dependency_bug`, `api_contract_bug`, or `compatibility_regression_bug`.

5. **Save the triage artifact** at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`. Include build classification, bug classification, evidence per surface, owning team, recommended next action.

6. **Peer review** the triage conclusion — use the background-bash pattern (see `../shared/peer-review-governance.md`):
   ```
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode analysis --cwd \"$PWD\" --prompt-file <triage-artifact-path>",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput until "## Verdict" appears.
   ```

7. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow build-fix --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>" --kv classification="<code|flaky-test|release|ownership|infra>" --kv bug_labels="<labels|unknown>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```

8. **Route the next action in the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: build-fix
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <triage-artifact-path>
   - Classification: <code|flaky-test|release|ownership|infra>
   - Bug labels: <primary label>[, <secondary label>...] or unknown
   - Severity: <severity values>
   - Origin: <origin values or unknown>
   - Defect surface: <surface values>
   - Fix strategy: <strategy values>
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   - Next skill: let-him-cook:lhc-ralplan         (only if classification=code)
   - Pass to next skill:
       triage-artifact=<triage-artifact-path>
      bug-labels=<labels|unknown>                 (only if classification=code)
       severity=<severity>                         (only if classification=code)
       origin=<origin>                             (only if classification=code)
       defect-surface=<surface>                    (only if classification=code)
       fix-strategy=<strategy>                     (only if classification=code)
   ```

   For `classification=code`, include the `Next skill` and full `Pass to next skill` block only after the peer-review verdict is recorded, and include all taxonomy pass-through fields shown above. For non-code classifications, omit the entire `Next skill` and `Pass to next skill` block and state the routing recommendation inline: flaky-test -> owning team follow-up, release -> release owner, ownership -> candidate owners, infra -> DevEx/SRE.

<Final_Checklist>
- [ ] Build classification is exactly one bucket
- [ ] Bug labels, severity, origin, defect surface, fix strategy, and verification implications are recorded or explicitly `unknown`
- [ ] If flaky, evidence spans at least 3 runs
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Peer-review verdict recorded
- [ ] Builds were NOT retriggered (unless explicitly authorized)
- [ ] No repo file was modified in this skill
</Final_Checklist>
