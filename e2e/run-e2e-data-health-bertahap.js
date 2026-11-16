const fs=require('fs'),path=require('path'),http=require('http');
/**
 * e2e/run-e2e-data-health-bertahap.js — uji browser nyata (Chromium headless, viewport HP 390px) untuk modal
 * "Hasil Pemindaian Data": tampilan bertahap (ciut/buka), batas 100 kartu per grup, urutan error, aksi perbaikan
 * dgn render ulang, reset state saat modal ditutup. Data uji SINTETIS di dalam halaman (tidak membaca data pribadi).
 * Prasyarat: bundle sudah dibangun (node scripts/build.js). Jalankan: node e2e/run-e2e-data-health-bertahap.js
 * Opsi env: E2E_ROOT (root repo), E2E_CHROME (path chrome), SHOT_DIR (folder tangkapan layar; default os.tmpdir()).
 */
let chromium;try{({chromium}=require('playwright'));}catch(_e){({chromium}=require('/opt/npm-tools/node_modules/playwright'));}
const os=require('os');
const ROOT=path.resolve(process.env.E2E_ROOT||path.join(__dirname,'..'));
const SHOT=process.env.SHOT_DIR||os.tmpdir();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf');}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
const res=[];const ck=(n,ok,d)=>{res.push({n,ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,220):''));};
(async()=>{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${srv.address().port}/index.html`;
const br=await chromium.launch({headless:true,executablePath:process.env.E2E_CHROME||'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'});
const ctx=await br.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,200)));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160));});
const ev=(f,a)=>p.evaluate(f,a);const sleep=ms=>p.waitForTimeout(ms);
await p.goto(base);await p.waitForFunction(()=>typeof D==='object'&&typeof showPage==='function');
await ev(()=>{localStorage.setItem('kw_v4',JSON.stringify(D));localStorage.setItem('kw_setup','1');});
await p.goto(base);await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(800);
// --- seed data uji (sintetis) ---
await ev(()=>{
 window.askConfirm=async()=>true;
 D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:1000000,balance:1000000,includeInBalance:true,jenis:'tunai',ownership:{type:'SELF'}}];
 D.vehicles=[{id:'v1',name:'Motor A'},{id:'v2',name:'Motor B'}];
 D.sparepartCats=[{id:'c1',vehicleId:'v2',name:'Rem'}];
 D.servisLogs=[];D.preorders=[];D.transactions=[];D.bbmLogs=[];
 for(let i=0;i<120;i++)D.servisLogs.push({id:'o'+i,item:'Oli '+i,categoryId:'zzz'+i,vehicleId:'v1',date:'2026-01-01'});
 for(let i=0;i<2;i++)D.servisLogs.push({id:'w'+i,item:'Rem '+i,categoryId:'c1',vehicleId:'v1',date:'2026-01-01'});
 for(let i=0;i<7;i++)D.preorders.push({id:'p'+i,productId:'x'+i,status:'open'});
 D.transactions.push({id:1700000000001,date:'2026-01-01',type:'expense',amount:1000.5,category:'Makan',accountId:'a1',note:'pecahan'});
 window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};
});
// --- buka modal lewat jalur produksi (lazy loader) ---
const t0=Date.now();
await ev(async()=>{if(typeof ensureDataHealthScripts==='function')await ensureDataHealthScripts();runDataHealthCheck();});
await sleep(600);
const st=await ev(()=>{
 const m=document.getElementById('dataHealthModal'),list=document.getElementById('dataHealthList');
 const cards=[...list.querySelectorAll('div[style*="padding:10px"]')];
 const vis=c=>!c.hidden&&c.getBoundingClientRect().height>0;
 return {open:m.classList.contains('open'),summary:document.getElementById('dataHealthSummary').innerText,
  total:cards.length,visible:cards.filter(vis).length,hiddenN:cards.filter(c=>c.hidden).length,
  firstCardIsError:cards[0]&&cards[0].innerText.trim().startsWith('❌'),
  heads:[...list.querySelectorAll('[data-dh-head]')].map(h=>h.innerText.replace(/\s+/g,' ')),
  note:(list.querySelector('[data-dh-note]')||{}).innerText||null,
  visTitles:cards.filter(vis).map(c=>c.innerText.split('\n')[0].trim()),overflowX:m.scrollWidth>m.clientWidth+1,docOverflow:document.documentElement.scrollWidth>window.innerWidth+1};});
console.log('--- fase 1: modal terbuka');
ck('modal terbuka (class open)',st.open);
ck('ringkasan BUKAN "sehat" & menghitung error+peringatan',!/Tidak ditemukan/.test(st.summary)&&/error/.test(st.summary)&&/peringatan/.test(st.summary),st.summary.slice(0,120));
ck('error tampil paling atas',st.firstCardIsError);
ck('2 tombol header grup (orphan servis 120, preorder 7)',st.heads.length===2,st.heads);
ck('cap: grup 120 dirender 100 + catatan',/Menampilkan 100 dari 120/.test(st.note||''),st.note);
ck('kartu di DOM = 2 error + 2 kendaraan + 1 pecahan + 100 (cap) + 7 = 112',st.total===112,st.total);
ck('kartu TERLIHAT awal = 2 error + 3 peringatan tak-bergrup (5); 107 tersembunyi',st.visible===5&&st.hiddenN===107,{visible:st.visible,hidden:st.hiddenN});
ck('tanpa overflow horizontal di layar 390px',!st.overflowX&&!st.docOverflow);
await p.screenshot({path:SHOT+'/1-awal-ciut.png'});
// --- ketuk header grup preorder (grup kecil) ---
console.log('--- fase 2: toggle dengan ketukan nyata');
const scr0=await ev(()=>{const l=document.getElementById('dataHealthList');let e=l;while(e&&!(e.scrollHeight>e.clientHeight+2&&/auto|scroll/.test(getComputedStyle(e).overflowY)))e=e.parentElement;window._sc=e;return e?e.scrollTop:-1;});
const preHead=p.locator('[data-dh-head]',{hasText:'Preorder'});
await preHead.scrollIntoViewIfNeeded();await preHead.tap();await sleep(300);
const a=await ev(()=>{const l=document.getElementById('dataHealthList');const h=[...l.querySelectorAll('[data-dh-head]')].find(x=>/Preorder/.test(x.innerText));
 const idx=h.getAttribute('data-dh-head');const g=[...l.querySelectorAll('[data-dh-grp="'+idx+'"]')];
 return {aria:h.getAttribute('aria-expanded'),label:h.innerText.replace(/\s+/g,' '),vis:g.filter(c=>!c.hidden&&c.getBoundingClientRect().height>0).length,n:g.length,toast:window._t.slice(-1)[0]||null};});
ck('ketuk "Lihat detail" → 7 kartu preorder terlihat, aria-expanded=true',a.aria==='true'&&a.vis===7&&/Sembunyikan/.test(a.label),a);
ck('toggle TIDAK menampilkan toast "belum berfungsi" (dispatcher ter-resolve)',!/belum berfungsi/i.test(a.toast||''),a.toast);
await p.screenshot({path:SHOT+'/2-preorder-terbuka.png'});
await preHead.tap();await sleep(300);
const b=await ev(()=>{const h=[...document.querySelectorAll('[data-dh-head]')].find(x=>/Preorder/.test(x.innerText));return {aria:h.getAttribute('aria-expanded'),vis:[...document.querySelectorAll('[data-dh-grp="'+h.getAttribute('data-dh-head')+'"]')].filter(c=>c.getBoundingClientRect().height>0).length};});
ck('ketuk lagi → ciut kembali (0 terlihat)',b.aria==='false'&&b.vis===0,b);
// --- buka grup preorder lalu jalankan aksi perbaikan nyata (pembulatan nominal) ---
console.log('--- fase 3: aksi perbaikan → render ulang, state bertahan');
await preHead.tap();await sleep(250);
const fixBtn=p.locator('#dataHealthList div[style*="padding:10px"]',{hasText:'Nominal pecahan'}).locator('button').first();
const hasFix=await fixBtn.count();
ck('kartu "Nominal pecahan" punya tombol perbaikan (kini terjangkau)',hasFix>0, hasFix?await fixBtn.innerText():null);
if(hasFix){await fixBtn.scrollIntoViewIfNeeded();await fixBtn.tap();await sleep(900);}
const c=await ev(()=>{const m=document.getElementById('dataHealthModal'),l=document.getElementById('dataHealthList');
 const h=[...l.querySelectorAll('[data-dh-head]')].find(x=>/Preorder/.test(x.innerText));
 const h2=[...l.querySelectorAll('[data-dh-head]')].find(x=>/categoryId orphan/.test(x.innerText));
 const pec=[...l.querySelectorAll('div[style*="padding:10px"]')].filter(x=>/Nominal pecahan/.test(x.innerText)).length;
 return {open:m.classList.contains('open'),preorderAria:h&&h.getAttribute('aria-expanded'),orphanAria:h2&&h2.getAttribute('aria-expanded'),pecahanLeft:pec,txAmt:D.transactions[0].amount,toast:window._t.slice(-2)};});
ck('modal tetap terbuka setelah perbaikan',c.open);
ck('kartu pecahan hilang & nominal jadi bulat',c.pecahanLeft===0&&Number.isInteger(c.txAmt),c);
ck('grup preorder yang dibuka TETAP terbuka setelah render ulang',c.preorderAria==='true',c.preorderAria);
ck('grup orphan servis yang tidak dibuka TETAP ciut',c.orphanAria==='false',c.orphanAria);
await p.screenshot({path:SHOT+'/3-setelah-perbaikan.png'});
// --- tutup & buka ulang: state direset ---
console.log('--- fase 4: tutup lalu buka ulang');
await ev(()=>{closeModal('dataHealthModal');});await sleep(300);
await ev(()=>{runDataHealthCheck();});await sleep(500);
const d=await ev(()=>{const h=[...document.querySelectorAll('[data-dh-head]')];return h.map(x=>x.getAttribute('aria-expanded'));});
ck('buka ulang modal → semua grup ciut lagi',d.length>0&&d.every(x=>x==='false'),d);
// --- performa render ---
const perf=await ev(()=>{const t=performance.now();runDataHealthCheck();return performance.now()-t;});
ck('render ulang 131 temuan < 500 ms',perf<500,Math.round(perf)+' ms');
ck('tanpa error JS / console error selama sesi',errs.length===0,errs);
const fail=res.filter(x=>!x.ok).length;console.log(`\nHASIL: ${res.length-fail}/${res.length} lolos`);
await br.close();srv.close();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e.message);process.exit(2);});
