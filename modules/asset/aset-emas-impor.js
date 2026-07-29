// aset-emas-impor.js — FITUR BARU: GoldImport (impor massal nota emas via paste teks ATAU
// Dipindah ke modules/asset/aset-emas-impor.js (Sesi 9 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// upload file .xlsx rekap nota) & GoldZakat (rekap emas utk zakat maal + analisa harga/gram
// & untung-rugi).
// CARA PASANG (lihat juga INTEGRASI-EMAS.md):
//   1. Salin file ini ke folder proyek (sejajar dgn aset.js).
//   2. Di build.js, tambahkan 'aset-emas-impor.js' ke GROUP_A, TEPAT SETELAH 'aset.js'
//      (module ini pakai Aset.ICON, D.assets, parsePzNum, uid(), save(), toast(), dst yg
//      sudah didefinisikan di aset.js / features-helpers-global-security.js. Utk fitur
//      import .xlsx, pakai ensureXLSX() global yg sama dipakai Aset.exportXLSX/importXLSX
//      di aset.js & ShopExport/ImportShopExcel di cobek.js — TIDAK nambah pustaka baru).
//   3. Tambahkan 2 modal baru ke modals.js — markup ada di file goldModals.html. Tambahkan
//      juga tombol upload xlsx & input file tersembunyi di dalam goldImportModal (lihat
//      contoh markup di komentar atas GoldImport.openXLSXPicker di bawah).
//   4. Tambahkan tombol pembuka di halaman Buku Aset (lihat INTEGRASI-EMAS.md), mis:
//      <button class="btn btn-ghost btn-full btn-sm u-mb10" data-action="GoldImport.open">📋 Impor Nota Emas (Massal)</button>
//      <button class="btn btn-ghost btn-full btn-sm u-mb10" data-action="GoldZakat.open">🕌 Analisa Zakat Emas</button>
//   5. Jalankan `node build.js` seperti biasa supaya masuk ke app-bundle-a.min.js.
//
// FORMAT XLSX YANG DITERIMA (kolom dicari via NAMA HEADER, urutan kolom bebas, header lain
// selain daftar di bawah diabaikan — jadi file "rekap nota emas" hasil catatan manual bisa
// langsung dipakai tanpa harus disamakan persis dgn format Aset.exportXLSX):
//   Tanggal                              — tanggal nota (boleh cell Date Excel atau teks)
//   Toko (Staf)                          — nama toko/staf yg layani (opsional)
//   Atas Nama                            — nama pemilik/pembeli di nota (opsional)
//   Jenis Perhiasan & Spesifikasi Detail — dipakai deteksi jenis (Cincin/Kalung/dst)
//   Kadar (‰)                            — kadar per mil, mis. 750
//   Berat (gram)                         — berat fisik dari nota
//   Harga/gram (Rp)                      — opsional, dihitung dari Total÷Berat kalau kosong
//   Total Harga Riil (Rp)                — opsional, dihitung dari Berat×Harga/gram kalau kosong
// Baris tanpa Berat DAN tanpa Total (dua-duanya kosong/nol) dilewati (dianggap bukan nota,
// mis. baris "TOTAL" rekap atau baris kosong).
//
// DATA MODEL: setiap item emas hasil impor disimpan sbg entri biasa di D.assets dengan
// jenis:'Emas/Logam Mulia', zakatable:true (default), plus field tambahan khusus emas:
//   goldKadar        — kadar per mil (mis. 750, 700, 916, 999)
//   goldBeratGram     — berat fisik dari nota (gram, apa adanya di nota)
//   goldHargaPerGram  — harga per gram SESUAI KADAR itu (bukan disetarakan 24K)
//   goldJenis         — 'Cincin' | 'Kalung' | 'Gelang' | 'Anting' | 'Liontin' | 'Lainnya'
//   goldToko          — nama toko/atas nama di nota (opsional, buat referensi)
// Field goldKadar/goldBeratGram dipakai GoldZakat utk hitung total gram setara 24K.
// Aset lama (yg sudah ada sebelum fitur ini) yg jenisnya 'Emas/Logam Mulia' tapi TIDAK
// punya goldKadar/goldBeratGram tetap ikut dihitung ke total NILAI (nilai Rp), tapi
// tidak ikut dihitung ke total GRAM (krn kita tidak tahu beratnya) — GoldZakat kasih
// peringatan soal ini biar user sadar & bisa lengkapi manual kalau mau akurat.

