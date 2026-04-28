# LHC Evidence & Provenance

Every non-trivial design choice in this plugin should be defensible from research or production evidence — not personal preference. This document maps each LHC design decision to its empirical source. If you want to add a new pattern to LHC, it should either appear here with a citation or gather citations before it ships.

Last reviewed: 2026-04-20.

---

## 1. Test-first execution (`lhc-ralph`)

**Rule:** For every acceptance criterion, write the test, run it, watch it fail, then implement.

**Evidence:**
- Anthropic's SWE-bench Verified scaffold explicitly prompts: *"implement your own tests first"* — this single line is the most-cited prompt-level lift in the leaderboard writeups. See [Anthropic SWE-bench post](https://www.anthropic.com/research/swe-bench-sonnet).
- **CodePRM** (Li et al., ACL Findings 2025, [aclanthology.org/2025.findings-acl.428](https://aclanthology.org/2025.findings-acl.428.pdf)): step-level rewards from *execution feedback* beat outcome-only rewards on code generation.
- **Huang et al. ICLR 2024** (*Large Language Models Cannot Self-Correct Reasoning Yet*, [arXiv:2310.01798](https://arxiv.org/abs/2310.01798)): without an external oracle, intrinsic self-correction *degrades* performance.
- **CRITIC** (Gou et al., ICLR 2024, [arXiv:2305.11738](https://arxiv.org/abs/2305.11738)): correction works reliably only when grounded in tools (code interpreter, search). Self-generated tests without an external oracle are not grounding.
- **CorrectBench** (NeurIPS 2025): replicates the above — external-feedback methods consistently win.
- **Superpowers** (obra, [github.com/obra/superpowers](https://github.com/obra/superpowers)) operationalizes this as RED-GREEN-REFACTOR and deletes production code that was written before a failing test existed. Cited case: chardet v7.0.0 rewrite saw 41× perf improvement under this discipline.

---

## 2. Single-threaded > multi-agent for coding (`lhc-team` constraints)

**Rule:** Default to serial. Fan-out requires a written independence proof (files, shared state, merge conflicts, blocking relationships). No lane may spawn lanes. Cap at 4 parallel lanes.

**Evidence:**
- **Cognition (Devin) "Don't Build Multi-Agents"** ([cognition.ai/blog/dont-build-multi-agents](https://cognition.ai/blog/dont-build-multi-agents)): parallel agents lose context and make conflicting implicit decisions. Their production system is explicitly single-threaded.
- **Augment Code post-mortem** ([augmentcode.com](https://www.augmentcode.com/blog/1-open-source-agent-on-swe-bench-verified-by-combining-claude-3-7-and-o1)): "chained sub-agents for orientation/implementation/regression did NOT work."
- **SWE-bench Verified leaderboard dissection** (Martinez et al., [arXiv:2506.17208](https://arxiv.org/html/2506.17208v1)): single-agent with emergent control (G6) reaches 73.2% precision; multi-agent variant (G7) reaches 62.2% on identical scaffold budget.
- **"Stop Overvaluing Multi-Agent Debate"** ([OpenReview tMJvb9JDsd](https://openreview.net/pdf?id=tMJvb9JDsd)): MAD fails to beat Chain-of-Thought across GPT-4o-mini, Llama-3.1, Claude-3.5-haiku — even scaled to 9 agents / 4 rounds.

---

## 3. Counterpart peer review as the approval gate (`lhc-review`, `peer-review.sh`)

**Rule:** Plans, diffs, investigations, and incident conclusions route to the counterpart model (Claude ↔ Codex). Self-approval in the same context is forbidden. For diffs, run a two-stage review (spec compliance, then code quality).

**Evidence:**
- **Tool-grounded verification wins** (CRITIC, Reflexion NeurIPS 2023 [arXiv:2303.11366](https://arxiv.org/abs/2303.11366), CorrectBench) — the *grounding*, not the *two LLMs*, is the lift. Routing to a counterpart model is a cheap way to force fresh tool invocation outside the producing agent's context.
- **Agent-as-a-Judge** ([arXiv:2510.24367](https://arxiv.org/html/2510.24367v1)): tool-augmented judges raise agreement with ground truth from <42% to ~72%.
- **Superpowers' two-stage review pattern** (spec compliance then code quality, separate invocations) — the canonical production shape for dual-pass review.
- **Anthropic Claude Code release notes**: `ENABLE_PROMPT_CACHING_1H` enables 1-hour prompt cache on the API. Peer-review calls share prompt prefixes (diff + criteria) and benefit materially; LHC's `peer-review.sh` defaults this flag on.

---

## 4. Plan-then-execute over ReAct for substantial changes (`lhc-ralplan` → `lhc-ralph`)

**Rule:** Non-trivial Wix changes go through `lhc-ralplan` before `lhc-ralph`. Plans have concrete acceptance criteria, file paths, and verification commands.

**Evidence:**
- **PlanSearch** (Wang et al., NeurIPS 2024, [arXiv:2409.03733](https://arxiv.org/pdf/2409.03733)): upfront plan diversification pushes Claude-3.5 Sonnet from 41.4% pass@1 to 77.0% pass@200 on LiveCodeBench.
- **Plan-and-Act** (2025): 57.6% on WebArena, substantially above ReAct baselines.
- Trade-off is real: for short, uncertain tasks ReAct is faster and cheaper ([arXiv:2507.21504](https://arxiv.org/html/2507.21504v1)) — hence LHC's "trivial fixes can skip planning" escape hatch in `lhc-ralplan` Do-Not-Use-When.

---

## 5. Aggressive context compaction (PreCompact hook, shared docs strategy)

**Rule:** Skills offload detail into `skills/shared/*.md` references. PreCompact hook re-injects working agreements. CLAUDE.md capped ~200 lines.

**Evidence:**
- **Lost in the Middle** (Liu et al., TACL 2024): critical instructions buried in long context get under-weighted.
- **Chroma "Context Rot"** (2025, [trychroma.com/research/context-rot](https://www.trychroma.com/research/context-rot)): degradation correlates with *length alone*, independent of needle position.
- **"Context Length Alone Hurts LLM Performance"** ([arXiv:2510.05381](https://arxiv.org/html/2510.05381v1)): shorter-is-better holds even with evidence at the best position.
- **Mindstudio "Context Rot in Skills"** ([mindstudio.ai](https://www.mindstudio.ai/blog/context-rot-claude-code-skills-bloated-files/)): bloated SKILL.md files cause instruction conflicts and drift toward generic output. Reddit survey "47 skills tested, 40 made output worse."
- **Inkeep "Fighting Context Rot"** ([inkeep.com/blog/fighting-context-rot](https://inkeep.com/blog/fighting-context-rot)): n² token-relationship argument.

---

## 6. Hard-coded loop guard (`scripts/loop-guard.js`)

**Rule:** Three identical (tool, args) calls signal strategy-switch; five signal stop-and-escalate. Enforced in code, not in the prompt.

**Evidence:**
- **Columbia DAPLab "9 Critical Failure Patterns of Coding Agents"** (Nov 2025, [daplab.cs.columbia.edu](https://daplab.cs.columbia.edu/general/2026/01/08/9-critical-failure-patterns-of-coding-agents.html)): agents "repeatedly choose to suppress errors rather than communicating" across Claude, Cursor, Cline, V0, Replit.
- **FixBrokenAIApps** ([fixbrokenaiapps.com/blog/ai-agents-infinite-loops](https://www.fixbrokenaiapps.com/blog/ai-agents-infinite-loops)): prompts alone do not stop loops; `MAX_STEPS` and counter-based repeat detection are required.
- **DEV community (whoffagents)** ([dev.to/whoffagents](https://dev.to/whoffagents/ai-agent-production-failures-what-breaks-and-how-to-build-around-it-17lj)): force a strategy-switch message when repeat threshold is hit.

---

## 7. Permission rules as data (`permissions.json`)

**Rule:** The read-only external-systems governance is encoded as structured data with `effect: allow|deny|ask` and per-context overrides (main thread vs. subagent).

**Evidence:**
- **Sourcegraph Amp's permission rule DSL** ([ampcode.com/manual/appendix](https://ampcode.com/manual/appendix)): the most articulated permission-rule shape in production, with `tool + matches + context: thread|subagent`.
- **Cline's `requires_approval` flag** ([docs.cline.bot/features/auto-approve](https://docs.cline.bot/features/auto-approve)): per-tool-call gating rather than a global YOLO toggle.
- Consensus shift (per 2026 expert reviews): global auto-approve is an anti-pattern; per-tool-call classifiers are the new baseline.

---

## 8. Minimal tool surface (no LHC-specific tools, skills only)

**Rule:** LHC does not register new tools with Claude Code. It ships skills and scripts. Agents use the built-in Read/Write/Edit/Bash/Grep/Glob surface.

**Evidence:**
- **Verdent technical report** ([verdent.ai](https://www.verdent.ai/blog/swe-bench-verified-technical-report)): stripping the toolkit to `bash + read + write + edit` "changed very little" on SWE-bench Verified. Benchmark-relevant capability lives in the model, not the toolbox.
- **Anthropic reference scaffold** uses only `bash + str_replace_editor` and leads the leaderboard.
- **mini-SWE-agent**: single tool (`bash`), achieves 76.8% with Opus 4.5 — functionally matching systems with 20+ tools.
- **Anthropic "Writing effective tools for AI agents"** ([anthropic.com/engineering/writing-tools-for-agents](https://www.anthropic.com/engineering/writing-tools-for-agents)): accuracy degrades past ~10 tools; cap response tokens.

---

## 9. Per-agent model pinning

**Rule:** Every agent frontmatter pins a model tier (haiku/sonnet/opus). Don't override at call time.

**Evidence:**
- **Claude Code agent catalog convergence** (oh-my-claudecode, wshobson/agents, claude-code-sub-agents): every mature multi-agent plugin pins models. The unpinned catalog is a source of decision overhead at every delegation.
- **Anthropic model routing guidance**: Haiku for lookups/verification, Sonnet for execution, Opus for planning/architecture — the model is the single biggest quality lever.

---

## 10. AST/symbol-map > vector RAG for repo awareness (`lhc-research`)

**Rule:** `lhc-research` prioritizes docs-schema and octocode (structured symbol access) over embedding-based retrieval.

**Evidence:**
- **Aider's repo-map** ([aider.chat/docs/repomap.html](https://aider.chat/docs/repomap.html)): PageRank-weighted call graph, not RAG. Cited reason: vector retrieval misses the structural signal that matters for code.
- **AutoCodeRover / Sonar Foundation Agent**: AST symbol index at 79.2% on SWE-bench Verified.
- **Devin's DeepWiki** codebase index (Cognition): structured index, not vector.
- **Moatless**: Faiss over AST nodes, not text chunks.
- Convergence: every SWE-bench leaderboard system that does retrieval uses structural indexing.

---

## 11. Kill switches (`DISABLE_LHC`, `LHC_SKIP_HOOKS`)

**Rule:** Every hook and helper respects `DISABLE_LHC=1` and `LHC_SKIP_HOOKS=<csv>`.

**Evidence:**
- **OMC** (Yeachan-Heo): `DISABLE_OMC`, `OMC_SKIP_HOOKS` — the convergent shape for plugin disable.
- **Cursor, Amp, Cline**: all ship equivalents (`.cursorrules` toggle, rule-disable flags, per-mode bypass).
- Practical: every engineer will occasionally need a vanilla Claude Code session; the lack of a kill switch becomes a footgun.

---

## 12. Commit trailers (`skills/shared/commit-trailers.md`)

**Rule:** Non-trivial LHC-authored commits carry `Constraint:`, `Rejected:`, `Confidence:`, `Scope-risk:`, `LHC-plan:`, `LHC-peer-review:` trailers.

**Evidence:**
- **OMC commit protocol**: the canonical in-plugin shape.
- **Augment's memory provenance** (`Source: Correction`) ([augmentcode.com](https://www.augmentcode.com/guides/agent-memory-vs-context-engineering)): provenance in-line with the decision is how agent-authored code stays debuggable six months later.
- **Git trailers standard**: `git interpret-trailers` + `git log --grep` make them first-class searchable.

---

## 13. Coding standards: weighted repo + ecosystem brief (`lhc-standards`, `skills/shared/coding-standards-policy.md`)

**Rule:** Code produced or reviewed under LHC follows a per-task standards brief. The brief synthesizes **current-repo conventions** and **Wix ecosystem standards** with explicit per-category weights (naming 90:10 repo-first, security 10:90 ecosystem-first, etc.). Executor reads the brief; code-reviewer enforces it.

**Evidence:**
- **Aider's architect/editor split** ([aider.chat/2024/09/26/architect.html](https://aider.chat/2024/09/26/architect.html)): separate the "what to do" from the "how to code it." The brief is the editor's spec.
- **Cursor rules (`.cursor/rules/*.mdc`) path-scoped frontmatter** ([cursor-alternatives.com/blog/cursor-rules](https://cursor-alternatives.com/blog/cursor-rules/)): local rules override global rules. The brief operationalizes the same layering at task-time.
- **Karpathy Guidelines skill** ([github.com/obra/superpowers](https://github.com/obra/superpowers)): surgical changes, reuse existing patterns, resist over-engineering. The 90:10 repo weight on naming and imports encodes this.
- **r/claude 47-skill survey** ([reddit.com/r/claude](https://www.reddit.com/r/claude/comments/1s51b5u/the_claude_code_skills_actually_worth_installing/)): generic "follow style" skills produced worse output than targeted ones. A per-task brief with cited conventions avoids the generic-style trap.
- **Wix engineering conventions** (FED CLI, Vitest, Oxlint, WDS, `wix-style-react`, Business Manager, Editor flows) consulted via `docs-schema`, `internal-docs-researcher`, and `framework-standards-reviewer`.
- **Columbia DAPLab failure taxonomy** ([daplab.cs.columbia.edu](https://daplab.cs.columbia.edu/general/2026/01/08/9-critical-failure-patterns-of-coding-agents.html)): agents suppress errors instead of surfacing them. The "fail loud, fail early" core principle and 10:90 security weighting are direct counters.

---

## 14. Specialist review for plugin and skill changes

**Rule:** Diffs that modify plugin structure, role prompts, agents, hooks, scripts, catalogs, or skill workflows run local `plugin-structure-reviewer` and `skill-authoring-reviewer` passes before final counterpart review. The main agent fixes findings and reruns the same specialists until both approve.

**Evidence:**
- **Anthropic Agent Skills** ([anthropic.com](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)): skills work best as lean instruction folders with progressive disclosure, scripts for deterministic work, representative-task evaluation, and explicit security auditing.
- **OpenAI Codex agent loop** ([openai.com](https://openai.com/index/unrolling-the-codex-agent-loop/)): software-agent quality depends on instruction layering, tools, observations, and context-window management. Plugin/skill changes modify those control surfaces and need a targeted review.
- **CRITIC ICLR 2024** ([iclr.cc](https://proceedings.iclr.cc/paper_files/paper/2024/hash/fef126561bbf9d4467dbb8d27334b8fe-Abstract-Conference.html)): external feedback and tool-grounded critique improve outputs; self-approval is not enough.
- **Reflexion NeurIPS 2023** ([neurips.cc](https://proceedings.neurips.cc/paper_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract-Conference.html)): iterative feedback can improve later attempts when the feedback is captured and reused.
- **CodePRM ACL Findings 2025** ([aclanthology.org](https://aclanthology.org/2025.findings-acl.428/)): generate-verify-refine with execution feedback is a useful pattern for code-generation quality control.

---

## Patterns explicitly NOT adopted

These look useful but the research does not support them for a coding-agent plugin. Listed so future contributors don't re-propose them without fresh evidence:

| Pattern | Why not | Citation |
|---------|---------|----------|
| **Tree-of-Thoughts / MCTS planning** | Null result on SWE-bench — voting mechanism for thought validation breaks down. | [arXiv:2405.13057](https://arxiv.org/html/2405.13057v1) |
| **Multi-agent debate (Du et al. style)** | Fails to beat CoT across model families in replications. | [OpenReview tMJvb9JDsd](https://openreview.net/pdf?id=tMJvb9JDsd) |
| **Hive-mind / queen-coordinator swarms** | Evidence *against* for coding; violates single-threaded consensus. | Cognition + SWE-bench G6>G7 |
| **Vector-RAG over codebase embeddings** | Displaced by AST/symbol indexing in every leaderboard system that retrieves. | Aider repo-map rationale |
| **Proliferating skill catalog (`SkillKit 400k`)** | Count ≠ quality. Curation wins. "47 tested, 40 made output worse." | r/claude 2025 survey |
| **Monolithic CLAUDE.md growth** | Context rot. | Mindstudio, Chroma |
| **Granular tools (`run_tests`, `lint_file`)** | Hurt benchmark scores vs. `bash + edit`. | Verdent ablation, Augment post-mortem |
| **Self-generated tests as verification** | Confirmation bias; Huang 2024 echo chamber. | Huang et al. ICLR 2024 |
| **Process Reward Models as the judge** | ORM + execution feedback often ties PRM; not worth the complexity. | CodePRM follow-ups |
| **Memory systems with vector stores** | Evidence for coding agents is thin; episodic personal memory ≠ coding memory. Procedural (skills) + semantic (docs-schema) covers our needs. | MemoryAgentBench (Hu et al. 2025) |

---

## Updating this document

If you add a new design to LHC, add a numbered section here with:
- The rule (one sentence)
- The evidence (2-3 citations with URLs, one of which should be replicated or production-adopted)

If the evidence isn't there yet, the pattern stays in an experimental branch until it is.
