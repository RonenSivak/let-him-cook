# Coding Standards Policy

This is LHC's constitution for code quality. It defines how we balance **the current repo's conventions** against **the Wix ecosystem standards** when we generate or review code. It is applied by the `lhc-standards` skill at task-time, which emits a per-task standards brief that `executor` and `code-reviewer` treat as authoritative.

The policy exists because two failure modes are equally bad:

- Ignoring repo conventions produces code that reviewers reject on style grounds and that future maintainers have to rewrite.
- Ignoring ecosystem standards produces code that looks consistent locally but drifts from Wix-wide patterns, missing security, accessibility, or framework-level correctness requirements.

The policy splits the difference per category, explicitly, with override rules for safety-critical concerns.

---

## Core principles (apply to every category)

1. **Clarity over cleverness.** Any teammate should be able to read the code cold and understand it. If the reader needs a comment to explain *what* the code does, the code is wrong.
2. **Consistency over personal preference.** Match the repo's existing pattern even if you prefer a different one. Consistency is a readability multiplier across the codebase.
3. **Minimal diffs.** Change the smallest thing that makes the acceptance criterion pass. Refactoring-while-fixing is forbidden unless the plan explicitly authorizes it.
4. **Self-documenting names.** Good names eliminate the need for comments. Comments explain *why*, never *what*.
5. **Fail loud, fail early.** Never catch-and-ignore. Throw, return an error, or log at the boundary. Silent failures are a Columbia-documented anti-pattern in coding agents.
6. **Smallest surface.** Export only what's called. Internal helpers stay internal.
7. **Test-backed correctness.** No claim of "this works" without a test that was observed failing before the implementation.
8. **No dead code, no TODOs in production.** If you can't complete it, don't ship it; file a ticket.

---

## The weighting table

Each row is a category where repo conventions and ecosystem standards might disagree. Weights are the **default** tiebreaker for routine work; override conditions flip them.

| Category | Default (repo : ecosystem) | What "repo wins" means | What "ecosystem wins" means |
|---|---|---|---|
| **Naming: files, folders, vars, functions, classes** | 90 : 10 | Match the repo's casing and token conventions (camelCase vs kebab-case vs PascalCase) | Only overrides when the repo name would shadow a reserved Wix token (e.g. `wix-*` packages) |
| **Import order & grouping** | 90 : 10 | Mirror the existing import blocks; follow any `oxlint`/`eslint-import` config | Override only if the config is outdated per current ecosystem |
| **File structure & colocation** | 85 : 15 | Place new files beside the files they modify; match the directory shape | Wix-mandated layouts (e.g. `src/editor/`, `src/dashboard/`) override |
| **Error handling idioms** | 70 : 30 | Use the repo's Result/throw/try-catch pattern consistently | Ecosystem wins when the repo pattern would silently swallow an error |
| **Async patterns (promises vs async/await, concurrency)** | 80 : 20 | Match the repo's preferred style | Ecosystem wins for race conditions, for unbounded parallelism, and for await-in-loop bans |
| **State management** | 70 : 30 | Use the store/hook/context pattern already in the repo | Ecosystem wins when the repo pattern is deprecated per Wix guidance |
| **React components & hooks** | 60 : 40 | Follow repo conventions for prop typing, composition, mocking | Wix Design System (WDS) and `wix-style-react` conventions win for shared UI |
| **Testing approach** | 60 : 40 | Match the repo's test layout, mock style, and naming | Vitest is the Wix ecosystem standard; ecosystem wins against Jest/Mocha |
| **Linting rules** | 50 : 50 | Repo's `oxlint`/`eslint` config is authoritative for overrides | Ecosystem base ruleset wins for rules the repo doesn't override |
| **TypeScript strictness** | 40 : 60 | Repo's `tsconfig` settings apply | Ecosystem enforces: `strict: true`, no `any` without `// eslint-disable` + reason, explicit function return types in public APIs |
| **Accessibility (a11y)** | 20 : 80 | Only when repo has a stricter a11y rule than ecosystem | Always win for ARIA, keyboard support, focus management, color contrast |
| **Security (XSS, injection, secrets, auth)** | 10 : 90 | Only when repo has a stricter security rule than ecosystem | Always win, period. Never ship a regression here. |
| **Wix SDK & Business Manager & Editor APIs** | 0 : 100 | N/A — these are ecosystem-owned | Follow docs-schema exactly; no repo-level inventions |
| **FED CLI commands, fedops config, deployment** | 0 : 100 | N/A — ecosystem-owned | Follow FED CLI + Wix deployment docs exactly |
| **Performance budgets, bundle size, metric thresholds** | 30 : 70 | Repo's existing budget overrides if it's stricter | Wix performance budgets win when repo has none or looser |

---

## Override rules

These rules flip the default weight in specific situations:

