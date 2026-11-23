const test = require('node:test'), assert = require('node:assert/strict'), ts = require('typescript'), fs = require('fs'), vm = require('vm');
function load(file) { const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out});return out; }
const {pageAfterDrag,resistedOffset}=load('src/experience/pagerPolicy.ts');
const {ratingDistribution}=load('src/experience/ratingDistribution.ts');
test('finger right-to-left advances, opposite goes previous, neither edge wraps',()=>{assert.equal(pageAfterDrag(0,4,-150,0,390),1);assert.equal(pageAfterDrag(1,4,150,0,390),0);assert.equal(pageAfterDrag(0,4,150,0,390),0);assert.equal(pageAfterDrag(3,4,-150,0,390),3);});
test('short/cancelled drags settle back, deliberate fling advances just one',()=>{assert.equal(pageAfterDrag(1,4,-60,200,390),1);assert.equal(pageAfterDrag(1,4,-30,-900,390),2);assert.equal(pageAfterDrag(1,4,-10,-900,390),1);});
test('middle drag follows finger exactly, edges resist without revealing blank pages',()=>{assert.equal(resistedOffset(-195,4,390),-195);assert.equal(resistedOffset(100,4,390),18);assert.equal(resistedOffset(-1270,4,390),-1188);});
test('rating bins include half stars, reject invalid values, retain real zero ratings',()=>{const b=ratingDistribution([9,9.5,10,0,null,undefined,NaN,11,-1]);assert.equal(b[9],1);assert.equal(b[10],2);assert.equal(b[0],1);assert.equal(b.reduce((a,v)=>a+v,0),4);});
