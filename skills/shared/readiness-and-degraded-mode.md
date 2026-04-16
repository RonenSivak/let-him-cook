# Readiness And Degraded Mode

All substantial workflows begin with a readiness check.

## Hard-Stop Rule

If a required MCP or CLI is missing:

- stop normal execution
- show a concrete checklist
- do not continue while presenting the result as fully grounded

Use:

```bash
node ../../scripts/check-readiness.js <workflow>
```

## Degraded Mode

If the user explicitly says to continue anyway in the same chat:

- continue in degraded mode
- restate missing coverage before major conclusions
- do not hide uncertainty

Example:

- missing `root-cause` means production investigation can continue with logs and metrics only, but request-ID RCA coverage is absent
- missing `octocode` means repo research can continue locally, but GitHub archaeology coverage is absent
