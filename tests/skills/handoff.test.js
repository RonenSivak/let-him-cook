'use strict';

// LHC offline replay/eval harness — handoff schema test.
//
// For each fixture under `tests/skills/fixtures/<name>.json`:
// - parses the embedded `input_handoff_text` via `tests/skills/handoff-parser.js`
// - asserts the `Completed` field matches the fixture's expected workflow
// - asserts every key in `expected_keys` is present
// - asserts every key in `expected_pass_to_next_skill_keys` is present in the
//   `Pass to next skill:` block (if any)
//
// This locks the handoff contract defined in
// `skills/shared/handoff-protocol.md`. A skill edit that drops a documented
// field, renames a field, or changes the block envelope breaks these tests.
//
// No model calls. No network. Pure offline replay against frozen fixtures.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseHandoff } = require('./handoff-parser');

const fixturesDir = path.join(__dirname, 'fixtures');

const fixtureFiles = fs
  .readdirSync(fixturesDir)
  .filter((entry) => entry.endsWith('.json'))
  .sort();

assert.ok(
  fixtureFiles.length >= 5,
  `handoff fixtures count must be at least 5; got ${fixtureFiles.length}`,
);

for (const fixtureFile of fixtureFiles) {
  const fixturePath = path.join(fixturesDir, fixtureFile);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  test(`handoff fixture: ${fixture.name || fixtureFile}`, () => {
    const parsed = parseHandoff(fixture.input_handoff_text);

    assert.equal(
      parsed.completed,
      fixture.expected_completed,
      `${fixtureFile}: parsed Completed must equal expected_completed`,
    );

    for (const key of fixture.expected_keys || []) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(parsed.fields, key),
        `${fixtureFile}: expected key "${key}" missing from parsed handoff fields`,
      );
    }

    const expectedPassKeys = fixture.expected_pass_to_next_skill_keys || [];
    for (const key of expectedPassKeys) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(parsed.passToNextSkill, key),
        `${fixtureFile}: expected pass-to-next-skill key "${key}" missing from parsed block`,
      );
    }

    if (expectedPassKeys.length === 0) {
      assert.equal(
        Object.keys(parsed.passToNextSkill).length,
        0,
        `${fixtureFile}: expected no pass-to-next-skill keys, got ${Object.keys(parsed.passToNextSkill).join(', ')}`,
      );
    }
  });
}

test('handoff parser handles every LHC HANDOFF block in handoff-protocol.md', () => {
  const protocolPath = path.join(
    __dirname,
    '..',
    '..',
    'skills',
    'shared',
    'handoff-protocol.md',
  );
  assert.ok(fs.existsSync(protocolPath), 'handoff-protocol.md must exist');

  const protocolText = fs.readFileSync(protocolPath, 'utf8');
  const fenceRe = /```\s*\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = fenceRe.exec(protocolText)) !== null) {
    const body = match[1];
    if (/^\s*LHC HANDOFF\s*$/m.test(body)) {
      blocks.push(body);
    }
  }

  assert.ok(
    blocks.length >= 4,
    `handoff-protocol.md must contain at least 4 LHC HANDOFF examples; found ${blocks.length}`,
  );

  for (const block of blocks) {
    const parsed = parseHandoff(block);
    assert.ok(
      typeof parsed.completed === 'string' && parsed.completed.length > 0,
      `handoff-protocol.md example must yield a non-empty Completed field; block:\n${block}`,
    );
    assert.ok(
      Object.prototype.hasOwnProperty.call(parsed.fields, 'Cwd') ||
        Object.prototype.hasOwnProperty.call(parsed.fields, 'Classification'),
      `handoff-protocol.md example must declare at least Cwd or Classification; block:\n${block}`,
    );
  }
});

test('handoff parser rejects malformed inputs (offline replay protocol contract)', () => {
  assert.throws(
    () => parseHandoff('this is not a handoff block'),
    /not an LHC HANDOFF block/,
    'parser must reject input missing the LHC HANDOFF header',
  );

  assert.throws(
    () => parseHandoff('LHC HANDOFF\n- Slug: orphan-fixture\n'),
    /missing required "Completed" field/,
    'parser must reject blocks without a Completed field',
  );

  assert.throws(
    () => parseHandoff(123),
    /requires a string input/,
    'parser must reject non-string input',
  );
});
