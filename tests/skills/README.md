# LHC offline replay / eval harness

This directory holds the offline replay harness for LHC skill outputs. Tests run under `node --test` with no model calls, no network, no MCP access — only the Node.js standard library plus frozen fixtures.

## Layout

```
tests/skills/
├── README.md                  # this file
├── handoff-parser.js          # pure parser for the LHC HANDOFF block format
├── handoff.test.js            # parses every fixture + protocol-doc blocks
└── fixtures/
    ├── ralplan-to-ralph.json
    ├── interview-to-build-fix.json
    ├── research-terminal.json
    ├── build-fix-to-ralplan.json
    └── investigate-conclusion.json
```

## Fixture schema (canonical)

Every fixture is a JSON object with these fields:

- `name` — short human-readable label for the test report.
- `input_handoff_text` — the raw LHC HANDOFF block (multi-line string) to parse.
- `expected_completed` — the expected `Completed:` field value (e.g. `ralplan`, `interview`, `build-fix`).
- `expected_keys` — array of top-level field names that MUST be present in the parsed handoff (e.g. `["Completed","Slug","Cwd","Artifact","Verdict","Next skill"]`).
- `expected_pass_to_next_skill_keys` — array of keys that MUST be present in the `Pass to next skill:` block. Empty array `[]` means the fixture is terminal (no next skill).

Earlier drafts mentioned `expected_handoff_shape` and `expected_notepad_keys` — both are intentionally **rejected**. Notepad-line shape is asserted elsewhere (`tests/codex-compatibility.test.js` against `skills/shared/notepad-schema.md`); this harness only exercises the parsed handoff structure.

## Running

```
# this directory only
node --test tests/skills/

# combined with the codex-compat suite
node --test tests/
```

Expected counts:
- `tests/skills/` — at least 6 tests (5 fixtures + 1 protocol contract test). 7+ when additional fixtures are added.
- combined `tests/` — at least 25 tests.

## Adding a new fixture

1. Drop a new `*.json` file under `fixtures/` matching the schema above.
2. Run `node --test tests/skills/` — `handoff.test.js` discovers fixtures by glob and creates one `test()` per file.
3. If the new fixture exercises a handoff field that the parser does not yet emit, extend `handoff-parser.js` (and its assertions) before the fixture goes in.

## Why no model calls?

Skill behavior changes are observed through their durable surface — the handoff block, the notepad line, and the saved artifact path. Replaying frozen fixtures locks the durable surface across edits without depending on a live LLM. If you need to test model-side behavior, that is a different harness (eval, not replay). See `skills/shared/peer-review-governance.md` and the §15 references in `docs/evidence.md` (Datadog Bits AI eval platform, Anthropic "Demystifying evals", SWE-rebench) for the design motivation.
