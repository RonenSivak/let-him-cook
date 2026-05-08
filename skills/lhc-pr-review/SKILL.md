---
name: lhc-pr-review
description: Reviews a Wix GitHub pull request through parallel scoped stages — spec-compliance, code quality, security, plus optional i18n-a11y and wix-standards lanes — and renders findings to chat. Read-only by default; never posts to GitHub. Complements the existing CI-side @wix/ai-code-reviewer; this skill is developer-side, on-demand, and tunable per invocation. Reads repo-local AGENTS.md / CLAUDE.md / REVIEW.md / .coderabbit.yaml. Saves a review artifact at ~/.lhc/artifacts/pr-review-*.md.
when_to_use: The user asks to review a specific PR ("review my PR", "review #1234", "second opinion on this diff", "preflight review before push"); or the user wants AI feedback on a change before merge but does not want the CI bot to be the only signal.
---

# LHC PR Review

Developer-side, on-demand PR review. Fans out scoped stages — spec-compliance, code quality, security, and optional i18n-a11y / wix-standards lanes — in parallel, suppresses below-threshold and low-confidence findings, has the counterpart model peer-review the review, then renders results to chat. Strictly read-only: never posts comments, never modifies the PR, never writes to GitHub.

<Iron_Law>
NEVER WRITES TO GITHUB. The skill is chat-only. It does NOT post `pull_request_review`s, does NOT post `issue_comment`s, does NOT post inline `pull_request_review_comment`s, does NOT call `gh pr comment / gh pr review / gh pr merge / gh pr close`, does NOT modify labels or assignees. The only GitHub interaction is read-only: `gh pr view ... --json` for metadata, `gh pr diff` for the patch. If the user asks the skill to post the review on the PR, refuse and tell them to copy the chat output into a comment themselves (a human decision). See `../shared/read-only-governance.md`.

NO SELF-APPROVAL ON THE REVIEW. The findings list is itself an artifact; route it through `peer-review.sh --mode analysis` before saving an `approved` verdict. If the counterpart cannot complete a parseable verdict, fall back per `../shared/peer-review-governance.md` and record `counterpart_coverage=degraded`.

LOW-CONFIDENCE FINDINGS ARE DROPPED. Prompt-only LLM judges are well-documented to over-flag in real-world code review — the dominant complaint across deployed tools is noise, not missed defects (CodeRabbit / Greptile / Cursor BugBot all ship explicit suppression lanes; arXiv:2509.01494 SWR-Bench reports best-in-class precision in the 15–20% range without grounding). The prompt envelope below applies the Qodo confidence rule verbatim plus a three-class ordinal self-check (`verified` / `plausible` / `speculative`) — LLMs calibrate ordinal categories with named definitions far better than 0–100 numeric scores, where outputs cluster around round numbers and shift with prompt wording. The default cutoff drops findings whose self-check is `speculative`; tunable per invocation via `--min-self-check`.

DEFER TO REPO TUNING. If `AGENTS.md` (Codex review guidelines), `CLAUDE.md`, `REVIEW.md`, or `.coderabbit.yaml` exists in the repo, treat it as the highest-priority instruction layer for this PR. Wix repos use `AGENTS.md` for Codex review tuning today; honoring it is non-negotiable.

FLAG, DO NOT DUPLICATE, EXISTING CI REVIEWS. If the CI-side `@wix/ai-code-reviewer` GitHub Action has already posted a review on this PR — detected as a comment or review authored by `github-actions[bot]` whose body contains the marker string `@wix/ai-code-reviewer` (or links to `wix-private/ai-code-reviewer`) — print a NOTE in the chat output and the artifact that names the existing CI review URL, so the user can compare. The skill still runs (chat-only output is harmless), but the artifact records the existing CI review explicitly.

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
- `../shared/review-attack-surface.md`
- `../shared/coding-standards-policy.md`
- `../shared/wix-tool-surfaces.md`
</Required_Reading>

<Use_When>
- The user names a specific PR or branch and asks for AI review feedback ("review #1234", "review this branch", "preflight before I push", "second opinion on the diff").
- The change is small enough that running CI just to see review feedback would waste a cycle, OR the user wants targeted deep-dive review beyond the CI bot's scope.
- The user wants to tune severity / category filters per invocation (e.g. "just security findings", "blockers only", "include nits").
- A plan exists at `~/.lhc/plans/` and the user wants spec-compliance verification on the implementing diff before merge.
</Use_When>

