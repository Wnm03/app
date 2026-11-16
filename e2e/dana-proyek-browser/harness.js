const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const ROOT=process.env.ROOT;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
exports.start=async function(vp={width:390,height:844},mobile=true){
 const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf');}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${srv.address().port}/index.html`;
 const br=await chromium.launch({headless:true});
 const ctx=await br.newContext({viewport:vp,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
 const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,200)));
 p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200));});
 await p.goto(base);await p.waitForFunction(()=>typeof D==='object'&&typeof showPage==='function');
 await p.evaluate(()=>{localStorage.setItem('kw_v4',JSON.stringify(D));localStorage.setItem('kw_setup','1');});
 await p.goto(base);await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await p.waitForTimeout(800);
 return {p,errs,base,close:async()=>{await br.close();srv.close();}};
};
