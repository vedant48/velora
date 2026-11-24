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

test('owner tab rules: Want both media, Watched movies only, Series watching/watched series only', () => {
 const {itemInTab} = exportsObject;
 const it = (media_type, status) => ({media_type, status});
 const tabs = (i) => ['want','watched','series'].filter(t => itemInTab(i,t));
 assert.deepEqual(tabs(it('movie','want')), ['want']); assert.deepEqual(tabs(it('tv','want')), ['want']);
 assert.deepEqual(tabs(it('movie','watched')), ['watched']); assert.deepEqual(tabs(it('tv','watched')), ['series']);
 assert.deepEqual(tabs(it('tv','watching')), ['series']); assert.deepEqual(tabs(it('movie','watching')), []);
 assert.equal(itemInTab(it('tv','watching'),'insights'), false);
});
test('real-scale split: 330 Want movies + 43 Want series + 899 watched movies + 52 watched series + 80 watching series', () => {
 const {itemInTab} = exportsObject;
 const items = [];
 for (const [m,s,n] of [['movie','want',330],['tv','want',43],['movie','watched',899],['tv','watched',52],['tv','watching',80]]) for (let i=0;i<n;i++) items.push({media_type:m,status:s});
 const count = (t) => items.filter(i => itemInTab(i,t)).length;
 assert.equal(count('want'),373); assert.equal(count('watched'),899); assert.equal(count('series'),132);
});
const sp = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/Library/seriesProgress.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:sp});
test('series progress and ended tick are source grounded', () => {
 const mk = (status, w, t) => ({media_type:'tv', status, episodes_watched:w, total_episodes:t});
 assert.equal(sp.seriesProgress(mk('want',0,10)), null);
 assert.equal(sp.seriesProgress(mk('watching',3,0)), null);
 assert.equal(sp.seriesProgress({media_type:'movie',status:'watched',episodes_watched:0,total_episodes:0}), null);
 const part = sp.seriesProgress(mk('watching',3,10)); assert.equal(part.left, 7);
 const full = sp.seriesProgress(mk('watched',10,10)); assert.equal(full.left, 0);
 assert.equal(sp.isEndedComplete(full, {status:'Ended', number_of_episodes:10}), true);
 assert.equal(sp.isEndedComplete(full, {status:'Returning Series', number_of_episodes:10}), false);
 assert.equal(sp.isEndedComplete(full, undefined), false);
 assert.equal(sp.isEndedComplete(full, {status:'Ended', number_of_episodes:12}), false);
 assert.equal(sp.isEndedComplete(part, {status:'Ended', number_of_episodes:10}), false);
});
test('canceled stays neutral', () => { assert.equal(sp.isEndedComplete(sp.seriesProgress({media_type:'tv',status:'watched',episodes_watched:10,total_episodes:10}), {status:'Canceled', number_of_episodes:10}), false); });