<Do_Not_Use_When>
- The user wants the CI to review the PR — that already runs automatically via `wix-private/ai-code-reviewer/.github/actions/code-review@master`. Do not duplicate it; tell the user the CI bot is sufficient.
- The user is investigating a production issue — use `lhc-investigate`.
- The user is fixing a broken build — use `lhc-build-fix`.
- The user wants to plan a change that has not been written yet — use `lhc-ralplan`.
- The user wants to peer-review a *plan* or *investigation* (not a diff) — use `lhc-review`.
- The diff is not yet pushed to a branch and there is no PR — running against a local `git diff` is still allowed (chat output is identical); the only loss is PR metadata (title, body, labels, author).
</Do_Not_Use_When>

<Execution_Policy>

- MUST NOT call `gh pr review`, `gh pr comment`, `gh pr merge`, `gh pr close`, or any `gh api ... -X POST` against the reviews/comments endpoints. The skill is chat-only.
- MUST save the review artifact at `~/.lhc/artifacts/pr-review-<slug>-<UTC-ISO>.md` before stopping.
- MUST run a counterpart peer-review of the merged findings via `peer-review.sh --mode analysis` before claiming the review is `approved`.
- MUST drop findings below the configured `--min-severity` (default `minor`), below the configured `--min-confidence` (default `medium`), and below the configured `--min-self-check` (default `plausible`, i.e. drop `speculative`).
- MUST honor repo-local tuning files (`AGENTS.md`, `CLAUDE.md`, `REVIEW.md`, `.coderabbit.yaml`) when present.
- MUST skip draft PRs unless `--include-draft` was given in the same turn.
- MUST skip bot-authored PRs (mirroring CI behavior) unless `--review-bots` was given.
- If readiness reports `blocked`, hard-stop unless the user opts into degraded mode in the same turn.

</Execution_Policy>

## Inputs (resolved in step 3 of the workflow)

| Input | Source | Default |
|-------|--------|---------|
| `--pr <number>` | user; or auto-detect from current branch via `gh pr view --json number` | required if no `--base/--head` |
| `--base <ref>` / `--head <ref>` | user; or `origin/main`...`HEAD` | fallback when no PR exists |
| `--stages <comma-sep>` | user; default chosen from context | `quality,security` (+ `spec` when a plan is attached) |
| `--plan <path>` | user; or auto-detect most-recent `~/.lhc/plans/ralplan-*.md` | optional |
| `--min-severity blocker|major|minor|nit` | user | `minor` (drop nits before output) |
| `--min-confidence high|medium|low` | user | `medium` (drop low before output) |
| `--min-self-check verified\|plausible\|speculative` | user | `plausible` (drops `speculative`; ordinal categories calibrate better than 0–100 numeric scores) |
| `--include-draft` | user | off |
| `--review-bots` | user | off |
| `--allow-large` | user | required when diff > 5000 added lines |
| `--owner <org>` / `--repo <name>` | gh CLI; or env | auto |

## Output

The skill is **chat-only**. It renders TL;DR + walkthrough + per-finding block to the terminal and saves the same content to `~/.lhc/artifacts/pr-review-<slug>-<UTC-ISO>.md`. Each finding is printed as:

```text
[<severity>][<category>] <file>:<line_start>-<line_end>  (confidence: <high|medium|low>, self-check: <verified|plausible|speculative>)
  Problem:    <one-sentence statement>
  Scenario:   <concrete trigger>
  Suggested:  <one-line fix or pointer to the suggestion block in the artifact>
```

If the user wants to share the review on GitHub, they copy the relevant section into a PR comment themselves. The skill does not post.

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow pr-review --source workflow --cwd "$PWD" --task "<user request>" --peer-review-required
   ```

2. **Run readiness**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/check-readiness.js pr-review --json
   ```

3. **Resolve the PR** — pick the cheapest path:
   ```bash
   gh pr view "${PR:-}" --json number,title,body,author,baseRefName,headRefName,headRefOid,isDraft,labels,additions,deletions,changedFiles,reviewDecision,url
   gh pr diff  "${PR:-}" --patch > "$LHC_TMP/pr-diff.patch"
   ```
   If no `--pr` was given, fall back to `gh pr view --json number` (auto-resolves from current branch). If still none, fall back to the local `git diff <base>..<head>` against the user-supplied base/head and run with reduced metadata (no PR title, body, labels, or author).

4. **Skip-or-continue gates**
   - If `isDraft` is true and `--include-draft` is not set: stop with a one-liner.
   - If `author.is_bot` is true and `--review-bots` is not set: stop with a one-liner.
   - If the diff contains zero source-file changes (only lockfiles, generated, docs-only, vendor, dist): print a "no review needed" line and stop.
   - **CI-bot-already-reviewed detection** — pull `gh pr view <pr> --json comments,reviews` and look for either:
     - a `comments[]` entry whose `author.login` matches `^github-actions(\[bot\])?$` AND whose `body` contains the marker `@wix/ai-code-reviewer` (or links to `wix-private/ai-code-reviewer`), OR
     - a `reviews[]` entry whose `author.login` matches the same pattern AND whose `body` contains the same marker.

     If either matches, print a one-line note (with the URL of the existing CI review) so the user can compare. Continue and produce the chat output regardless. Record the detection result in the artifact under "CI-bot detection" with verbatim author and marker.

