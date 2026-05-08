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
- `../shared/confidence-escalation-policy.md`
- `../shared/peer-review-governance.md`
- `../shared/handoff-protocol.md`
- `../shared/notepad-schema.md`
- `../shared/wix-tool-surfaces.md`
- `../shared/wix-context-graph.md`
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
- MUST gate the final conclusion on peer review per `../shared/peer-review-governance.md`: counterpart review via `peer-review.sh` is preferred; the strict local fallback may satisfy the gate when the counterpart CLI is missing, out of tokens, rate-limited, timed out, crashed, or returned an unparseable verdict, in which case `Counterpart coverage: degraded` must be recorded.
- MUST NOT implement code edits. If a fix is warranted, tell the user to invoke `lhc-ralplan` next.
- State confidence explicitly (low/medium/high) and name the evidence that would change it.
- Use at least two surfaces before concluding — a single-surface conclusion is weak.
- MUST classify the symptom/root cause using `../shared/bug-fix-taxonomy.md`; labels before root-cause proof are hypotheses, not conclusions.
- MUST apply `../shared/confidence-escalation-policy.md`: `medium` or `low` confidence is allowed only after the relevant investigation surfaces were exhausted or the blocked surfaces are recorded.
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

7. **Confidence gate** — before assigning `Confidence`, apply the investigation ladder from `../shared/confidence-escalation-policy.md`:
   - For `high`, require at least two correlated surfaces and no unresolved material contradiction.
   - If only one surface supports the conclusion, keep the root cause as `hypothesis` and do not report high confidence.
   - For `medium` or `low`, add an Exhaustion Ledger naming every attempted surface, blocked tool, empty query, contradiction, and the next evidence that would raise confidence.

7a. **Per-finding self-check classification** — for each individual finding in the investigation (evidence point, contributing factor, derived inference), apply the same three-axis ordinal self-check used by `lhc-pr-review`:
   - **anchor** — does the cited surface (request ID, dashboard panel, log line, build hash) point at the right evidence? `concrete` | `uncertain`
   - **inference** — is the leap from the cited evidence to the claim sound, or does it skip a step? `concrete` | `uncertain`
   - **corroboration** — is the same claim supported by an independent surface? `concrete` | `uncertain`

   Aggregate self-check is the WORST of the three axes: `verified` (all concrete) / `plausible` (one uncertain) / `speculative` (two or three uncertain). Findings with `self_check: speculative` are demoted to "Open hypotheses worth probing" — they do NOT contribute to the root-cause conclusion. Borrowed from `lhc-pr-review`'s self-check classification because LLM investigators over-attribute single-surface evidence; ordinal categories with named definitions calibrate more reliably than a numeric confidence score.

7b. **Adversarial alternative-hypothesis pass — orchestrator decides whether to run.** The orchestrator (NOT the user) evaluates the auto-trigger rules below; if any rule fires, dispatch a fresh `Task(subagent_type="let-him-cook:incident-investigator", prompt=<challenge-prompt>)` lane that ONLY tries to falsify the working conclusion:
   - Given the same evidence, what alternative explanation fits the same surface signals?
   - What evidence would the working conclusion predict that has NOT been observed yet?
   - What surface was NOT consulted that would have differentiated alternatives?
   - Is there a contradiction between two cited surfaces that the conclusion is silently smoothing over?

   **Auto-trigger rules** — run the challenge lane when ANY of:
   - bug labels include `data_corruption`, `security_bug`, `auth_bug`, `privacy_bug`, `money_loss_bug`, `concurrency_bug`, `distributed_system_bug`, `migration_bug`
   - severity is `blocking` or `critical`
   - the working conclusion is single-surface (one corroborating surface) but the orchestrator is about to assign `high` confidence — challenge is the cheapest way to surface what a second surface would have shown
   - two cited surfaces partially contradict each other and the conclusion picked one without explaining why
   - the incident has user-impact, money-impact, or privacy-impact in its symptom description

   **User override (natural language only).** "Skip the alt-hypothesis pass" / "don't challenge" → orchestrator records the quote and skips. "Challenge this" / "what else could it be" → orchestrator forces the lane and records the quote. No CLI flag.

   The challenge lane returns at most three counter-hypotheses, each with: surface signals it explains, surface signals the working conclusion explains better, and the differentiating evidence that would settle it. If a counter-hypothesis is `verified` or `plausible` (per 7a), the working conclusion is demoted from `root cause` to `leading hypothesis` and the artifact records both hypotheses side-by-side. Pattern borrowed from `openai/codex-plugin-cc`'s adversarial-review stance, applied to investigations rather than diffs.

8. **Peer review the conclusion** — use the background-bash pattern (see `../shared/peer-review-governance.md`); investigation reviews typically take 60-180s:
   ```
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode investigation --cwd \"$PWD\" --prompt-file <investigation-summary-path>",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput until "## Verdict" appears.
   ```

   If the counterpart CLI is missing, out of tokens, rate-limited, timed out, crashes before a verdict, or returns an unparseable verdict, use the strict local fallback route defined in `../shared/peer-review-governance.md` and record `Review route: strict-local-fallback`, `Counterpart coverage: degraded`, and `Counterpart failure: <missing cli|token limit|rate limit|timeout|crash|unparseable verdict>`.
   If strict local fallback also cannot run, record `Verdict: degraded`, `Review route: degraded-none`, `Counterpart coverage: degraded`, and the exact `Counterpart failure`.

9. **Save the artifact** at `~/.lhc/artifacts/investigate-<slug>-<UTC-ISO>.md`. Required sections: timeline (UTC), evidence per surface with links/request IDs, **per-finding self-check classification** (anchor / inference / corroboration axes plus aggregate `verified` | `plausible` | `speculative`), correlation across surfaces, root-cause hypothesis with confidence, confidence Evidence Coverage, Exhaustion Ledger, Confidence Blockers, Next Evidence That Would Raise Confidence, bug classification, owner, **alternative hypotheses** (when the orchestrator ran the challenge lane — full counter-hypothesis blocks; otherwise `Challenge stance: skipped (<auto-trigger reason or user override>)` with the orchestrator's reasoning), peer-review verdict, Review route, Counterpart coverage, Counterpart failure when applicable, residual gaps.

10. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow investigate --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>" --kv verdict="<approved|approved-with-changes|rejected|degraded>" --kv conf="<low|medium|high>" --kv bug_labels="<labels|hypothesis:label>"
   ```

11. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
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
- [ ] Confidence policy applied; `medium` or `low` includes an Exhaustion Ledger and next evidence
- [ ] Each finding has a per-finding self-check classification (anchor / inference / corroboration); `speculative` findings are demoted to open hypotheses, not part of the conclusion
- [ ] Bug labels, severity, origin, defect surface, fix strategy, and verification implications recorded as evidence-backed conclusion or hypothesis
- [ ] Challenge stance recorded in the artifact (either ran with counter-hypotheses, or skipped with the orchestrator's reasoning); when the lane ran, every counter-hypothesis is side-by-side with the working conclusion
- [ ] Peer-review verdict recorded
- [ ] Review route, Counterpart coverage, and Counterpart failure recorded when applicable
- [ ] No external system was written to
- [ ] No source file was modified
</Final_Checklist>
