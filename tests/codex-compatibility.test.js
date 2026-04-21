const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function walkFiles(rootDir) {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      files.push(path.relative(repoRoot, fullPath));
    }
  }

  walk(path.join(repoRoot, rootDir));
  return files.sort();
}

test('README does not rely on removed Codex plugin CLI commands', () => {
  const readme = read('README.md');
  assert.doesNotMatch(readme, /\bcodex plugin list\b/);
});

test('shared skill docs are host-neutral for plugin root lookup', () => {
  const files = [
    'README.md',
    'scripts/precompact-reinject.js',
    'scripts/stop-reminder.js',
    'skills/shared/notepad-schema.md',
    'skills/shared/peer-review-governance.md',
    ...walkFiles('skills').filter(file => file.endsWith('.md')),
  ];

  for (const file of files) {
    const content = read(file);
    const offendingLine = content
      .split('\n')
      .find(line => line.includes('CLAUDE_PLUGIN_ROOT') && !line.includes('CODEX_PLUGIN_ROOT'));
    assert.equal(offendingLine, undefined, `${file} still assumes Claude-only plugin root`);
  }
});

test('shared peer review examples do not hardcode Claude as the leader', () => {
  const files = [
    'README.md',
    'scripts/stop-reminder.js',
    'skills/shared/peer-review-governance.md',
    ...walkFiles('skills').filter(file => file.endsWith('.md')),
  ];

  for (const file of files) {
    const content = read(file);
    assert.doesNotMatch(
      content,
      /peer-review\.sh[^\n]*--leader\s+claude/,
      `${file} still hardcodes --leader claude`
    );
  }
});

test('Codex manifest points back to this repository', () => {
  const plugin = JSON.parse(read('.codex-plugin/plugin.json'));
  assert.equal(plugin.repository, 'https://github.com/RonenSivak/let-him-cook');
});

test('Codex installer supports a safe dry-run', () => {
  const fakeHome = path.join(os.tmpdir(), `lhc-codex-${Date.now()}`);
  const output = childProcess.execFileSync(
    process.execPath,
    ['scripts/install-codex-plugin.js', '--dry-run', '--home', fakeHome],
    { cwd: repoRoot, encoding: 'utf8' }
  );

  assert.match(output, /\[codex-plugin\] dry-run let-him-cook/);
  assert.match(output, /marketplace\.json/);
  assert.match(output, /config\.toml/);
});
