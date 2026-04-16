# Subagent Catalog

## Generic Roles

- `planner`
- `executor`
- `architect`
- `debugger`
- `verifier`
- `code-reviewer`
- `security-reviewer`
- `test-engineer`
- `writer`
- `explore`

## Wix-Native Specialist Roles

- `incident-investigator`
  - uses `root-cause`, `grafana`, and `devex`
- `build-release-operator`
  - uses `devex` for builds, releases, rollouts, and ownership
- `internal-docs-researcher`
  - uses `docs-schema` and internal docs
- `repo-cartographer`
  - uses `octocode` for `wix-private` discovery and PR archaeology
- `jira-slack-coordinator`
  - reads tickets and threads, drafts suggested writes, stays read-only by default
- `framework-standards-reviewer`
  - checks work against Wix tooling and standards guidance

## Routing Guidance

- Use Codex native subagents for bounded parallel work inside the current session.
- Use counterpart-model review only for final review or explicit second-opinion workflows.
- Keep write access disabled unless the user explicitly asks for the specific write action.
