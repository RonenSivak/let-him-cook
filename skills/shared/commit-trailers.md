# Commit Trailers

When an LHC workflow produces a commit (via `lhc-ralph`, `lhc-team`, or a user-authorized direct edit), preserve decision context in the commit message using git trailers.

Trailers sit below the body, one per line, no blank lines between them. They are indexable by `git log --grep` and by `git interpret-trailers`.

## Trailer keys

| Key | When to include | Example |
|-----|----------------|---------|
| `Constraint:` | An active constraint that shaped this decision. | `Constraint: Auth service does not support token introspection` |
| `Rejected:` | An alternative considered and why it was rejected. Format: `alternative \| reason`. | `Rejected: Extend token TTL to 24h \| security policy violation` |
| `Directive:` | A warning or instruction for future modifiers of this code. | `Directive: Error handling is intentionally broad — do not narrow without verifying upstream 4xx behavior` |
| `Confidence:` | `high` / `medium` / `low` for the correctness of the change. | `Confidence: high` |
| `Scope-risk:` | `narrow` / `moderate` / `broad` for the blast radius. | `Scope-risk: narrow` |
| `Not-tested:` | An edge case or scenario intentionally not covered. | `Not-tested: Auth service cold-start latency >500ms` |
| `LHC-plan:` | Absolute path to the `~/.lhc/plans/` artifact that authorized this change. | `LHC-plan: ~/.lhc/plans/ralplan-auth-2026-04-20T14-23-05Z.md` |
| `LHC-peer-review:` | Verdict from counterpart peer review. | `LHC-peer-review: approved` |

Skip trailers for trivial commits (typo, formatting-only).

## Example

```
fix(auth): prevent silent session drops during long-running ops

Auth service returns inconsistent status codes on token expiry, so the
interceptor catches all 4xx and triggers inline refresh.

Constraint: Auth service does not support token introspection
Constraint: Must not add latency to non-expired-token paths
Rejected: Extend token TTL to 24h | security policy violation
Rejected: Background refresh on timer | race condition with concurrent requests
Confidence: high
Scope-risk: narrow
Directive: Error handling is intentionally broad (all 4xx) — do not narrow without verifying upstream behavior
Not-tested: Auth service cold-start latency >500ms
LHC-plan: ~/.lhc/plans/ralplan-auth-session-drop-2026-04-18T09-12-00Z.md
LHC-peer-review: approved
```

## Querying trailers

```bash
# Find all commits with a rejected alternative
git log --grep="^Rejected:" --format="%h %s"

# Show trailers for the last commit
git log -1 --format="%(trailers)"

# Show every commit that cited an LHC plan
git log --grep="^LHC-plan:" --format="%h %(trailers:key=LHC-plan)"
```

## Relation to LHC artifacts

Trailers duplicate information that is *also* in the `~/.lhc/plans/` or `~/.lhc/artifacts/` file. That is deliberate. The LHC artifact is the full decision record; trailers are the searchable shadow in git history. If the artifact is ever lost (cleaned home directory, new machine), the trailers still hold the key facts.
