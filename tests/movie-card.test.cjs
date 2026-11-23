const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/components/MovieCard/MovieCard.tsx'), 'utf8');
function load() {
  let comparator = null;
  const React = { memo: (component, compare) => { comparator = compare; return component; } };
  const context = { exports: {}, require: name => {
    if (name.endsWith('experience/motion')) return { motion: { press: {} } };
    if (name === 'react') return { __esModule: true, default: React };
    if (name === 'react-native') return { StyleSheet: { create: x => x } };
    if (name.endsWith('ThemeContext')) return { useAppTheme: () => { throw Error('Invalid hook call outside component'); }, useThemedStyles: () => { throw Error('Invalid hook call outside component'); } };
    return {};
  }};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  vm.runInNewContext(js, context);
  return comparator;
}
test('MovieCard memo comparison cannot invoke theme hooks while recycling', () => {
  const compare = load();
  const props = { item: { id: 1, poster_path: '/poster.jpg' } };
  if (compare) assert.doesNotThrow(() => compare(props, { ...props }));
});
test('MovieCard uses default memo comparison, retaining changed callbacks and media props', () => {
  assert.equal(load(), undefined);
});
