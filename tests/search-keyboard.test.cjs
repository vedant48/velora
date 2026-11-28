const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs');
const src = fs.readFileSync('src/screens/Search/SearchScreen.tsx', 'utf8');
test('search result lists deliver the first tap to the row while the keyboard is up', () => {
  const flashLists = src.match(/<FlashList[\s\S]*?\/>/g) ?? [];
  assert.ok(flashLists.length >= 2, 'expected results + people FlashLists');
  for (const list of flashLists) assert.match(list, /keyboardShouldPersistTaps="handled"/, 'every search FlashList must not swallow the first tap to dismiss the keyboard');
});