5. **Read repo tunings (in this priority order, highest first)**
   - `REVIEW.md` (review-only, treated as highest priority — Anthropic Claude Code Review pattern).
   - `AGENTS.md` "Review guidelines" / "Code review" section (Codex pattern, used by `wix-private/ai-code-reviewer`).
   - `CLAUDE.md` (project-wide context; review treats violations as nits unless flagged otherwise).
   - `.coderabbit.yaml` (path instructions, ast-grep rules, language-specific).
   - The latest `~/.lhc/artifacts/standards-*.md` brief if one exists for the slug; otherwise invoke `Skill("let-him-cook:lhc-standards")` for diffs that touch source files.

6. **Optional: attach a plan for spec-compliance** — if `--plan <path>` was given or the most-recent `~/.lhc/plans/ralplan-*.md` matches the current branch slug, load it and add `spec` to `--stages`. The spec stage will be evaluated criterion-by-criterion against the diff.

7. **Optional: attach a Jira ticket for spec-compliance (READ-ONLY)** — if the PR title or body references a Jira key (e.g. `TLV-12345`), pull the ticket via `mcp__mcp-s__jira__get-issues` and use the description and acceptance criteria as additional spec inputs. Do NOT call any mutating Jira tool — `comment-on-issue`, `transition-issue`, `update-issue` are all denied per `permissions.json`. If the Jira MCP is unavailable, off-token, or rate-limited, skip this step and record `Jira coverage: skipped (<reason>)` in the artifact — do NOT block the workflow on optional ticket context.

8. **Optional: attach repo intelligence (READ-ONLY)** — when the diff touches public exports, cross-package APIs, or files with many incoming references, pull supplementary context with `octocode` (`localFindFiles`, `localSearchCode`, `lspCallHierarchy(incoming)` for changed exports) and `mcp__mcp-s__docs-schema__*` for FQDN/contract diffs. Skip when the change is purely local. The deep-dive budget is bounded — three octocode calls per stage maximum.

