# Peer-Review Governance

Counterpart-model review is mandatory for:

- code changes
- major plans
- production investigations
- incident conclusions

Default mapping:

- Codex leader -> Claude reviewer
- Claude leader -> Codex reviewer

Use:

```bash
sh ../../scripts/peer-review.sh --leader codex --mode plan --prompt-file /path/to/prompt.txt
```

or:

```bash
sh ../../scripts/peer-review.sh --leader claude --mode code-review --cwd /path/to/repo --prompt-file /path/to/prompt.txt
```

Review outputs should be saved as local artifacts. If the review is not clean, do not present the work as approved.
