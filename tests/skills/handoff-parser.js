'use strict';

// LHC Handoff Parser — offline replay/eval helper.
//
// Parses the LHC HANDOFF block format defined in
// `skills/shared/handoff-protocol.md`. Pure function over a string; never reads
// the filesystem. Designed for the offline replay harness in `tests/skills/`
// where fixtures contain known-good handoff strings; the parser asserts that
// the schema/keys are stable across skill edits.
//
// The parser is intentionally permissive about whitespace and case-insensitive
// about field names; it is strict about the block envelope (must contain
// `LHC HANDOFF` followed by hyphen-prefixed fields) so unintended drift is
// caught.

const HEADER_RE = /(^|\n)\s*LHC HANDOFF\s*(\n|$)/m;
const FIELD_RE = /^\s*-\s+([^:]+?)\s*:\s*(.*?)\s*$/;
const PASS_KEY_RE = /^\s{2,}([a-zA-Z][\w-]*)\s*=\s*(.*?)\s*$/;

function parseHandoff(input) {
  if (typeof input !== 'string') {
    throw new TypeError('parseHandoff requires a string input');
  }
  if (!HEADER_RE.test(input)) {
    throw new Error('input is not an LHC HANDOFF block: missing "LHC HANDOFF" header');
  }

  const headerMatch = input.match(HEADER_RE);
  const startIdx = headerMatch.index + headerMatch[0].indexOf('LHC HANDOFF');
  const lines = input.slice(startIdx).split(/\r?\n/);

  const fields = {};
  const passToNextSkill = {};
  let inPassBlock = false;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') {
      if (inPassBlock) break;
      continue;
    }

    if (inPassBlock) {
      const passMatch = line.match(PASS_KEY_RE);
      if (passMatch) {
        passToNextSkill[passMatch[1]] = passMatch[2];
        continue;
      }
      const fieldMatch = line.match(FIELD_RE);
      if (fieldMatch) {
        inPassBlock = false;
      } else {
        break;
      }
    }

    const fieldMatch = line.match(FIELD_RE);
    if (!fieldMatch) {
      break;
    }
    const key = fieldMatch[1].trim();
    const value = fieldMatch[2];
    if (/^pass to next skill$/i.test(key)) {
      inPassBlock = true;
      continue;
    }
    fields[key] = value;
  }

  if (!Object.prototype.hasOwnProperty.call(fields, 'Completed')) {
    throw new Error('LHC HANDOFF block missing required "Completed" field');
  }

  return {
    completed: fields.Completed,
    fields,
    passToNextSkill,
  };
}

module.exports = { parseHandoff };
