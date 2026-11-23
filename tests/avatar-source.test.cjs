const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('Android authenticated avatar uses array source so RN forwards headers', () => {
  const src = fs.readFileSync('src/components/Avatar.tsx', 'utf8');
  assert.match(src, /source=\{\[\{ uri, headers: \{ Authorization:/);
  const rn = fs.readFileSync('node_modules/react-native/Libraries/Image/Image.android.js','utf8');
  const arrayBranch = rn.slice(rn.indexOf('if (Array.isArray(source_))'), rn.indexOf('const {uri, width: sourceWidth'));
  assert.match(arrayBranch, /nativeProps.headers = sourceHeaders/);
});
