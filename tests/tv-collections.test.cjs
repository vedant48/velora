const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
test('TV collections use real TV source, preserve exact title snapshot and unknown progress',()=>{
 const s=fs.readFileSync('src/components/Collections/TVCollections.tsx','utf8');
 assert.match(s,/getTVByGenre\(group.id, 1\)/);assert.match(s,/media_type: 'tv'/);assert.match(s,/watched: null/);assert.match(s,/hasLibrary \? c.ids.filter/);assert.match(s,/items: card.items/);assert.doesNotMatch(s,/Math.random|likes|5961|Mid-October/);
});
