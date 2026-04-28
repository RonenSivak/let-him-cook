# Programmer Research Intent Taxonomy

Use this reference when a workflow needs to answer a programmer's research request. Classify by the **action the programmer is trying to take after the research**, not by topic keywords alone.

## Labels

| Label | Programmer action | Typical answer |
|-------|-------------------|----------------|
| `learn_concept` | Understand a concept, mechanism, framework feature, or domain rule. | Explanation, examples, mental model. |
| `how_to_implement` | Build a known goal. | Steps, API usage, examples, implementation recipe. |
| `internal_best_practice` | Follow the company-approved or repo-native way. | Internal convention, approved tooling, precedent, ownership notes. |
| `codebase_understanding` | Understand existing code or system behavior. | Files, call/dependency trace, behavior summary, history. |
| `design_decision` | Decide or justify an architecture or approach. | Recommendation, tradeoffs, risks, constraints. |
| `rfc_review` | Evaluate an RFC, ADR, or proposal. | Review findings, missing pieces, recommendation. |
| `compare_options` | Choose between tools, libraries, vendors, or designs. | Ranked options or tradeoff table. |
| `debug_issue` | Explain unexpected behavior, errors, regressions, or incidents. | Hypothesis, root cause evidence, fix or investigation path. |
| `verify_correctness` | Check logic, edge cases, invariants, or spec conformance. | Correctness analysis, edge cases, source-backed caveats. |
| `security_privacy_review` | Assess security, privacy, compliance, or abuse risk. | Risk assessment, required mitigations, policy/spec references. |
| `performance_optimization` | Improve speed, scale, or cost. | Bottlenecks, benchmark/profiling evidence, optimization plan. |
| `integration_research` | Connect to an API, service, protocol, webhook, or SDK. | Contract, auth flow, data mapping, failure cases. |
| `migration_upgrade` | Change an existing system safely. | Compatibility matrix, rollout/migration plan, risks. |
| `testing_strategy` | Prove a solution works. | Test plan, fixtures, acceptance criteria, validation script. |
| `ops_reliability` | Make production operation safer. | Failure modes, observability, rollout/rollback, runbook notes. |
| `planning_estimation` | Estimate feasibility, complexity, dependencies, or timeline. | Scope breakdown, unknowns, risk list, next evidence needed. |
| `documentation_communication` | Explain or persuade others. | Docs, ADR/RFC content, review prep, onboarding explanation. |
| `ecosystem_awareness` | Stay current with tools, versions, maturity, or deprecations. | Recent changes, maturity assessment, learning path. |

## Source Selection

Start with the source family that can prove the requested action:

| Source family | Use for |
|---------------|---------|
| Public docs | API behavior, framework usage, language features, ecosystem changes. |
| Internal docs | Wix standards, architecture, ownership, approved tooling. |
| Codebase | Actual implementation, examples, dependencies, behavior. |
| RFCs / ADRs | Design history, accepted tradeoffs, decision rationale. |
| Tickets / issues | Past bugs, requirements, rollout context, known gaps. |
| PRs / commits | Why code changed, implementation history, regression windows. |
| Logs / metrics / traces | Incidents, debugging, performance, live behavior. |
| Specs / standards | Protocol correctness, compliance, interoperability. |
| Security advisories | Vulnerabilities, affected versions, patch requirements. |
| Benchmarks | Performance and cost comparison. |
| People / team knowledge | Undocumented context and ownership; cite only if captured in a retrievable source. |

## LHC Routing Notes

- `internal_best_practice`, `codebase_understanding`, `design_decision`, `compare_options`, `integration_research`, `migration_upgrade`, `testing_strategy`, `planning_estimation`, and `documentation_communication` often route to `lhc-research` when the user wants source-backed context before acting.
- `debug_issue` routes to `lhc-investigate` when the request is about a live production issue, request ID, logs, metrics, traces, or an incident. Use `lhc-research` only for general explanation or historical/codebase discovery.
- `performance_optimization` routes to `lhc-investigate` when live metrics or production symptoms are central; otherwise `lhc-research` can gather patterns, code examples, and prior art.
- `security_privacy_review` can use `lhc-research` for policy/spec/background evidence, but formal review conclusions should be routed through `lhc-review`.
- `how_to_implement`, `migration_upgrade`, and `testing_strategy` route to `lhc-ralplan` when the user already wants a code-changing plan. Use `lhc-research` when the next action is still knowledge gathering.
- `ecosystem_awareness` uses public docs or advisories only when internal sources are not the proving source; prefer `context7` for external dependency docs.

## Artifact Fields

Research artifacts should make the classification explicit:

```
Intent label: <one label from this taxonomy>
Programmer action: <what the user is trying to do after the research>
Source plan: <source families consulted and why>
Answer format: <explanation|recipe|recommendation|tradeoff table|risk assessment|test plan|migration plan|doc draft|other>
```

If multiple labels apply, choose the primary action and list secondary labels under caveats.