9. **Stage dispatch (parallel)** — fan out independent subagent lanes via the host's Task tool. Each lane is a fresh context, gets only the inputs it needs, and returns a list of findings in the canonical schema (see "Finding schema" below).

    **Auto-include rules — decided by the orchestrator, NOT the user** (run before dispatch, in this order):
    - If a plan was attached in step 6 OR a Jira ticket in step 7: auto-add `spec` to `--stages`.
    - If any changed file matches `**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.svelte`, `**/*.html`, `**/*.css`, `**/*.scss`: auto-add `i18n-a11y` to `--stages` unless the user explicitly excluded it in plain language ("skip i18n review", "no a11y").
    - If any changed file matches `**/wix.config.js`, `**/yoshi.config.*`, `**/fedops.config.*`, `**/bi-events/**`, `**/experiments/**`, or imports `@wix/yoshi`, `@wix/fedops-logger`, `@wix/wix-bi-tag`: auto-add `wix-standards` unless explicitly excluded.
    - **simplify lane** auto-add when ANY of: (a) source-file additions exceed 200 lines, (b) the diff introduces 3+ new functions/methods/classes, (c) the diff contains nested ternaries, dense one-liner functional chains, or comments that restate the code (these are detectable patterns the orchestrator can grep for in the patch). Skip when the diff is doc-only / config-only / generated, or when the user explicitly said "skip simplification" / "no polish pass" in plain language in the same turn.
    - `quality` and `security` always run unless explicitly excluded.

    **Adversarial stance — decided by the orchestrator, NOT the user.** Adversarial mode applies the **Adversarial overlay** block (below) to every dispatched stage's prompt envelope. The orchestrator activates adversarial mode when ANY of:
    - The PR touches security-sensitive paths: `**/auth/**`, `**/permissions/**`, `**/csrf/**`, `**/session/**`, `**/billing/**`, `**/payment/**`, `**/iam/**`, `**/secrets/**`, or any file importing crypto / signing / token-mint primitives.
    - The PR changes a public API contract (any TypeScript declaration file in `dist/`, `.d.ts` in `index`, OpenAPI/proto files, or exported function signatures in package entry points).
    - The PR modifies a config flag default, a feature-flag rollout setting, or an experiment's targeting rule.
    - The diff is large (>500 added lines) AND has no test additions.
    - The PR description claims "no behavior change" but the diff has substantive logic changes (new conditionals, new function calls in production paths).
    - A plan is attached and the plan has high-risk classifications (auth, billing, privacy, data-corruption, distributed-system, concurrency, migration).

    **User override (natural language only).** If in the same turn the user explicitly says "review adversarially", "challenge this", "pressure-test the design" — adversarial mode is on. If they say "standard review", "no adversarial pass", "just check correctness" — adversarial mode is off. The orchestrator records the decision and reasoning in the artifact (`Review stance: adversarial (<auto-trigger reason | user override quote>)` or `Review stance: standard`).

    Stages (only the ones in `--stages` after auto-include run):
    - **spec** — `Task(subagent_type="let-him-cook:code-reviewer", prompt=<spec-prompt with plan + diff>)` — verifies acceptance criteria criterion-by-criterion. Stage 1 of the LHC two-stage code-review contract.
    - **quality** — `Task(subagent_type="let-him-cook:code-reviewer", prompt=<quality-prompt with diff + standards brief + repo tunings>)` — correctness, minimality, idiomatic fit, test coverage, dead code, error handling. Stage 2 of the contract.
    - **security** — `Task(subagent_type="let-him-cook:code-reviewer", prompt=<security-prompt with diff + Wix security non-negotiables>)` — CSRF/XSS/SSRF/SQLi/secrets, authz/authn, SSO cookie handling, prototype pollution, unsafe `eval`, regex DoS, supply-chain (new deps), and Wix-specific concerns: BI event PII leakage, fedops misuse, experiment flag leakage, panorama tags.
    - **i18n-a11y** (auto-included for UI changes) — RTL handling, missing `alt`, unlabeled controls, contrast, hardcoded strings where i18n is required, ARIA misuse.
    - **wix-standards** (auto-included for Wix tooling changes) — Yoshi config, fedops events, BI events, experiment flags, panorama tags, Wix SDK usage, monorepo build rules.
    - **simplify** (auto-included by orchestrator decision; see auto-trigger rules below) — `Task(subagent_type="let-him-cook:code-simplifier", prompt=<simplify-prompt with diff>)` — clarity-focused before/after suggestions on the recently-modified code only. Read-only; emits before/after blocks, never applies edits. Output is rendered alongside review findings in the artifact and chat output as a separate `## Simplification suggestions` section. Suggestions whose `Behavior:` is anything other than `preserved` are dropped (they are findings, not simplifications).

    Pass each subagent the **prompt envelope** (below) with the appropriate stage-focus paragraph. Do NOT include the diff inline if it exceeds 50 KB — write it to `$LHC_TMP/pr-diff.patch` and pass the path.

10. **Merge stage outputs**
    - Concatenate findings.
    - Deduplicate by `(file, line_start, line_end, category)` keeping the highest severity / highest confidence variant.
    - Drop findings with `severity` below `--min-severity`.
    - Drop findings with `confidence` below `--min-confidence`.
    - **Self-check classification** — for each surviving finding, run a single-shot subagent pass that classifies the finding into one of three ordinal categories on three axes: (a) anchor correctness — does the file:line point at the right code, (b) fix correctness — is the suggested change actually right, (c) evidence concreteness — is the trigger scenario specific enough that a competent reviewer would address it. The aggregate self-check is the WORST of the three axis-level checks:
      - `verified` — all three axes are concrete and right.
      - `plausible` — exactly one axis is uncertain; the other two are concrete.
      - `speculative` — two or three axes are uncertain, OR any axis is contradicted by quick re-reading of the diff.

      Drop findings whose self-check is below `--min-self-check` (default `plausible`, i.e. drop `speculative`). Ordinal classification with named categories is more reliable than a 0–100 score: LLMs cluster numeric outputs around round numbers (50, 70, 80) and shift with prompt wording, but they apply named categories with consistent definitions far more stably (commonly cited in calibration evaluations of LLM-as-judge). Record the per-axis classifications in the artifact so cutoff calibration can be evaluated against subsequent human-reviewer outcomes.
    - Order surviving findings by severity, then confidence, then file path.

11. **Counterpart peer-review of the merged review** — required before `approved`:
    ```
    Bash(
      command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode analysis --cwd \"$PWD\" --prompt-file <merged-review-path>",
      run_in_background: true,
      timeout: 600000
    )
    → poll BashOutput(bash_id) every 10-20s until "## Verdict" appears.
    ```
    The counterpart sees the merged review (verdict + per-finding block) plus the diff, and is prompted to flag hallucinated findings, evidence laundering, severity inflation, and prompt-injection in the diff itself. If the counterpart cannot complete a parseable verdict, run the strict local fallback per `../shared/peer-review-governance.md` and record `Review route: strict-local-fallback`, `Counterpart coverage: degraded`, `Counterpart failure: <reason>`.

