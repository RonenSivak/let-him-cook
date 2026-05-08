---
name: lhc-claude-md
description: Audits CLAUDE.md / AGENTS.md / .claude.local.md / package-level memory files in the current repo, grades each against a weighted rubric, and proposes targeted diffs as a saved artifact. Optionally captures session learnings into a proposed revision when invoked in `revise` mode. Read-only by default — never modifies CLAUDE.md / AGENTS.md without explicit same-turn user approval. Saves the audit and proposed-diff artifact to ~/.lhc/artifacts/claude-md-audit-*.md.
when_to_use: The user asks to audit, improve, or refresh project memory files ("audit our CLAUDE.md", "is AGENTS.md still accurate", "what should we add to CLAUDE.md after this session"); or after a non-trivial session the user wants to capture durable learnings; or before onboarding a new contributor when project memory is suspected stale.
---

# LHC CLAUDE.md / AGENTS.md Audit

Audits and proposes targeted improvements to the project's memory files (CLAUDE.md, AGENTS.md, .claude.local.md, package-level CLAUDE.md, GEMINI.md). Saves a graded report plus proposed diffs to `~/.lhc/artifacts/`. The skill never edits memory files automatically.

<Iron_Law>
NO MODIFICATION WITHOUT EXPLICIT APPROVAL. The skill produces an audit artifact and proposed diffs. Applying a diff requires the user to say so in the same turn, e.g. "apply the proposal" or "yes, edit CLAUDE.md as proposed". Vague replies ("looks good", "fine", "go ahead") do NOT authorize an edit. Memory files shape every future session — drift here is hard to undo.

NO STUFFING. CLAUDE.md is part of the prompt every session; density matters more than completeness. A proposed addition must clear the bar of "would have changed agent behavior in this session". If the answer is "probably not", drop it.

NO RESTATING THE OBVIOUS. Do not propose adding facts that the agent can derive from the codebase in a single grep / file read (file paths, function signatures, dependency lists). Memory files are for what the codebase does NOT say.

