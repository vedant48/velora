// Disposable local evidence only: hold read responses long enough to inspect
// refresh feedback. Does not ship and never receives production credentials.
const http = require('http');
http.createServer((req,res)=>{
 const delay=req.method==='GET' && /\/api\/(users|library|reviews|auth\/me)/.test(req.url) ? 4000 : 0;
 if(delay)console.log('Delayed local read:',req.url);
 const upstream=http.request({hostname:'127.0.0.1',port:8787,path:req.url,method:req.method,headers:req.headers},r=>{
  const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>setTimeout(()=>{res.writeHead(r.statusCode,r.headers);res.end(Buffer.concat(chunks));},delay));
 });upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
}).listen(8788,'127.0.0.1');
