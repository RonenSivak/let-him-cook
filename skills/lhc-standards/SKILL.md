---
name: lhc-standards
description: Produces a per-task coding-standards brief at ~/.lhc/artifacts/standards-*.md by detecting the current repo's conventions, consulting Wix ecosystem standards (docs-schema, framework-standards-reviewer, context7), and applying a weighted policy. Used automatically by lhc-ralplan for code-modifying plans, and invokable on demand when you want standards guidance before writing code. Does not implement.
when_to_use: A code change is planned or drafted and you need explicit guidance on naming, imports, error handling, testing, Wix SDK usage, security, and accessibility — backed by evidence from both the current repo and the Wix ecosystem. Also use when you want to resolve a disagreement about "what does our repo do here" vs "what does Wix say."
---

# LHC Standards

Emits a coding-standards brief that balances the current repo's conventions against Wix ecosystem standards. The brief is the contract `executor` (during `lhc-ralph`) and `code-reviewer` (during `lhc-review`) follow to produce and evaluate code. It is not a style guide — it is a task-scoped instruction set derived from live evidence.

<Iron_Law>
NO IMPLEMENTATION. This skill produces a standards brief and stops. It never edits source files (except to write the artifact under `~/.lhc/`).

NO STANDARDS-BY-VIBES. Every claim about the repo's convention cites a file:line. Every claim about ecosystem standards cites a source URL, repo path, or PR.

WEIGHTING COMES FROM THE POLICY, NOT FROM TASTE. Categories, weights, and override rules live in `skills/shared/coding-standards-policy.md`. The skill applies the policy; it does not invent new weights mid-task.

SECURITY AND ACCESSIBILITY NEVER LOSE. If either surfaces, the brief carries the ecosystem ruling as a non-negotiable. The 10:90 and 20:80 weights are floors, not ceilings.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/coding-standards-policy.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/handoff-protocol.md`
- `../shared/notepad-schema.md`
- `../shared/wix-tool-surfaces.md`
</Required_Reading>

<Use_When>
- `lhc-ralplan` is producing a plan that will modify source files — always.
- The user asks "what's the right pattern here" specifically about code style, naming, imports, testing, or framework usage.
- A code review dispute needs a grounded tiebreaker citing both the repo and the ecosystem.
- Before touching unfamiliar Wix surfaces (editor, Business Manager, WDS) — get the brief first.
</Use_When>

<Do_Not_Use_When>
- The task is purely a design question (component split, architecture) — use `architect` via `lhc-ralplan`.
- The task is a correctness or algorithm question — use `code-reviewer` via `lhc-review`.
- The change is documentation-only or config-only with no source files — skip; it adds no value.
- A recent `~/.lhc/artifacts/standards-*.md` already covers the same files — reuse it (but confirm the task scope matches).
</Do_Not_Use_When>

<Execution_Policy>
- MUST save the brief to `~/.lhc/artifacts/standards-<slug>-<UTC-ISO>.md` before stopping.
- MUST NOT edit repo files.
- MUST NOT invoke `lhc-ralph`, `lhc-team`, or any execution skill.
- MUST cite file:line evidence for every repo-convention claim and URL/path evidence for every ecosystem claim.
- MUST apply weights exactly as defined in `coding-standards-policy.md`. If a needed category is missing from the policy, flag it in the brief and use a conservative 50:50 tiebreaker.
- If the change is cross-cutting (touches multiple packages with divergent conventions), produce a brief per package OR a single brief with per-package sections — do not average the conventions.
- The brief's confidence rating depends on evidence breadth: `high` when repo detection has ≥10 signal files AND the ecosystem consult returned authoritative docs; `medium` when one side is thin; `low` when both are thin (warn the user and suggest `lhc-research` as a prerequisite).
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow standards --source workflow --cwd "$PWD" --task "<files or feature area>"
   ```