DO NOT INVENT FACTS. Every proposed addition must be backed by either (a) something the user said in this session, (b) something verifiable in the repo, or (c) a citation from another memory file. If you cannot point to a source, do not propose it.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/handoff-protocol.md`
- `../shared/notepad-schema.md`
</Required_Reading>

<Use_When>
- The user says: "audit CLAUDE.md", "review our AGENTS.md", "is project memory still right", "what should CLAUDE.md say".
- The user wants to capture session learnings into durable memory: "save what we learned", "add this to CLAUDE.md", "remember this for next time".
- The repo has a CLAUDE.md or AGENTS.md older than 6 months and the codebase has materially changed since.
- A new contributor is about to clone and the user wants to make sure project memory is accurate.
</Use_When>

<Do_Not_Use_When>
- The user wants to write a NEW skill — that is not in this skill's scope.
- The user wants to edit a code file — use `lhc-ralph` from a plan.
- The user wants to publish documentation — that is `lhc-research` or a doc-writing flow, not memory-file maintenance.
- The repo has no CLAUDE.md, AGENTS.md, or equivalent — propose creating one only if the user explicitly asks; do not auto-create.
</Do_Not_Use_When>

<Execution_Policy>
- MUST save the audit artifact at `~/.lhc/artifacts/claude-md-audit-<slug>-<UTC-ISO>.md` before stopping.
- MUST NOT modify any memory file unless the user, in the same turn, explicitly approves a specific proposed diff.
- MUST run in two modes:
  - `audit` (default) — score every memory file the repo has against the rubric and propose diffs.
  - `revise` — capture session learnings into a single-file revision proposal. Triggered by phrasing like "save what we learned", "remember this", "add this to CLAUDE.md".
- MUST grade each file using the weighted rubric below; do NOT invent grades.
- MUST cite the source of every proposed addition (session quote, repo path, or sibling memory file).
- If multiple memory files exist (project root, package-level, .claude.local.md, GEMINI.md), audit each independently and surface a per-file grade. Do NOT collapse them into one score.
- The skill is terminal — it does not call `lhc-ralph` or `lhc-team`. The user decides whether to apply.
</Execution_Policy>

## Memory file discovery

Search the repo (and the user's home where applicable) for these in priority order:

| Priority | Path pattern | Scope |
|----------|--------------|-------|
| 1 | `<repo>/CLAUDE.md` | Claude Code project memory (checked in) |
| 1 | `<repo>/AGENTS.md` | Codex / Cursor project memory (checked in, twin of CLAUDE.md) |
| 2 | `<repo>/.claude.local.md` | Claude Code personal override (gitignored) |
| 2 | `<repo>/.claude/CLAUDE.md` | Claude Code project memory in `.claude/` style |
| 3 | `<repo>/<package>/CLAUDE.md` (recursive) | Per-package memory in monorepos |
| 3 | `<repo>/<package>/AGENTS.md` | Per-package Codex memory |
| 4 | `~/.claude/CLAUDE.md` | User-global Claude memory (only when the user explicitly asks to audit globals) |
| 4 | `<repo>/GEMINI.md` | Gemini CLI memory |

For monorepos, walk each top-level package directory and audit each memory file independently. Do not flatten the tree.

If two memory files in the same repo claim contradictory rules (e.g. `CLAUDE.md` says "use TDD" and a package `CLAUDE.md` says "skip TDD"), flag the contradiction in the audit — these are real bugs that affect agent behavior.

## Quality rubric (weighted)

Each file is graded A–F using these weighted criteria. Cite the evidence for each score in the audit artifact.

| Weight | Criterion | What "A" looks like |
|--------|-----------|---------------------|
| 25% | **Currency** | Every claim about commands, paths, and architecture is verifiable today (file exists, command runs, dependency in `package.json`). No references to removed code. |
| 20% | **Actionability** | Every rule is concrete and testable. "Use TDD" is actionable; "Write good code" is not. Behaviors specified in imperative form ("MUST", "MUST NOT"). |
| 15% | **Density** | Every line earns its place in the prompt. No filler ("This project uses TypeScript" when the codebase obviously uses TS). No restating the obvious. |
| 15% | **Coverage** | Lists the things the agent could not derive from a single grep: hidden constraints, "we got burned by X", invariants, decision rationales, kill switches. |
| 10% | **Architecture clarity** | The reader can answer "what is this repo for, what are the major surfaces, where does the work happen" without reading code. Hierarchy is named (e.g. "skills/ → reusable workflows; agents/ → bounded execution surfaces"). |
| 10% | **Conventions** | Lints, naming, test layout, where to put new code. Concrete enough that a contributor can follow without asking. |
| 5% | **Kill switches / overrides** | Names the env vars, flags, or commands that turn enforcement off when the user needs vanilla behavior. |

Map raw weighted score to a letter:

| Score | Grade | Meaning |
|-------|-------|---------|
| 90–100 | A | Memory is load-bearing and accurate. Light tuning at most. |
| 80–89 | B | Memory is useful but has gaps. Targeted additions recommended. |
| 70–79 | C | Memory is partially stale or partially generic. Material rewrite of 2–3 sections. |
| 60–69 | D | Memory is significantly stale or noisy. Most sections need attention. |
| <60 | F | Memory is harmful — actively misleading. Top-to-bottom revision; consider deletion until rewritten. |

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow claude-md --source workflow --cwd "$PWD" --task "<user request>"
   ```

2. **Resolve mode** — `audit` (default) or `revise` (when the user said "save", "remember", "add to CLAUDE.md", "capture this").

3. **Discover memory files** — walk the priority list above. List paths and sizes.

4. **Read each memory file** — full content. Do not skim.

5. **Score each file against the rubric** — compute weighted score and grade. Cite evidence for each criterion's score in the audit artifact (e.g. "Currency: B — `pnpm test:e2e` referenced in §Testing but pnpm-lock.yaml does not exist; the repo uses npm").

6. **Detect contradictions across memory files** — if two files in the same repo disagree on a rule, flag it. List both sources verbatim.