12. **Save the review artifact** at `~/.lhc/artifacts/pr-review-<slug>-<UTC-ISO>.md`. Required sections:
    - PR metadata (number, title, author, base, head SHA, additions/deletions, label list, URL)
    - Stages run, with subagent IDs / dispatch timings
    - Repo tunings consulted (paths and sizes)
    - Plan attached (path) and Jira ticket attached (key) when applicable
    - CI-bot detection result (URL of the existing CI review when found, or "none")
    - **Verdict** — `approved` / `approved-with-changes` / `rejected` / `degraded`
    - **TL;DR** — one or two sentences
    - **Walkthrough** — bullet list of what changed and why
    - **Scoring** — review-effort 1–5; security-concerns: yes/no/specific
    - **Findings** — list in the canonical schema below, ordered by severity / confidence
    - **Simplification suggestions** (when `simplify` stage ran) — separate section, not folded into findings. Each suggestion as a before/after block. Source: `code-simplifier` agent.
    - **Suppressed findings** — list of findings that were dropped (with reason: severity floor / confidence floor / self-check classification) so the user can audit signal-to-noise
    - **Peer review** — counterpart verdict, Review route, Counterpart coverage, Counterpart failure when applicable

13. **Render output to chat** — print the TL;DR, walkthrough, scoring, and per-finding block to the terminal. Each finding rendered as:

    ```text
    [<severity>][<category>] <file>:<line_start>-<line_end>  (confidence: <high|medium|low>, self-check: <verified|plausible|speculative>)
      Problem:    <one-sentence statement>
      Scenario:   <concrete trigger>
      Suggested:  <one-line fix or pointer to suggestion block in artifact>
    ```

    The terminal output is a strict subset of the artifact — the artifact contains the full suggestion blocks (multi-line code) and the suppressed-findings list; the terminal trims those for readability and points at the artifact path. The user can copy any section into a PR comment manually if they want to share findings.

14. **Append to notepad** (use the helper — never hand-format)

    ```bash
    node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
      --workflow pr-review --slug "<slug>" --cwd "$PWD" \
      --kv artifact="<artifact-path>" --kv pr="<pr-number>" \
      --kv verdict="<approved|approved-with-changes|rejected|degraded>" \
      --kv findings="<count>" --kv suppressed="<count>"
    ```

15. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):

    ```text
    LHC HANDOFF
    - Completed: pr-review
    - Slug: <slug>
    - Cwd: <pwd>
    - Artifact: <artifact-path>
    - PR: <pr-number>
    - Verdict: <approved|approved-with-changes|rejected|degraded>
    - Findings: <count>
    - Suppressed: <count>
    ```

    `lhc-pr-review` is terminal — the user decides whether to act on findings, share them in a PR comment manually, or revise the diff and re-review.

## Finding schema (canonical)

Every finding (in subagent output, in the merged artifact, and in the GitHub payload) uses this shape:

```yaml
file:        path/to/file.ts            # relative to repo root
line_start:  42                          # 1-indexed line in the head ref
line_end:    47                          # inclusive; equal to line_start for a single-line finding
side:        RIGHT                       # RIGHT for new lines, LEFT for context
severity:    blocker|major|minor|nit
category:    bug|security|spec-drift|perf|maintainability|test|i18n-a11y|wix-standards
confidence:  high|medium|low
self_check:  verified|plausible|speculative   # ordinal self-check (anchor, fix, evidence axes; aggregate = worst)
self_check_axes:
  anchor:    concrete|uncertain
  fix:       concrete|uncertain
  evidence:  concrete|uncertain
problem:     "One-sentence statement of what is wrong."
scenario:    "Concrete trigger: when X happens, Y is observed."
suggested_fix: |
  ```suggestion
  // exact replacement for the cited lines, when confidence is high
  const safe = guard(input);
  ```
why_it_matters: "Impact on user / data / security / availability."
sources:     ["repo-tuning:AGENTS.md§Review-guidelines", "standards-brief:§Security non-negotiables"]
```

`suggested_fix` uses GitHub's ```suggestion fenced-block syntax when `confidence == high` so the PR author can one-click commit the fix. Per arXiv 2508.18771, code-heavy comments (>50% code) are addressed at 23.2% vs prose-only at 4.2%.

## Severity rubric (locked semantics)

| Severity | Meaning | Maps to |
|----------|---------|---------|
| `blocker` | Will cause incident, data loss, money loss, security breach, or violates a hard non-negotiable. Cannot ship. | LHC `rejected` if any blocker survives suppression. |
| `major` | Real defect or design problem. Should fix before merge. Implementation choice with material downside. | LHC `approved-with-changes` if any major survives. |
| `minor` | Should fix in this PR if cheap. Quality, missing edge case, small refactor. | LHC `approved-with-changes` only if explicitly enabled. |
| `nit` | Reviewer preference. Skipped by default (`--min-severity minor`). Subjective. | Never blocks; usually suppressed. |

