const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require.resolve('../src/theme/preferences.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} }; vm.runInNewContext(js, context);
const { readThemePreference, resolveThemeMode } = context.exports;
test('missing, malformed and unknown preferences default to System', () => {
  for (const value of [null, '', 'dark', '{', 'null', '42', '"automatic"', '{}']) assert.equal(readThemePreference(value), 'system');
});
test('all supported choices round trip through saved JSON', () => {
  for (const value of ['system', 'light', 'dark']) assert.equal(readThemePreference(JSON.stringify(value)), value);
});
test('System follows appearance and handles an unavailable OS preference', () => {
  assert.equal(resolveThemeMode('system', 'dark'), 'dark');
  assert.equal(resolveThemeMode('system', 'light'), 'light');
  assert.equal(resolveThemeMode('system', null), 'light');
});
test('explicit choice overrides the OS in both directions', () => {
  assert.equal(resolveThemeMode('dark', 'light'), 'dark');
  assert.equal(resolveThemeMode('light', 'dark'), 'light');
});
test('native app config does not pin System mode to light', () => {
  const config = JSON.parse(fs.readFileSync(require.resolve('../app.json'), 'utf8')).expo;
  const dependencies = JSON.parse(fs.readFileSync(require.resolve('../package.json'), 'utf8')).dependencies;
  assert.equal(config.userInterfaceStyle, 'automatic');
  assert.ok(config.plugins.includes('expo-system-ui'));
  assert.ok(dependencies['expo-system-ui']);
});

// Native preview found dark text over artwork in light mode and a one-off CTA.
test('artwork badges keep contrasting white labels in either theme', () => {
  const badge = fs.readFileSync(require.resolve('../src/components/common/Badge.tsx'), 'utf8');
  assert.match(badge, /ratingText: \{\s*color: '#FFFFFF'/);
  assert.match(badge, /hdText: \{\s*color: '#FFFFFF'/);
});
test('signed-out library uses the shared primary button', () => {
  const library = fs.readFileSync(require.resolve('../src/screens/Profile/LibraryScreen.tsx'), 'utf8');
  assert.match(library, /<AppButton title="Log in \/ Sign up"/);
  assert.doesNotMatch(library, /loginButton:/);
});