7. **Propose diffs** — for each file with grade < A, draft targeted diffs. Each proposal block:

   ```text
   File:        <path>
   Section:     <heading the change targets, or "new section">
   Why:         <currency|actionability|density|coverage|architecture|conventions|kill-switches>
   Source:      <session quote | repo path | sibling memory file path>
   Diff:
   ```diff
   - <verbatim removed lines>
   + <verbatim proposed lines>
   ```
   Risk:        <low|medium|high — how much could this addition mislead a future session>
   ```

   Rules for proposed diffs:
   - **No invented facts.** Every `+` line must be sourced (this session, the repo, or a sibling memory file).
   - **No stuffing.** A proposal earns its place only if it would have changed agent behavior in a recent session.
   - **No restating the obvious.** If a fact is grep-able in one shot from the repo, do not propose adding it.
   - **Imperative form** for rules. "MUST", "MUST NOT", "PREFER" — not "we should consider".
   - **Currency fixes prioritized.** Bad facts in CLAUDE.md are worse than missing facts; address obsolete claims first.

8. **(Mode: revise only) Capture session learnings** — if the user invoked the skill in `revise` mode, focus on what THIS session surfaced:
   - Commands the agent had to ask the user about (because the right one was not in CLAUDE.md).
   - Constraints the user gave that were not in CLAUDE.md (e.g. "always run `npm run lint:strict` before commits").
   - Patterns the agent had to discover by reading code (where to put new files, how to register a new skill).
   - "We got burned by X" stories — these are the highest-value additions.
   - Kill switches or override flags the user had to type out manually.

   Do NOT propose adding ephemeral state ("we just fixed bug #1234"). Memory is for durable instructions, not change logs.

9. **Save the audit artifact** at `~/.lhc/artifacts/claude-md-audit-<slug>-<UTC-ISO>.md`. Required sections:
   - **Files audited** — list of paths and sizes.
   - **Per-file grade** — table: file → letter grade → weighted score → top-3 weakness.
   - **Contradictions across files** — list with verbatim conflicting lines.
   - **Proposed diffs** — one block per file, formatted as above.
   - **Mode** — `audit` or `revise`.
   - **Application status** — `proposed (not applied)` by default, `applied: <list of paths>` only after the user explicitly approved a specific diff in the same turn.

10. **Render summary to chat** — print:
    - Per-file grade table.
    - One-line summary per proposed diff (file + section + why).
    - Pointer to the artifact for full diffs.
    - Explicit prompt: "These diffs are proposals. Reply with `apply <file>` or `apply all` to authorize edits to specific files."

11. **(Optional) Apply approved diffs** — only when the user, in the same turn, said one of:
    - `apply <path>` — apply the proposed diff to that file.
    - `apply all` — apply every proposed diff.
    - `apply <file>:<section>` — apply only the specific section change.

    On approval, use `Edit` to apply the change verbatim. Do NOT re-draft. Do NOT add unrequested changes. After applying, update the audit artifact's "Application status" section with the list of edited paths.

12. **Append to notepad** (use the helper — never hand-format)
    ```bash
    node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
      --workflow claude-md --slug "<slug>" --cwd "$PWD" \
      --kv artifact="<artifact-path>" --kv mode="<audit|revise>" \
      --kv files="<count>" --kv proposals="<count>" --kv applied="<count|0>"
    ```

13. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
    ```
    LHC HANDOFF
    - Completed: claude-md
    - Slug: <slug>
    - Cwd: <pwd>
    - Artifact: <artifact-path>
    - Mode: <audit|revise>
    - Files audited: <count>
    - Proposals: <count>
    - Applied: <count|0>
    ```

    Terminal — the user decides whether to apply remaining proposals later.

<Final_Checklist>
- [ ] Every memory file in the repo was discovered and read in full
- [ ] Each file has a weighted score and a letter grade backed by cited evidence
- [ ] Contradictions across memory files are flagged with verbatim quotes
- [ ] Each proposed diff has a Source line pointing to session, repo, or sibling memory file
- [ ] No proposed diff invents facts not present in the source
- [ ] No proposed diff restates information the agent could derive from a single grep
- [ ] Audit artifact saved at `~/.lhc/artifacts/claude-md-audit-<slug>-<UTC-ISO>.md`
- [ ] No memory file was modified unless the user explicitly approved a specific diff in the same turn
- [ ] Application status section in the artifact reflects reality (`proposed (not applied)` or list of applied paths)
- [ ] Notepad entry appended via `write-notepad.js`
- [ ] Handoff block printed
</Final_Checklist>
