---
name: lhc-investigate
description: Investigate a Wix production issue using root-cause, grafana, and devex, save the artifact, peer-review, and STOP. Does not implement fixes.
pipeline: [lhc-investigate, lhc-review]
next-skill: lhc-review
handoff: ~/.lhc/artifacts/investigate-*.md
---

# LHC Investigate

Production debugging, incident analysis, request-ID driven RCA. Produces an investigation artifact and stops. Never posts to Slack, mutates Jira, or retriggers builds.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/wix-tool-surfaces.md`

<Use_When>
- The user reports a prod issue, failing request, on-call page, or regression.
- The task is "what caused X" — not "how do I fix X in code".
- Multiple evidence families (logs, metrics, traces, releases, ownership) need to be correlated.
</Use_When>

<Do_Not_Use_When>
- The issue is a failing PR/CI build — use `lhc-build-fix`.
- The user wants a code change — use `lhc-ralplan` then `lhc-ralph`.
- The user is asking a "how does X work" question — use `lhc-research`.
</Do_Not_Use_When>

<Execution_Policy>
- External systems stay read-only. No Slack posts, no Jira mutations, no Grafana writes, no build retriggers.
- MUST save the investigation artifact at `~/.lhc/artifacts/investigate-<slug>-<UTC-ISO>.md` before stopping.
- MUST gate the final conclusion on counterpart peer review.
- MUST NOT implement or recommend code edits. If a code fix is warranted, tell the user to invoke the `lhc-ralplan` skill next.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow investigate --source workflow --cwd "$PWD" --task "<user request>" --peer-review-required
   ```

2. **Run readiness**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js investigate --json
   ```

3. **Use primary surfaces**
   - `root-cause` for request-ID-based RCA
   - `grafana` for logs, metrics, traces, incidents, alerts, on-call context
   - `devex` for build, release, rollout, and ownership correlation

4. **Ensure runtime exists**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js >/dev/null
   ```

5. **Dispatch subagents for independent evidence lanes** when the investigation decomposes cleanly:
   `Task(subagent_type="let-him-cook:incident-investigator", …)`,
   `Task(subagent_type="let-him-cook:build-release-operator", …)`.

6. **Peer review the conclusion**

   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode investigation --cwd "$PWD" --prompt-file <investigation-summary-path>
   ```

7. **Save the artifact** to `~/.lhc/artifacts/investigate-<slug>-<UTC-ISO>.md`. Include evidence per surface, correlation, root-cause hypothesis with confidence, owner, peer-review verdict, residual gaps.

8. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Evidence gathered from at least one of root-cause / grafana / devex
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Peer-review verdict recorded
- [ ] No external system was written to
- [ ] No source file was modified
</Final_Checklist>
