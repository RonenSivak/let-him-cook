---
name: lhc-build-fix
description: Triage failing Wix builds/PR checks/releases. Classify the failure and either hand off to planning or stop with owner guidance. Does not implement inline.
pipeline: [lhc-build-fix, lhc-ralplan, lhc-ralph]
next-skill: lhc-ralplan
handoff: ~/.lhc/artifacts/build-fix-*.md
---

# LHC Build Fix

CI failures, PR build failures, release failures, rollout anomalies. Classifies the root cause. If a code fix is warranted, hands off to `lhc-ralplan` to produce a plan — never implements inline.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/wix-tool-surfaces.md`

<Use_When>
- A PR build, CI job, release, or rollout is failing.
- The user asks "why is my build red".
- Ownership is ambiguous and needs a DevEx + octocode correlation.
</Use_When>

<Do_Not_Use_When>
- The user has a plan and wants to implement it — use `lhc-ralph`.
- The failure is a prod incident (not a build) — use `lhc-investigate`.
- The question is "what's the right pattern" — use `lhc-research`.
</Do_Not_Use_When>

<Execution_Policy>
- External systems stay read-only. MUST NOT retrigger builds unless the user explicitly asks.
- MUST classify the failure into exactly one bucket: code / flaky test / release / ownership / infra.
- MUST save the triage artifact at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`.
- MUST NOT edit repo files from inside this skill.
- If a code fix is warranted, hand off to `lhc-ralplan` via `Skill("let-him-cook:lhc-ralplan")` and STOP. Never inline the fix.
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
   - `devex` for build/release/rollout/ownership
   - `octocode` for repo search and PR archaeology
   - local inspection of the active repo

   Dispatch `let-him-cook:build-release-operator` and `let-him-cook:repo-cartographer` when useful.

4. **Classify** into one of: code failure / flaky test / release failure / ownership ambiguity / infra failure.

5. **Save the triage artifact** at `~/.lhc/artifacts/build-fix-<slug>-<UTC-ISO>.md`.

6. **Route the next action**
   - code failure: hand off to `/let-him-cook:plan` (do not implement here)
   - flaky test: open a follow-up for the owning team, STOP
   - release failure: tell the user to route to the release owner, STOP
   - ownership ambiguity: list top candidate owners, STOP
   - infra failure: route to DevEx/SRE, STOP

7. **Peer review** the triage conclusion via `peer-review.sh` in `analysis` mode.

8. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Classification is exactly one bucket
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Peer-review verdict recorded
- [ ] Builds were not retriggered (unless explicitly authorized)
- [ ] No repo file was modified in this skill
</Final_Checklist>
