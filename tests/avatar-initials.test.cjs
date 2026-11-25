const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Deterministic check that avatar initials come from real display names /
// usernames only: multiword names give first+last word initials, single
// names give their first two characters, and no gallery sample identity
// can leak into a real profile.
function loadInitials() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/utils/initials.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(compiled, { exports: mod.exports, module: mod, require: require });
  return mod.exports.avatarInitials;
}

const avatarInitials = loadInitials();

test('two-letter initials use first and last word of real multiword names', () => {
  assert.equal(avatarInitials('E2E Bob', 2), 'EB');
  assert.equal(avatarInitials('Priya Sharma', 2), 'PS');
  assert.equal(avatarInitials('Rohan Kumar', 2), 'RK');
  assert.equal(avatarInitials('Vedant Kumar', 2), 'VK');
  assert.equal(avatarInitials('mary jane watson', 2), 'MW');
});

test('two-letter initials fall back to first two characters of a single name', () => {
  assert.equal(avatarInitials('Aarav', 2), 'AA');
  assert.equal(avatarInitials('madonna', 2), 'MA');
});

test('single-letter default and edge cases', () => {
  assert.equal(avatarInitials('Vedant Kumar'), 'V');
  assert.equal(avatarInitials('e2e_alice'), 'E');
  assert.equal(avatarInitials('  ', 2), '?');
  assert.equal(avatarInitials(null, 2), '?');
  assert.equal(avatarInitials(undefined), '?');
});
