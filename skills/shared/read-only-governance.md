# Read-Only Governance

LHC defaults to `read-only` behavior for external systems.

Forbidden by default:

- `git commit`
- `git push`
- PR comments or PR edits
- Jira create, update, comment, transition, or delete
- Slack post, reply, reaction, or scheduling
- Grafana mutations
- DevEx write-side actions such as retriggering builds
- any other external mutation

Allowed by default:

- read-only inspection of local files
- local workspace edits
- local runtime state and artifact writes under `~/.lhc/`
- read-only external inspection through MCPs and CLIs

Escalation rule:

- External writes are allowed only when the user explicitly requests the specific write action in the current session.
- Do not infer write permission from vague wording like "handle it", "take care of it", or "finish the task".

## Capability ledger (data form of the prose denylist)

The forbidden actions above are also encoded as data in `permissions.json`. Two structured surfaces back the prose:

- `permissions.json` `rules[]` — pattern-based rules (`tool_family`, `command_regex`, `path_prefix`) mapped to `allow` / `deny` / `ask` effects.
- `permissions.json` `denied_mcp_tools[]` — explicit `{server, tool, rationale}` entries listing known-write MCP tools (Jira, Slack, Grafana, DevEx). Mirrors the prose denylist; intentionally non-exhaustive.

Both surfaces are **agent-enforced documentation**. The runtime does not auto-block these calls — `permissions.json` `notes[0]` and `notes[2]` say so explicitly. Skills MUST refuse the listed tools unless the user names the specific write in the current turn. The schema is committed at `permissions.schema.json` so the `$schema` reference in `permissions.json` resolves; the test in `tests/codex-compatibility.test.js` ("permissions.json validates against permissions.schema.json") pins the data and the schema together so future edits cannot drift.