2. **Run readiness**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js standards --json
   ```

3. **Classify the task** — determine primary language (TS/JS/Go/Python), framework (React/Node/Wix editor), and package(s) touched. Read:
   - `package.json` (name, dependencies, scripts, workspaces)
   - `tsconfig.json` (strictness, paths, moduleResolution)
   - `.oxlintrc.json` / `.eslintrc.*` / `oxlint.json`
   - `fedops.json` / `fed.json` (Wix front-end config)
   - `vite.config.*` / `vitest.config.*` (build/test)
   - Any `CODEOWNERS`, `CONTRIBUTING.md`, or `docs/` in the repo that document conventions

4. **Detect repo conventions — parallel lanes**:
   - **Pattern sampling**: read 5-10 existing files nearest to the task (same package, same file-type) and extract the dominant patterns per policy category. Use `Grep` for quick scans (import order, error-handling keywords, testing lib calls, naming regex).
   - **Recent commits**: `git log -p --since="3 months" -- <target-paths>` to detect modernization direction.
   - Optionally dispatch `Task(subagent_type="let-him-cook:repo-cartographer", …)` if the package topology is unfamiliar.

5. **Consult ecosystem standards — parallel lanes**:
   - `Task(subagent_type="let-him-cook:internal-docs-researcher", …)` with the detected framework/surface to pull relevant docs-schema entries.
   - `Task(subagent_type="let-him-cook:framework-standards-reviewer", …)` for FED CLI / Vitest / Oxlint / WDS / wix-style-react / Business Manager / editor conventions that touch the task.
   - For external deps (React, TypeScript, major libraries), consult `context7` via the research flow (or include a "context7 hint" line so the executor can pull fresh docs later).

6. **Apply the policy** — for each category in `coding-standards-policy.md`:
   - Record the detected repo convention and the consulted ecosystem standard.
   - Apply the weight; record the ruling.
   - If override rules trigger (security, a11y, deprecated-pattern, new-file-existing-dir, new-dir, same-file-being-modified, refactor-plan), annotate which override applied.

7. **Synthesize the brief** at `~/.lhc/artifacts/standards-<slug>-<UTC-ISO>.md`. Use this structure:

   ```markdown
   # Standards Brief: <task slug>

   ## Task
   <one paragraph>

   ## Detected Context
   - Language/framework: ...
   - Package(s): ...
   - Config signals: tsconfig.json (...), .oxlintrc.json (...), fedops.json (...)
   - Primary file-type: ...

   ## Repo Conventions (cited)
   - Naming: camelCase vars, PascalCase components, kebab-case files — see [src/foo/bar.tsx:1](...) and 8 more
   - Imports: sorted alphabetically within group, group order = node / wix-private / relative — see [src/foo/baz.ts:1-12](...)
   - Error handling: `throw new Error(...)` inside services; callers wrap with try/catch at route boundary — see [src/services/a.ts:40](...)
   - ...

   ## Ecosystem Standards (cited)
   - Vitest for tests (not Jest) — wix-private/frontend-standards
   - `strict: true` in tsconfig — Wix TypeScript policy
   - `wix-style-react` Button over raw `<button>` — WDS guide
   - ...

   ## Applied Weights & Rulings
   | Category | Weight (repo:eco) | Detected repo | Detected ecosystem | Ruling | Override? |
   |---|---|---|---|---|---|
   | Naming | 90:10 | camelCase | (n/a) | repo wins | — |
   | Imports | 90:10 | grouped alphabetically | (n/a) | repo wins | — |
   | Testing | 60:40 | Jest present | Vitest required | **ecosystem wins**, brief flags migration cost | deprecated-repo |
   | Security | 10:90 | no CSRF token in POST | Wix requires CSRF on all POSTs | **ecosystem wins** | security always wins |
   | ... |

   ## Non-negotiables
   - Every public API function has an explicit return type.
   - No `any` without `// eslint-disable-next-line ... — reason: ...` and a matching ticket.
   - POST routes require CSRF.
   - Images have non-empty `alt` (unless decorative with `alt=""`).

   ## Per-File Guidance
   - `src/foo/new-feature.tsx` — PascalCase default export; imports grouped alphabetically; props interface named `NewFeatureProps` per repo pattern
   - ...

   ## Migration Flags
   - Jest → Vitest migration recommended but out of scope for this change. Follow-up ticket: create when merging.

   ## Confidence
   high | medium | low — with the evidence count that justifies it.
   ```

8. **Append to notepad**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/write-notepad.js \
     --workflow standards --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<brief-path>" --kv conf="<low|medium|high>"
   ```

9. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: standards
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <brief-path>
   - Confidence: <low|medium|high>
   - One-line summary: <e.g. "2 ecosystem overrides on testing and security">
   ```

   Standards is terminal inside its own invocation, but the brief is almost always consumed by `lhc-ralplan` (as step 4a) or referenced directly by `lhc-ralph` / `lhc-review`. Do not invoke those skills yourself.

<Final_Checklist>
- [ ] Standards brief saved under `~/.lhc/artifacts/`
- [ ] Every repo claim has a file:line citation
- [ ] Every ecosystem claim has a source URL or docs-schema reference
- [ ] Weights applied match the policy exactly (no ad-hoc weights invented)
- [ ] Overrides (security, a11y, deprecated-pattern, new-file, new-dir, same-file, refactor-plan) are explicitly flagged where they fire
- [ ] Non-negotiables listed separately from weighted rulings
- [ ] Confidence rating justified by evidence count
- [ ] Notepad entry appended
- [ ] No source file in the repo was modified
</Final_Checklist>
