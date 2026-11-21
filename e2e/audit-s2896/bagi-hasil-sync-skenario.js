// AUDIT-ONLY (tidak mengubah source). Jalankan: BACKUP=<backup.json> node e2e/audit-s2896/bagi-hasil-sync-skenario.js
// Audit poin 4 (read-only terhadap source): perilaku sinkron utang bagi hasil di luar peristiwa laba/bhSave. Backup dari env, tidak ditulis.
process.env.ROOT=require('path').resolve(process.env.ROOT||require('path').join(__dirname,'..','..'));
const h=require('../dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const out=[];const R=(k,v)=>{out.push([k,v]);console.log(k,'=>',JSON.stringify(v).slice(0,400));};
(async()=>{const H=await h.start({width:390,height:844},true);const p=H.p,ev=(f,a)=>p.evaluate(f,a),sleep=ms=>p.waitForTimeout(ms);
 const boot=async()=>{await ev(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);await ev(()=>{window.askConfirm=async()=>true;});};
 await boot();
 R('engine renov dimuat saat boot?',await ev(()=>typeof renovTandaiSelesai));
 await ev(async()=>{try{if(typeof ensureKlienEngineSafe==='function')ensureKlienEngineSafe();}catch(e){void e;}for(let i=0;i<40&&typeof renovTandaiSelesai!=='function';i++)await new Promise(r=>setTimeout(r,250));});
 R('engine renov setelah ensureKlienEngineSafe',await ev(()=>typeof renovTandaiSelesai));
 const PID='1794663148350';
 const st=()=>ev(id=>{const pr=D.renovProjects.find(x=>String(x.id)===id);const d=(D.debts||[]).filter(x=>String(x.renovBagiProjectId)===id);return{debts:d.map(x=>({n:x.name,v:x.nilai,l:!!x.lunas})),owners:(pr.bagiHasil.owners||[]).map(o=>o.ownerName),diakui:renovLabaSummary(pr).labaDiakuiBersih,koreksi:renovLabaSummary(pr).koreksiDiperlukan,ledger:(pr.labaLedger||[]).length};},PID);
 // siapkan: selesai + akui penuh (jalur normal -> utang terbentuk)
 await ev(id=>{const pr=D.renovProjects.find(x=>String(x.id)===id);renovTandaiSelesai(pr,{semuaBiayaTercatat:true});renovAkuiLaba(pr,renovLabaSummary(pr).bisaAkui,{kunci:'a1'});},PID);
 R('S0 normal setelah akui penuh',await st());
 // S1: data "lama": ledger ada, utang tidak ada (mis. restore backup/ Drive dari sebelum patch). Simpan, boot ulang
 await ev(async id=>{D.debts=D.debts.filter(x=>String(x.renovBagiProjectId)!==id);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);await IDBStore.set('kw_v4_mirror',s);},PID);
 await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1500);
 R('S1 engine renov dimuat setelah boot ulang (tanpa membuka Renovasi)?',await ev(()=>typeof renovSyncBagiHasilUtang));
 await ev(async()=>{try{ensureKlienEngineSafe();}catch(e){void e;}for(let i=0;i<40&&typeof renovLabaSummary!=='function';i++)await new Promise(r=>setTimeout(r,250));});
 R('S1 boot ulang: ledger ada, utang dihapus',await st());
 const card=await ev(async()=>{showPage('keuangan');setKeuanganTab('laporan');setLaporanTab('titipan');await new Promise(r=>setTimeout(r,700));return [...document.querySelectorAll('#danaTitipanTabList [id^=titipanOwnerCard_]')].map(x=>x.textContent.replace(/\s+/g,' ').slice(0,120));});
 R('S1 kartu titipan',card);
 R('S1 Data Health menyebut bagi hasil?',await ev(async()=>{try{await ensureDataHealthScripts();runDataHealthCheck();await new Promise(r=>setTimeout(r,700));return /bagi hasil/i.test(document.getElementById('dataHealthList').innerText);}catch(e){return 'ERR '+e.message;}}));
 await ev(()=>{document.querySelectorAll('.overlay.open').forEach(o=>closeModal(o.id));});
 // S1b: pulih lewat peristiwa berikutnya (akui kecil tidak mungkin: sudah penuh) -> koreksi 1 lalu akui 1
 R('S1b pulih via koreksi+akui',await ev(id=>{const pr=D.renovProjects.find(x=>String(x.id)===id);const a=renovKoreksiLaba(pr,1,{catatan:'uji',kunci:'k1'});const b=renovAkuiLaba(pr,1,{kunci:'a2'});return{a:a.ok,b:b.ok,debts:(D.debts||[]).filter(x=>String(x.renovBagiProjectId)===id).map(x=>x.v)};},PID));
 // S3: rename pemilik penerima
 const oid=await ev(id=>String(D.renovProjects.find(x=>String(x.id)===id).bagiHasil.owners.find(o=>!o.isSelf).ownerId),PID);
 R('S3 rename home in -> home out',await ev(([id,o])=>{const r=OwnerRegistry.rename(o,'home out');return {r:r&&r.ok,debts:(D.debts||[]).filter(x=>String(x.renovBagiProjectId)===id).map(x=>x.name),owners:D.renovProjects.find(x=>String(x.id)===id).bagiHasil.owners.map(x=>x.ownerName)};},[PID,oid]));
 R('S3b setelah sync berikutnya (koreksi 1 + akui 1)',await ev(id=>{const pr=D.renovProjects.find(x=>String(x.id)===id);renovKoreksiLaba(pr,1,{catatan:'u',kunci:'k2'});renovAkuiLaba(pr,1,{kunci:'a3'});return{debts:(D.debts||[]).filter(x=>String(x.renovBagiProjectId)===id).map(x=>x.name),owners:pr.bagiHasil.owners.map(x=>x.ownerName)};},PID));
 // S4: hapus pemasukan DP setelah laba diakui
 R('S4 hapus DP income setelah akui',await ev(async id=>{const pr=D.renovProjects.find(x=>String(x.id)===id);const tx=D.transactions.find(t=>t.type==='income'&&String(t.renovDpProjectId)===id);const before=(D.debts||[]).filter(x=>String(x.renovBagiProjectId)===id).map(x=>x.nilai);try{await Promise.race([Renov.deleteDpIncome(id,tx.id),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout 6s (dialog konfirmasi?)')),6000))]);}catch(e){try{await Promise.race([delTx(tx.id),new Promise(r=>setTimeout(r,6000))]);}catch(e2){return 'ERR '+e.message+' / '+e2.message;}}await new Promise(r=>setTimeout(r,800));const sm=renovLabaSummary(pr);return{before,after:(D.debts||[]).filter(x=>String(x.renovBagiProjectId)===id).map(x=>x.nilai),status:sm.status,koreksi:sm.koreksiDiperlukan,diakui:sm.labaDiakuiBersih,labaMaks:sm.labaMaks};},PID));
 R('S4 Data Health / kartu menandai?',await ev(()=>{const t=document.body.innerText;return /Koreksi diperlukan/.test(t);}));
 R('errors',H.errs.filter(e=>!/ERR_NAME|Failed to load/.test(e)));
 await H.close();fs.writeFileSync('/tmp/audit4.json',JSON.stringify(out,null,1));})().catch(e=>{console.error('ERR',e);process.exit(2);});
