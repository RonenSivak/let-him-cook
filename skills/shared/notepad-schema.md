# Notepad Schema

`~/.lhc/notepad.md` is a per-user, append-only activity ledger. It is *not* per-session and *not* per-repo — it is the single durable trace of every LHC workflow invocation across all sessions on this machine.

## Format

Every entry is a single line with tab-separated fields, prefixed by a dash:

```
- <ISO-8601-UTC>\t<workflow>\t<slug>\t<cwd>\t<key=value>...
```

- `ISO-8601-UTC` — `date -u +%FT%TZ` output (e.g. `2026-04-20T14:23:05Z`)
- `workflow` — one of `interview`, `ralplan`, `ralph`, `team`, `investigate`, `build-fix`, `research`, `review`
- `slug` — short kebab-case identifier for the task (`auth-token-refresh`, `rollout-42`)
- `cwd` — current working directory at invocation
- `key=value` pairs — any of: `plan=<path>`, `artifact=<path>`, `verdict=<approved|approved-with-changes|rejected|degraded>`, `classification=<code|flaky-test|release|ownership|infra>`, `conf=<low|medium|high>`

Example:

```
- 2026-04-20T14:23:05Z	ralplan	auth-token-refresh	/Users/ronen/src/mcp-servers	plan=/Users/ronen/.lhc/plans/ralplan-auth-token-refresh-2026-04-20T14-23-05Z.md	verdict=approved
- 2026-04-20T14:40:12Z	ralph	auth-token-refresh	/Users/ronen/src/mcp-servers	plan=/Users/ronen/.lhc/plans/ralplan-auth-token-refresh-2026-04-20T14-23-05Z.md	artifact=/Users/ronen/.lhc/artifacts/execute-auth-token-refresh-2026-04-20T14-40-12Z.md	verdict=approved
- 2026-04-20T15:02:44Z	investigate	payments-5xx-spike	/Users/ronen/src/payments	artifact=/Users/ronen/.lhc/artifacts/investigate-payments-5xx-spike-2026-04-20T15-02-44Z.md	verdict=approved	conf=high
```

## The only correct way to append

Use the helper. Do not write notepad entries by hand — format drift across skills is the #1 cause of unreadable notepad history.

```bash
node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
  --workflow ralph \
  --slug auth-token-refresh \
  --cwd "$PWD" \
  --kv plan=/path/to/plan.md \
  --kv artifact=/path/to/execute.md \
  --kv verdict=approved
```

The helper guarantees:
- UTC ISO-8601 timestamp
- tab-separated fields
- KV pairs are shell-quoted
- trailing newline
- never truncates the file (append only)

## Tail conventions

- `lhc-status` tails 20 lines
- A session that invokes more than 20 workflows is unusual — if you see this, question whether you're in a loop
- `~/.lhc/state/activity.jsonl` is the structured counterpart; notepad is the human-readable one

## Rotation

The notepad is intentionally unbounded. If it exceeds ~10 MB, the user may archive old entries manually via `mv ~/.lhc/notepad.md ~/.lhc/notepad.$(date -u +%Y-%m).md && : > ~/.lhc/notepad.md`. No skill should auto-rotate or prune the notepad.
