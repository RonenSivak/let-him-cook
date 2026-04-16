# Wix Tool Surfaces

Core surfaces used by WIXx:

- `mcp-s`
  - gateway that can satisfy many internal Wix capabilities such as `devex`, `grafana`, `root-cause`, `docs-schema`, `jira`, and `slack`
- `octocode`
  - repo discovery, file search, PR archaeology, and package lookup
- `context7`
  - external library docs when internal docs are not the right source
- local `codex` CLI
- local `claude` CLI

Primary workflow routing:

- `investigate`
  - `root-cause`, `grafana`, `devex`
- `build-fix`
  - `devex`, `octocode`
- `research`
  - `docs-schema`, `octocode`, optionally `context7`
- `review`
  - `codex` and `claude`
