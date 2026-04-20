# Peer-Review Governance

Counterpart-model review is mandatory for:

- code changes
- major plans
- production investigations
- incident conclusions

Default routing:

- Codex leader → Claude reviewer
- Claude leader → Codex reviewer

All reviews go through [`scripts/peer-review.sh`](../../scripts/peer-review.sh). The script applies two independent guards so the reviewer can never mutate the artifact:

1. A **review-only prompt envelope** prepended to every call — forbids implementation, file edits, commits, PRs, Slack/Jira writes.
2. A **sandboxed execution layer** — `codex exec --sandbox read-only` makes file writes structurally impossible, regardless of what the prompt says.

## Invocation pattern (critical)

Peer review typically takes **30-180 seconds**. A synchronous Bash tool call blocks the session with no visible progress and may hit the 2-minute default timeout. Every skill that invokes peer review **must** use Claude Code's background-bash pattern:

```
1. Bash(command="sh $CLAUDE_PLUGIN_ROOT/scripts/peer-review.sh --leader claude --mode <mode> --cwd \"$PWD\" --prompt-file <path>", run_in_background=true, timeout=600000)
   → returns { bash_id }

2. Capture the [peer-review] startup line printed to stderr; it names the log file for recovery.

3. Poll: BashOutput(bash_id=<id>) every 10-20s.
   - Surface any new stdout to the user.
   - Stop polling when status becomes "completed" or the Verdict section appears.

4. On completion, parse the Verdict line.
```

Inside Codex, the equivalent is `shell` with background + a `tail -f` on the log path.

For quick reviews (< 30s expected) the foreground call pattern is acceptable:

```bash
sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode plan --prompt-file <path>
```

## Modes

| Mode | When | CLI path inside peer-review.sh |
|------|------|-------------------------------|
| `code-review` | diff review after `lhc-ralph` or `lhc-team` | `codex review` (when `--cwd` is set) |
| `plan` | plan review during `lhc-ralplan` | `codex exec --sandbox read-only` |
| `investigation` | RCA review during `lhc-investigate` | `codex exec --sandbox read-only` |
| `conclusion` | incident-conclusion review | `codex exec --sandbox read-only` |
| `analysis` | general review (build-fix triage, standards brief) | `codex exec --sandbox read-only` |

The envelope is applied to all modes. The `--sandbox read-only` flag is applied to every `codex exec` call.

## What the reviewer returns

The envelope forces a fixed response structure:

```
## Verdict
approved | approved-with-changes | rejected | degraded

## Spec compliance          (code-review mode only)
## Quality assessment
## Findings                  (each labeled [blocker|major|minor|nit])
## Recommendations
## Residual risks
```

Skills parse the Verdict line and record the full text verbatim in the review artifact.

## Review outputs

- Full reviewer stdout + stderr is always tee'd to `~/.lhc/logs/peer-review/<mode>-<timestamp>-<pid>.log` for post-hoc inspection.
- The invoking skill saves the verdict + extracted findings to the skill's own artifact under `~/.lhc/artifacts/`.
- If the review is not clean (rejected), do not present the work as approved. Revise and re-run.

## Degraded mode

If the counterpart CLI is missing, the script exits with code 2 and the verdict is recorded as `degraded`. Missing coverage must be named explicitly in the invoking skill's artifact — silent degraded mode is forbidden.

## Environment knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `ENABLE_PROMPT_CACHING_1H` | `1` | 1-hour prompt cache for repeat prefixes (cost savings) |
| `LHC_PEER_REVIEW_NO_LOG` | `0` | Disable tee-to-log mirror (use for pristine stdout) |
| `LHC_PEER_REVIEW_LOG_DIR` | `~/.lhc/logs/peer-review` | Override log directory |
| `DISABLE_LHC` | unset | (does not affect this script — the script is on-demand) |