Severity is mapped to the LHC verdict at merge time, not by individual subagents. Subagents emit findings; the merge step computes the overall verdict from the surviving findings.

## Category list (locked vocabulary)

| Category | What it covers |
|----------|----------------|
| `bug` | Logic errors, null/boundary, off-by-one, race, wrong return type, broken control flow. |
| `security` | CSRF, XSS, SSRF, SQLi, command injection, prototype pollution, unsafe `eval`, regex DoS, secrets in code, weak crypto, auth/authz bypass, SSO cookie misuse, BI PII leakage, unsafe `dangerouslySetInnerHTML`, supply-chain risk on new deps. |
| `spec-drift` | Diff does not satisfy a numbered acceptance criterion in the attached plan, or contradicts the PR description. |
| `perf` | Quadratic loops on hot paths, missing memoization, accidental N+1, oversized bundle additions, unbounded retries. Only flag with concrete scenario. |
| `maintainability` | Dead code, duplication that survives the diff, unclear naming, excessive complexity, missing types where the codebase enforces typing. |
| `test` | Missing test for new behavior, broken test, flaky pattern, mock/prod divergence, test asserts on wrong observable. |
| `i18n-a11y` | RTL handling, missing `alt`, unlabeled controls, contrast, hardcoded strings where i18n is required, ARIA misuse. |
| `wix-standards` | Wix tooling conventions: Yoshi config, fedops events, BI events, experiment flags, panorama tags, wix-bi schemas, Wix SDK usage, monorepo build rules. Map to `wix-tool-surfaces.md` and the standards brief. |

## Prompt envelope (passed to each stage subagent)

```
# LHC PR REVIEW — STAGE=<stage>

You are reviewing a single GitHub pull request for the Wix engineering org.
Your ONLY job is to produce a list of findings in the canonical YAML schema.
You MUST NOT implement code, write to files, or call write-side tools.

# Confidence rule (Qodo PR-Agent, verbatim)
For clear bugs and security issues, be thorough. Do not skip a genuine problem
just because the trigger scenario is narrow. For lower-severity concerns, be
certain before flagging. When confidence is limited but the potential impact
is high (e.g., data loss, security), report it with an explicit note on what
remains uncertain. Otherwise, prefer not reporting over guessing.

If you cannot confidently explain why something is a problem with a concrete
scenario, do not flag it. False positives erode reviewer trust faster than
missed defects do (arXiv:2509.01494, codeant.ai 2026 benchmark).

# Stage focus
<one of the stage-focus blocks below, six lines max each>

# Inputs
- PR metadata:           <json>
- Diff:                  <inline if <50 KB, else $LHC_TMP/pr-diff.patch>
- Repo tunings:          <list of paths read>
- Standards brief:       <path or "none">
- Plan (spec stage only): <path or "none">

# Output schema
A YAML list of findings, one per finding, exactly as specified in the
"Finding schema (canonical)" section of the LHC PR Review skill.
Empty list if you find nothing worth flagging at this confidence.

# Severity contract
Use ONLY: blocker | major | minor | nit. Use the rubric verbatim from the
skill. Do not invent severities. Do not coerce a stylistic preference into
"major". A blocker requires a concrete scenario where the code causes
incident-level harm.

# Read-only contract
You have Read, Grep, and Glob. You do NOT have Write or Edit. Do not attempt
to modify the diff or the repo. Do not post comments anywhere.
```

The stage-specific paragraph is short and focused (no more than 6 lines), per Huang et al. ICLR 2024 (long self-correction prompts degrade quality) and SWR-Bench (decomposition-by-concern beats CoT inside a single prompt). Use the canonical block for each stage:

### Stage focus — `spec`
```
Verify the diff against the attached plan or Jira ticket criterion-by-criterion.
For each numbered acceptance criterion, decide: satisfied / partially satisfied /
unmet / out-of-scope. Cite file:line evidence for every "satisfied" call. Flag
any code in the diff that does not map to a criterion as `spec-drift` (severity
`major` if it changes acceptance, `minor` otherwise). Do not evaluate code
quality here — that is the `quality` stage.
```

