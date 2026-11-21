// AUDIT-ONLY. Jalankan: node e2e/audit-s2896/service-worker-offline-update.js (tanpa backup)
// Audit poin 2: service worker AKTIF (harness e2e lama memblokir SW dan memakai 127.0.0.1 -> setupPWA tidak mendaftarkan SW sama sekali).
const fs=require('fs'),path=require('path'),http=require('http');
let chromium;for(const m of ['playwright','playwright-core','/opt/npm-tools/node_modules/playwright']){try{({chromium}=require(m));break;}catch(e){void e;}}
const ROOT=path.resolve(process.env.ROOT||path.join(__dirname,'..','..'));let SWVER=null;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const hits=[];
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);hits.push(u);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf');}
 let body=fs.readFileSync(f);if(u==='/sw.js'&&SWVER)body=Buffer.from(body.toString().replace(/kw-cache-v\d+/,'kw-cache-v'+SWVER));
 r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});r.end(body);});
const R=(k,v)=>console.log(k,'=>',JSON.stringify(v).slice(0,500));
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base=`http://localhost:${srv.address().port}/index.html`;
 const br=await chromium.launch({headless:true});const ctx=await br.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});const p=await ctx.newPage();const errs=[];let navs=0;
 p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('framenavigated',f=>{if(f===p.mainFrame())navs++;});
 await p.goto(base);await p.waitForFunction(()=>typeof D==='object'&&typeof showPage==='function');
 await p.evaluate(()=>{localStorage.setItem('kw_v4',JSON.stringify(D));localStorage.setItem('kw_setup','1');});await p.goto(base);await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');
 const ready=async()=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {active:r&&r.active&&r.active.state,ctrl:!!navigator.serviceWorker.controller,caches:await caches.keys()};});
 await p.waitForTimeout(2500);
 let s=await ready();R('A1 SW terdaftar & aktif (hostname localhost)',s);
 if(!s.ctrl){await p.reload();await p.waitForTimeout(1500);s=await ready();R('A1b setelah reload',s);}
 R('A2 isi cache precache',await p.evaluate(async()=>{const k=(await caches.keys())[0];const c=await caches.open(k);return (await c.keys()).map(r=>r.url.replace(location.origin,''));}));

 const offBoot=async(label)=>{await ctx.setOffline(true);let o;try{await p.reload();await p.waitForFunction(()=>typeof D==='object'&&typeof showPage==='function'&&getComputedStyle(document.getElementById('mainApp')).display!=='none',null,{timeout:12000});o={boot:true};}catch(e){o={boot:false,err:e.message.slice(0,90)};}await ctx.setOffline(false);R(label,o);return o;};
 await offBoot('B0 first-install: offline reload SEBELUM ada load online yang dikontrol SW');
 await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await p.waitForTimeout(1500);
 R('B1a cache setelah 1x load online dikontrol SW',await p.evaluate(async()=>{const k=(await caches.keys())[0];return (await (await caches.open(k)).keys()).map(r=>r.url.replace(location.origin,'')).filter(u=>/\?v=/.test(u)).slice(0,6);}));
 await offBoot('B1 offline reload setelah >=1 load online dikontrol SW');
 await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await p.waitForTimeout(800);
 // update versi SW (deploy baru: cache lama dihapus saat activate)
 SWVER='9999';await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await p.waitForTimeout(3500);
 R('B2a setelah update SW (tab terbuka): cache',await p.evaluate(async()=>{const ks=await caches.keys();const o={};for(const k of ks)o[k]=(await (await caches.open(k)).keys()).length;return {o,notice:!!document.getElementById('pwaUpdateNotice')};}));
 await offBoot('B2 offline reload tepat setelah update SW (sebelum load online baru)');
 await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await p.waitForTimeout(1200);
 await offBoot('B3 offline reload setelah 1x load online pasca-update');
 R('errors',errs);await br.close();srv.close();})().catch(e=>{console.error('ERR',e.message);process.exit(2);});
