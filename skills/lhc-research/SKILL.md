---
name: lhc-research
description: Researches Wix engineering questions by programmer intent via docs-schema, octocode, and context7 (for external deps), saves findings to ~/.lhc/artifacts/research-*.md. Use when the user asks how something works, what internal pattern to follow, which service owns an area, what prior art exists, or which source-backed recommendation fits. Does not implement or modify code.
when_to_use: The user has a source-backed research question about internal Wix systems, docs, APIs, repo patterns, prior art, tradeoffs, migration/testing strategy, or standards context. The next action is knowledge gathering, not an immediate code change.
---

# LHC Research

"How does this work at Wix?" "What's the right internal pattern?" "Which service or doc explains this?" "What prior art or source-backed recommendation should guide the next step?" — this skill answers from internal sources and saves the answer as an artifact.

<Iron_Law>
NO CLAIM WITHOUT A SOURCE. Every non-trivial claim cites a doc URL, repo path, or PR ref. Quote the grounding passage when possible. Speculation is labeled speculation.

NO EXTRAPOLATION. Conclusions stay scoped to evidence actually found. If a question cannot be answered from internal sources, say so explicitly — do not guess.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/confidence-escalation-policy.md`
- `../shared/handoff-protocol.md`
- `../shared/notepad-schema.md`
- `../shared/wix-tool-surfaces.md`
- `../shared/research-intent-taxonomy.md`
- `../shared/bug-fix-taxonomy.md`
</Required_Reading>

<Use_When>
- The user asks "how does X work", "what pattern does Wix use for Y", or "which service owns Z".
- The user asks for source-backed internal prior art, implementation guidance, tradeoffs, migration/testing strategy, or planning context before deciding what to do.
- The answer lives in internal docs, schemas, or repo history.
- The goal is understanding, not a code change.
</Use_When>

<Do_Not_Use_When>
- The user wants a code change — use `lhc-ralplan` then `lhc-ralph`.
- The user is debugging a prod issue — use `lhc-investigate`.
- The user is failing a build — use `lhc-build-fix`.
</Do_Not_Use_When>

## Research Intent Classification

<Research_Intent_Classification>
Classify the request by the **programmer action after the research**, then choose evidence lanes and answer shape from `../shared/research-intent-taxonomy.md`.

Common LHC research labels:
- `learn_concept` — explain an internal concept, mechanism, framework behavior, or domain rule.
- `how_to_implement` — find source-backed implementation steps or examples, without editing code.
- `internal_best_practice` — find the Wix-approved or repo-native way to do something.
- `codebase_understanding` — explain where behavior lives, what calls it, or why it exists.
- `design_decision`, `rfc_review`, `compare_options` — compare approaches and recommend one from constraints and evidence.
- `debug_issue` — explain an unexpected behavior or historical/non-live bug pattern. Use `../shared/bug-fix-taxonomy.md` to name likely bug labels, but route live incidents to `lhc-investigate` and immediate code-changing fixes to `lhc-ralplan`.
- `verify_correctness`, `security_privacy_review`, `performance_optimization`, `ops_reliability` — gather source-backed risk, correctness, performance, or reliability evidence. Route live incidents to `lhc-investigate`.
- `integration_research`, `migration_upgrade`, `testing_strategy`, `planning_estimation`, `documentation_communication`, `ecosystem_awareness` — produce the source-backed context, plan inputs, or doc material the next action needs.

If multiple labels apply, choose the primary action and record secondary labels under caveats. If classification changes the right workflow, stop and route rather than forcing research.
</Research_Intent_Classification>

## Source Selection

<Source_Selection>
Use the taxonomy's source table to pick the minimum proving sources:
- Internal convention or approved tooling: `docs-schema` first, then octocode examples and PR/commit history.
- Codebase behavior or prior art: `octocode` first, then internal docs for intended contracts.
- RFC/proposal/tradeoff: RFC/ADR text first, then docs/code precedent and production constraints.
- API/framework/external dependency: internal docs first when Wix-specific; otherwise `context7` or official public docs.
- Correctness/security/compliance/protocol: specs, standards, policies, and advisories before examples.
- Performance/reliability/live behavior: logs, metrics, traces, dashboards, or datasource queries when the question depends on current production behavior.
</Source_Selection>

<Execution_Policy>
- Source priority is selected by `Source_Selection`. Use `docs-schema` as the default first source for internal standards, architecture, ownership, and schema/docs questions; use `octocode` first for codebase behavior, repo prior art, and PR/commit history; use `context7` only for external dependencies. Pull from the highest-priority relevant source first.
- Optional live surface: `grafana-datasource` — when the question is "what events does service X actually emit in prod?" or "which schema is in use right now?", `query_bi_events` / `query_panorama` answer from ground truth instead of docs. Treat as supporting, not primary; still cite every claim.
- Optional prior-art surfaces (READ-ONLY — write tools are policy-blocked):
  - `jira` — `get-issues`, `get-issue-changelog` to check whether the question has already been asked/decided in a ticket. Cite ticket key + quoted snippet. Do NOT call `create-issue`, `comment-on-issue`, or `transition-issue`.
  - `slack` — `search-messages`, `get_channel_history` for prior discussions ("has this been asked in the last 90 days?"). Cite the message permalink + verbatim snippet. Do NOT call `post_message`, `reply_to_thread`, or `schedule_message`.
- MUST save the research artifact at `~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md`.
- MUST keep conclusions scoped to evidence actually found. No extrapolating.
- MUST NOT edit repo files.
- Every non-trivial claim gets a source (doc URL, repo path, PR ref, or datasource query + response shape). Quote the passage that grounds the claim when possible.
- MUST apply `../shared/confidence-escalation-policy.md`: do not emit `medium` or `low` confidence until the relevant research evidence lanes have been exhausted or blocked paths have been recorded.
- If the research turns into a formal conclusion or plan, route through `lhc-review` for counterpart peer review.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow research --source workflow --cwd "$PWD" --task "<question>"
   ```

