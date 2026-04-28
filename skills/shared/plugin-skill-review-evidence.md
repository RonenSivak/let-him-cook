# Plugin and Skill Review Evidence

Use this reference when reviewing plugin or skill changes. The goal is a science-backed and product-aware review loop, not subjective preference.

## External Evidence Base

- Anthropic Agent Skills engineering note: skills are organized folders with instructions, scripts, and resources. The article emphasizes progressive disclosure, lean `SKILL.md` files, bundled scripts for deterministic operations, evaluation from representative tasks, and auditing skills from less-trusted sources.
  Source: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- OpenAI Codex agent-loop engineering note: Codex work proceeds through a loop of instructions, tools, observations, and repeated model calls. It also describes context-window pressure and the role of hierarchical instructions, tools, skills metadata, and local environment context.
  Source: https://openai.com/index/unrolling-the-codex-agent-loop/
- CRITIC, ICLR 2024: tool-interactive critique improves LLM outputs by using external feedback to validate and amend initial answers. Reviewers should ask for executable evidence or source-backed checks, not self-approval.
  Source: https://proceedings.iclr.cc/paper_files/paper/2024/hash/fef126561bbf9d4467dbb8d27334b8fe-Abstract-Conference.html
- Reflexion, NeurIPS 2023: language agents improve by incorporating task feedback into subsequent attempts. Review loops should return actionable findings that the main agent can fix and rerun.
  Source: https://proceedings.neurips.cc/paper_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract-Conference.html
- CodePRM, ACL Findings 2025: Generate-Verify-Refine uses execution feedback as a process verifier for code generation. Plugin and skill reviews should prefer concrete validation commands, failing/passing tests, and artifact checks over ungrounded critique.
  Source: https://aclanthology.org/2025.findings-acl.428/

## Review Principles

### Progressive Disclosure

Progressive disclosure is the default skill/plugin design rule.

- Keep always-loaded metadata and role text short.
- Move long taxonomies, specs, examples, and evidence into shared references.
- Require role prompts to state exactly which references to read and when.
- Reject changes that paste large reference material into every prompt when a shared reference would work.

### External Feedback

External feedback is required before approval.

- A reviewer must not approve solely from confidence or familiarity.
- Require evidence: tests, `git diff --check`, catalog consistency, manifest validity, readiness behavior, or source citations.
- A reviewer may return `approved-with-changes` only for non-blocking improvements; anything that breaks routing, loading, safety, or verification is `rejected`.

### Generate-Verify-Refine

- Findings must be fixable and rerunnable.
- Each finding should name the file, the violated rule, and the smallest correction.
- The main agent fixes findings outside the review-only skill, reruns the same specialist reviewers, and stops only when all specialist verdicts are `approved` or a hard blocker is explicit.

### Safety and Trust

- Treat plugin manifests, hooks, scripts, MCP config, and skill instructions as privileged control surfaces.
- Call out untrusted network access, write-side external tools, broad permissions, hidden install steps, and prompt-injection exposure.
- Preserve LHC read-only defaults for external systems unless the user explicitly authorizes a specific write.

## Verdict Contract

Every specialist reviewer returns exactly one of:

- `approved` - no required changes.
- `approved-with-changes` - usable after small non-blocking changes; list them.
- `rejected` - blocking defects exist; main agent must fix and rerun.

Use this output shape:

```markdown
## Verdict
approved | approved-with-changes | rejected

## Findings
- [blocker|major|minor|nit] <file:line or section> - <issue> - <fix direction>

## Evidence Checked
- <tests, files, sources, or commands reviewed>

## Rerun Criteria
- <what must be true on the next pass>
```