1. **Security always wins for the ecosystem.** Regardless of weight, if the ecosystem guidance flags a security concern (XSS vector, unsafe eval, missing auth check), follow the ecosystem. Document the exception if the repo is intentionally permissive (rare).
2. **Accessibility always wins for the ecosystem** when targeting Wix editor surfaces or published sites. Internal dashboards have some slack; public surfaces have none.
3. **Deprecated-repo-pattern, modern-ecosystem-pattern**: if the repo pattern is flagged deprecated in internal docs and the ecosystem has a replacement, ecosystem wins — but document the migration cost in the standards brief so reviewers can weigh whether to include the migration in this change or follow up.
4. **New file in existing directory**: repo wins even harder (95:5). Adding a new file that doesn't look like the others is worse than introducing a new pattern alongside a fresh abstraction.
5. **New directory or new service**: ecosystem wins a bit harder (50:50 → 40:60). New code should start from the current ecosystem pattern, not inherit legacy.
6. **Same file being modified**: match the file's local style over the package's style over the repo's style. Locality wins finer granularity.
7. **Explicitly-scoped refactor**: if the plan names "migrate from X to Y," ecosystem wins fully — the refactor *is* the migration.

---

## Conflict resolution

When repo and ecosystem conflict and the weight table doesn't resolve it:

1. **Cite both**. The standards brief quotes both sources (repo line number + ecosystem doc URL).
2. **State the chosen side with weight justification**. "Using repo convention because naming is 90:10 repo-first, and the ecosystem pattern would create 14 new inconsistent imports across this package."
3. **Flag the divergence as tech debt** if the ecosystem pattern is newer. Don't silently comply with the old pattern forever.
4. **When the plan authorizes the migration**, switch to ecosystem across the scope the plan names.

---

## Categories that are NOT standards

Some choices feel like standards but are actually architecture or correctness. These are out of scope for `lhc-standards`:

- "Should we split this component" — design review (`architect`).
- "Is this the right algorithm" — correctness review (`code-reviewer` + `verifier`).
- "Should this be async" — design, not standards.
- "Is this covered by tests" — plan acceptance criteria + `lhc-ralph` test-first rule, not standards.

If you find yourself arguing about any of the above while holding the standards brief, you've wandered out of the skill's scope.

---

## The standards brief (output shape)

`lhc-standards` produces a brief at `~/.lhc/artifacts/standards-<slug>-<UTC-ISO>.md` with:

1. **Task summary** (one paragraph)
2. **Detected language/framework/package** (with signal: `package.json`, `tsconfig`, `fedops.json`, etc.)
3. **Repo conventions detected** (per category, one line each, with file:line cite)
4. **Ecosystem standards consulted** (per category, with source URL)
5. **Applied weighting per category** (the rule table, customized for this task)
6. **Conflicts + resolutions** (each with cited sides and chosen side + reason)
7. **Non-negotiables** (security, a11y, Wix SDK usage — listed separately)
8. **Per-file guidance** (when the plan names files, give per-file rules)
9. **Migration flags** (deprecated-repo-pattern callouts)
10. **Confidence** (`high | medium | low`) based on how much evidence backs the brief

Executor reads sections 4-8. Code-reviewer reads sections 5-9. The brief is a contract between the plan and the reviewer; neither rewrites it.

---

## Evidence for this approach

- **Aider's architect/editor split** ([aider.chat/2024/09/26/architect.html](https://aider.chat/2024/09/26/architect.html)): separate the "what to do" from the "how to code it." The standards brief is the editor's spec; the executor is the editor.
- **Cursor rules (`.cursor/rules/*.mdc`) path-scoped frontmatter** ([cursor-alternatives.com/blog/cursor-rules](https://cursor-alternatives.com/blog/cursor-rules/)): local rules override global rules. The brief operationalizes the same layering at task-time.
- **Karpathy Guidelines** ([superpowers `karpathy-guidelines` skill](https://github.com/obra/superpowers)): surgical changes, reuse existing patterns, resist overengineering. The 90:10 repo weight on naming and imports encodes this directly.
- **r/claude 47-skill survey** — generic "follow style" skills produced worse output than targeted ones. A per-task brief with cited conventions avoids the generic-style trap.
- **Wix engineering conventions** — FED CLI, Vitest, Oxlint, WDS, `wix-style-react`, Business Manager, Editor flows are the canonical ecosystem surfaces the brief consults via `docs-schema`, `internal-docs-researcher`, and `framework-standards-reviewer`.
- **Columbia DAPLab failure taxonomy** ([daplab.cs.columbia.edu](https://daplab.cs.columbia.edu/general/2026/01/08/9-critical-failure-patterns-of-coding-agents.html)): agents suppress errors instead of surfacing them. The "fail loud, fail early" core principle and 10:90 security weighting are a direct counter.

See `docs/evidence.md § 13` for the full citation chain.
