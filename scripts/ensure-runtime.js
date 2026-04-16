#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const asJson = args.includes('--json');

const runtimeRoot = path.join(os.homedir(), '.wixx');
const directories = [
  runtimeRoot,
  path.join(runtimeRoot, 'state'),
  path.join(runtimeRoot, 'state', 'sessions'),
  path.join(runtimeRoot, 'plans'),
  path.join(runtimeRoot, 'artifacts'),
  path.join(runtimeRoot, 'readiness')
];

const files = [
  {
    path: path.join(runtimeRoot, 'notepad.md'),
    contents: '# WIXx Notepad\n'
  },
  {
    path: path.join(runtimeRoot, 'project-memory.json'),
    contents: JSON.stringify({ notes: [], directives: [] }, null, 2) + '\n'
  }
];

if (!dryRun) {
  for (const directory of directories) {
    fs.mkdirSync(directory, { recursive: true });
  }

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, file.contents, 'utf8');
    }
  }
}

const report = {
  runtimeRoot,
  dryRun,
  directories,
  files: files.map((file) => file.path)
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(`Runtime root: ${runtimeRoot}\n`);
  process.stdout.write(`Mode: ${dryRun ? 'dry-run' : 'created-or-verified'}\n`);
  process.stdout.write(`Directories:\n- ${directories.join('\n- ')}\n`);
  process.stdout.write(`Files:\n- ${report.files.join('\n- ')}\n`);
}
