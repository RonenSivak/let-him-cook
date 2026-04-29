# Peer-Review Governance

Counterpart-model review is mandatory for:

- code changes
- major plans
- production investigations
- incident conclusions

Default routing:

- Codex leader → Claude reviewer
- Claude leader → Codex reviewer

Fallback routing:

- If the counterpart CLI is missing, token/quota-limited, rate-limited, timed
  out, crashed, or returned an unparseable verdict, invoke the strict fallback
  in a separate context.
- This is a strict local fallback, not counterpart coverage. Record
  `Review route: strict-local-fallback` in the review artifact.
- If the strict fallback also cannot run, record `Review route: degraded-none`
  and `Verdict: degraded`.

All counterpart reviews go through [`scripts/peer-review.sh`](../../scripts/peer-review.sh). The script applies two independent guards so the counterpart reviewer can never mutate the artifact:

1. A **review-only prompt envelope** prepended to every call — forbids implementation, file edits, commits, PRs, Slack/Jira writes.
2. A **sandboxed execution layer** — `codex exec --sandbox read-only` makes file writes structurally impossible, regardless of what the prompt says.

## Invocation pattern (critical)

Peer review typically takes **30-180 seconds**. A synchronous shell call blocks the session with no visible progress and may hit the default timeout. Every skill that invokes peer review **must** use the host CLI's background-shell pattern:

```
1. Shell(command="sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode <mode> --cwd \"$PWD\" --prompt-file <path>", run_in_background=true, timeout=600000)
   → returns { bash_id }

2. Capture the [peer-review] startup line printed to stderr; it names the log file for recovery.

3. Poll: BashOutput(bash_id=<id>) every 10-20s.
   - Surface any new stdout to the user.
   - Stop polling when status becomes "completed" or the Verdict section appears.

4. On completion, parse the Verdict line.
```

`peer-review.sh` auto-detects the current leader from `CODEX_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT`, so shared skill docs do not need to hardcode `--leader`.

For quick reviews (< 30s expected) the foreground call pattern is acceptable:

```bash
sh "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/peer-review.sh --mode plan --prompt-file <path>
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

## Strict Local Fallback

Use `strict-peer-reviewer` when `peer-review.sh` exits 2, reports a missing CLI,
hits a quota/token/rate-limit error, crashes before the `## Verdict` section,
times out after the caller's maximum wait, or returns an unparseable verdict
(no `## Verdict` line in output). "Unparseable verdict" is detected by the
caller parsing reviewer output, not by a dedicated `peer-review.sh` exit code.

The fallback reviewer must:

- run in a separate context/subagent from the producing agent
- stay read-only
- use a structurally review-only surface:
  - Claude Code: `agents/strict-peer-reviewer.md` with `tools: Read, Grep, Glob`
  - Codex: native `code-reviewer` subagent seeded with `prompts/strict-peer-reviewer.md`
    and no implementation task; never `default`, `executor`, or a worker role
- return the fixed review structure from `prompts/strict-peer-reviewer.md` or
  `agents/strict-peer-reviewer.md`
- return only `approved`, `approved-with-changes`, or `rejected`; `degraded` is
  reserved for orchestration failure when fallback cannot run
- preserve the normal `code-review` two-stage contract by running two distinct
  fallback passes:
  - fallback stage 1 receives the plan acceptance criteria plus diff and returns
    criterion-by-criterion `## Spec Compliance`
  - fallback stage 2 receives the diff plus standards brief and returns
    `## Quality Assessment`
- cite concrete artifact sections, file paths, commands, or source links
- explicitly state `Review Route: strict-local-fallback`

Overall verdict handling:

- all stages `approved` -> overall `approved`, with `counterpart_coverage=degraded`
- any stage `approved-with-changes` and no stage rejected -> overall
  `approved-with-changes`, with `counterpart_coverage=degraded`
- any stage `rejected` -> overall `rejected`
- fallback unavailable -> overall `degraded`

Do not hide missing counterpart coverage. The artifact must say which CLI failed
or which quota/token condition blocked it.

## Degraded Mode

If both counterpart review and strict local fallback are unavailable, the verdict
is recorded as `degraded`. Missing coverage must be named explicitly in the
invoking skill's artifact - silent degraded mode is forbidden.

## Environment knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `ENABLE_PROMPT_CACHING_1H` | `1` | 1-hour prompt cache for repeat prefixes (cost savings) |
| `LHC_PEER_REVIEW_NO_LOG` | `0` | Disable tee-to-log mirror (use for pristine stdout) |
| `LHC_PEER_REVIEW_LOG_DIR` | `~/.lhc/logs/peer-review` | Override log directory |
| `DISABLE_LHC` | unset | (does not affect this script — the script is on-demand) |