### Stage focus — `quality`
```
Evaluate correctness, minimality, idiomatic fit, test coverage against the
new behavior, and adherence to the standards brief's Applied Rulings. Defer
style nits to the brief — do not raise findings that contradict its rulings.
Flag dead code, broken control flow, off-by-one, race conditions, missing
error handling, and tests that assert the wrong observable. Do NOT raise
security findings here — that is the `security` stage.

Apply the four specialty lenses (zero tolerance for violations):

(a) Silent-failure lens — every catch / try-except / .catch / fallback
    code path must have a specific exception type, log-and-rethrow OR
    log-and-surface OR justified swallow with comment. Bare catches and
    silent fallbacks that hide failures from observability are blockers
    in production paths.

(b) Type-design four-axis lens (typed languages) — for newly-introduced
    or substantially-modified types, classify each axis as `concrete` or
    `uncertain`: encapsulation (invariants enforced through the type),
    invariant expression (rules visible in shape), usefulness (compile-time
    misuse becomes obvious), enforcement (no `as any` / unjustified casts).
    Two `uncertain` axes = [major]; cast at a domain boundary = [major]
    regardless.

(c) Test-purpose lens — every test added or modified must answer
    "what specific regression does this prevent". Tests asserting on
    implementation detail = [major]; tests testing the mock = [blocker].

(d) Specialty-lens detail lives in skills/lhc-review/SKILL.md
    "Specialty lens checklist (Stage 2)". Apply it verbatim here.
```

### Stage focus — `security`
```
Limit findings to security-impacting issues. Categories: CSRF / XSS / SSRF /
SQLi / command injection / prototype pollution / unsafe eval / regex DoS /
secrets in code / weak crypto / authn-authz bypass / SSO cookie misuse /
unsafe dangerouslySetInnerHTML / supply-chain risk on new deps. Wix-specific:
BI event PII leakage, fedops misuse, experiment-flag leakage, panorama tag
PII. A `blocker` requires a concrete exploit scenario, not a theoretical risk.
```

### Stage focus — `i18n-a11y` (UI changes only)
```
Limit findings to internationalization and accessibility. Look for: hardcoded
user-visible strings where i18n is the convention, missing `alt` on images,
unlabeled form controls, ARIA misuse, keyboard-trap risks, RTL-breaking
hard-coded `left/right`, contrast violations, loss of focus state. A `blocker`
requires demonstrable user harm (cannot complete a task with a screen reader,
cannot use the page in RTL).
```

### Stage focus — `wix-standards` (Wix tooling changes only)
```
Limit findings to Wix tooling conventions: Yoshi config drift, fedops event
schema drift, BI event schema drift, experiment-flag naming, panorama tag
shape, Wix SDK usage, monorepo build rule changes. Map each finding back to
the standards brief or `wix-tool-surfaces.md`. Defer general code quality to
the `quality` stage and security to the `security` stage. Do not raise nits
that contradict the standards brief's applied rulings.
```

### Stage focus — `simplify` (clarity-only polish lane)
```
Use the `code-simplifier` agent. Scope is the diff, not the codebase. Emit
before/after blocks with `Behavior: preserved` for every suggestion. Three
priorities: `keep` (materially better), `consider` (defensible alternative),
`nit` (taste). Drop suggestions where Behavior is anything other than
`preserved` — those are findings, not simplifications, and belong in the
`quality` stage.

Targets: nested ternaries, redundancy the diff introduced, misleading names,
comments that restate the code, dense one-liners that the diff added. Do NOT
flag duplication that pre-dates the diff. Do NOT propose changes to code the
diff did not touch. Defer to the standards brief's Applied Rulings.

Output is rendered as `## Simplification suggestions` — separate from
`## Findings`. Severity does not apply (these are not defects).
```

### Adversarial overlay (applied when the orchestrator activates adversarial stance)

When the auto-trigger rules above (or a same-turn user override) put the review in adversarial stance, prepend this block to every stage's prompt envelope. It does NOT replace the stage-focus paragraph — it changes the stance.

```text
Adversarial stance:
You are reviewing this diff as a skeptic, not a checker. Your job is not to
verify the implementation works — it is to question whether this is the right
implementation at all.

For each non-trivial choice in the diff, ask:
- Why this approach and not the obvious alternative? Is the alternative cited
  and rejected, or silently skipped?
- What invariant or constraint makes this choice load-bearing? Is that
  invariant actually true in the rest of the codebase?
- What part of this design will be the first thing rewritten in 6 months?
- Where does this diff add complexity that the problem did not require?
- What edge case or failure mode is the author confident about that they
  haven't actually tested?

Surface findings as [major] when the design choice has a material downside the
author appears to have missed, [minor] when there is a defensible alternative
worth considering, and [nit] when it is a genuine matter of taste. Do NOT use
[blocker] in adversarial mode unless the design choice causes incident-level
harm — otherwise adversarial findings inflate severity past usefulness.