2. **Run readiness**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/check-readiness.js research --json
   ```

3. **Decompose** into 1-3 evidence lanes:
   - intent label and answer shape from `../shared/research-intent-taxonomy.md`
   - internal docs and schemas
   - repo and PR archaeology
   - framework/standards guidance

4. **Dispatch subagents in parallel** when lanes are independent:
   - `Task(subagent_type="let-him-cook:internal-docs-researcher", …)`
   - `Task(subagent_type="let-him-cook:repo-cartographer", …)`
   - `Task(subagent_type="let-him-cook:framework-standards-reviewer", …)`

5. **Gather evidence** from the highest-priority relevant source first. Each subagent returns: what it checked, key findings with quoted passages, caveats, source families.

6. **Synthesize** — the coordinating agent reconciles conflicts and writes the final answer.

6a. **Per-claim self-check classification** — for each non-trivial claim in the answer (any sentence the user might cite or act on), apply the same three-axis ordinal self-check used by `lhc-pr-review` and `lhc-investigate`:
   - **anchor** — does the cited source (doc URL, repo path, PR ref, datasource query) point at the right grounding passage? `concrete` | `uncertain`
   - **inference** — is the claim faithful to the source, or does it generalize beyond what the source said? `concrete` | `uncertain`
   - **corroboration** — does an independent source family (docs vs. repo prior art vs. RFC vs. live datasource) corroborate the claim? `concrete` | `uncertain`

   Aggregate self-check is the WORST of the three axes: `verified` (all concrete) / `plausible` (one uncertain) / `speculative` (two or three uncertain). Claims with `self_check: speculative` are demoted to a `## Speculative claims` section in the artifact and excluded from any "recommendation" or "conclusion" answer-format. This forces the Iron Law ("NO CLAIM WITHOUT A SOURCE") to bite at the per-claim level rather than at the artifact level.

