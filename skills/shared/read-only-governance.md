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
