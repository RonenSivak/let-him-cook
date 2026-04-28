---
name: lhc-investigate
description: Investigates a Wix production issue using root-cause, grafana, grafana-datasource, and devex (with optional read-only jira + slack context), saves findings to ~/.lhc/artifacts/investigate-*.md, and peer-reviews the conclusion. Use for production debugging, incident analysis, request-ID driven RCA. Does not implement fixes, post to Slack, mutate Jira, or retrigger builds.
when_to_use: The user reports a prod issue, failing request, on-call page, or regression; or asks "what caused X" about a live system — never "how do I code the fix".
---

# LHC Investigate

Production debugging, incident analysis, request-ID driven RCA. Produces an investigation artifact and stops.

<Iron_Law>
NO CONCLUSION WITHOUT AT LEAST TWO CORRELATED SURFACES AND PEER REVIEW. A single-surface conclusion is labeled `hypothesis`, never `root cause`.

NO IMPLEMENTATION FROM INSIDE INVESTIGATE. If a fix is warranted, route the user to `lhc-ralplan`. Do not edit code inside this skill.

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
- MUST classify the symptom/root cause using `../shared/bug-fix-taxonomy.md`; labels before root-cause proof are hypotheses, not conclusions.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow investigate --source workflow --cwd "$PWD" --task "<user request>" --peer-review-required
   ```

2. **Run readiness**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/check-readiness.js investigate --json
   ```

3. **Use primary surfaces** — pull in parallel when lanes are independent:
   - `root-cause` for request-ID RCA
   - `grafana` for dashboards, panels, alerts, incidents, on-call context (dashboard-shaped — `get_dashboard_by_uid`, `get_dashboard_panel_queries`, `list_incidents`)
   - `grafana-datasource` for **raw Wix data queries** — `query_panorama`, `query_bi_events`, `query_domain_events`, `query_app_logs`, `query_access_logs`, `query_prometheus`, `query_loki`. Use this when "did the code emit?" vs "did the dashboard see?" needs separating, or when a dashboard's panel query needs to run stripped of variables.
   - `devex` for build/release/rollout/ownership correlation

   **Canonical dashboard-empty diagnostic ladder**: (a) `get_dashboard_panel_queries` → extract the PromQL / Panorama expressions, (b) `query_panorama` / `query_prometheus` → run them directly with the user's time range, (c) if the raw query returns data, it's a dashboard variable / filter issue; if not, it's an emission / datasource / time-window issue.

   **Optional supporting surfaces (READ-ONLY — write tools are policy-blocked by the working agreement)**:
   - `jira` — `get-issues`, `get-issue-changelog`, `list-projects` to correlate the symptom with existing tickets and identify the owner ticket. Do NOT call `create-issue`, `comment-on-issue`, `transition-issue`, or any other mutating tool.
   - `slack` — `search-messages`, `get_channel_history`, `get_thread_replies` to check whether the symptom is already being discussed in #incidents-prod / a support channel / the owner channel. Do NOT call `post_message`, `reply_to_thread`, `schedule_message`, or any other mutating tool.

4. **Ensure runtime exists**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/ensure-runtime.js >/dev/null
   ```

5. **Dispatch specialists** for bounded lanes:
   - `Task(subagent_type="let-him-cook:incident-investigator", …)` for cross-surface correlation
   - `Task(subagent_type="let-him-cook:build-release-operator", …)` for release/rollout correlation

6. **Bug Fix Classification** — classify the production symptom/root cause using `../shared/bug-fix-taxonomy.md`:
   ```
   Bug labels: <primary label>[, <secondary label>...] or hypothesis:<label>
   Severity: <severity values>
   Origin: <origin values or unknown>
   Defect surface: <surface values>
   Fix strategy: <strategy values>
   Bug routing rationale: <why the next step is ralplan or terminal ops follow-up>
   Bug verification implications: <regression, data repair, rollout, observability, and review consequences>
   ```

   Use `hypothesis:<label>` until two or more surfaces corroborate the defect shape. Escalate security-critical, data-loss, money-impacting, privacy, authorization, concurrency, distributed, migration, and data-integrity labels as high-risk plan inputs when a fix is warranted.

7. **Peer review the conclusion** — use the background-bash pattern (see `../shared/peer-review-governance.md`); investigation reviews typically take 60-180s:
   ```
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode investigation --cwd \"$PWD\" --prompt-file <investigation-summary-path>",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput until "## Verdict" appears.
   ```

8. **Save the artifact** at `~/.lhc/artifacts/investigate-<slug>-<UTC-ISO>.md`. Required sections: timeline (UTC), evidence per surface with links/request IDs, correlation across surfaces, root-cause hypothesis with confidence, bug classification, owner, peer-review verdict, residual gaps.

9. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow investigate --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>" --kv verdict="<approved|approved-with-changes|rejected|degraded>" --kv conf="<low|medium|high>" --kv bug_labels="<labels|hypothesis:label>"
   ```

10. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: investigate
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <artifact-path>
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   - Confidence: <low|medium|high>
   - Bug labels: <primary label>[, <secondary label>...] or hypothesis:<label>
   - Severity: <severity values>
   - Origin: <origin values or unknown>
   - Defect surface: <surface values>
   - Fix strategy: <strategy values>
   - Next skill: let-him-cook:lhc-ralplan    (only if a code fix is warranted)
   - Pass to next skill:
       investigation-artifact=<artifact-path>
       bug-labels=<labels>
       severity=<severity>
       origin=<origin>
       defect-surface=<surface>
       fix-strategy=<strategy>
   ```

   Include the `Next skill` and full `Pass to next skill` block only when a code fix is warranted, and pass `investigation-artifact`, `bug-labels`, `severity`, `origin`, `defect-surface`, and `fix-strategy`. If no code fix is warranted, omit the entire `Next skill` and `Pass to next skill` block — an incident conclusion can be the terminal step.

<Final_Checklist>
- [ ] Evidence gathered from at least two of root-cause / grafana / grafana-datasource / devex
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Confidence stated explicitly with the evidence that would change it
- [ ] Bug labels, severity, origin, defect surface, fix strategy, and verification implications recorded as evidence-backed conclusion or hypothesis
- [ ] Peer-review verdict recorded
- [ ] No external system was written to
- [ ] No source file was modified
</Final_Checklist>
