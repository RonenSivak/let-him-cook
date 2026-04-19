---
name: lhc-investigate
description: Investigates a Wix production issue using root-cause, grafana, and devex, saves findings to ~/.lhc/artifacts/investigate-*.md, and peer-reviews the conclusion. Use for production debugging, incident analysis, request-ID driven RCA. Does not implement fixes, post to Slack, mutate Jira, or retrigger builds.
when_to_use: The user reports a prod issue, failing request, on-call page, or regression; or asks "what caused X" about a live system — never "how do I code the fix".
---

# LHC Investigate

Production debugging, incident analysis, request-ID driven RCA. Produces an investigation artifact and stops.

<Required_Reading>
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/wix-tool-surfaces.md`
</Required_Reading>

<Use_When>
- The user reports a prod issue, failing request, on-call page, or regression.
- The task is "what caused X" — not "how do I code the fix".
- Multiple evidence families (logs, metrics, traces, releases, ownership) need correlation.
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
- MUST NOT implement code edits. If a fix is warranted, tell the user to invoke `lhc-ralplan` next.
- State confidence explicitly (low/medium/high) and name the evidence that would change it.
- Use at least two surfaces before concluding — a single-surface conclusion is weak.
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

3. **Use primary surfaces** — pull in parallel when lanes are independent:
   - `root-cause` for request-ID RCA
   - `grafana` for logs, metrics, traces, incidents, alerts, on-call context
   - `devex` for build/release/rollout/ownership correlation

4. **Ensure runtime exists**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js >/dev/null
   ```

5. **Dispatch specialists** for bounded lanes:
   - `Task(subagent_type="let-him-cook:incident-investigator", …)` for cross-surface correlation
   - `Task(subagent_type="let-him-cook:build-release-operator", …)` for release/rollout correlation

6. **Peer review the conclusion**
   ```bash
   sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode investigation --cwd "$PWD" --prompt-file <investigation-summary-path>
   ```

7. **Save the artifact** at `~/.lhc/artifacts/investigate-<slug>-<UTC-ISO>.md`. Required sections: timeline (UTC), evidence per surface with links/request IDs, correlation across surfaces, root-cause hypothesis with confidence, owner, peer-review verdict, residual gaps.

8. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Evidence gathered from at least two of root-cause / grafana / devex
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Confidence stated explicitly with the evidence that would change it
- [ ] Peer-review verdict recorded
- [ ] No external system was written to
- [ ] No source file was modified
</Final_Checklist>
