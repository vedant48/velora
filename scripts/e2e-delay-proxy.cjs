// Disposable local evidence only: hold read responses long enough to inspect
// refresh feedback. Does not ship and never receives production credentials.
// Routes: /api/* -> local wrangler backend (1.4s on user/library/reviews reads),
// /v1/tmdb/* -> deployed TMDB proxy over HTTPS (1.5s on discover reads so the
// genre grid skeleton is reliably observable; the rest of TMDB stays fast).
// Deterministic p09b capture: ONLY the Comedy-series first page (the request
// the p09 leg triggers) is held 15s, because maestro's tap needs ~3s to settle
// before the screenshot fires and a 1.5s hold already ended by then.
const http = require('http');
const https = require('https');
const TMDB_HOST = 'proxy-api-server-f1an.onrender.com';
const COMEDY_SERIES_PAGE1 = '/v1/tmdb/3/discover/tv?with_genres=35&page=1';
const delayFor = (req) => {
  if (req.method !== 'GET') return 0;
  if (/\/api\/(users|library|reviews|auth\/me)/.test(req.url)) return 1400;
  if (req.url === COMEDY_SERIES_PAGE1) return 15000;
  if (req.url.startsWith('/v1/tmdb/3/discover/')) return 1500;
  return 0;
};
http.createServer((req,res)=>{
 const delay=delayFor(req);
 if(delay)console.log('Delayed read:',req.url);
 const isTmdb=req.url.startsWith('/v1/');
 const opt=isTmdb?{hostname:TMDB_HOST,path:req.url,method:req.method,headers:{...req.headers,host:TMDB_HOST},protocol:'https:'}:{hostname:'127.0.0.1',port:8787,path:req.url,method:req.method,headers:req.headers};
 const upstream=(isTmdb?https:http).request(opt,r=>{
  const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>setTimeout(()=>{res.writeHead(r.statusCode,r.headers);res.end(Buffer.concat(chunks));},delay));
 });upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
}).listen(8788,'127.0.0.1');
