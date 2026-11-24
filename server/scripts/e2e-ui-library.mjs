import {readFileSync} from 'node:fs';
const {aliceToken}=JSON.parse(readFileSync('/tmp/e2e-tokens.json','utf8'));
const rows=[
 {mediaType:'movie',tmdbId:680,title:'Pulp Fiction',posterPath:'/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',status:'want'},
 {mediaType:'movie',tmdbId:550,title:'Fight Club',posterPath:'/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',status:'want'},
 {mediaType:'movie',tmdbId:13,title:'Forrest Gump',posterPath:'/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',status:'want'},
 {mediaType:'movie',tmdbId:27205,title:'Inception',posterPath:'/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',status:'watched'},
 {mediaType:'tv',tmdbId:1396,title:'Breaking Bad',posterPath:'/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',status:'watching',totalEpisodes:62},
];
for(const row of rows){const r=await fetch(`http://127.0.0.1:8787/api/library/${row.mediaType}/${row.tmdbId}`,{method:'PUT',headers:{Authorization:`Bearer ${aliceToken}`,'Content-Type':'application/json'},body:JSON.stringify(row)});if(!r.ok)throw Error(`seed ${row.tmdbId}: ${r.status} ${await r.text()}`);}
console.log('Seeded5 synthetic-account library items locally');

