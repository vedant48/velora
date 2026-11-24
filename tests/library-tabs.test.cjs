const test = require('node:test'), assert = require('node:assert/strict'), ts = require('typescript'), fs = require('fs'), vm = require('vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/screens/Profile/libraryTabs.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:exportsObject});
const {tabAfterSwipe} = exportsObject;
test('explicit leftward-finger sequence and reverse, with no wrapping', () => {
 assert.equal(tabAfterSwipe('want',-100,3,0),'watched'); assert.equal(tabAfterSwipe('watched',-100,3,0),'series'); assert.equal(tabAfterSwipe('series',-100,3,0),'insights'); assert.equal(tabAfterSwipe('insights',-100,3,0),'insights'); assert.equal(tabAfterSwipe('want',100,3,0),'want'); assert.equal(tabAfterSwipe('series',100,3,0),'watched');
});
test('vertical refresh, short drags and cancelled intent do not change tabs', () => {
 for (const [x,y,v] of [[20,120,900],[15,0,900],[45,0,100],[90,100,900]]) assert.equal(tabAfterSwipe('want',x,y,v),'want');
 assert.equal(tabAfterSwipe('want',-30,2,-900),'watched');
});
test('Want series stay in Want; Series holds only tracked (non-Want) series', () => {
 const {itemInTab} = exportsObject;
 const tv = (status) => ({media_type:'tv', status}), movie = (status) => ({media_type:'movie', status});
 assert.equal(itemInTab(tv('want'),'series'), false); assert.equal(itemInTab(tv('want'),'want'), true);
 assert.equal(itemInTab(tv('watching'),'series'), true); assert.equal(itemInTab(tv('watched'),'series'), true);
 assert.equal(itemInTab(movie('watched'),'series'), false); assert.equal(itemInTab(movie('want'),'want'), true);
});