6b. **Adversarial steelman pass — orchestrator decides whether to run.** The orchestrator (NOT the user) evaluates the auto-trigger rules below; if any rule fires, dispatch a fresh `Task(subagent_type="let-him-cook:repo-cartographer", prompt=<challenge-prompt>)` lane that ONLY tries to argue the OPPOSITE of the working answer:
   - For each material claim, what would a senior engineer who disagrees say?
   - What source would they cite? Is that source actually present in the repo / docs?
   - What is the strongest version of the alternative — not the weakest?
   - Where does the working answer over-generalize from a single example?

   **Auto-trigger rules** — run the steelman lane when ANY of:
   - intent label is `design_decision`, `rfc_review`, `compare_options`, `security_privacy_review`, `migration_upgrade`, `performance_optimization`, `ops_reliability`
   - answer format is `recommendation`, `tradeoff table`, or `risk assessment`
   - the working answer recommends ONE option among 2+ alternatives (recommendation questions are where being wrong is most expensive)
   - the question's domain involves security, privacy, money, data integrity, or rollout-irreversible migrations
   - all corroboration evidence comes from the SAME source family (e.g. only docs-schema, or only octocode) — single-family corroboration is brittle, steelman from a different angle catches it

   **User override (natural language only).** "Skip the steelman" / "don't argue the other side" → orchestrator records the quote and skips. "Steelman this" / "what's the counter-argument" → orchestrator forces the lane and records the quote. No CLI flag.

   Returns at most three steelman counter-claims, each with: cited source, the version of the working answer it contradicts, and a one-line resolution (which is right and why, OR "both partially correct, qualify the working answer"). Steelmans that are themselves `speculative` are dropped. Pattern borrowed from `openai/codex-plugin-cc`'s adversarial-review stance, applied to research conclusions rather than diffs.

7. **Confidence gate** — before assigning `Confidence`, apply the research ladder from `../shared/confidence-escalation-policy.md`:
   - For `high`, record the primary source and an independent supporting source, or record that the negative search exhausted the relevant source families.
   - For `medium` or `low`, add an Exhaustion Ledger naming each source/tool/query/path tried, its result, blocked paths, contradictions, and the next evidence that would raise confidence.
   - Do not use the lower label as a shortcut for an incomplete first pass.

8. **Save artifact** at `~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md`. Include question, intent fields, answer, evidence with links + one-line quote per claim, **per-claim self-check classification** (anchor / inference / corroboration axes plus aggregate `verified` | `plausible` | `speculative`), **speculative claims** demoted out of the main answer (separate section), **steelman counter-claims** (when the orchestrator ran the steelman lane — each with cited source and resolution; otherwise `Challenge stance: skipped (<auto-trigger reason or user override>)` with the orchestrator's reasoning), caveats, and an explicit "not verified" list for anything that could not be grounded.

   Required intent fields:
   ```
   Intent label: <one label from ../shared/research-intent-taxonomy.md>
   Programmer action: <what the user is trying to do after the research>
   Source plan: <source families consulted and why>
   Answer format: <explanation|recipe|recommendation|tradeoff table|risk assessment|test plan|migration plan|doc draft|other>
   Bug labels: <primary label>[, <secondary label>...]   (if intent is debug_issue)
   ```

   Required confidence fields:
   ```
   Confidence: <high|medium|low>
   Evidence Coverage: <required source families, consulted source families, independent cross-check>
   Exhaustion Ledger: <attempted sources/tools/queries and results>
   Confidence Blockers: <none for high, otherwise exact blockers>
   Next Evidence That Would Raise Confidence: <specific source/tool/query/person/test>
   ```

9. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow research --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>" --kv conf="<low|medium|high>"
   ```

10. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: research
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <artifact-path>
   - Intent label: <one label from ../shared/research-intent-taxonomy.md>
   - Answer format: <explanation|recipe|recommendation|tradeoff table|risk assessment|test plan|migration plan|doc draft|other>
   - Bug labels: <primary label>[, <secondary label>...]   (if intent is debug_issue)
   - Confidence: <low|medium|high>
   ```

   Research is terminal. If the user wants to plan a code change from here, they invoke `lhc-ralplan` explicitly — this skill does not chain.

<Final_Checklist>
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Intent label, programmer action, source plan, and answer format recorded
- [ ] Intent label and answer format included in the terminal handoff
- [ ] At least one internal source cited (docs-schema or octocode) when the question is Wix-specific
- [ ] Quoted passages per claim where available
- [ ] Each non-trivial claim has a per-claim self-check classification (anchor / inference / corroboration); `speculative` claims are demoted out of the main answer
- [ ] Challenge stance recorded in the artifact (either ran with steelman counter-claims, or skipped with the orchestrator's reasoning)
- [ ] Caveats and "not verified" items explicit
- [ ] Confidence policy applied; `medium` or `low` includes an Exhaustion Ledger and next evidence
- [ ] No source file was modified
</Final_Checklist>