Stick to the stage-focus paragraph for what to look for. Adversarial mode
changes the stance; it does not authorize you to roam outside the stage's
remit (e.g. don't raise security findings in the quality stage, even when
adversarial).
```

Adversarial mode is borrowed from `openai/codex-plugin-cc`'s `adversarial-review` command. The auto-trigger rules above are LHC's decision policy: adversarial review is reserved for diffs where being wrong is expensive (security paths, public API contracts, large diffs without tests, claims of no-behavior-change with substantive logic changes) and is NOT applied by default — adversarial review on every PR creates noise.

## Tunings honored from the repo (priority order)

1. `REVIEW.md` — review-only system instructions, treated as highest priority (Anthropic Claude Code Review pattern).
2. `AGENTS.md` "Review guidelines" / "Code review" section — Codex pattern; this is what `wix-private/ai-code-reviewer` already reads, so honoring it keeps both review surfaces aligned.
3. `CLAUDE.md` — project-wide context; review treats violations as `nit` unless the section is explicitly tagged `must-block`.
4. `.coderabbit.yaml` — `path_instructions[]`, `ast-grep` rules, language-specific. CodeRabbit's `ast-grep` integration is read for syntax-aware structural lints; we don't run them ourselves but we honor the suppress lists.
5. The latest `~/.lhc/artifacts/standards-*.md` brief if applicable — see `../shared/coding-standards-policy.md`.

If two tunings disagree on the same rule, the higher-priority one wins. Record the tie-break in the artifact's "Repo tunings consulted" section.

## Skip rules (mirror the CI bot, plus a few)

- **Draft PR** — skip unless `--include-draft`.
- **Bot author** — skip unless `--review-bots` (mirrors `wix-private/ai-code-reviewer` behavior).
- **No source-file changes** — skip with a one-liner. Pure docs / config / lockfile updates do not need an AI review.
- **Diff > 5000 added lines** — warn and require `--allow-large` in the same turn. Reviews of huge diffs degrade sharply; arXiv 2508.18771 documents the precision drop.
- **CI bot already reviewed this PR** — print a NOTE pointing at the existing CI review (URL + author + marker) so the user can compare; the skill still runs and chat output is harmless.
- **`generated`-tagged files** — exclude from per-file review; flag at the file level only if the diff signals manual changes inside a generated block.

## Coordination with the existing CI review

The Wix monorepo and many private repos already run `wix-private/ai-code-reviewer/.github/actions/code-review@master` on every PR open/sync. That review is OpenAI-Codex-driven (default model `gpt-5.3-codex`), posts a single combined PR comment with "Issues Found" + "Suggestions" sections, and updates the same comment on subsequent runs. Our skill is intentionally complementary:

| | CI bot (`@wix/ai-code-reviewer`) | LHC PR Review |
|-|--------------------------------|----------------|
| When | Auto on PR open/sync | On-demand from IDE/CLI |
| Trigger | GitHub event | User invocation |
| Model | OpenAI Codex (gpt-5.3-codex) | LHC counterpart routing (Claude or Codex, whichever is the non-leader) |
| Tunings | `AGENTS.md` | `AGENTS.md` + `REVIEW.md` + `CLAUDE.md` + `.coderabbit.yaml` |
| Output | Single PR comment, updated on each run | Chat-only (terminal + saved artifact) |
| GitHub writes | Posts the review comment | None — never writes to GitHub |
| Stages | Single pass | Spec + quality + security + optional i18n-a11y / wix-standards |
| Use case | Default first-pass for every PR | Targeted, deeper, or pre-push review with per-invocation tuning |

If the CI bot has already reviewed the PR, the skill still runs and prints a NOTE in the chat output that names the existing CI review URL so the user can compare. The artifact records which CI comment we observed.

<Final_Checklist>

- [ ] Readiness checked; `blocked` only proceeded with same-turn degraded opt-in
- [ ] PR resolved; draft / bot / no-source-files skip rules applied
- [ ] Repo tunings read in priority order (REVIEW.md > AGENTS.md > CLAUDE.md > .coderabbit.yaml > standards brief)
- [ ] Plan attached when present; spec stage added if so
- [ ] Stages dispatched in parallel; each subagent in a fresh context with the prompt envelope
- [ ] Findings deduped, severity-floored, confidence-floored, self-check-classified (default drop `speculative`)
- [ ] Counterpart peer-review of the merged review ran via `peer-review.sh --mode analysis`
- [ ] Review route, Counterpart coverage, Counterpart failure recorded when applicable
- [ ] Artifact saved at `~/.lhc/artifacts/pr-review-<slug>-<UTC-ISO>.md`
- [ ] Notepad entry appended via `write-notepad.js`
- [ ] No `gh pr review`, `gh pr comment`, or `gh api` POST against reviews/comments endpoints (the skill is chat-only)
- [ ] No source file in the working repo was modified
- [ ] Handoff block printed

</Final_Checklist>
