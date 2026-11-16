const h=require('./harness');const seed=require('./seed');const fs=require('fs');
const SHOTS=process.env.SHOTS,TAG=process.env.TAG||'hp',MODE=process.env.MODE||'client';
const vp=TAG==='desktop'?{width:1280,height:720}:TAG==='hp360'?{width:360,height:800}:TAG==='hp412'?{width:412,height:915}:{width:390,height:844};
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok,d});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,260):''));};
const rp=s=>String(s).replace(/[^\d]/g,'');
(async()=>{
 let H=await h.start(vp,TAG!=='desktop');let {p,errs}=H;
 const ev=(f,a)=>p.evaluate(f,a),sleep=ms=>p.waitForTimeout(ms),shot=async n=>p.screenshot({path:`${SHOTS}/${TAG}-${n}.png`});
 // seed -> persist -> reload (boot nyata dgn data berisi)
 await p.evaluate(`(${seed[MODE==='client'?'seedClient':'seedPlain'].toString()})()`);
 await ev(async()=>{const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);await IDBStore.set('kw_v4_mirror',s);});
 await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(500);
 await ev(()=>{window.askConfirm=async()=>true;window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};});
 const go=async(tab,sub)=>{await ev(([t,s])=>{showPage('keuangan');setKeuanganTab(t);if(s)setKelolaTab(s);},[tab,sub]);await sleep(500);};
 const noOverflow=async(n)=>{const o=await ev(()=>({doc:document.documentElement.scrollWidth-window.innerWidth,body:document.body.scrollWidth-window.innerWidth}));ck(n+': tanpa overflow horizontal',o.doc<=1&&o.body<=1,o);};
 const hasEngine=await ev(()=>typeof renovClientFundState==='function'&&typeof saldoPribadi==='function');
 if(MODE==='client'){
  ck('A1 mesin dana klien sudah dimuat saat app tampil (boot langsung dgn proyek klien)',hasEngine);
  // ---- Dashboard / Beranda
  await ev(()=>showPage('dashboard-hub'));await sleep(700);await shot('01-beranda');
  const d1=await ev(()=>({sal:document.getElementById('dashHubHeroSaldo').innerText,inc:document.getElementById('dashHubHeroInc').innerText,exp:document.getElementById('dashHubHeroExp').innerText,hub:document.getElementById('page-dashboard-hub').innerText}));
  ck('B1 Hub: Saldo Semua Akun = saldo PRIBADI 2.500.000 (konsisten dgn Masuk/Keluar hub)',rp(d1.sal)==='2500000'&&rp(d1.inc)==='3000000'&&rp(d1.exp)==='500000',d1);
  const hk=await ev(()=>({n:(document.getElementById('dashHubHeroKlien')||{}).innerText||null}));
  ck('B3 Hub: catatan "Belum termasuk dana klien tertahan 800.000 · Saldo fisik 3.300.000"',/800\.000/.test(hk.n||'')&&/3\.300\.000/.test(hk.n||''),hk);
  await shot('01b-hub-catatan');
  ck('B2 Hub: kartu Kekayaan Bersih memakai kas pribadi 2.500.000',/Kekayaan Bersih[\s\S]{0,40}Rp 2\.500\.000/.test(d1.hub));
  await noOverflow('Beranda');
  // ---- Keuangan > Kelola > Ringkasan
  await go('kelola','ringkasan');await shot('02-kelola-ringkasan');
  const k=await ev(()=>({inc:mIncome.innerText,exp:mExpense.innerText,net:mNet.innerText,txt:document.getElementById('page-keuangan').innerText}));
  ck('C1 ringkasan bulan: Pemasukan 3.000.000 (DP klien dikeluarkan)',rp(k.inc)==='3000000',k.inc);
  ck('C2 ringkasan bulan: Pengeluaran 500.000 (biaya proyek dikeluarkan)',rp(k.exp)==='500000',k.exp);
  ck('C3 ringkasan bulan: Saldo bersih 2.500.000',rp(k.net)==='2500000',k.net);
  await noOverflow('Kelola');
  // tombol kartu ringkasan: klik Pemasukan => daftar terfilter
  await ev(()=>{[...document.querySelectorAll('#page-keuangan [data-action="showFilteredTx"]')][0].click();});await sleep(500);await shot('03-filter-pemasukan');
  const fm=await ev(()=>{const m=[...document.querySelectorAll('.overlay.open,.modal.open')].map(x=>x.id);return {open:m,txt:(document.querySelector('.overlay.open')||document.body).innerText.slice(0,400)};});
  ck('C4 klik kartu Pemasukan membuka daftar terfilter (tanpa error)',fm.open.length>0,fm.open);
  await ev(()=>{document.querySelectorAll('.overlay.open').forEach(o=>closeModal(o.id));});await sleep(200);
  // ---- Transaksi: daftar tetap memuat semua transaksi (txM tidak berubah)
  await go('kelola','transaksi');await sleep(300);await shot('04-transaksi');
  const tl=await ev(()=>document.getElementById('page-keuangan').innerText);
  ck('C5 daftar transaksi TETAP memuat DP klien & biaya proyek (tidak diubah)',/Rumah Pak Budi - DP|DP/.test(tl)&&/Keramik proyek|Keramik/.test(tl));
  // ---- Akun
  await go('akun');await sleep(400);await shot('05-akun');
  const a=await ev(()=>({txt:document.getElementById('page-keuangan').innerText,cat:(document.getElementById('accGridTotalKlien')||document.querySelector('[id*="TotalKlien"]')||{}).innerText||null,ids:[...document.querySelectorAll('[id*="Klien"]')].map(x=>x.id+':'+x.innerText.slice(0,120))}));
  ck('D1 halaman Akun: catatan "dana klien tertahan" + saldo pribadi',/dana klien tertahan/i.test(a.txt)&&/2\.500\.000/.test(a.txt)&&/800\.000/.test(a.txt),a.ids);
  ck('D2 halaman Akun: lencana "Memuat dana klien" pada kartu akun',/memuat dana klien/i.test(a.txt));
  ck('D3 halaman Akun: total fisik 3.300.000 tampil',/3\.300\.000/.test(a.txt));
  await noOverflow('Akun');
  // ---- Laporan + basis
  await go('laporan');await sleep(500);await shot('06-laporan');
  const l1=await ev(()=>({tot:lapAccTotal.innerText,note:(document.getElementById('lapAccTotalKlien')||{}).innerText||null,basis:[...document.querySelectorAll('[data-lap-basis]')].map(b=>b.getAttribute('data-lap-basis')+':'+b.innerText.trim()),txt:document.getElementById('page-keuangan').innerText}));
  ck('E1 Laporan: total akun FISIK 3.300.000 + catatan dana klien',rp(l1.tot)==='3300000'&&/800\.000/.test(l1.note||''),{tot:l1.tot,note:l1.note});
  ck('E2 Laporan: ada tombol basis Pribadi/Fisik',l1.basis.length>=2,l1.basis);
  if(l1.basis.length>=2){
   const num=async()=>ev(()=>{const t=document.getElementById('page-keuangan').innerText;return t;});
   await ev(()=>document.querySelector('[data-lap-basis="fisik"]').click());await sleep(500);await shot('07-laporan-fisik');
   const fis=await ev(()=>({inc:(document.querySelector('#laporanTab-ringkasan,#page-keuangan')||{}).innerText.length,sel:[...document.querySelectorAll('[data-lap-basis]')].map(b=>b.className+'|'+b.getAttribute('aria-pressed'))}));
   await ev(()=>document.querySelector('[data-lap-basis="pribadi"]').click());await sleep(500);
   const bp=await ev(()=>({sel:[...document.querySelectorAll('[data-lap-basis]')].map(b=>b.className+'|'+b.getAttribute('aria-pressed')),b:getLapBasis()}));
   ck('E3 klik basis Fisik lalu Pribadi: state berpindah & render ulang tanpa error',bp.b==='pribadi',{fis,bp});
  }
  await noOverflow('Laporan');
  // ---- Kekayaan Bersih (Keuangan > Kelola > Ringkasan)
  await go('kelola','ringkasan');await sleep(400);
  const kb=await ev(()=>({lbl:document.getElementById('kbSaldoAkun').previousElementSibling?document.getElementById('kbSaldoAkun').previousElementSibling.textContent:null,val:kbSaldoAkun.innerText,note:(document.getElementById('kbSaldoAkunNote')||{}).innerText||null,nw:kbNetWorth.innerText}));
  ck('F1 kartu Kekayaan Bersih: label "Saldo Akun (pribadi)" + "belum termasuk 800.000 dana klien" + nilai 2.500.000',/\(pribadi\)/.test(kb.lbl||'')&&/800\.000/.test(kb.note||'')&&rp(kb.val)==='2500000',kb);
  await shot('06b-kekayaan-bersih');
  // ---- Renovasi
  await go('asetproyek');await sleep(600);await shot('08-renovasi-list');
  const r1=await ev(()=>({list:renovList.innerText,btns:[...renovList.querySelectorAll('button,[data-action]')].map(b=>b.getAttribute('data-action')+':'+b.innerText.replace(/\s+/g,' ').slice(0,20))}));
  ck('G1 daftar proyek renovasi memuat "Rumah Pak Budi"',/Rumah Pak Budi/.test(r1.list),r1.btns.slice(0,8));
  await ev(()=>{const b=renovList.querySelector('[data-action="Renov.openDetail"]');if(b)b.click();});await sleep(600);await shot('09-renovasi-detail');
  const det=await ev(()=>{const m=document.getElementById('renovDetailModal');return {open:m&&m.classList.contains('open'),txt:m?m.innerText:'',acts:m?[...m.querySelectorAll('[data-action]')].map(b=>b.getAttribute('data-action')+' '+(b.getAttribute('data-args')||'')+' | '+b.innerText.replace(/\s+/g,' ').slice(0,25)):[]};});
  ck('G2 detail proyek terbuka; panel Arus Dana Proyek tampil (status HIJAU/dana tertahan)',det.open&&/Dana Proyek|dana tertahan|Tertahan/i.test(det.txt),det.txt.slice(0,300));
  console.log('   aksi di detail:',JSON.stringify(det.acts.slice(0,30)));
  ck('G3 tombol laba tersedia: Tandai selesai',det.acts.some(x=>/openLabaAksi.*selesai/.test(x)),det.acts.filter(x=>/Laba/.test(x)));
  // Tandai selesai via UI
  await ev(()=>{const m=document.getElementById('renovDetailModal');const b=[...m.querySelectorAll('[data-action="Renov.openLabaAksi"]')].find(x=>/selesai/.test(x.getAttribute('data-args')));if(b)b.click();});await sleep(500);await shot('10-modal-selesai');
  await ev(()=>{document.getElementById('renovLabaAllCost').checked=true;});
  await ev(()=>{const b=document.querySelector('[data-action="Renov.submitLaba"]');b.click();});await sleep(600);
  const st1=await ev(()=>{const p=D.renovProjects[0];return {status:p.status,at:!!p.atestasi,t:window._t.slice(-2)};});
  ck('G4 UI "Tandai selesai" + atestasi tersimpan',st1.status==='selesai'&&st1.at,st1);
  // Akui laba 800.000
  await ev(()=>{const m=document.getElementById('renovDetailModal');const b=[...m.querySelectorAll('[data-action="Renov.openLabaAksi"]')].find(x=>/akui/.test(x.getAttribute('data-args')));if(b)b.click();});await sleep(500);
  const mx=await ev(()=>({v:(document.getElementById('renovLabaAmount')||{}).value,max:(document.getElementById('renovLabaAmount')||{}).max}));
  ck('G5 modal Akui Laba: batas pengakuan 800.000 (bukti status HIJAU & fix renovAkunTitipan)',mx.max==='800000',mx);await shot('11-modal-akui');
  await ev(()=>document.querySelector('[data-action="Renov.submitLaba"]').click());await sleep(600);
  // Cairkan
  await ev(()=>{const m=document.getElementById('renovDetailModal');const b=[...m.querySelectorAll('[data-action="Renov.openLabaAksi"]')].find(x=>/cairkan/.test(x.getAttribute('data-args')));if(b)b.click();});await sleep(500);
  const bf=await ev(()=>({inc:null}));
  await ev(()=>document.querySelector('[data-action="Renov.submitLaba"]').click());await sleep(700);await shot('12-setelah-pencairan');
  const led=await ev(()=>({l:D.renovProjects[0].labaLedger.map(e=>e.tipe+':'+e.jumlah),t:window._t.slice(-3)}));
  ck('G6 ledger: akui 800000 lalu cairkan 800000',JSON.stringify(led.l)==='["akui:800000","cairkan:800000"]',led);
  await ev(()=>{document.querySelectorAll('.overlay.open').forEach(o=>closeModal(o.id));});await sleep(300);
  // dampak setelah pencairan
  await go('kelola','ringkasan');await sleep(400);await shot('13-ringkasan-setelah');
  const k2=await ev(()=>({inc:mIncome.innerText,exp:mExpense.innerText,net:mNet.innerText}));
  ck('H1 setelah pencairan: Pemasukan bulan 3.800.000, Pengeluaran 500.000, Bersih 3.300.000',rp(k2.inc)==='3800000'&&rp(k2.exp)==='500000'&&rp(k2.net)==='3300000',k2);
  await go('akun');await sleep(300);
  const a2=await ev(()=>document.getElementById('page-keuangan').innerText);
  ck('H2a Akun: catatan "dana klien tertahan" hilang setelah pencairan penuh',!/dana klien tertahan/i.test(a2)&&!(await ev(()=>document.getElementById('accGridTotalKlien'))));
  ck('H2b Akun: lencana kartu hilang bila dana tertahan = 0',!/memuat dana klien/i.test(a2),a2.split('\n').filter(l=>/klien/i.test(l)));
  await shot('13b-akun-setelah-pencairan');
  await ev(()=>showPage('dashboard-hub'));await sleep(500);
  ck('H2c Hub: catatan dana klien hilang setelah pencairan penuh',await ev(()=>!document.getElementById('dashHubHeroKlien')));
  // batal cairkan -> kembali
  await ev(()=>{const p=D.renovProjects[0];const e=p.labaLedger.find(x=>x.tipe==='cairkan');Renov.batalCairkan&&Renov.batalCairkan(p.id,e.id);});await sleep(500);
  const bc=await ev(()=>({l:D.renovProjects[0].labaLedger.map(e=>e.tipe),pr:saldoPribadi()}));
  ck('H3 batal pencairan (ledger append-only): entri batal-cairkan ada',bc.l.includes('batal-cairkan'),bc);
  // pulihkan data untuk uji lanjut: tambahkan pencairan lagi
  await ev(()=>{const p=D.renovProjects[0];renovCairkanLaba(p,800000,{kunci:'ulang-1'});});
  // ---- Pajak PPh21 (pencairan bulan ini 800.000 harus ikut; DP 2.000.000 tidak)
  await ev(()=>{showPage('pajak');setPajakTab('pajak');setPjkTab('pph21');});await sleep(500);await shot('14-pph21');
  await ev(()=>document.querySelector('[data-action="isiPPhDariTransaksi"]').click());await sleep(500);
  const pph=await ev(()=>({bruto:document.getElementById('pphBruto').value,toast:window._t.slice(-1)[0]}));
  ck('I1 PPh21 tombol "Isi dari Rata-rata": bruto = (gaji 3.000.000 + pencairan 800.000) = 3.800.000, DP tidak dihitung',rp(pph.bruto)==='3800000',pph);
  await noOverflow('PPh21');
  // Zakat penghasilan (tidak disentuh patch) - amati apakah DP klien ikut
  await ev(()=>setPajakTab('zakat'));await sleep(400);
  await ev(()=>{const b=document.querySelector('[data-action="hitungZakatPenghasilan"]');if(b)b.click();});await sleep(500);await shot('15-zakat');
  const zk=await ev(()=>{const t=document.getElementById('page-pajak').innerText;const m=t.match(/Penghasilan Bulan Ini[^\n]*\n[^\n]*/);return {m:m&&m[0],all:t.split('\n').filter(l=>/Rp\s?[\d.]{7,}/.test(l)).slice(0,8)};});
  console.log('   zakat penghasilan (observasi):',JSON.stringify(zk));
  // ---- Budget
  await go('budget');await sleep(500);await shot('16-budget');
  const bg=await ev(()=>document.getElementById('page-keuangan').innerText);
  ck('J1 Budget Makan: terpakai 500.000 dari 2.000.000 (belanja proyek tidak ikut)',/500\.000/.test(bg)&&/2\.000\.000/.test(bg)&&!/1\.700\.000/.test(bg)&&!/1\.200\.000/.test(bg.replace(/Keramik[^\n]*/,'')),bg.split('\n').filter(l=>/Makan|terpakai|%/i.test(l)).slice(0,6));
  await noOverflow('Budget');
  // ---- Tagihan & Piutang/Utang & Aset: render tanpa error
  for(const t of ['tagihan','utangpiutang','asetproyek','kelola']){await go(t);await sleep(350);await noOverflow('Tab '+t);}
  // ---- Data Health Check dgn akun tertaut aset memuat dana klien
  await ev(()=>{D.assets=D.assets||[];D.assets.push({id:'as1',name:'Rumah Uji',kategori:'Properti',nilai:100000000,accountId:'a1'});save();});
  await go('akun');await sleep(500);await shot('17-akun-tertaut');
  const w=await ev(()=>({warn:(document.getElementById('accGridTautKlienWarn')||{}).innerText||null}));
  ck('K1 Akun: peringatan merah "Akun tertaut aset memuat dana klien" tampil',/tertaut aset memuat dana klien/i.test(w.warn||''),w);
  await ev(async()=>{await ensureDataHealthScripts();runDataHealthCheck();});await sleep(700);await shot('18-datahealth');
  const dh=await ev(()=>{const m=document.getElementById('dataHealthModal');const l=document.getElementById('dataHealthList');return {open:m.classList.contains('open'),sum:document.getElementById('dataHealthSummary').innerText,cards:[...l.querySelectorAll('div[style*="padding:10px"]')].map(c=>c.innerText.replace(/\s+/g,' ').slice(0,140)),acts:[...l.querySelectorAll('[data-action]')].map(b=>b.getAttribute('data-action')+' '+(b.getAttribute('data-args')||'')+'|'+b.innerText.trim().slice(0,24))};});
  ck('K2 Data Health Check: modal terbuka & kartu "Akun tertaut aset memuat dana klien" + tombol Buka Akun',dh.open&&dh.cards.some(c=>/tertaut aset memuat dana klien/i.test(c))&&dh.acts.some(x=>/openAccModal/.test(x)),dh);
  await ev(()=>{const b=[...document.querySelectorAll('#dataHealthList [data-action="openAccModal"]')][0];if(b)b.click();});await sleep(600);await shot('19-buka-akun-dari-health');
  const om=await ev(()=>({m:[...document.querySelectorAll('.overlay.open,.modal.open')].map(x=>x.id)}));
  ck('K3 tombol "Buka Akun" dari Data Health membuka modal akun',om.m.some(x=>/acc/i.test(x)),om);
  await ev(()=>{document.querySelectorAll('.overlay.open').forEach(o=>closeModal(o.id));});
  // ---- Sapuan tombol: klik semua tombol aman di halaman utama, tangkap error / toast "belum berfungsi"
  const risky=/delete|hapus|reset|clear|import|export|backup|restore|logout|keluar|wipe|archive|arsip|share|scan|google|pin|hapusSemua|ganti|upload|download|print|pdf|xlsx|csv|install|reload|cache/i;
  for(const pg of ['dashboard-hub','keuangan','pajak','aset','settings','ai']){
   await ev(([x])=>{showPage(x);},[pg]);await sleep(500);
   const acts=await ev(([x,rs])=>{const re=new RegExp(rs,'i');return [...document.querySelectorAll('#page-'+x+' [data-action]')].filter(b=>b.getBoundingClientRect().width>0&&!re.test(b.getAttribute('data-action')+(b.getAttribute('data-args')||'')+b.innerText)).map(b=>b.getAttribute('data-action')+' '+(b.getAttribute('data-args')||''));},[pg,risky.source]);
   let n=0,bad=[];
   for(let i=0;i<acts.length;i++){
    const before=errs.length;
    const r=await ev(([x,key,rs])=>{const re=new RegExp(rs,'i');window._t=[];const b=[...document.querySelectorAll('#page-'+x+' [data-action]')].filter(b=>b.getBoundingClientRect().width>0&&!re.test(b.getAttribute('data-action')+(b.getAttribute('data-args')||'')+b.innerText)).find(b=>(b.getAttribute('data-action')+' '+(b.getAttribute('data-args')||''))===key);if(!b)return {skip:true};try{b.click();}catch(e){return {err:String(e)};}return {t:window._t.slice()};},[pg,acts[i],risky.source]);
    await sleep(120);n++;
    const tt=(r.t||[]).filter(m=>/belum berfungsi|tidak dikenal|undefined|NaN|gagal/i.test(m));
    if(r.err||tt.length||errs.length>before)bad.push({a:acts[i].slice(0,60),r:r.err||tt,e:errs.slice(before)});
    await ev(()=>{document.querySelectorAll('.overlay.open').forEach(o=>{try{closeModal(o.id);}catch(e){}});});
    await ev(([x])=>{if(!document.getElementById('page-'+x).classList.contains('active'))showPage(x);},[pg]);
   }
   ck('L sapuan tombol halaman '+pg+': '+n+' kontrol diklik, 0 error/toast rusak',bad.length===0,bad.slice(0,4));
  }
 } else {
  ck('A1 tanpa proyek klien: mesin dana klien TIDAK dimuat saat boot',hasEngine===false);
  await go('akun');await sleep(400);await shot('05-akun-plain');
  const a=await ev(()=>document.getElementById('page-keuangan').innerText);
  ck('P1 tanpa proyek klien: tidak ada catatan/lencana dana klien (tampilan identik)',!/dana klien/i.test(a));
  await go('kelola','ringkasan');
  const k=await ev(()=>({inc:mIncome.innerText,exp:mExpense.innerText,net:mNet.innerText}));
  ck('P2 ringkasan bulan 3.000.000 / 500.000 / 2.500.000',rp(k.inc)==='3000000'&&rp(k.exp)==='500000'&&rp(k.net)==='2500000',k);
  await ev(()=>showPage('dashboard-hub'));await sleep(500);
  const kb=await ev(()=>/Saldo Akun \(pribadi\)|belum termasuk/.test(document.body.innerText));
  ck('P3b Hub tanpa proyek klien: tidak ada catatan',await ev(()=>!document.getElementById('dashHubHeroKlien')));
  ck('P3 tanpa proyek klien: label Kekayaan Bersih tetap "Saldo Akun"',!kb);
  const still=await ev(()=>typeof renovClientFundState);
  ck('P4 mesin tetap tidak dimuat setelah menjelajah Keuangan & Beranda',still==='undefined',still);
 }
 const e=H.errs;ck('Z tanpa error JS/console selama sesi '+TAG+'/'+MODE,e.length===0,e);
 fs.writeFileSync(`${SHOTS}/result-${TAG}-${MODE}.json`,JSON.stringify(res,null,1));
 console.log(`HASIL ${TAG}/${MODE}: ${res.filter(r=>r.ok).length}/${res.length}`);
 await H.close();
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