const GoldImport={
parsed:[],
open(){
this.parsed=[];
const ta=document.getElementById('goldImportText');
if(ta)ta.value='';
const box=document.getElementById('goldImportPreview');
if(box)box.innerHTML='';
const btn=document.getElementById('goldImportCommitBtn');
if(btn)btn.disabled=true;
openModal('goldImportModal');
},
// --- deteksi jenis perhiasan dari teks bebas ---
_detectJenis(text){
const t=text.toLowerCase();
// BUGFIX: pakai \b (word boundary) supaya nama kota spt "Magelang" tidak
// ke-deteksi salah jadi jenis "Gelang" (krn "Magelang" mengandung substring
// "gelang" tapi bukan kata "gelang" yg berdiri sendiri). Ketemu saat test
// import 6 nota asli dari rekap-nota-emas.xlsx (nota dari toko "Mustika Gold
// Magelang" jenisnya "Anting" tapi ke-deteksi "Gelang").
if(/\bcincin\b/.test(t))return 'Cincin';
if(/\bkalung\b|\brantai\b|\bliontin\b|\bsusup\b|\bsusun\b/.test(t))return 'Kalung';
if(/\bgelang\b/.test(t))return 'Gelang';
if(/\banting\b/.test(t))return 'Anting';
return 'Lainnya';
},
// --- parser 1 blok nota (multi-baris bebas, ditempel apa adanya dari WA/catatan) ---
// Pola yg dicari, masing2 opsional & bisa muncul di baris mana saja dalam 1 blok:
//   Tanggal   : "18-7-2020" / "18/07/2020" / "18 Juli 2020"
//   Nama/Toko : baris "Nama : Alina" atau baris pertama non-angka jika ada
//   Kadar     : "750", "700", "916", "999" (angka 3 digit berdiri sendiri, atau "@755"→harga bukan kadar)
//   Berat     : "B: 4.130 g" / "berat 4,13 gr" / "4.130g"
//   Harga/gram: "@755" / "harga 755000/gr"
//   Total     : "JUMLAH 3.118.000" / "Rp 3.118.000" (angka terbesar di blok biasanya total)
_parseBlock(text){
const raw=text;
const lower=raw.toLowerCase();
const jenis=this._detectJenis(raw);
// tanggal
let tanggal='';
const dm=raw.match(/(\d{1,2})[\s./-](\d{1,2}|[a-zA-Z]+)[\s./-](\d{4})/);
if(dm){
const bulanMap={jan:1,januari:1,feb:2,februari:2,mar:3,maret:3,apr:4,april:4,mei:5,jun:6,juni:6,jul:7,juli:7,agu:8,agustus:8,sep:9,september:9,okt:10,oktober:10,nov:11,november:11,des:12,desember:12};
let bln=dm[2];
if(isNaN(parseInt(bln,10))){
const key=bln.toLowerCase().slice(0,3);
bln=bulanMap[key]||bulanMap[bln.toLowerCase()]||1;
} else bln=parseInt(bln,10);
const dd=String(parseInt(dm[1],10)).padStart(2,'0');
const mm=String(bln).padStart(2,'0');
tanggal=`${dm[3]}-${mm}-${dd}`;
}
// kadar (750/700/833/875/916/999) — cari token 3 digit yg BUKAN didahului '@' (itu harga)
let kadar=750;
const kadarMatch=raw.match(/(?<!@)\b(700|750|833|840|875|916|920|999)\b/);
if(kadarMatch)kadar=parseInt(kadarMatch[1],10);
// berat gram — pola "B: 4.130 g" / "berat 4,13" / angka diikuti g/gr/gram
let berat=0;
const beratMatch=raw.match(/b\s*[:=]?\s*([\d.,]+)\s*g/i)||raw.match(/berat\s*[:=]?\s*([\d.,]+)/i)||raw.match(/([\d.,]+)\s*(?:gr|gram)\b/i);
if(beratMatch)berat=parseDecStr(beratMatch[1])||0;
// harga per gram — pola "@755" artinya 755rb/gram (konvensi toko emas)
let hargaPerGram=0;
const hpgMatch=raw.match(/@\s*(\d{2,4})/);
if(hpgMatch)hargaPerGram=parseInt(hpgMatch[1],10)*1000;
// total harga — cari "jumlah"/"total" diikuti angka, kalau tidak ada ambil angka terbesar
let total=0;
const jumlahMatch=raw.match(/(?:jumlah|total)\s*[:.]?\s*(?:rp\.?)?\s*([\d.,]+)/i);
if(jumlahMatch)total=this._toNumber(jumlahMatch[1]);
if(!total){
const allNums=(raw.match(/\d[\d.,]{4,}/g)||[]).map(s=>this._toNumber(s)).filter(n=>n>1000);
if(allNums.length)total=Math.max(...allNums);
}
if(total&&berat&&!hargaPerGram)hargaPerGram=Math.round(total/berat);
if(!total&&berat&&hargaPerGram)total=Math.round(berat*hargaPerGram);
// nama/toko — baris "Nama :" kalau ada
let nama='';
const namaMatch=raw.match(/nama\s*:?\s*([a-zA-Z. ]{2,30})/i);
if(namaMatch)nama=namaMatch[1].trim();
return {tanggal,kadar,berat,hargaPerGram,total,jenis,nama,rawText:raw.trim()};
},
_toNumber(s){
// "3.118.000" -> 3118000 ; "3,118,000" -> 3118000 ; "3118000" -> 3118000
const cleaned=String(s).replace(/[^\d.,]/g,'');
const noThousand=cleaned.replace(/[.,](?=\d{3}(?:\D|$))/g,'');
return parseInt(noThousand.replace(/[.,]/g,''),10)||0;
},
preview(){
const ta=document.getElementById('goldImportText');
const text=ta?ta.value:'';
if(!text.trim()){toast('⚠️ Tempel dulu isi nota emas di kotak teks');return;}
// pisah per blok pakai baris kosong ganda, ATAU baris yg mengandung "Toko Mas"/"Nota"/tanggal baru
const blocks=text.split(/\n\s*\n+/).map(b=>b.trim()).filter(Boolean);
const items=blocks.map(b=>this._parseBlock(b)).filter(it=>it.berat>0||it.total>0);
this._setParsed(items,'Tidak ada nota yg kebaca. Pisahkan tiap nota dgn 1 baris kosong. Pastikan tiap blok ada info berat (mis. "B: 4.130 g") dan harga/total (mis. "JUMLAH 3.118.000" atau "@755").');
},
// --- render ulang preview + enable/disable tombol commit, dipakai bareng oleh flow paste-teks
// (preview) & flow upload-xlsx (importXLSXFile) supaya UI & tombol Impor sama persis ---
_setParsed(items,emptyMsg){
this.parsed=items;
const box=document.getElementById('goldImportPreview');
const btn=document.getElementById('goldImportCommitBtn');
if(!box)return;
if(!items.length){
box.innerHTML='<div class="u-fs12 u-t2">'+emptyMsg+'</div>';
if(btn)btn.disabled=true;
return;
}
box.innerHTML=items.map((it,i)=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
<div style="font-weight:700">${it.jenis}${it.nama?' — '+escapeHtml(it.nama):''}${it.tanggal?' · '+it.tanggal:''}</div>
<div class="u-t2">Kadar ${it.kadar} · Berat ${it.berat.toFixed(3)}g · @${fmtFull(it.hargaPerGram)} · Total ${fmtFull(it.total)}</div>
</div>`).join('');
if(btn)btn.disabled=false;
},
// --- lazy-load SheetJS, pola identik Aset._ensureXLSXLib di aset.js (satu pustaka, dua tempat pakai) ---
async _ensureXLSXLib(){
if(typeof XLSX!=='undefined')return true;
try{ await ensureXLSX(); }catch(e){ toast('⚠️ Gagal memuat pustaka Excel, cek koneksi internet'); return false; }
if(typeof XLSX==='undefined'){ toast('⚠️ Pustaka Excel tidak tersedia'); return false; }
return true;
},
// --- buka file picker tersembunyi. Markup input yg perlu ditambahkan di goldImportModal:
//   <input type="file" id="goldImportXLSXFile" accept=".xlsx,.xls" class="u-dnone" onchange="GoldImport.importXLSXFile(event)">
//   <button type="button" class="btn btn-ghost btn-full btn-sm u-mb10" data-action="GoldImport.openXLSXPicker">📥 Upload Rekap Nota (.xlsx)</button>
openXLSXPicker(){
const inp=document.getElementById('goldImportXLSXFile');
if(inp)inp.click();
},
// --- baca 1 baris rekap xlsx (object hasil XLSX.utils.sheet_to_json) jadi bentuk yg sama
// dgn output _parseBlock() diatas, supaya bisa lewat preview/commit yg sama persis ---
_parseXLSXRow(r){
const jenisTeks=String(r['Jenis Perhiasan & Spesifikasi Detail']||r['Jenis Perhiasan']||r['Jenis']||'');
const jenis=this._detectJenis(jenisTeks);
// tanggal: SheetJS (cellDates:true) bisa kasih objek Date asli, atau tetap string kalau
// cell-nya format teks -- tangani dua-duanya.
let tanggal='';
const rawTgl=r['Tanggal'];
if(rawTgl instanceof Date&&!isNaN(rawTgl)){
tanggal=rawTgl.getFullYear()+'-'+String(rawTgl.getMonth()+1).padStart(2,'0')+'-'+String(rawTgl.getDate()).padStart(2,'0');
}else if(rawTgl){
const dm=String(rawTgl).match(/(\d{4})-(\d{1,2})-(\d{1,2})/)||String(rawTgl).match(/(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{4})/);
if(dm){
if(dm[1].length===4)tanggal=dm[1]+'-'+dm[2].padStart(2,'0')+'-'+dm[3].padStart(2,'0');
else tanggal=dm[3]+'-'+dm[2].padStart(2,'0')+'-'+dm[1].padStart(2,'0');
}
}
const kadar=parseInt(r['Kadar (‰)']||r['Kadar']||0,10)||750;
const berat=parseDecStr(String(r['Berat (gram)']||r['Berat']||'').trim())||Number(r['Berat (gram)'])||0;
let hargaPerGram=Number(r['Harga/gram (Rp)']||r['Harga per Gram']||0)||0;
let total=Number(r['Total Harga Riil (Rp)']||r['Total']||0)||0;
if(total&&berat&&!hargaPerGram)hargaPerGram=Math.round(total/berat);
if(!total&&berat&&hargaPerGram)total=Math.round(berat*hargaPerGram);
// nama/referensi nota: gabung Toko (Staf) + Atas Nama kalau dua-duanya ada, biar tetap
// jelas rujukannya di Buku Aset (field goldToko cuma 1 kolom teks)
const toko=String(r['Toko (Staf)']||r['Toko']||'').trim();
const atasNama=String(r['Atas Nama']||r['Nama']||'').trim();
let nama=toko;
if(atasNama)nama=nama?(nama+' · a.n. '+atasNama):atasNama;
return {tanggal,kadar,berat,hargaPerGram,total,jenis,nama,rawText:JSON.stringify(r)};
},
// --- cari baris header tabel secara otomatis lalu bangun array objek {header:nilai}
// dari baris2 sesudahnya. BUGFIX: dulu pakai XLSX.utils.sheet_to_json(ws,{defval:''})
// polos yg SELALU asumsikan baris PERTAMA sheet = header -- gagal total kalau file
// rekap punya judul/subjudul/baris kosong di atas tabel (pola umum: baris 1 judul,
// baris 2 keterangan sumber, baris 3 kosong, baris 4 baru header asli "No/Toko
// (Staf)/Tanggal/dst"). Ketemu nyata dari laporan user pakai file rekap-nota-emas-v2.xlsx
// yg persis berformat begini -- semua baris kebaca tapi ke-mapping ke key yg salah
// (key jadi teks judul), jadi importXLSXFile() selalu bilang "tidak ada nota kebaca".
_sheetToRows(ws){
const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
const HEADER_MARKERS=['Tanggal','Toko (Staf)','Atas Nama','Jenis Perhiasan & Spesifikasi Detail','Kadar (‰)','Berat (gram)','Harga/gram (Rp)','Total Harga Riil (Rp)'];
let headerIdx=-1;
for(let i=0;i<Math.min(aoa.length,25);i++){
const cells=(aoa[i]||[]).map(c=>String(c==null?'':c).trim());
const hits=HEADER_MARKERS.filter(h=>cells.includes(h)).length;
if(hits>=2){headerIdx=i;break;}
}
if(headerIdx===-1)headerIdx=0; // fallback: pola lama (header = baris pertama)
const headers=(aoa[headerIdx]||[]).map(h=>String(h==null?'':h).trim());
const out=[];
for(let i=headerIdx+1;i<aoa.length;i++){
const row=aoa[i]||[];
const allEmpty=row.every(c=>c===''||c==null);
if(allEmpty)continue; // baris kosong pemisah
const firstCell=String(row[0]==null?'':row[0]).trim().toUpperCase();
if(firstCell==='TOTAL'||firstCell==='JUMLAH')continue; // baris rekap total, bukan nota
const obj={};
headers.forEach((h,idx)=>{ if(h)obj[h]=row[idx]; });
out.push(obj);
}
return out;
},
async importXLSXFile(e){
const file=e.target.files[0];if(!file)return;
if(!await this._ensureXLSXLib()){e.target.value='';return;}
let rows;
try{
const buf=await file.arrayBuffer();
const wb=XLSX.read(buf,{type:'array',cellDates:true});
const ws=wb.Sheets[wb.SheetNames[0]];
rows=this._sheetToRows(ws);
}catch{
toast('❌ File tidak valid / rusak (bukan Excel)!');
e.target.value='';
return;
}
const items=rows.map(r=>this._parseXLSXRow(r)).filter(it=>it.berat>0||it.total>0);
this._setParsed(items,'Tidak ada nota valid ditemukan di file ini. Pastikan ada kolom "Berat (gram)" dan/atau "Total Harga Riil (Rp)" terisi di tiap baris nota (baris rekap "TOTAL" atau baris kosong otomatis dilewati).');
if(items.length)toast('✅ '+items.length+' baris nota kebaca dari file — cek pratinjau lalu tap Impor');
e.target.value='';
},
commit(){
if(!this.parsed.length){toast('⚠️ Belum ada yg dipratinjau');return;}
let count=0;
this.parsed.forEach(it=>{
D.assets.push({
id:uid(),
name:`${it.jenis} emas ${it.kadar}${it.nama?' — '+it.nama:''}`,
jenis:'Emas/Logam Mulia',
lokasi:it.nama?('Nota: '+it.nama):'',
nilai:it.total||Math.round((it.berat||0)*(it.hargaPerGram||0)),
tanggal:it.tanggal||todayStr(),
zakatable:true,
accountId:null,
modalInvestasi:it.total||null,
hargaBeli:it.hargaPerGram||null,
jumlahUnit:it.berat||null,
keuntungan:null,
keuntunganPct:null,
goldKadar:it.kadar,
goldBeratGram:it.berat,
goldHargaPerGram:it.hargaPerGram,
goldJenis:it.jenis,
goldToko:it.nama||''
});
count++;
});
save();
closeModal('goldImportModal');
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();
toast(`✅ ${count} aset emas berhasil diimpor`);
}
};

const GoldZakat={
NISAB_GRAM_24K:85, // standar umum: 85 gram emas murni (24K)
ZAKAT_RATE:0.025,
// ambil semua aset emas yg punya data kadar+berat lengkap
_goldAssetsLengkap(){
return (D.assets||[]).filter(a=>a.jenis==='Emas/Logam Mulia'&&a.goldKadar&&a.goldBeratGram);
},
_goldAssetsTanpaData(){
return (D.assets||[]).filter(a=>a.jenis==='Emas/Logam Mulia'&&!(a.goldKadar&&a.goldBeratGram));
},
totalGram24kEquiv(){
return this._goldAssetsLengkap().reduce((s,a)=>s+(a.goldBeratGram*(a.goldKadar/1000)),0);
},
totalGramApaAdanya(){
return this._goldAssetsLengkap().reduce((s,a)=>s+a.goldBeratGram,0);
},
totalModal(){
const lengkap=this._goldAssetsLengkap().reduce((s,a)=>s+(a.modalInvestasi||a.nilai||0),0);
const tanpaData=this._goldAssetsTanpaData().reduce((s,a)=>s+(a.modalInvestasi||0),0);
return lengkap+tanpaData;
},
totalNilaiSekarang(hargaPerGram24k){
const dariLengkap=this.totalGram24kEquiv()*(hargaPerGram24k||0);
const dariTanpaData=this._goldAssetsTanpaData().reduce((s,a)=>s+(a.nilai||0),0);
return dariLengkap+dariTanpaData;
},
open(){
this.render();
openModal('goldZakatModal');
},
onHargaInput(){
D.goldZakatSettings=D.goldZakatSettings||{};
D.goldZakatSettings.hargaPerGram24k=parsePzNum(document.getElementById('gzHargaGram').value);
save();
this.render();
},
render(){
const box=document.getElementById('goldZakatBody');
if(!box)return;
const harga=(D.goldZakatSettings&&D.goldZakatSettings.hargaPerGram24k)||0;
const hargaInput=document.getElementById('gzHargaGram');
if(hargaInput&&!hargaInput.value)hargaInput.value=harga||'';
const gramEquiv=this.totalGram24kEquiv();
const gramApaAdanya=this.totalGramApaAdanya();
const modal=this.totalModal();
const nilaiSekarang=this.totalNilaiSekarang(harga);
const untung=nilaiSekarang-modal;
const untungPct=modal?(untung/modal*100):0;
const tanpaDataList=this._goldAssetsTanpaData();
const sudahNisab=gramEquiv>=this.NISAB_GRAM_24K;
const zakatWajib=sudahNisab?nilaiSekarang*this.ZAKAT_RATE:0;
const rekapPerJenis={};
this._goldAssetsLengkap().forEach(a=>{
const j=a.goldJenis||'Lainnya';
if(!rekapPerJenis[j])rekapPerJenis[j]={gram:0,gramEquiv:0,nilai:0,count:0};
rekapPerJenis[j].gram+=a.goldBeratGram;
rekapPerJenis[j].gramEquiv+=a.goldBeratGram*(a.goldKadar/1000);
rekapPerJenis[j].nilai+=(a.nilai||0);
rekapPerJenis[j].count++;
});
let html=`
<div class="fg"><label class="fl">Harga Emas Saat Ini per Gram (24K, Rp)</label>
<div class="amt-wrap">
<input type="text" class="fi fi-calc-only" id="gzHargaGram" placeholder="cth. 1.500.000" inputmode="decimal" value="${harga||''}" oninput="GoldZakat.onHargaInput()" onblur="evalAmtExpr('gzHargaGram');GoldZakat.onHargaInput()">
</div>
<div style="font-size:11px;color:var(--text2);margin-top:4px">Isi harga emas Antam/pasar hari ini per gram (24K) — dipakai utk estimasi nilai sekarang & cek Nisab. Cek harga terkini di Pegadaian/Antam/toko emas langganan.</div>
</div>
<div style="background:var(--surface3);border-radius:12px;padding:14px;margin-bottom:14px">
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="u-t2">Total berat (apa adanya)</span><b>${gramApaAdanya.toFixed(3)} gram</b></div>
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="u-t2">Total setara emas 24K</span><b>${gramEquiv.toFixed(3)} gram</b></div>
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="u-t2">Total modal/harga beli</span><b>${fmtFull(modal)}</b></div>
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="u-t2">Estimasi nilai sekarang</span><b>${fmtFull(nilaiSekarang)}</b></div>
<div style="display:flex;justify-content:space-between"><span class="u-t2">Untung/rugi vs modal</span><b class="${untung>=0?'green':'red'}">${untung>=0?'+':''}${fmtFull(untung)} (${untungPct>=0?'+':''}${untungPct.toFixed(1)}%)</b></div>
</div>
<div style="background:${sudahNisab?'var(--accent3-soft)':'var(--surface2)'};border-radius:12px;padding:14px;margin-bottom:14px">
<div class="u-fs12t2" style="margin-bottom:6px">Nisab zakat emas (standar umum: 85 gram emas 24K)</div>
<div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:800;margin-bottom:4px">${sudahNisab?'✅ Sudah mencapai Nisab':'⏳ Belum mencapai Nisab'}</div>
<div class="u-fs12t2">${gramEquiv.toFixed(2)} gram / ${this.NISAB_GRAM_24K} gram nisab</div>
${sudahNisab?`<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
<div style="display:flex;justify-content:space-between"><span class="u-fs12t2">Zakat Maal (2,5%, JIKA sudah haul 1 th Hijriah)</span><b style="color:var(--accent3)">${fmtFull(zakatWajib)}</b></div>
</div>`:''}
</div>`;
if(Object.keys(rekapPerJenis).length){
html+='<div class="card-title" style="margin-bottom:8px">Rincian per Jenis Perhiasan</div>';
Object.keys(rekapPerJenis).forEach(j=>{
const r=rekapPerJenis[j];
html+=`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px">
<span>${j} (${r.count})</span><span>${r.gram.toFixed(3)}g · ${fmtFull(r.nilai)}</span>
</div>`;
});
}
if(tanpaDataList.length){
html+=`<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:12px;padding:10px 12px;background:var(--accent2-soft);border-radius:10px">
⚠️ Ada ${tanpaDataList.length} aset emas TANPA data kadar/berat detail (dicatat manual sebelum fitur ini ada), jadi tidak ikut dihitung ke total gram di atas — hanya ikut ke nilai Rp. Edit aset itu satu-satu utk isi kadar & berat kalau mau perhitungan gram lebih akurat.</div>`;
}
html+=`<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:12px">⚠️ Ini bukan fatwa resmi. Nisab (85gr) & tarif (2,5%) mengikuti pendapat yang umum dipakai — cek ke ustadz/lembaga amil zakat terpercaya utk kepastian hukum, terutama soal syarat haul (kepemilikan genap 1 tahun Hijriah) & apakah emas ini termasuk kategori wajib zakat (perhiasan pakai sehari-hari umumnya dikecualikan menurut sebagian ulama).</div>`;
box.innerHTML=html;
}
};

// --- wrapper global, dipanggil lewat data-action="..." di modal (pola sama seperti ImportKatalog) ---
function previewGoldImport(){return GoldImport.preview();}
function commitGoldImport(){return GoldImport.commit();}
