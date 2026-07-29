// scan-ocr.js — Scan struk belanja (OCR): struk belanja, bukti transfer, tanggal dari foto, odometer, portofolio aset, kategori & sparepart otomatis dari struk
// Dipindah ke modules/shared/scan-ocr.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Domain terakhir hasil pembedahan features-filter-scanstruk-ocr.js (v84-v87 sudah memindahkan Akun, lookup Kategori,
// Filter/Laporan, dan Form Transaksi+Cicilan ke file domain masing2 — lihat PEMISAHAN-FILE-ROADMAP.md). Sisa file lama
// ini murni scan OCR, jadi di v88 filenya di-rename jadi scan-ocr.js (isi tidak berubah, cuma nama file + komentar).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

// BUGFIX: semua fungsi scan* di file ini dulu punya pengecekan `if(typeof Tesseract==='undefined')`
// SEBELUM memanggil ocrRecognize() -- niatnya kasih pesan jelas kalau modul OCR belum siap. Tapi
// Tesseract cuma didaftarkan sbg global lewat ensureTesseract() di DALAM getOcrWorker() di bawah,
// yang HANYA dipanggil dari ocrRecognize(). Jadi di scan pertama kali (fresh session, Tesseract
// belum pernah dimuat), pengecekan itu selalu true & langsung return SEBELUM ocrRecognize/
// ensureTesseract sempat jalan -- OCR jadi tidak akan pernah bisa jalan sama sekali di scan
// pertama manapun (chicken-egg deadlock). Fix: pengecekan itu dihapus dari semua scan* function;
// biarkan ocrRecognize() yang coba muat modulnya, kegagalan (termasuk modul gagal dimuat) tetap
// ditangani & dikasih pesan jelas lewat scanErrorMessage() di catch block masing2 fungsi.
let _ocrWorkerPromise=null;
function getOcrWorker(){
if(!_ocrWorkerPromise){
_ocrWorkerPromise=ensureTesseract().then(()=>Tesseract.createWorker('eng')).catch(err=>{
console.error('[OCR] gagal membuat worker Tesseract:',err);
_ocrWorkerPromise=null;
throw err;
});
}
return _ocrWorkerPromise;
}
async function resetOcrWorker(){
const old=_ocrWorkerPromise;
_ocrWorkerPromise=null;
if(old){
try{const w=await old; if(w&&typeof w.terminate==='function')await w.terminate();}catch(e){ }
}
}
function withTimeout(promise,ms,label){
return Promise.race([
promise,
new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT:'+label)),ms))
]);
}
function scanErrorMessage(err){
console.error('[OCR] gagal scan:',err);
const raw=(err&&err.message)||(err&&err.error&&err.error.message)||(typeof err==='string'?err:'');
const name=(err&&err.name)||'';
// BUGFIX: sebelumnya izin kamera ditolak (NotAllowedError) jatuh ke pesan generik di paling
// bawah ("error tidak diketahui...") yang menyuruh user cek internet/restart app -- padahal
// masalahnya murni izin kamera di browser/OS, bukan OCR/koneksi. User jadi bingung & coba-coba
// hal yang salah. Fix: deteksi NotAllowedError/PermissionDeniedError secara eksplisit & kasih
// instruksi yang langsung relevan (cek izin kamera di browser + Android), bukan pesan OCR umum.
if(name==='NotAllowedError'||name==='PermissionDeniedError'||/permission denied|not allowed/i.test(raw)){
return 'izin kamera ditolak — buka pengaturan situs di browser (ikon gembok/Shields di address bar) lalu izinkan Kamera untuk situs ini, dan pastikan izin Kamera utk aplikasi browser juga diizinkan di Pengaturan HP (Apps → nama browser → Permissions → Camera), lalu coba scan lagi';
}
if(name==='NotFoundError'||name==='OverconstrainedError')return 'kamera tidak ditemukan/tidak cocok di perangkat ini — coba pakai "Scan dari Galeri" sbg alternatif';
if(name==='NotReadableError')return 'kamera sedang dipakai aplikasi lain — tutup aplikasi kamera/video call lain, lalu coba scan lagi';
if(raw&&raw.startsWith('TIMEOUT:'))return 'koneksi lambat/putus saat mengunduh modul OCR — cek internet & coba lagi (hindari download lain bareng)';
if(raw&&/fetch|network|load/i.test(raw))return 'gagal mengunduh modul OCR, cek koneksi internet & coba lagi';
if(raw&&/SetImageFile|SetImage|null/i.test(raw))return 'modul OCR sempat gagal muat sempurna, sudah dicoba ulang otomatis tapi masih gagal — coba scan sekali lagi';
if(raw)return raw;
return 'error tidak diketahui — cek koneksi internet, lalu coba lagi (kalau masih gagal, coba tutup & buka lagi aplikasinya)';
}
function downscaleImage(file,maxWidth){
return new Promise((resolve)=>{
try{
const img=new Image();
const url=URL.createObjectURL(file);
img.onload=()=>{
URL.revokeObjectURL(url);
const scale=Math.min(1,maxWidth/img.width);
if(scale>=1){resolve(file);return;}
const canvas=document.createElement('canvas');
canvas.width=Math.round(img.width*scale);
canvas.height=Math.round(img.height*scale);
const ctx=canvas.getContext('2d');
ctx.drawImage(img,0,0,canvas.width,canvas.height);
canvas.toBlob((blob)=>{resolve(blob||file);},'image/jpeg',0.85);
};
img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
img.src=url;
}catch(err){resolve(file);}
});
}
async function ocrRecognize(file){
const scaled=await downscaleImage(file,1600);
try{
const worker=await withTimeout(getOcrWorker(),45000,'worker-init');
return await withTimeout(worker.recognize(scaled),30000,'recognize');
}catch(err){
if(err&&err.message&&err.message.startsWith('TIMEOUT:'))throw err;
console.warn('[OCR] worker tampak bermasalah, mencoba bikin ulang & scan sekali lagi:',err);
await resetOcrWorker();
const worker2=await withTimeout(getOcrWorker(),45000,'worker-init-retry');
return withTimeout(worker2.recognize(scaled),30000,'recognize-retry');
}
}
const _bulanIndoMap={jan:1,januari:1,feb:2,februari:2,mar:3,maret:3,apr:4,april:4,mei:5,jun:6,juni:6,jul:7,juli:7,agu:8,agt:8,agustus:8,sep:9,sept:9,september:9,okt:10,oktober:10,nov:11,november:11,des:12,desember:12};
function extractDateFromText(text){
const numMatch=text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
if(numMatch){
let[,d,m,y]=numMatch;if(y.length===2)y='20'+y;
const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
if(!isNaN(new Date(iso).getTime()))return iso;
}
const bulanRegex=new RegExp('(\\d{1,2})\\s+([A-Za-z]{3,10})\\s+(\\d{4})','i');
const textMatch=text.match(bulanRegex);
if(textMatch){
const[,d,bulanRaw,y]=textMatch;
const bulan=_bulanIndoMap[bulanRaw.toLowerCase()];
if(bulan){
const iso=`${y}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
if(!isNaN(new Date(iso).getTime()))return iso;
}
}
return null;
}
// BUGFIX: struk/riwayat pesanan marketplace (mis. "Detail Pesanan" Tokopedia/Shopee) sering
// punya banyak angka bertingkat -- harga produk, ongkir, voucher, asuransi, dst -- dan yang
// BENERAN dibayar (mis. "Total Belanja"/"Total Tagihan"/"Total Pembayaran") bisa LEBIH KECIL
// dari harga produk doang (karena voucher/diskon). scanReceipt()/scanReceiptBelanja() dulu
// cuma ambil Math.max(...nums) dari SEMUA angka di struk -- jadi salah ambil harga produk
// (lebih besar) padahal yang harus diisi ke nominal transaksi itu total akhir yang lebih kecil.
// Fix: kalau ada baris berlabel total akhir yang jelas, prioritaskan itu; fallback ke angka
// terbesar kalau labelnya tidak ketemu (struk kasir biasa/format lain). Sengaja TIDAK match
// "Subtotal ..." atau "Total ongkos kirim" dsb (butuh kata "total" LANGSUNG diikuti salah satu
// kata kunci di bawah, bukan cuma mengandung substring "total").
// BUGFIX: e-wallet/dompet digital (GoPay dkk) pakai label "Total Transaksi" utk
// nominal akhir yg beneran dibayar (bukan "Total belanja/tagihan/pembayaran"
// spt marketplace) -- ditambahkan supaya tidak fallback salah ke harga barang.
const RECEIPT_TOTAL_LABEL_RE=/total\s*(belanja|tagihan|pembayaran|transaksi|bayar|(?:yang\s*)?harus\s*dibayar)\b/i;
// BUGFIX: catatan transaksi (txNote) diisi dari "baris pertama" hasil OCR yang bukan angka murni.
// Itu cocok untuk struk kasir fisik (baris pertama = nama toko), tapi SALAH untuk screenshot
// marketplace (Tokopedia/Shopee/dll) seperti "Detail Pesanan" -- baris paling atas di situ malah
// jam status bar HP ("20:53"), judul halaman, nomor pesanan, atau "Lihat Invoice", bukan nama
// barang. Akibatnya catatan hasil scan jadi terisi teks acak, bukan nama produk yang dibeli.
// Fix: skip baris "chrome" umum ini saat mencari firstLine, supaya jatuh ke baris nama produk.
const RECEIPT_NOISE_LINE_RE=/^\d{1,2}[:.]\d{2}$|^\d{1,3}\s*%$|detail\s*pesanan|no\.?\s*pesanan|lihat\s*invoice|tanggal\s*pembelian|^selesai$|^diproses$|^dikirim$|^dibatalkan$|detail\s*produk|beli\s*lagi|chat\s*penjual|info\s*pengiriman|\bwib\b|\d{1,2}\s+(jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:t|tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)\s+\d{4}/i;
function scanReceipt(amtId,dateId,noteId){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai gambar, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const rawNums=text.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}/g)||[];
const nums=rawNums.map(s=>parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))).filter(n=>n>=500&&n<500000000);
const labeledTotal=extractLabeledAmount(text,RECEIPT_TOTAL_LABEL_RE);
const bestAmt=labeledTotal!=null?Math.round(labeledTotal):(nums.length?Math.round(Math.max(...nums)):null);
if(bestAmt!=null&&amtId){const el=document.getElementById(amtId);if(el){el.value=bestAmt;if(el.oninput)el.oninput();}}
const isoForBill=extractDateFromText(text);
if(dateId&&isoForBill){const el=document.getElementById(dateId);if(el)el.value=isoForBill;}
const firstLine=text.split('\n').map(l=>l.trim()).find(l=>l.length>3&&!/^\d+$/.test(l));
if(firstLine){const el=document.getElementById(noteId);if(el)el.value=firstLine.slice(0,60);}
toast(bestAmt!=null?'✅ Scan selesai, cek & koreksi hasilnya':'⚠️ Nominal tidak terbaca, isi manual ya');
await maybeOfferPaylaterReminder(text,bestAmt,isoForBill);
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}
function guessTransferNameFromText(text){
const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
const kw=/(kepada|penerima|nama\s*penerima|tujuan|a\.?n\.?|acc(?:ount)?\s*name|beneficiary|received?\s*by)/i;
for(let i=0;i<lines.length;i++){
if(kw.test(lines[i])){
const m=lines[i].match(/(?:kepada|penerima|nama\s*penerima|tujuan|a\.?n\.?|acc(?:ount)?\s*name|beneficiary|received?\s*by)\s*[:\-]?\s*(.+)/i);
if(m&&m[1]&&m[1].trim().length>2&&!/^\d+$/.test(m[1].trim()))return m[1].trim().slice(0,40);
const next=lines[i+1];
if(next&&next.length>2&&!/^\d+$/.test(next))return next.slice(0,40);
}
}
return null;
}
function scanBuktiTransfer(nameId,amtId,dateId){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai bukti transfer, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const rawNums=text.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}/g)||[];
const nums=rawNums.map(s=>parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))).filter(n=>n>=1000&&n<500000000);
if(nums.length&&amtId){const amt=Math.round(Math.max(...nums));const el=document.getElementById(amtId);if(el){el.value=amt;if(el.oninput)el.oninput();}}
if(dateId){
const iso=extractDateFromText(text);
if(iso){const el=document.getElementById(dateId);if(el)el.value=iso;}
}
const name=guessTransferNameFromText(text);
if(name){const el=document.getElementById(nameId);if(el)el.value=name;}
toast(nums.length?'✅ Scan selesai, cek & koreksi hasilnya (nama otomatis kadang meleset, tetap dicek ya)':'⚠️ Nominal tidak terbaca, isi manual ya');
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}
function scanTanggalDariFoto(dateId){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai foto, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const iso=extractDateFromText(text);
if(iso){
const el=document.getElementById(dateId);
if(el){el.value=iso;if(el.oninput)el.oninput();}
toast('✅ Tanggal terbaca: '+iso+' — cek dulu sebelum simpan');
}else{
toast('⚠️ Tanggal tidak terbaca, isi manual ya');
}
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}
function scanKmOdometer(){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai foto odometer, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const km=extractOdometerKm(text);
if(km!=null){
const el=document.getElementById('kmVal');
if(el){el.value=km;if(el.oninput)el.oninput();}
toast('✅ Terbaca '+km.toLocaleString('id-ID')+' km — cek dulu sebelum simpan, angka spidometer digital kadang ke-OCR salah');
} else {
toast('⚠️ Angka odometer tidak terbaca jelas, isi manual ya');
}
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}
function extractOdometerKm(text){
const lines=String(text).split('\n');
for(let i=0;i<lines.length;i++){
if(!/\bkm\b/i.test(lines[i]))continue;
for(const cl of [lines[i],lines[i-1]||'',lines[i+1]||'']){
const m=cl.match(/\d{2,6}(?:[.,]\d{1,2})?/);
if(m){
const n=Math.round(parseFloat(m[0].replace(',','.')));
if(n>=1&&n<999999)return n;
}
}
}
const allNums=(String(text).match(/\d{3,6}(?:[.,]\d{1,2})?/g)||[]).map(s=>parseFloat(s.replace(',','.')));
if(allNums.length)return Math.round(Math.max(...allNums));
return null;
}
function extractLabeledAmount(text,labelRegex){
const lines=text.split('\n');
for(let i=0;i<lines.length;i++){
if(!labelRegex.test(lines[i]))continue;
for(const cl of [lines[i],lines[i+1]||'']){
const matches=cl.match(/\d[\d.,]*/g);
if(!matches)continue;
for(const raw of matches){
if(raw.replace(/[.,]/g,'').length>=2){
const n=normalizeOcrNumber(raw);
if(!isNaN(n))return n;
}
}
}
}
return null;
}
function extractPortfolioFields(text){
return{
nilai:extractLabeledAmount(text,PORTFOLIO_LABELS.nilai),
modal:extractLabeledAmount(text,PORTFOLIO_LABELS.modal),
hargaBeli:extractLabeledAmount(text,PORTFOLIO_LABELS.hargaBeli),
jumlahUnit:extractLabeledAmount(text,PORTFOLIO_LABELS.jumlahUnit)
};
}
function extractBitgetFields(text){
const nilaiM=text.match(/[≈=]\s*([\d][\d.,]*)\s*idr/i);
const qtyM=text.match(/total\s*aset[\s\S]{0,15}?(\d+\.\d+)/i);
// BUGFIX: regex lama pakai \s* yang ikut nangkep newline, jadi bisa nyambungin jam
// di status bar ("20:35") dengan baris "USDT" di bawahnya -> salah kebaca "35 USDT".
// Sekarang diprioritaskan cari label "Harga impas" dulu (baris label & nilai boleh
// terpisah newline, tapi antara angka & "USDT" wajib satu baris/spasi saja).
const impasLabelM=text.match(/harga\s*impas[\s\S]{0,20}?([\d][\d.,]*)[ \t]*usdt/i);
const impasM=impasLabelM||text.match(/([\d][\d.,]*)[ \t]*usdt\b/i);
return{
nilai:nilaiM?normalizeOcrNumber(nilaiM[1]):null,
jumlahUnit:qtyM?normalizeOcrNumber(qtyM[1]):null,
hargaImpasUsdt:impasM?normalizeOcrNumber(impasM[1]):null
};
}
const ASSET_JENIS_KEYWORDS=[
[/bitcoin|ethereum|\bbtc\b|\beth\b|usdt|kripto|crypto|binance|indodax|bitget|tokocrypto|pintu\b/i,'Kripto'],
[/reksa\s*dana|rdpu|rdps|rdpt|reksadana|nab\b|bibit\b|bareksa|pasar\s*uang|reksa\s*dana\s*pasar\s*uang/i,'Reksadana'],
[/\bsaham\b|\blot\b|ihsg|emiten|bursa\s*efek|stockbit|ajaib\b/i,'Saham'],
[/emas|gold\b|logam\s*mulia|antam|pegadaian\s*emas/i,'Emas/Logam Mulia'],
[/deposito|time\s*deposit|obligasi|\bsbn\b|sukuk/i,'Deposito/Investasi'],
[/kendaraan|motor\b|mobil\b|bpkb|plat\s*nomor|stnk/i,'Kendaraan'],
[/rumah|bangunan|kpr\b|ruko\b|apartemen/i,'Rumah/Bangunan'],
[/tanah|kavling|sertifikat|\bshm\b|\bshgb\b/i,'Tanah']
];
function guessAssetJenisFromText(text){
for(const[re,jenis]of ASSET_JENIS_KEYWORDS){
if(re.test(text))return jenis;
}
return null;
}
function guessCryptoSymbolFromText(text){
const m=text.match(/\b([A-Z]{2,10})\s*\/\s*(USDT|USDC|BUSD|IDR|BTC|ETH)\b/);
return m?m[1]:null;
}
const ASSET_NAME_LABEL_RE=/nama\s*(produk|reksa\s*dana|instrumen|aset|saham|koin|barang)?\s*[:\-]?/i;
// BUGFIX: screenshot Bibit "Pasar Uang" (folder tujuan investasi) punya breadcrumb subtitle
// pendek "Rumah" tepat di bawah judul halaman -- ini nama FOLDER TUJUAN (goal) bawaan Bibit,
// BUKAN nama produk reksa dana. Karena pendek (≤8 char), lolos semua filter panjang/huruf, dan
// tidak match kata kunci "rp|total|nilai|...", jadi ke-pilih salah sbg Nama Aset padahal nama
// produk asli ("Majoris Pasar Uang Syariah Indonesia") ada di bawah, di luar window 8 baris
// pertama yg dicek. Tambahkan nama2 folder tujuan umum Bibit ke exclude list.
const ASSET_NAME_EXCLUDE_RE=/^(rp|total|nilai|profit|untung|rugi|modal|harga|jumlah|detail|kembali|beli|jual|topup|top up|edit|invest|portofolio|riwayat|transaksi|saldo|dompet|wallet|home|beranda|profil|pengaturan|cari|search|filter|urutkan|semua|lainnya|pasar uang|reksa dana|saham|deposito|obligasi|kripto|nilai portofolio|nilai sekarang|imbal hasil|keuntungan|rumah|pendidikan|pensiun|dana darurat|liburan|kendaraan|nikah|umroh|haji)$/i;
const STATUS_BAR_LINE_RE=/^\d{1,2}[:.]\d{2}\b/;
function guessAssetNameFromText(text){
const lines=String(text).split('\n').map(l=>l.trim()).filter(Boolean).filter(l=>!STATUS_BAR_LINE_RE.test(l));
for(let i=0;i<lines.length;i++){
if(!ASSET_NAME_LABEL_RE.test(lines[i]))continue;
const afterLabel=lines[i].replace(ASSET_NAME_LABEL_RE,'').trim();
const candidate=(afterLabel.length>2?afterLabel:lines[i+1])||'';
if(candidate.length>2&&/[a-zA-Z]{3,}/.test(candidate))return candidate.slice(0,60);
}
// BUGFIX: window 8 baris ketinggalan nama produk asli yang sering ada di baris
// ke-9/10 (setelah breadcrumb folder + ringkasan angka). Diperlebar ke 20 baris.
for(const l of lines.slice(0,20)){
if(l.length<=2||l.length>60)continue;
if(!/[a-zA-Z]{3,}/.test(l))continue;
const clean=l.replace(/[^a-zA-Z0-9\s]/g,'').trim();
if(ASSET_NAME_EXCLUDE_RE.test(clean))continue;
if(/rp|total|nilai|profit|untung|rugi|modal|harga|jumlah/i.test(l))continue;
return l.slice(0,60);
}
return null;
}
function scanAssetPortfolio(){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
const box=document.getElementById('assetScanCandidates');
if(box){box.style.display='block';box.innerHTML='🔍 Memindai gambar, mohon tunggu...';}
toast('🔍 Memindai gambar, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const filledMeta=[];
const guessedJenis=guessAssetJenisFromText(text);
const jenisEl=document.getElementById('assetJenis');
if(guessedJenis&&jenisEl){jenisEl.value=guessedJenis;filledMeta.push('Jenis ('+guessedJenis+')');}
const guessedName=(guessedJenis==='Kripto'?guessCryptoSymbolFromText(text):null)||guessAssetNameFromText(text);
const nameEl=document.getElementById('assetName');
if(guessedName&&nameEl&&!nameEl.value.trim()){nameEl.value=guessedName;filledMeta.push('Nama Aset');}
const fields=extractPortfolioFields(text);
const filled=[...filledMeta];
if(fields.modal!=null){document.getElementById('assetModalInvestasi').value=Math.round(fields.modal);filled.push('Modal Investasi');}
if(fields.hargaBeli!=null){document.getElementById('assetHargaBeli').value=fields.hargaBeli;filled.push('Harga Beli');}
if(fields.jumlahUnit!=null){document.getElementById('assetJumlahUnit').value=fields.jumlahUnit;filled.push('Jumlah Unit');}
if(fields.nilai!=null){
document.getElementById('assetNilai').value=Math.round(fields.nilai);
updateAmtPreview('assetNilai','assetNilaiPreview');
filled.unshift('Nilai Saat Ini');
Aset.updateProfitPreview();
if(box){box.style.display='none';box.innerHTML='';}
toast('✅ Scan selesai — '+filled.join(', ')+' terisi otomatis, cek lagi sebelum simpan');
return;
}
const bg=extractBitgetFields(text);
if(bg.nilai!=null){
document.getElementById('assetNilai').value=Math.round(bg.nilai);
updateAmtPreview('assetNilai','assetNilaiPreview');
filled.unshift('Nilai Saat Ini');
if(bg.jumlahUnit!=null){document.getElementById('assetJumlahUnit').value=bg.jumlahUnit;filled.push('Jumlah Unit');}
Aset.updateProfitPreview();
if(box){
box.style.display='block';
box.innerHTML='<div class="u-fs12 u-cacc3 u-mb6">✅ '+filled.join(', ')+' terisi otomatis dari format Bitget.</div>'+
(bg.hargaImpasUsdt!=null?'<div class="u-fs11 u-t2 u-lh15">ℹ️ Terbaca juga "Harga impas" '+Number(bg.hargaImpasUsdt).toLocaleString('id-ID')+' USDT -- ini <b>harga breakeven dalam USDT</b>, bukan Rupiah, jadi TIDAK diisi otomatis ke Harga Beli/Unit (biar tidak salah satuan). Kalau mau dipakai, konversi dulu ke Rupiah lalu isi manual.</div>':'')+
'<div class="u-fs11 u-t2 u-mt6 u-lh15">ℹ️ "PnL hari ini" (kalau ada di screenshot) itu untung/rugi HARI INI saja, bukan total sejak beli, jadi sengaja tidak dipakai untuk Modal Investasi/Keuntungan di sini. Isi Modal Investasi manual kalau kamu tahu total dana yang sudah disetor.</div>';
}
toast('✅ Scan selesai — '+filled.join(', ')+' terisi otomatis, cek lagi sebelum simpan');
return;
}
Aset.updateProfitPreview();
const rawNums=text.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}/g)||[];
let nums=rawNums.map(s=>parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))).filter(n=>n>=1000&&n<100000000000);
nums=[...new Set(nums.map(n=>Math.round(n)))].sort((a,b)=>b-a).slice(0,6);
if(!box)return;
if(!nums.length){
box.innerHTML='⚠️ Tidak ada nominal yang terbaca. Isi manual ya.';
toast(filled.length?'✅ '+filled.join(', ')+' terisi, tapi Nilai Saat Ini tidak terbaca — isi manual ya':'⚠️ Nominal tidak terbaca, isi manual ya');
return;
}
box.innerHTML='<div class="u-fs12 u-fw600 u-mb6">Pilih angka yang sesuai "Nilai Saat Ini":</div>'+
nums.map(n=>`<button type="button" class="chip-btn" style="margin:0 6px 6px 0" data-action="pickAssetScanCandidate" data-args="${escapeHtml(JSON.stringify([n]))}">${fmtFull(n)}</button>`).join('')+
'<div class="u-fs11 u-t2 u-mt4">Kalau tidak ada yang cocok, isi manual di bawah.</div>';
toast(filled.length?'✅ '+filled.join(', ')+' terisi — pilih juga angka Nilai Saat Ini':'✅ Scan selesai, pilih angka yang benar');
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
if(box){box.style.display='none';box.innerHTML='';}
}
};
inp.click();
}
function pickAssetScanCandidate(n){
const el=document.getElementById('assetNilai');
if(el){el.value=n;if(el.oninput)el.oninput();}
const box=document.getElementById('assetScanCandidates');
if(box){box.style.display='none';box.innerHTML='';}
toast('✅ Nilai diisi: '+fmtFull(n));
}
function quickScanAsset(id){
const a=(D.assets||[]).find(x=>sameId(x.id,id));
if(!a){toast('⚠️ Aset tidak ditemukan');return;}
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai gambar, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const rawNums=text.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}/g)||[];
let nums=rawNums.map(s=>parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))).filter(n=>n>=1000&&n<100000000000);
nums=[...new Set(nums.map(n=>Math.round(n)))].sort((a,b)=>b-a).slice(0,6);
if(!nums.length){toast('⚠️ Nominal tidak terbaca, isi manual lewat Edit Aset ya');return;}
showQuickScanPicker(id,nums);
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}
function showQuickScanPicker(id,nums){
const a=(D.assets||[]).find(x=>sameId(x.id,id));
if(!a)return;
document.getElementById('quickScanAssetName').textContent=a.name;
const body=document.getElementById('quickScanBody');
body.innerHTML='<div class="u-fs12 u-t2 u-mb6">Nilai lama: '+fmtFull(a.nilai||0)+'</div>'+
'<div class="u-fs12 u-fw600 u-mb8">Pilih angka baru yang sesuai:</div>'+
nums.map(n=>`<button type="button" class="chip-btn" style="margin:0 6px 8px 0" data-action="applyQuickScan" data-args="${escapeHtml(JSON.stringify([id, n]))}">${fmtFull(n)}</button>`).join('')+
'<div class="u-fs11 u-t2 u-mt6">Kalau tidak ada yang cocok, batalkan lalu isi manual lewat Edit Aset.</div>';
openModal('quickScanModal');
}
function applyQuickScan(id,n){
const a=(D.assets||[]).find(x=>sameId(x.id,id));
if(!a)return;
a.nilai=n;
save();
closeModal('quickScanModal');
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();
toast('✅ '+escapeHtml(a.name)+' diupdate ke '+fmtFull(n));
}
function scanReceiptBelanja(){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
const insightEl=document.getElementById('txScanInsight');
if(insightEl){insightEl.style.display='none';insightEl.innerHTML='';}
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai struk, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const rawNums=text.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}/g)||[];
const nums=rawNums.map(s=>parseFloat(s.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(',','.'))).filter(n=>n>=500&&n<500000000);
let amt=0;
const labeledTotal=extractLabeledAmount(text,RECEIPT_TOTAL_LABEL_RE);
if(labeledTotal!=null){amt=Math.round(labeledTotal);const el=document.getElementById('txAmt');if(el){el.value=amt;if(el.oninput)el.oninput();}}
else if(nums.length){amt=Math.round(Math.max(...nums));const el=document.getElementById('txAmt');if(el){el.value=amt;if(el.oninput)el.oninput();}}
let isoDate=null;
const dm=text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
if(dm){let[,d,m,y]=dm;if(y.length===2)y='20'+y;const iso=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(!isNaN(new Date(iso).getTime())){isoDate=iso;const el=document.getElementById('txDate');if(el)el.value=iso;}}
const firstLine=text.split('\n').map(l=>l.trim()).find(l=>l.length>3&&!/^\d+$/.test(l)&&!RECEIPT_NOISE_LINE_RE.test(l)&&(l.match(/[a-zA-Z]/g)||[]).length>=8);
if(firstLine){const el=document.getElementById('txNote');if(el)el.value=firstLine.slice(0,60);}
const guessedCat=guessCategoryFromReceiptText(text);
const catField=document.getElementById('txCat');
if(guessedCat&&catField&&!catField.value.trim()){
selectTxCat(guessedCat.name);
}
// BUGFIX: dulu fallback ke `text` (seluruh blob OCR mentah) kalau firstLine gagal
// kedetek -- akibatnya catLearnKey() bisa ambil kata generik boilerplate struk
// (mis. "kirim" dari "Total Ongkos Kirim") lalu diajarkan sbg keyword kategori.
// Sekali itu tersimpan, SEMUA scan lain yg kebetulan mengandung kata generik itu
// ikut ke-tag ke kategori yg salah. Fix: kalau firstLine (nama produk/toko yg
// sudah difilter RECEIPT_NOISE_LINE_RE) tidak ketemu, JANGAN belajar sama sekali
// drpd belajar dari sumber yg tidak reliable.
_txCatLearnSource=firstLine?firstLine.slice(0,120):null;
const catNameForInsight=(catField&&catField.value.trim())||(guessedCat?guessedCat.name:'');
renderReceiptInsight(amt,catNameForInsight,guessedCat);
const stockPanelEl=document.getElementById('txStockPanel');
if(stockPanelEl&&stockPanelEl.style.display!=='none'){
const guessedPart=guessSparepartFromReceiptText(text);
if(guessedPart){
const chk=document.getElementById('txAddStock');
if(chk&&!chk.checked){chk.checked=true;toggleTxStockFields();}
const existing=D.partsStock.find(p=>p.name.toLowerCase().includes(guessedPart.name.toLowerCase())||guessedPart.name.toLowerCase().includes(p.name.toLowerCase()));
const sel=document.getElementById('txStockItem');
if(sel){sel.value=existing?existing.id:'__new__';onTxStockItemChange();}
if(!existing){const nameEl=document.getElementById('txStockNewName');if(nameEl)nameEl.value=guessedPart.name;}
const qtyEl=document.getElementById('txStockQty');if(qtyEl)qtyEl.value=guessedPart.qty;
const unitEl=document.getElementById('txStockUnit');if(unitEl)unitEl.value=guessedPart.unit;
toast('✅ Scan selesai — tebakan sparepart & jumlah otomatis terisi, cek & koreksi kalau meleset');
} else {
toast(amt?'✅ Scan selesai, cek & koreksi hasilnya. Nama sparepart tidak terbaca jelas, isi manual ya':'⚠️ Nominal tidak terbaca, isi manual ya');
}
} else {
toast(amt?'✅ Scan selesai, cek & koreksi hasilnya':'⚠️ Nominal tidak terbaca, isi manual ya');
}
await maybeOfferPaylaterReminder(text,amt||null,isoDate);
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}
function guessCategoryFromReceiptText(text){
const lower=String(text).toLowerCase();
if(D.learnedItemCat){
for(const key in D.learnedItemCat){
if(key&&lower.includes(key)){
const catName=D.learnedItemCat[key];
const cat=D.categories.expense.find(c=>c.name===catName);
if(cat)return cat;
}
}
}
for(const[re]of CAT_EMOJI_GUESS){
if(re.test(lower)){
const cat=D.categories.expense.find(c=>re.test(c.name));
if(cat)return cat;
}
}
if(/indomaret|alfamart|alfamidi|superindo|hypermart|carrefour|hero|lottemart|transmart/i.test(lower)){
const cat=D.categories.expense.find(c=>/belanja|dapur|sabun/i.test(c.name));
if(cat)return cat;
}
return null;
}
// BUGFIX (bareng fix _txCatLearnSource di atas): kata umum boilerplate struk/dompet
// digital -- kalau kepilih jadi key, bisa nyasar ke SEMUA struk lain yg kebetulan
// mengandung kata itu (mis. "kirim" muncul di hampir semua "Total Ongkos Kirim"),
// bukan spesifik ke barang yg dibeli. Diblok di sini sbg lapis kedua (lapis pertama:
// _txCatLearnSource cuma diisi dari firstLine yg sudah difilter RECEIPT_NOISE_LINE_RE).
const CAT_LEARN_KEY_BLOCKLIST=new Set(['kirim','ongkos','ongkir','total','bayar','tagihan',
'transaksi','diskon','metode','invoice','pesanan','ringkasan','rincian','detail','bantuan',
'hubungi','layanan','cashback','pembayaran','tabungan','dashboard','voucher','asuransi',
'subtotal','produk','jasa','aplikasi','platform','selesai','diproses','dikirim','dibatalkan']);
function catLearnKey(name){
const words=String(name).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!/^\d+$/.test(w)&&!CAT_LEARN_KEY_BLOCKLIST.has(w));
return words[0]||null;
}
function learnCatFromItemName(name,catName){
if(!name||!catName)return;
const key=catLearnKey(name);
if(!key)return;
if(!D.learnedItemCat)D.learnedItemCat={};
D.learnedItemCat[key]=catName;
}
function rememberLastAccForCat(catName,accId){
if(!catName||!accId)return;
if(!D.lastAccByCategory)D.lastAccByCategory={};
D.lastAccByCategory[catName]=accId;
}
function findPossibleDuplicateTx(amt,date,note,type){
const noteNorm=String(note||'').trim().toLowerCase();
return D.transactions.find(t=>{
if(t.id===txEditId)return false;
if(t.type!==type)return false;
if(Math.abs(t.amount-amt)>0.5)return false;
if(t.date!==date)return false;
const tNoteNorm=String(t.note||'').trim().toLowerCase();
if(!noteNorm&&!tNoteNorm)return true;
if(!noteNorm||!tNoteNorm)return false;
return tNoteNorm.includes(noteNorm)||noteNorm.includes(tNoteNorm);
});
}
const SPAREPART_LINE_KEYWORDS=/oli|olie|kampas|rem|busi|aki|accu|ban\b|tubeless|filter|saring|rantai|gear|sprocket|lampu|bohlam|kabel|bearing|klaher|shock\s*breaker|shockbreaker|per\s*shock|radiator|coolant|timing\s*belt|fanbelt|v-?belt|wiper|piston|ring\s*piston|gasket|packing|seal|bearing|karet|roller|cvt|v-?matic|selang|master\s*rem|kanvas|platina|karburator|injektor|throttle|sensor|dinamo|starter|spul|kiprok|cdi|koil/i;
function guessSparepartFromReceiptText(text){
const lines=String(text).split('\n').map(l=>l.trim()).filter(Boolean);
for(const line of lines){
if(!SPAREPART_LINE_KEYWORDS.test(line))continue;
if(/^(jl\.|jalan|telp|npwp|kasir|struk|nota|invoice)/i.test(line))continue;
let qty=1,unit='pcs';
const qtyM=line.match(/\bx\s*(\d{1,3})\b/i)||line.match(/\b(\d{1,3})\s*x\b/i)||line.match(/\b(\d{1,3})\s*(pcs|buah|unit|set|liter|ltr|botol)\b/i);
if(qtyM){
qty=parseInt(qtyM[1],10)||1;
if(qtyM[2]&&/liter|ltr/i.test(qtyM[2]))unit='liter';
else if(qtyM[2]&&/set/i.test(qtyM[2]))unit='set';
else if(qtyM[2]&&/botol/i.test(qtyM[2]))unit='botol';
}
let name=line
.replace(/\bx\s*\d{1,3}\b/gi,'')
.replace(/\b\d{1,3}\s*(pcs|buah|unit|set|liter|ltr|botol)\b/gi,'')
.replace(/rp\.?\s*[\d.,]+/gi,'')
.replace(/[\d.,]{4,}/g,'')
.replace(/\s{2,}/g,' ')
.replace(/[-–—:|]+$/,'')
.trim();
if(name.length<3)name=line.trim();
if(name.length>50)name=name.slice(0,50).trim();
return{name,qty,unit};
}
return null;
}
/* moved to modules-render.js: renderReceiptInsight */

// --- Deteksi item checkout dari screenshot belanja (Worth-It) ---
// Digabung dari backup-restore.js (v89) — domainnya OCR juga,
// cuma dulu kepisah gara-gara ikut nomor batch lama. Dipakai WorthIt.scanCheckout()/scanCheckoutList()
// di worthit.js lewat scanWorthItCheckout(mode). Bergantung ke ocrRecognize()/scanErrorMessage()
// (sudah di file yang sama sekarang) & WorthIt.* (worthit.js, diakses lewat variabel global saat runtime).
// BUGFIX: badge pendek seperti "Pasti Ori" belum masuk exclude list, jadi suka
// ketuker jadi "nama produk" padahal cuma label kecil di bawah nama produk asli.
const CHECKOUT_UI_EXCLUDE_RE=/checkout|keranjang|alamat|pengiriman|^toko\b|kargo|estimasi|\btiba\b|gratis|pengembalian|proteksi|rusak\s*total|asuransi|kasih\s*catatan|tambah\s*catatan|belanjaanmu|hemat\s*rp|dapat\s*bonus|tagihan|bayar\s*sekarang|^stok|^sisa|^plus\b|pembayaran|voucher|kupon|rincian|subtotal|admin|lihat\s*semua|beli\s*sekalian|rating\s*tinggi|terjadi\s*kesalahan|coba\s*lagi|pasti\s*ori|^ori\s*100|100%?\s*ori|garansi\s*resmi|cod\s*tersedia|^cashback\b|flash\s*sale|^termurah\b|^terlaris\b|best\s*seller|stok\s*terbatas|barang\s*ready/i;
const CHECKOUT_ADDR_RE=/\bjl\.?\b|\balamat\b|\bkecamatan\b|\bkelurahan\b|\bkabupaten\b/i;
const CHECKOUT_RATING_PREFIX_RE=/^\d{1,2}[.,]\d\s+(?=[A-Za-z])/;
function guessCheckoutItemName(text){
const lines=String(text).split('\n').map(l=>l.trim()).filter(Boolean);
let priceIdx=lines.findIndex(l=>/rp\s?\d/i.test(l));
const searchLines=priceIdx>=0?lines.slice(Math.max(0,priceIdx-5),priceIdx):lines;
let best=null,bestLetters=0;
for(const raw of searchLines){
const l=raw.replace(CHECKOUT_RATING_PREFIX_RE,'');
if(l.length<8||l.length>110)continue;
if(/^rp\b/i.test(l)||/^\d/.test(l))continue;
if(CHECKOUT_ADDR_RE.test(l)||CHECKOUT_UI_EXCLUDE_RE.test(l))continue;
const letters=(l.match(/[a-zA-Z]/g)||[]).length;
if(letters<8)continue;
// BUGFIX: dulu ambil kandidat TERAKHIR di window, jadi badge pendek yang muncul
// setelah nama produk asli (co. "Pasti Ori") bisa menimpa hasil yang benar.
// Sekarang ambil kandidat dengan jumlah huruf TERBANYAK, karena nama produk
// asli hampir selalu lebih panjang/detail dibanding badge/label kecil.
if(letters>bestLetters){best=l;bestLetters=letters;}
}
if(best)return best.slice(0,80);
for(const raw of lines){
const l=raw.replace(CHECKOUT_RATING_PREFIX_RE,'');
if(l.length<8||l.length>90)continue;
if(/^rp\b/i.test(l)||/^\d/.test(l))continue;
if(CHECKOUT_ADDR_RE.test(l)||CHECKOUT_UI_EXCLUDE_RE.test(l))continue;
const letters=(l.match(/[a-zA-Z]/g)||[]).length;
if(letters>=8)return l.slice(0,80);
}
return null;
}
const CHECKOUT_PRICE_CUT_RE=/beli\s*sekalian|opsi\s*pengiriman|metode\s*pembayaran|rincian\s*pembayaran|produk\s*lain|rekomendasi\s*untuk/i;
function guessCheckoutPrices(text){
const full=String(text);
const cutIdx=full.search(CHECKOUT_PRICE_CUT_RE);
const scoped=cutIdx>=0?full.slice(0,cutIdx):full;
const rpMatches=[...scoped.matchAll(/rp\s?([\d][\d.,]*)/gi)].map(m=>normalizeOcrNumber(m[1])).filter(n=>!isNaN(n)&&n>=500);
const pctMatch=scoped.match(/(\d{1,2})\s?%/);
const diskonPct=pctMatch?parseInt(pctMatch[1],10):null;
for(let i=0;i<rpMatches.length-1;i++){
const x=rpMatches[i],y=rpMatches[i+1];
const a=Math.max(x,y),b=Math.min(x,y);
if(a!==b && b>=a*0.3 && b<=a*0.97){
return{hargaNormal:Math.round(a),harga:Math.round(b),diskonPct};
}
}
return{hargaNormal:null,harga:rpMatches.length?Math.round(Math.max(...rpMatches)):null,diskonPct:null};
}
const WORTHIT_KEBUTUHAN_KEYWORDS=/\bban\b|kampas|\brem\b|\boli\b|busi|\baki\b|sparepart|onderdil|obat|vitamin|susu|popok|beras|sembako|sekolah|buku\s*pelajaran|seragam|listrik|air\s*pdam|bpjs|\btoken\b|pulsa|paket\s*data|masker|sabun|deterjen/i;
function guessWorthItCategory(text){
return WORTHIT_KEBUTUHAN_KEYWORDS.test(String(text).toLowerCase())?'kebutuhan':'keinginan';
}
// Total FINAL yang bakal kepotong/dibayar (sudah termasuk ongkir, asuransi,
// semua diskon promo, dikurangi bonus cashback) — beda dari harga produk
// doang yang ditangkap guessCheckoutPrices(). Kalau ada, ini yang lebih
// tepat buat field "Harga (yang akan dibayar)".
// Istilah beda-beda tiap marketplace, jadi dicek beberapa varian:
//   - Tokopedia: "Total Tagihan"
//   - Shopee/Lazada/TikTok Shop: "Total Pembayaran"
//   - Blibli & lainnya: "Total Bayar" / "Total yang Harus Dibayar"
// Fallback ke "Grand Total" kalau semua varian di atas nggak ketemu.
// Ambil kemunculan TERAKHIR karena biasanya baris ini muncul 2x (ringkasan
// & footer sebelum tombol Bayar) — yang terakhir paling dekat ke tombol
// bayar, jadi paling representatif.
// BUGFIX: dulu [^\d\n]{0,25} melarang newline antara label & "Rp", padahal di
// banyak screenshot (co. Tokopedia) "Total Tagihan" dan "Rp4.041.450" itu dua
// baris terpisah -> regex gak pernah match, hasilnya selalu null. Newline
// sekarang diperbolehkan di celah itu (digit tetap dilarang biar gak accidentally
// lompatin angka lain yang gak berhubungan).
const CHECKOUT_TOTAL_RE=/total\s*(?:tagihan|pembayaran|transaksi|bayar|(?:yang\s*)?harus\s*dibayar)\b[^\d]{0,25}rp\s?([\d][\d.,]*)/gi;
const CHECKOUT_TOTAL_FALLBACK_RE=/grand\s*total[^\d]{0,25}rp\s?([\d][\d.,]*)/gi;
function guessCheckoutTotalTagihan(text){
const full=String(text);
let matches=[...full.matchAll(CHECKOUT_TOTAL_RE)];
if(!matches.length)matches=[...full.matchAll(CHECKOUT_TOTAL_FALLBACK_RE)];
if(!matches.length)return null;
const n=normalizeOcrNumber(matches[matches.length-1][1]);
return isNaN(n)?null:Math.round(n);
}
// Cicilan/tenor: format beda-beda tiap marketplace/metode:
//   - Tokopedia (Tokopedia Card dll): "Cicil 12x Rp308.736"
//   - Shopee/Lazada (kartu kredit): "Cicilan 3 Bulan Rp1.533.000"
//   - Shopee SPayLater / Kredivo / Akulaku: "SPayLater Rp1.150.000 x 4"
//     (urutan kebalik: nominal dulu baru jumlah cicilan)
// Dicoba berurutan, dipakai pola pertama yang cocok. Ambang Rp>=10.000
// buat hindari salah tangkap baris "1 x Rp0" (qty produk/hadiah gratis).
const CICILAN_PATTERNS=[
{re:/cicil(?:an)?\s*(\d{1,2})\s*x\D{0,15}rp\s?([\d][\d.,]*)/i,tenorFirst:true}, // Tokopedia
{re:/cicil(?:an)?\b[^\d\n]{0,25}?(\d{1,2})\s*bulan\D{0,20}rp\s?([\d][\d.,]*)/i,tenorFirst:true}, // Shopee/Lazada (termasuk "Cicilan Kartu Kredit 12 Bulan")
{re:/(?:spaylater|paylater|akulaku|kredivo|indodana)\D{0,15}rp\s?([\d][\d.,]*)\s*x\s*(\d{1,2})\b/i,tenorFirst:false}, // paylater terbalik
{re:/rp\s?([\d][\d.,]*)\s*x\s*(\d{1,2})\s*bulan/i,tenorFirst:false} // generik "RpX x N Bulan"
];
function guessCheckoutCicilan(text){
const full=String(text);
for(const{re,tenorFirst}of CICILAN_PATTERNS){
const m=full.match(re);
if(!m)continue;
const tenor=parseInt(tenorFirst?m[1]:m[2],10);
const perBulan=normalizeOcrNumber(tenorFirst?m[2]:m[1]);
if(tenor&&tenor<=60&&!isNaN(perBulan)&&perBulan>=10000)return{tenor,perBulan:Math.round(perBulan)};
}
return null;
}
// Deteksi metode "bayar bulan depan" / paylater SEKALI BAYAR (bukan cicilan
// multi-bulan yang sudah ditangani CICILAN_PATTERNS di atas) — mis. GoPay
// Later, ShopeePayLater/Kredivo/Akulaku/Indodana versi bayar penuh di tempo
// berikutnya (BUKAN dicicil per bulan), atau frasa umum "Bayar Nanti"/
// "Bayar Bulan Depan"/"Tempo 30 Hari". Kalau ketemu & belum ketangkep pola
// cicilan di atas, dipakai buat nawarin bikin pengingat 🧾 Tagihan (sekali)
// lewat maybeOfferPaylaterReminder() di bawah, biar tidak lupa pas ditagih.
const PAYLATER_DUE_NEXT_MONTH_RE=/(gopay\s*later|shopee\s*pay\s*later|spaylater|paylater|kredivo|akulaku|indodana|bayar\s*(?:nanti|bulan\s*depan)|tempo\s*30\s*hari)/i;
function detectPaylaterDueNextMonth(text,alreadyCicilan){
if(alreadyCicilan)return null; // sudah ditangani sbg cicilan multi-bulan, jangan dobel
const full=String(text);
const m=full.match(PAYLATER_DUE_NEXT_MONTH_RE);
if(!m)return null;
const totalTagihan=guessCheckoutTotalTagihan(full);
return{label:m[0].trim(),amount:totalTagihan};
}
// Setelah scan struk/checkout, kalau kedetek metode bayar-bulan-depan di
// atas, tawarin bikin pengingat 🧾 Tagihan (sekali, jatuh tempo +1 bulan
// dari tanggal transaksi/hari ini) lewat askConfirm — supaya nggak kelupaan
// pas ditagih. fallbackAmt/fallbackDateStr dipakai kalau nominal/tanggal
// tidak kebaca lewat pola "Total Tagihan" (mis. struknya cuma ada "Total
// Belanja", bukan "Total Tagihan/Pembayaran/Bayar").
async function maybeOfferPaylaterReminder(text,fallbackAmt,fallbackDateStr,alreadyCicilan){
if(typeof askConfirm!=='function'||typeof D==='undefined'||!D.bills)return;
const paylater=detectPaylaterDueNextMonth(text,!!alreadyCicilan);
if(!paylater)return;
const amt=paylater.amount||fallbackAmt;
if(!amt||amt<=0)return;
const baseDate=fallbackDateStr&&!isNaN(new Date(fallbackDateStr).getTime())?new Date(fallbackDateStr):new Date();
const due=new Date(baseDate);due.setMonth(due.getMonth()+1);
const dueStr=due.toISOString().slice(0,10);
const amtLabel=typeof fmt==='function'?fmt(amt):('Rp'+amt);
const ok=await askConfirm('Terdeteksi metode bayar nanti/bulan depan ('+paylater.label+') senilai '+amtLabel+'. Tambahkan pengingat jatuh tempo '+dueStr+' ke 🧾 Tagihan?',{icon:'📅',okText:'✅ Ya, Tambahkan',cancelText:'Tidak Usah',danger:false});
if(!ok)return;
D.bills.push({id:uid(),name:'Bayar '+paylater.label,amount:Math.round(amt),nextDue:dueStr,freq:'sekali',category:'',subcategory:'',accountId:(D.accounts&&D.accounts[0])?D.accounts[0].id:null,note:'Otomatis dari hasil scan — cek nominal & tanggal sebelum jatuh tempo',kind:'tagihan',shared:false,sharedPct:null,totalAmount:null});
save();
if(typeof refreshBillEverywhere==='function')refreshBillEverywhere();
toast('🔔 Pengingat tagihan bulan depan ditambahkan (🧾 Tagihan)');
}
function scanWorthItCheckout(mode){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
toast('🔍 Memindai screenshot checkout, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
const name=guessCheckoutItemName(text);
const{hargaNormal,harga:hargaItem,diskonPct}=guessCheckoutPrices(text);
const totalTagihan=guessCheckoutTotalTagihan(text);
const cicilan=guessCheckoutCicilan(text);
// Kalau "Total Tagihan" ketemu, itu yang dipakai sebagai harga akhir
// (sudah termasuk ongkir/asuransi/diskon/cashback) — lebih akurat
// daripada harga produk doang, sesuai label field "Harga (yang akan
// dibayar)". Kalau tidak ketemu, tetap fallback ke harga produk seperti
// sebelumnya (mis. screenshot cuma halaman produk, bukan checkout).
const harga=totalTagihan||hargaItem;
const cat=guessWorthItCategory(text);
const map={
single:{name:'wiName',price:'wiPrice',chk:'wiIsDiskon',normal:'wiHargaNormal',cat:'wiCategory',toggle:()=>WorthIt.toggleDiskon(),sync:()=>WorthIt.syncDiskon()},
list:{name:'wlName',price:'wlPrice',chk:'wlIsDiskon',normal:'wlHargaNormal',cat:'wlCategory',toggle:()=>WorthIt.toggleDiskonList(),sync:()=>WorthIt.syncDiskonList()}
}[mode];
if(!map)return;
const filled=[];
if(name){document.getElementById(map.name).value=name;filled.push('Nama Barang');}
if(harga){document.getElementById(map.price).value=harga;filled.push(totalTagihan?'Harga (Total Tagihan)':'Harga');}
const catEl=document.getElementById(map.cat); if(catEl){catEl.value=cat;filled.push('Kategori (tebakan, cek lagi)');}
const chkEl=document.getElementById(map.chk);
if(hargaNormal){
if(chkEl)chkEl.checked=true;
map.toggle();
document.getElementById(map.normal).value=hargaNormal;
map.sync();
filled.push('Harga Normal'+(diskonPct?(' (≈'+diskonPct+'% diskon)'):''));
} else if(chkEl){
chkEl.checked=false;
map.toggle();
}
// Cicilan cuma ada di form mode "single" (wiMethod/wiTenor/wiCicilanBulan).
// Mode "list" tidak punya field ini, jadi dilewati kalau mode==='list'.
if(cicilan&&mode==='single'){
const methodEl=document.getElementById('wiMethod');
if(methodEl){
methodEl.value='cicilan';
WorthIt.onMethodChange();
const tenorEl=document.getElementById('wiTenor');
const bulanEl=document.getElementById('wiCicilanBulan');
if(tenorEl)tenorEl.value=cicilan.tenor;
if(bulanEl)bulanEl.value=cicilan.perBulan;
filled.push('Cicilan '+cicilan.tenor+'x '+fmt(cicilan.perBulan)+'/bln');
}
}
toast(filled.length?'✅ Terisi otomatis: '+filled.join(', ')+' — cek lagi sebelum lanjut':'⚠️ Tidak banyak yang terbaca, isi manual ya');
await maybeOfferPaylaterReminder(text,harga||null,null,!!cicilan);
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
}
};
inp.click();
}

// ==================== BillMultiScan (Sesi 124) ====================
// BARU: parser & flow scan MULTI-ITEM untuk screenshot "Rincian Tagihan" (mis. Tagihan
// Kartu Kredit/PayLater marketplace) yang punya BANYAK baris transaksi sekaligus dalam 1
// foto -- beda dari scanReceipt()/scanBuktiTransfer() dkk di atas yang cuma ambil 1 nominal
// per foto. Pola screenshot: tiap item biasanya berurutan nama/deskripsi transaksi, lalu
// tanggal ("23 Jun 2026"), lalu nominal bertanda ("-Rp87.724" / "+Rp463.585"). 100% REUSE
// ocrRecognize() (di atas) utk ambil teksnya -- parseBillMultiItems() sendiri murni fungsi
// teks->array (tidak baca/tulis DOM), supaya gampang dites lewat loadSource() (lihat
// tests/scan-ocr-multi-item-parse.test.js).
// wajib ada tanda +/- di depan "Rp" -- ini yang membedakan 1 baris ITEM transaksi (selalu
// bertanda di screenshot rincian tagihan) dari baris ringkasan/footer tanpa tanda (mis.
// "Total Tagihan" / "Minimal Bayar" / "Rp568.469" polos), supaya baris ringkasan itu TIDAK
// ikut kebaca sbg item transaksi tersendiri.
const BILL_MULTI_AMOUNT_RE=/([+\-])\s*Rp\.?\s*(\d[\d.,]*)/i;
const BILL_MULTI_DATE_RE=/(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{4})/;
// baris "chrome" umum di screenshot tagihan (header kolom, tombol, footer total) yang bukan
// bagian dari 1 item transaksi -- dilewati saat mencari nama/tanggal mundur dari 1 nominal.
const BILL_MULTI_NOISE_LINE_RE=/^rincian\s*tagihan$|^total\s*tagihan$|^bayar\s*sekarang$|^minimal\s*bayar$|^batas\s*waktu\s*bayar$|^penting\s*:|^lihat\s*detail$/i;
function _billMultiIsNoiseLine(line){
if(!line)return true;
const t=String(line).trim();
if(!t)return true;
return BILL_MULTI_NOISE_LINE_RE.test(t);
}
// tanggal per baris format "23 Jun 2026" (reuse _bulanIndoMap yang sudah ada di atas file
// ini, dipakai bareng extractDateFromText()).
function _billMultiParseDateLine(line){
if(!line)return null;
const m=String(line).match(BILL_MULTI_DATE_RE);
if(!m)return null;
const[,d,bulanRaw,y]=m;
const bulan=_bulanIndoMap[bulanRaw.toLowerCase()];
if(!bulan)return null;
const iso=`${y}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
if(isNaN(new Date(iso).getTime()))return null;
return iso;
}
// Default unchecked utk baris yang biasanya BUKAN tagihan/pengeluaran nyata (pembayaran yang
// sudah masuk, biaya administrasi e-statement, dst) -- lihat spesifikasi Sesi 124. Baris lain
// (item tagihan/transaksi biasa) default TERCENTANG.
function _billMultiDefaultChecked(nama){
if(!nama)return true;
const t=String(nama).toUpperCase();
if(/PAYMENT/.test(t))return false;
if(/PEMBAYARAN/.test(t))return false;
if(/E[\s\-.]?STATEMENT/.test(t))return false;
return true;
}
// parseBillMultiItems(text) -- input: teks mentah hasil OCR (result.data.text dari
// ocrRecognize()). Output: array {nama,tanggal,nominal,checked}. Toleran thd noise OCR:
// dicari mundur dari tiap baris nominal lewat WINDOW beberapa baris (bukan pola 3-baris
// kaku), jadi tetap kebaca meski ada baris kosong/noise yang nyempil di antara nama-
// tanggal-nominal (umum terjadi krn hasil Tesseract).
function parseBillMultiItems(text){
if(!text)return[];
const lines=String(text).split('\n').map(l=>l.trim());
const items=[];
for(let i=0;i<lines.length;i++){
const line=lines[i];
if(!line||_billMultiIsNoiseLine(line))continue;
const amtMatch=line.match(BILL_MULTI_AMOUNT_RE);
if(!amtMatch)continue;
const nominal=normalizeOcrNumber(amtMatch[2]);
if(isNaN(nominal)||nominal<=0)continue;
// cari tanggal mundur dari baris nominal ini (window 4 baris, lewati noise/kosong)
let tanggal=null,dateLineIdx=-1;
for(let j=i;j>=Math.max(0,i-4);j--){
if(j!==i&&BILL_MULTI_AMOUNT_RE.test(lines[j])&&!_billMultiIsNoiseLine(lines[j]))break;
if(_billMultiIsNoiseLine(lines[j]))continue;
const iso=_billMultiParseDateLine(lines[j]);
if(iso){tanggal=iso;dateLineIdx=j;break;}
}
// cari nama mundur dari baris tanggal (atau dari baris nominal kalau tanggal tidak ketemu)
const searchFrom=dateLineIdx>=0?dateLineIdx:i;
let nama=null;
for(let j=searchFrom-1;j>=Math.max(0,searchFrom-4);j--){
const cand=lines[j];
if(_billMultiIsNoiseLine(cand))continue;
if(BILL_MULTI_AMOUNT_RE.test(cand))continue;
if(_billMultiParseDateLine(cand))continue;
nama=cand;
break;
}
if(!nama)nama='(tanpa nama)';
items.push({nama,tanggal,nominal:Math.round(nominal),checked:_billMultiDefaultChecked(nama)});
}
return items;
}
// BillMultiScan -- object flow UI (ambil foto -> OCR -> parseBillMultiItems -> preview
// checklist -> import terpilih ke D.bills), pola sama persis GoldImport
// (modules/asset/aset-emas-impor.js: open/preview/commit) & scanAssetPortfolio() di atas
// (candidate list). 100% reuse ocrRecognize(); TIDAK ada struktur data baru -- item hasil
// import masuk ke D.bills dgn field yang SAMA PERSIS dgn yang dipakai _saveBillInner()
// (modules/finance/tagihan-kalender.js).
const BillMultiScan={
items:[],
scan(){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
this.items=[];
openModal('billMultiScanModal');
this.render();
const box=document.getElementById('billMultiScanBody');
if(box)box.innerHTML='🔍 Memindai gambar, mohon tunggu...';
toast('🔍 Memindai gambar, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
this.items=parseBillMultiItems(text);
this.render();
toast(this.items.length?'✅ '+this.items.length+' item terbaca — cek & koreksi centangnya sebelum impor':'⚠️ Tidak ada item tagihan yang terbaca dari foto ini');
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
this.render();
}
};
inp.click();
},
render(){
const box=document.getElementById('billMultiScanBody');
if(!box)return;
if(!this.items.length){
box.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada item terbaca. Scan foto rincian tagihan dulu.</div></div>';
return;
}
box.innerHTML=this.items.map((it,i)=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
<input type="checkbox" ${it.checked?'checked':''} style="width:16px;height:16px;margin-top:2px;flex-shrink:0" data-action="BillMultiScan.toggle" data-args="${escapeHtml(JSON.stringify([i]))}">
<div style="flex:1;font-size:12px">
<div style="font-weight:700">${escapeHtml(it.nama)}</div>
<div class="u-t2">${it.tanggal||'tanggal tidak terbaca'} · ${fmtFull(it.nominal)}</div>
</div>
</div>`).join('');
},
toggle(i){
const it=this.items[i];
if(!it)return;
it.checked=!it.checked;
this.render();
},
importSelected(){
const selected=this.items.filter(it=>it.checked);
if(!selected.length){toast('⚠️ Pilih minimal 1 item dulu');return;}
selected.forEach(it=>{
D.bills.push({
id:uid(),
name:it.nama,
amount:it.nominal,
nextDue:it.tanggal||todayStr(),
freq:'sekali',
category:'',
subcategory:'',
accountId:D.accounts[0]?.id,
note:'Impor dari Scan Rincian Tagihan',
kind:'tagihan',
shared:false,
sharedPct:null,
totalAmount:null
});
});
save();
closeModal('billMultiScanModal');
if(typeof refreshBillEverywhere==='function')refreshBillEverywhere();
toast('✅ '+selected.length+' tagihan diimpor dari scan');
}
};
function scanBillMultiItems(){return BillMultiScan.scan();}

// ==================== UniversalScan (Sesi 125) ====================
// BARU: scan screenshot BANK / E-WALLET / BIBIT / JAGO (Kantong) buat isi ➕/Edit Akun
// (accModal) otomatis -- beda dari scanAssetPortfolio() (portofolio ASET, bukan akun) &
// BillMultiScan (item TAGIHAN, bukan saldo akun). 100% REUSE ocrRecognize() (di atas),
// D.accounts, save(), recalcAccBalance() (modules/finance/akun.js, dipanggil lewat
// forward reference runtime -- sama seperti BillMultiScan manggil refreshBillEverywhere()
// di atas), openModal()/closeModal() bawaan. detectScreenType()/parse*Screen() SEMUA murni
// fungsi teks->data (tidak baca/tulis DOM) supaya gampang dites lewat loadSource().
//
// 4 jenis layar yang dikenali:
//  - "bank"        : layar akun bank/digital-bank biasa ("Total Saldo", "No. Rekening") -> 1 akun
//  - "wallet"      : layar e-wallet (GoPay/DANA/OVO/ShopeePay dkk) -> 1 akun
//  - "bibit"       : layar portofolio Bibit ("Total Investasi"/"Portofolio") -> 1 akun
//  - "jago_pocket" : layar daftar "Kantong" (Bank Jago dkk, banyak kantong sekaligus
//                    dalam 1 foto) -> BANYAK akun, pola mirip parseBillMultiItems() di atas
//
// Parser di sini bersifat "best effort" (OCR + toleransi noise) -- hasilnya SELALU lewat
// preview checklist (universalOcrModal) dulu sebelum diimpor, jadi item yang salah baca
// bisa dicentang-lepas dulu sebelum disimpan ke D.accounts.
// detectScreenTypeScores(text) -- Batch 19: ekstraksi MURNI dari body scoring yang
// sebelumnya inline di detectScreenType() (Sesi 125), supaya bisa dipakai ulang oleh
// detectScreenTypeWithConfidence() tanpa duplikasi aturan skor. detectScreenType() TIDAK
// berubah kontraknya (tetap return string|null), cuma manggil helper ini sekarang.
function detectScreenTypeScores(text){
const t=String(text||'').toLowerCase();
const scores={bank:0,wallet:0,bibit:0,jago_pocket:0};
if(/kantong\s*utama|kantong\s*bayar|kantong\s*berbagi|cari\s*kantong/.test(t))scores.jago_pocket+=3;
if(/aset\s*saya/.test(t))scores.jago_pocket+=2;
if(/\bbibit\b|reksa\s*dana\s*pasar\s*uang|portofolio\s*saya|top\s*gainer|imbal\s*hasil/.test(t))scores.bibit+=3;
// BUGFIX (laporan user): layar "Detail Portofolio" per-instrumen Bibit (dibuka lewat
// tap 1 reksa dana/saham dari halaman lain, mis. dari hasil cari) TIDAK PUNYA banner
// ringkasan atas ("Nilai Portofolio .../Imbal Hasil") yang jadi sumber kata kunci di
// atas -- cuma kartu detail 1 instrumen (Nilai Sekarang/Modal Investasi/Jumlah Unit
// atau Total Unit). Akibatnya detectScreenType() return null sama sekali -> scan
// gagal total ("Nominal tidak ditemukan"), bukan cuma parseBibitScreen() yang gagal.
// Fingerprint kombinasi 3 label ini spesifik ke kartu instrumen Bibit (tidak overlap
// dgn layar bank/wallet/jago_pocket) -- aman ditambahkan ke skor bibit yang sudah ada,
// TIDAK mengubah/mengurangi skor screen lain.
if(/modal\s*investasi/.test(t)&&/nilai\s*(sekarang|saat\s*ini)/.test(t)&&/(jumlah|total)\s*unit/.test(t))scores.bibit+=3;
if(/gopay|\bdana\s*aktif\b|shopeepay|\bovo\b/.test(t))scores.wallet+=3;
if(/tarik\s*tunai|top\s*up\b/.test(t))scores.wallet+=1;
if(/no\.?\s*rekening|nomor\s*rekening|total\s*saldo|\btabungan\b|\bdeposito\b/.test(t))scores.bank+=3;
if(/\brekening\b/.test(t))scores.bank+=1;
return scores;
}
function detectScreenType(text){
if(!text)return null;
const scores=detectScreenTypeScores(text);
let best=null,bestScore=0;
for(const k in scores){if(scores[k]>bestScore){bestScore=scores[k];best=k;}}
return bestScore>0?best:null;
}
// detectScreenTypeWithConfidence(text) -- Batch 19 Tahap 1, item 1 (Confidence Score).
// REUSE detectScreenTypeScores()/detectScreenType(), TIDAK mengganti keduanya. confidence
// dihitung dari margin antara skor tertinggi & skor kedua tertinggi (skor tinggi + margin
// lebar = yakin; skor tinggi tapi mepet dgn kandidat lain = ragu-ragu), dinormalisasi ke
// rentang 0..1 lewat pembagi tetap (4 -- margin terbesar yang mungkin dari aturan skor di
// detectScreenTypeScores()).
function detectScreenTypeWithConfidence(text){
const scores=detectScreenTypeScores(text);
const sorted=Object.keys(scores).map(k=>scores[k]).sort((a,b)=>b-a);
const type=detectScreenType(text);
if(!type)return{type:null,confidence:0,scores};
const best=sorted[0],second=sorted[1]||0;
const margin=best-second;
const confidence=Math.max(0,Math.min(1,margin/4));
return{type,confidence:Math.round(confidence*100)/100,scores};
}
// parseBankScreen(text) -- 1 akun: nama pemilik/bank (ditebak dari baris sebelum "No.
// Rekening") + nominal dari "Total Saldo" (fallback "Saldo" polos).
function parseBankScreen(text){
if(!text)return null;
const mPrimary=text.match(/total\s*saldo[^\d]{0,20}(\d[\d.,]*)/i);
const m=mPrimary||text.match(/\bsaldo\b[^\d]{0,20}(\d[\d.,]*)/i);
const nominalRaw=m?normalizeOcrNumber(m[1]):NaN;
const lines=String(text).split('\n').map(l=>l.trim()).filter(Boolean);
const relIdx=lines.findIndex(l=>/no\.?\s*rekening|nomor\s*rekening/i.test(l));
let nama=null;
if(relIdx>0){
for(let j=relIdx-1;j>=Math.max(0,relIdx-3);j--){
if(lines[j]&&!/\d{4,}/.test(lines[j])){nama=lines[j];break;}
}
}
// confidence (Batch 19 item 1): nominal via "Total Saldo" (pola paling spesifik) = 0.9,
// via fallback "Saldo" polos = 0.6, nominal tidak ketemu = 0. nama ketemu dari baris
// sebelum "No. Rekening" -> +0.1 (default label "Rekening Bank" generik -> tanpa bonus).
if(isNaN(nominalRaw))return{nama:nama||'Rekening Bank',nominal:null,confidence:0};
let confidence=mPrimary?0.9:0.6;
if(nama)confidence=Math.min(1,confidence+0.1);
return{nama:nama||'Rekening Bank',nominal:Math.round(nominalRaw),confidence:Math.round(confidence*100)/100};
}
// BUGFIX (laporan user): layar e-wallet (GoPay dkk) sering punya baris kedua semacam
// "Rp937.000 sudah terpakai di Juli" (rekap pengeluaran bulan ini) yang tampil TEPAT
// SETELAH saldo utama -- kalau OCR/regex asal ambil angka "Rp..." pertama yang match,
// gampang salah ambil angka pengeluaran ini alih-alih saldo. WALLET_SPEND_CONTEXT_RE
// dipakai utk menyaring kandidat semacam ini SEBELUM pilih nominal.
const WALLET_SPEND_CONTEXT_RE=/terpakai|pemakaian|pengeluaran|dipakai|digunakan|penggunaan|transaksi\s*(?:bulan|bln)|spent/i;
// BUGFIX S169 (laporan user, foto asli GoPay -- dites pakai tesseract thd screenshot
// asli): saldo utama biasa ditulis besar/bold di layar sementara simbol "Rp" di
// depannya kecil/tipis -- OCR NYATA sering gagal baca "Rp" itu sama sekali, jadi angka
// saldo nongol di teks OCR TANPA prefix "Rp", sementara baris "Rp937.000 sudah terpakai
// di Juli" di bawahnya (font lebih kecil/reguler) kebaca lengkap dgn "Rp"-nya. Akibatnya
// walletAmtRe lama (wajib "Rp" di depan) cuma nemu 1 kandidat -- si angka pengeluaran --
// dan itu yang kepilih. WALLET_BARE_AMT_RE nangkep angka berformat ribuan (ada titik/koma
// pemisah) TANPA prefix "Rp" sbg kandidat tambahan, supaya saldo yang "Rp"-nya tidak
// kebaca tetap ikut bersaing (via urutan-kemunculan + filter WALLET_SPEND_CONTEXT_RE yang
// sama). Syarat "ada pemisah ribuan" sengaja dipasang biar tidak nyangkut angka lain yang
// kebetulan 4+ digit tanpa pemisah (jam "0854", tahun "2026", dll).
const WALLET_BARE_AMT_RE=/\b(\d{1,3}(?:[.,]\d{3}){0,3}[.,]\d{3,4})\b/g;
// parseWalletNominal(raw) -- dipakai KHUSUS di parseWalletScreen() (bukan
// normalizeOcrNumber() generik), krn saldo e-wallet SELALU bilangan bulat (tidak pernah
// ada sen/desimal beneran) -- beda dgn normalizeOcrNumber() yang sengaja punya heuristik
// deteksi desimal (dipakai jenis nilai lain, mis. imbal hasil/nilai investasi). Heuristik
// itu salah kalau dipaksakan ke saldo: grup terakhir 4 digit (mis. noise OCR nempel di
// akhir) malah ditafsir jadi desimal. Guard: kalau grup terakhir kebetulan 4+ digit
// (seharusnya SELALU tepat 3 di format ribuan yang valid -- berarti nyangkut 1 digit
// noise OCR, mis. ikon di sebelah angka kebaca jadi tambahan digit), buang digit
// terakhirnya SEBELUM dirangkai jadi bilangan bulat.
function parseWalletNominal(raw){
if(!raw)return NaN;
let s=String(raw).trim();
const lastSepIdx=Math.max(s.lastIndexOf('.'),s.lastIndexOf(','));
if(lastSepIdx>-1){
const lastGroup=s.slice(lastSepIdx+1);
if(/^\d{4,}$/.test(lastGroup))s=s.slice(0,lastSepIdx+1)+lastGroup.slice(0,3);
}
const digits=s.replace(/[^\d]/g,'');
return digits?parseInt(digits,10):NaN;
}
// parseWalletScreen(text) -- 1 akun: nama e-wallet ditebak dari brand yang kedetek
// (GoPay/DANA/OVO/ShopeePay), nominal dari angka "Rp..." ATAU angka polos berformat
// ribuan (lihat WALLET_BARE_AMT_RE di atas) pertama yang BUKAN rekap pengeluaran (lihat
// WALLET_SPEND_CONTEXT_RE di atas) -- biasanya saldo besar di bagian atas layar.
function parseWalletScreen(text){
if(!text)return null;
const walletAmtRe=/Rp\.?\s*(\d[\d.,]*)/gi;
let wm,walletCandidates=[],rpSpans=[];
while((wm=walletAmtRe.exec(text))){
const ctxEnd=Math.min(text.length,wm.index+wm[0].length+30);
const context=text.slice(wm.index,ctxEnd);
rpSpans.push([wm.index,wm.index+wm[0].length]);
walletCandidates.push({raw:wm[1],index:wm.index,fromRp:true,isSpend:WALLET_SPEND_CONTEXT_RE.test(context),endsLine:/^\s*(?:\n|$)/.test(text.slice(wm.index+wm[0].length,wm.index+wm[0].length+2))});
}
let bm;
WALLET_BARE_AMT_RE.lastIndex=0;
while((bm=WALLET_BARE_AMT_RE.exec(text))){
// lewati kalau posisi ini sudah tercakup match "Rp..." di atas (hindari 1 angka
// kehitung 2x sbg kandidat terpisah, mis. "Rp937.000" juga kena WALLET_BARE_AMT_RE).
if(rpSpans.some(([s,e])=>bm.index>=s&&bm.index<e))continue;
const ctxEnd=Math.min(text.length,bm.index+bm[0].length+30);
const context=text.slice(bm.index,ctxEnd);
walletCandidates.push({raw:bm[1],index:bm.index,fromRp:false,isSpend:WALLET_SPEND_CONTEXT_RE.test(context),endsLine:/^\s*(?:\n|$)/.test(text.slice(bm.index+bm[0].length,bm.index+bm[0].length+2))});
}
walletCandidates.sort((a,b)=>a.index-b.index);
// Prioritas: (1) kandidat non-spend yang diikuti akhir baris (pola saldo paling umum),
// (2) kandidat non-spend manapun (urutan kemunculan -- termasuk yang tanpa "Rp", lihat
// WALLET_BARE_AMT_RE di atas), (3) fallback ke kandidat pertama apa adanya (termasuk yang
// isSpend) SUPAYA tidak berubah jadi tidak ketemu sama sekali kalau semua kandidat
// kebetulan ke-flag salah (lebih baik dari sebelumnya, tidak lebih buruk).
const nonSpend=walletCandidates.filter(c=>!c.isSpend);
const chosen=(nonSpend.find(c=>c.endsLine))||nonSpend[0]||walletCandidates[0];
const nominalRaw=chosen?parseWalletNominal(chosen.raw):NaN;
let nama='E-Wallet',brandMatched=false;
if(/gopay/i.test(text)){nama='GoPay';brandMatched=true;}
else if(/\bdana\b/i.test(text)){nama='DANA';brandMatched=true;}
else if(/\bovo\b/i.test(text)){nama='OVO';brandMatched=true;}
else if(/shopeepay/i.test(text)){nama='ShopeePay';brandMatched=true;}
// confidence (Batch 19 item 1): brand e-wallet kedetek (GoPay/DANA/OVO/ShopeePay) +
// nominal via pola "Rp... di akhir baris" (biasanya saldo besar paling atas) = 0.9;
// brand tidak kedetek (fallback nama generik "E-Wallet") atau nominal via fallback "Rp..."
// bebas posisi = confidence lebih rendah. S169: kandidat TANPA "Rp" (WALLET_BARE_AMT_RE)
// kurangi sedikit confidence -- OCR tidak ikut mengonfirmasi ini beneran nominal uang
// (bukan mis. angka lain) krn simbol "Rp"-nya sendiri tidak lolos kebaca.
if(isNaN(nominalRaw))return{nama,nominal:null,confidence:0};
let confidence=(brandMatched?0.7:0.4)+((chosen&&chosen.endsLine&&!chosen.isSpend)?0.2:0)-((chosen&&!chosen.fromRp)?0.1:0);
confidence=Math.max(0,confidence);
return{nama,nominal:Math.round(nominalRaw),confidence:Math.round(Math.min(1,confidence)*100)/100};
}
// BIBIT_DETAIL_LABELS -- label per-instrumen di kartu "Detail Portofolio"/halaman jenis
// reksa dana Bibit (Nilai Sekarang, Modal Investasi, Keuntungan, Harga Beli, Jumlah Unit
// ATAU Total Unit -- dua nama beda dipakai Bibit utk field yang sama tergantung halaman,
// lihat laporan user). Dipakai fallback parseBibitScreen() (di bawah) DAN dieksport lewat
// hasil parse sbg `detail` -- field dinamis per akun (Modal Investasi/Keuntungan/Harga
// Beli/Jumlah Unit) yang HANYA terisi kalau discan (bukan field wajib akun biasa).
const BIBIT_DETAIL_LABELS={
nilai:/nilai\s*(sekarang|saat\s*ini)/i,
modal:/modal\s*investasi/i,
keuntungan:/\bkeuntungan\b/i,
hargaBeli:/harga\s*(beli|perolehan)/i,
jumlahUnit:/(?:jumlah|total)\s*unit/i,
};
// extractBibitKeuntungan(text) -- terpisah dari extractLabeledAmount() generik krn
// "Keuntungan" bisa NEGATIF (rugi, mis. "-Rp24,883" di layar Saham) -- extractLabeledAmount()/
// normalizeOcrNumber() dipakai field lain di atas TIDAK menangani tanda minus (dirancang utk
// nominal yang selalu positif, mis. saldo/modal/harga beli). Cari angka bertanda persis di
// baris label atau baris berikutnya (pola window sama dgn extractLabeledAmount()).
function extractBibitKeuntungan(text){
const lines=String(text).split('\n');
for(let i=0;i<lines.length;i++){
if(!BIBIT_DETAIL_LABELS.keuntungan.test(lines[i]))continue;
for(const cl of[lines[i],lines[i+1]||'']){
const m=cl.match(/-?\s*rp?\s*-?\d[\d.,]*/i);
if(!m)continue;
const neg=/-/.test(m[0]);
const numPart=m[0].replace(/[^\d.,]/g,'');
const n=normalizeOcrNumber(numPart);
if(!isNaN(n))return neg?-Math.abs(n):n;
}
}
return null;
}
// parseBibitScreen(text) -- 1 akun: nominal dari "Total Investasi"/"Portofolio"/"Total
// Aset" (banner ringkasan atas). FALLBACK (laporan user): layar "Detail Portofolio"
// per-instrumen TIDAK PUNYA banner itu -- cuma kartu "Nilai Sekarang" 1 instrumen. Kalau
// pola banner tidak ketemu, coba baca "Nilai Sekarang" sbg nominal (nilai investasi
// instrumen ybs), plus tangkap detail Modal Investasi/Keuntungan/Harga Beli/Jumlah Unit
// sbg field TAMBAHAN (bukan pengganti nominal) -- ini yang bikin field dinamis (Modal
// Investasi, Keuntungan, dll) bisa ikut kebawa ke akun tujuan saat diimpor (lihat
// UniversalScan.importSelected()), TANPA mengubah kontrak lama (nominal tetap 1 angka).
function parseBibitScreen(text){
if(!text)return null;
const mPrimary=text.match(/total\s*(?:investasi|portofolio|aset)[^\d]{0,20}(\d[\d.,]*)/i);
const m=mPrimary||text.match(/portofolio[^\d]{0,20}(\d[\d.,]*)/i);
let nominalRaw=m?normalizeOcrNumber(m[1]):NaN;
let confidence=mPrimary?0.9:(m?0.6:0);
let viaDetail=false;
if(isNaN(nominalRaw)){
const nilaiDetail=extractLabeledAmount(text,BIBIT_DETAIL_LABELS.nilai);
if(nilaiDetail!=null){nominalRaw=nilaiDetail;confidence=0.6;viaDetail=true;}
}
const detail={
modal:extractLabeledAmount(text,BIBIT_DETAIL_LABELS.modal),
keuntungan:extractBibitKeuntungan(text),
hargaBeli:extractLabeledAmount(text,BIBIT_DETAIL_LABELS.hargaBeli),
jumlahUnit:extractLabeledAmount(text,BIBIT_DETAIL_LABELS.jumlahUnit),
};
const hasDetail=Object.values(detail).some(v=>v!=null);
if(isNaN(nominalRaw))return{nama:'Bibit',nominal:null,confidence:0,detail:hasDetail?detail:null};
if(viaDetail&&hasDetail)confidence=Math.min(1,confidence+0.1);
return{nama:'Bibit',nominal:Math.round(nominalRaw),confidence:Math.round(confidence*100)/100,detail:hasDetail?detail:null};
}
// parseJagoPocketScreen(text) -- BANYAK akun sekaligus (1 per "Kantong"): cari tiap baris
// nominal "Rp...", lalu cari nama kantong mundur 1-2 baris (skip label umum "Aset Saya"/
// "Semua"/"Kantong Saya"/"Investasi" yang bukan nama kantong individual).
const JAGO_POCKET_AMOUNT_RE=/^Rp\.?\s*(\d[\d.,]*)/i;
const JAGO_POCKET_NOISE_LINE_RE=/^semua$|^kantong\s*saya$|^investasi$|^aset\s*saya$|^dibagikan$|^cari\s*kantong$/i;
function parseJagoPocketScreen(text){
if(!text)return[];
const lines=String(text).split('\n').map(l=>l.trim()).filter(Boolean);
const items=[];
for(let i=0;i<lines.length;i++){
const m=lines[i].match(JAGO_POCKET_AMOUNT_RE);
if(!m)continue;
const nominalRaw=normalizeOcrNumber(m[1]);
if(isNaN(nominalRaw))continue;
let nama=null,dist=0;
for(let j=i-1;j>=Math.max(0,i-2);j--){
const cand=lines[j];
if(!cand||JAGO_POCKET_NOISE_LINE_RE.test(cand))continue;
if(JAGO_POCKET_AMOUNT_RE.test(cand))continue;
nama=cand;dist=i-j;break;
}
if(!nama)continue;
// confidence (Batch 19 item 1): nama 1 baris di atas nominal (dist===1, pola paling
// umum) = 0.9; 2 baris di atas (ada baris noise yang dilompati) = 0.7.
items.push({nama,nominal:Math.round(nominalRaw),confidence:dist===1?0.9:0.7});
}
return items;
}
// _normalizeAccNameForMatch/_fuzzyAccountMatch -- BUGFIX (laporan user): parseBankScreen()
// menebak `nama` dari baris TEPAT SEBELUM "No. Rekening", yang di banyak layar bank/digital-
// bank (mis. SeaBank) adalah NAMA PEMILIK REKENING ("Wisnu Nur Muhamad"), BUKAN nama bank
// ("SeaBank"). Padahal importSelected() sebelumnya cuma cocokkan exact-string (trim+lowercase)
// ke D.accounts -- kalau akun yang sudah ada bernama "SeaBank", nama hasil OCR ("Wisnu Nur
// Muhamad") TIDAK PERNAH cocok, jadi tiap scan selalu bikin akun baru alih-alih update saldo
// akun yang sudah ada (persis keluhan user). Fix: tambahkan matcher fuzzy (exact match setelah
// dinormalisasi, lalu substring kedua arah) dipakai sebagai SARAN default akun tujuan di
// preview (lihat targetAccId di scan()/render() di bawah) -- user tetap bisa ganti manual lewat
// dropdown kalau saran salah, & tetap bisa pilih "Buat Akun Baru" eksplisit. 0 perubahan pada
// parser OCR itu sendiri (parseBankScreen dkk) -- murni menambah lapisan pencocokan akun.
function _normalizeAccNameForMatch(s){
return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}
function _fuzzyAccountMatch(nama){
const norm=_normalizeAccNameForMatch(nama);
if(!norm)return null;
const exact=D.accounts.find(a=>_normalizeAccNameForMatch(a.name)===norm);
if(exact)return exact;
const sub=D.accounts.find(a=>{
const an=_normalizeAccNameForMatch(a.name);
return an.length>=3&&(norm.includes(an)||an.includes(norm));
});
return sub||null;
}
function _universalScanEmoji(screenType){
return{bank:'🏦',wallet:'📱',bibit:'🌱',jago_pocket:'👝'}[screenType]||'💰';
}
// UNIVERSAL_SCAN_PARSERS -- Batch 19 Tahap 1, item 4 (Parser Registry). REUSE 100%
// parseBankScreen()/parseWalletScreen()/parseBibitScreen()/parseJagoPocketScreen() yang
// SUDAH ADA (Sesi 125) -- registry ini cuma peta screenType->parser supaya UniversalScan
// tidak perlu if/else berjenjang tiap nambah jenis layar baru. TIDAK ada parser baru,
// TIDAK ada perubahan aturan parsing (lihat diff parseBankScreen dkk di atas: hanya
// nambah field `confidence`, bukan ganti logic).
const UNIVERSAL_SCAN_PARSERS={
bank:parseBankScreen,
wallet:parseWalletScreen,
bibit:parseBibitScreen,
jago_pocket:parseJagoPocketScreen,
};
// runUniversalScanParser(screenType, text) -- lookup di registry lalu normalisasi hasil
// jadi array (parseJagoPocketScreen sudah array; parseBankScreen/Wallet/Bibit single
// object -> dibungkus [x]). Dipakai UniversalScan.scan() (lihat di bawah) supaya alur
// "screenType -> parser -> array item" 1 pintu, bukan diulang di 2 tempat.
function runUniversalScanParser(screenType,text){
const parser=UNIVERSAL_SCAN_PARSERS[screenType];
if(!parser)return[];
const result=parser(text);
if(Array.isArray(result))return result;
return result?[result]:[];
}
// validateUniversalScanItem(item) -- Batch 19 Tahap 1, item 2 (Preview Validation). Fungsi
// MURNI (tidak baca/tulis DOM) yang mengecek 1 item hasil parse SEBELUM ditampilkan di
// preview checklist (universalOcrModal) / sebelum diimpor ke D.accounts. Tidak mengubah
// item, cuma melaporkan {valid, issues[]} -- keputusan akhir (tetap ditampilkan tapi
// dikasih peringatan, vs di-uncheck default) ranah UI (render()), bukan fungsi ini.
// validateUniversalScanItem(item, minConfidence) -- S128: `minConfidence` sekarang
// parameter opsional (default OCR_MIN_CONFIDENCE_DEFAULT_PCT/100 = 0.5, SAMA PERSIS
// angka lama yang tadinya hardcoded), bukan aturan validasi baru -- cuma supaya nilainya
// bisa disuplai dari Pengaturan (lihat getOcrMinConfidence() di bawah) tanpa mengubah
// fungsi ini jadi bergantung ke `D` global (tetap murni/gampang dites lewat loadSource(),
// pemanggil yang urusan baca D.profile).
function validateUniversalScanItem(item,minConfidence){
const threshold=typeof minConfidence==='number'&&!isNaN(minConfidence)?minConfidence:(OCR_MIN_CONFIDENCE_DEFAULT_PCT/100);
const issues=[];
if(!item||item.nominal==null||isNaN(item.nominal)){
issues.push('nominal tidak terbaca');
}else{
if(item.nominal<=0)issues.push('nominal 0 atau negatif');
if(item.nominal>100000000000)issues.push('nominal tidak wajar (di atas Rp100 miliar)');
}
if(!item||!item.nama||!String(item.nama).trim())issues.push('nama akun kosong');
else if(String(item.nama).trim().length<2)issues.push('nama akun terlalu pendek, kemungkinan salah baca');
if(item&&typeof item.confidence==='number'&&item.confidence<threshold)issues.push('confidence rendah, cek ulang manual');
return{valid:issues.length===0,issues};
}
// getOcrMinConfidence()/setOcrMinConfidence(pct) -- S128 (OCR Settings). REUSE 100% pola
// getter/setter threshold yang SUDAH ADA di project (getAIFinanceOverspendThreshold() di
// modules/finance/tx-list-cashflow.js, getAIDeliveryThinMarginThreshold() di
// modules/shop/cobek-pricing.js, dst): simpan sebagai persen (0-100) di
// D.profile.ocrMinConfidencePct, TIDAK ada struktur data baru (reuse D.profile yang sudah
// ada, sama seperti threshold AI lainnya), field Pengaturan baca/tulis lewat
// renderSettings()/autoSaveProfile() (lihat modules/shared/profil-pengaturan.js,
// modules-render.js) dgn pola persis sama.
const OCR_MIN_CONFIDENCE_DEFAULT_PCT=50;
function getOcrMinConfidence(){
const v=typeof D!=='undefined'&&D.profile&&D.profile.ocrMinConfidencePct;
return(typeof v==='number'&&v>=0&&v<=100)?v:OCR_MIN_CONFIDENCE_DEFAULT_PCT;
}
function setOcrMinConfidence(pct){
const n=parseInt(pct,10);
const clamped=(Number.isFinite(n)&&n>=0&&n<=100)?n:OCR_MIN_CONFIDENCE_DEFAULT_PCT;
if(typeof D!=='undefined'&&D.profile)D.profile.ocrMinConfidencePct=clamped;
return clamped;
}
// UniversalScanHistory -- Batch 19 Tahap 1, item 5 (Universal Scan History). Riwayat
// ringkas tiap sesi scan (bukan struktur data baru di D -- disimpan terpisah, in-memory +
// localStorage best-effort, SAMA SEKALI TIDAK menyentuh D.accounts / bentuk akun yang
// sudah ada, sesuai larangan "JANGAN mengubah struktur data"). add()/list()/clear() murni
// operasi array biasa, gampang dites lewat loadSource() tanpa stub tambahan.
const UNIVERSAL_SCAN_HISTORY_KEY='universalScanHistory';
const UniversalScanHistory={
_mem:[],
add(record){
const entry={
ts:record&&record.ts?record.ts:Date.now(),
screenType:record?record.screenType:null,
totalDetected:record?(record.totalDetected||0):0,
importedCount:record?(record.importedCount||0):0,
confidence:record&&typeof record.confidence==='number'?record.confidence:null,
};
this._mem.unshift(entry);
if(this._mem.length>50)this._mem.length=50;
try{
if(typeof localStorage!=='undefined'&&localStorage&&typeof localStorage.setItem==='function'){
localStorage.setItem(UNIVERSAL_SCAN_HISTORY_KEY,JSON.stringify(this._mem));
}
}catch(e){/* localStorage tidak tersedia/full -- history in-memory tetap jalan */}
return entry;
},
list(){return this._mem.slice();},
clear(){
this._mem=[];
try{
if(typeof localStorage!=='undefined'&&localStorage&&typeof localStorage.removeItem==='function'){
localStorage.removeItem(UNIVERSAL_SCAN_HISTORY_KEY);
}
}catch(e){/* no-op */}
},
};
// UniversalScan -- object flow UI (ambil foto -> OCR -> detectScreenType -> parse*Screen ->
// preview checklist -> import terpilih ke D.accounts), pola sama persis BillMultiScan di
// atas. Akun yang namanya SUDAH ADA di D.accounts (case-insensitive) di-UPDATE saldonya
// (pola sama seperti _saveAccInner() di akun.js: baseBalance disesuaikan lewat selisih
// transaksi supaya riwayat transaksi tidak berubah); yang belum ada dibuatkan akun BARU.
// TIDAK ada struktur data baru -- field akun yang dipakai SAMA PERSIS dgn D.accounts biasa.
const UniversalScan={
screenType:null,
items:[],
scanConfidence:0,
scan(){
const inp=document.createElement('input');
inp.type='file'; inp.accept='image/*';
inp.onchange=async(e)=>{
const file=e.target.files[0]; if(!file)return;
this.items=[]; this.screenType=null; this.scanConfidence=0;
openModal('universalOcrModal');
this.render();
const box=document.getElementById('universalOcrBody');
if(box)box.innerHTML='🔍 Memindai gambar, mohon tunggu...';
toast('🔍 Memindai gambar, mohon tunggu...',6000);
try{
const result=await ocrRecognize(file);
const text=result&&result.data?result.data.text:'';
// Batch 19: pakai detectScreenTypeWithConfidence() (bukan detectScreenType() polos)
// supaya confidence keseluruhan-jenis-layar ikut kesimpan, lalu runUniversalScanParser()
// (Parser Registry, REUSE parse*Screen() yang sudah ada -- lihat komentar di atasnya).
const detected=detectScreenTypeWithConfidence(text);
this.screenType=detected.type;
this.scanConfidence=detected.confidence;
const raw=runUniversalScanParser(this.screenType,text);
this.items=raw.filter(it=>it&&it.nominal!=null&&!isNaN(it.nominal)).map(it=>{
const validation=validateUniversalScanItem(it,getOcrMinConfidence()/100);
const fuzzy=_fuzzyAccountMatch(it.nama);
return{
nama:it.nama,
nominal:it.nominal,
confidence:typeof it.confidence==='number'?it.confidence:null,
valid:validation.valid,
issues:validation.issues,
checked:it.nominal>0&&validation.valid,
targetAccId:fuzzy?fuzzy.id:'__new__',
// detail (Modal Investasi/Keuntungan/Harga Beli/Jumlah Unit) -- field DINAMIS,
// cuma ada kalau parser (parseBibitScreen()) berhasil membacanya dari layar detail
// per-instrumen. null kalau screenType lain (bank/wallet/jago_pocket) atau tidak
// kebaca -- TIDAK mengubah kontrak item lama, murni tambahan opsional yang dibaca
// importSelected() (di bawah) untuk disimpan ke akun tujuan kalau ada.
detail:it.detail||null,
};
});
this.render();
UniversalScanHistory.add({
screenType:this.screenType,
totalDetected:this.items.length,
importedCount:0,
confidence:this.scanConfidence,
});
toast(this.items.length?'✅ '+this.items.length+' akun terbaca ('+(this.screenType||'?')+') — cek & koreksi sebelum impor':'⚠️ Tidak ada saldo akun yang terbaca dari foto ini, isi manual ya');
}catch(err){
toast('❌ Gagal scan: '+scanErrorMessage(err));
this.render();
}
};
inp.click();
},
render(){
const box=document.getElementById('universalOcrBody');
if(!box)return;
if(!this.items.length){
box.innerHTML='<div class="empty"><div class="empty-icon">📷</div><div class="empty-text">Belum ada akun terbaca. Scan foto layar Bank/E-Wallet/Bibit/Jago dulu.</div></div>';
return;
}
const emoji=_universalScanEmoji(this.screenType);
box.innerHTML=this.items.map((it,i)=>{
if(it.targetAccId!=='__new__'&&!D.accounts.find(a=>a.id===it.targetAccId))it.targetAccId='__new__';
const confPct=typeof it.confidence==='number'?Math.round(it.confidence*100):null;
const confBadge=confPct==null?'':` · <span style="color:${confPct>=70?'var(--green,#2e7d32)':'var(--orange,#b45309)'}">confidence ${confPct}%</span>`;
const warn=(!it.valid&&it.issues&&it.issues.length)?`<div class="u-t2" style="color:var(--red,#c0392b)">⚠️ ${escapeHtml(it.issues.join('; '))}</div>`:'';
// BUGFIX (laporan user): dulu status "akun sudah ada"/"akun baru" dihitung dari
// exact-string-match antara `nama` hasil OCR vs D.accounts -- di layar bank/digital-bank
// (mis. SeaBank) `nama` yang kebaca sering NAMA PEMILIK REKENING (bukan nama bank), jadi
// TIDAK PERNAH cocok ke akun yang sudah ada ("SeaBank") & tiap scan selalu bikin akun
// baru. Sekarang ada dropdown "Akun Tujuan" eksplisit (default: hasil _fuzzyAccountMatch()
// di atas kalau ketemu, kalau tidak "Buat Akun Baru") -- user bisa arahkan manual ke akun
// mana saja, importSelected() ikut baca targetAccId ini (bukan cocok-nama lagi).
const accOptions=`<option value="__new__" ${it.targetAccId==='__new__'?'selected':''}>➕ Buat Akun Baru</option>`+
D.accounts.map(a=>`<option value="${escapeHtml(a.id)}" ${it.targetAccId===a.id?'selected':''}>🔄 Update: ${escapeHtml(a.name)}</option>`).join('');
// detailPreview -- tampilkan field dinamis (Modal Investasi/Keuntungan/Harga Beli/
// Jumlah Unit) yang berhasil kebaca dari layar detail Bibit, supaya user tahu field
// tambahan ini juga ikut disimpan ke akun tujuan (bukan cuma nominal/nama). Read-only
// di preview ini (koreksi lewat Edit Akun kalau ada yang salah baca) -- fokus editable
// tetap di nama/nominal seperti sebelumnya.
const detailLabels={modal:'Modal Investasi',keuntungan:'Keuntungan',hargaBeli:'Harga Beli',jumlahUnit:'Jumlah Unit'};
const detailPreview=it.detail?`<div class="u-t2" style="margin-top:2px">${Object.keys(detailLabels).filter(k=>it.detail[k]!=null).map(k=>detailLabels[k]+': '+fmtFull(it.detail[k])).join(' · ')}</div>`:'';
// Batch 19 item 3 (Editable Preview): nama & nominal jadi <input> (data-action
// UniversalScan.updateItem), bukan teks statis lagi -- user bisa koreksi hasil OCR yang
// salah baca langsung di preview, sebelum importSelected() (tidak berubah kontraknya:
// tetap baca this.items[i].nama/nominal/checked, cuma sumbernya sekarang bisa hasil edit
// manual juga, bukan cuma hasil OCR).
return`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
<input type="checkbox" ${it.checked?'checked':''} style="width:16px;height:16px;margin-top:2px;flex-shrink:0" data-action="UniversalScan.toggle" data-args="${escapeHtml(JSON.stringify([i]))}">
<div style="flex:1;font-size:12px">
<div style="font-weight:700;display:flex;align-items:center;gap:4px">${emoji} <input type="text" value="${escapeHtml(it.nama)}" style="font-weight:700;border:1px solid var(--border);border-radius:4px;padding:2px 4px;flex:1;min-width:0" onchange="UniversalScan.updateItemField(${i},'nama',this.value)"></div>
<div class="u-t2" style="display:flex;align-items:center;gap:4px;margin-top:2px">Rp <input type="number" value="${it.nominal}" style="border:1px solid var(--border);border-radius:4px;padding:2px 4px;width:110px" onchange="UniversalScan.updateItemField(${i},'nominal',this.value)">${confBadge}</div>
${detailPreview}
<div style="margin-top:4px"><select class="fs" style="font-size:11px;padding:4px 6px" onchange="UniversalScan.setTarget(${i},this.value)">${accOptions}</select></div>
${warn}
</div>
</div>`;
}).join('');
},
// setTarget(i, value) -- dipanggil dari onchange <select> langsung (BUKAN lewat dispatcher
// data-action, karena dispatcher itu cuma listen event 'click', bukan 'change' -- pola sama
// dengan <select> lain di app ini, mis. id="txAcc" onchange="_txAccManuallySet=true").
setTarget(i,value){
const it=this.items[i];
if(!it)return;
it.targetAccId=value||'__new__';
},
toggle(i){
const it=this.items[i];
if(!it)return;
it.checked=!it.checked;
this.render();
},
// updateItemField(i, field, value) -- Batch 19 item 3 (Editable Preview). Dipanggil dari
// <input onchange> lewat data-action (pola sama persis toggle() di atas). field cuma
// 'nama'|'nominal' (2 kolom yang ditampilkan editable di render()); nominal divalidasi ulang
// lewat validateUniversalScanItem() (item 2, REUSE, bukan aturan validasi baru) supaya
// badge ⚠️ & status checked ikut nyesuaian kalau user perbaiki jadi valid (atau sebaliknya).
updateItemField(i,field,value){
const it=this.items[i];
if(!it)return;
if(field==='nama'){
it.nama=value;
}else if(field==='nominal'){
const n=typeof value==='number'?value:normalizeOcrNumber(String(value));
it.nominal=isNaN(n)?null:Math.round(n);
}else{
return;
}
const validation=validateUniversalScanItem(it,getOcrMinConfidence()/100);
it.valid=validation.valid;
it.issues=validation.issues;
this.render();
},
importSelected(){
const selected=this.items.filter(it=>it.checked);
if(!selected.length){toast('⚠️ Pilih minimal 1 akun dulu');return;}
const emoji=_universalScanEmoji(this.screenType);
let created=0,updated=0;
selected.forEach(it=>{
// BUGFIX (laporan user): dulu di sini SELALU cari akun via exact-string-match nama vs
// D.accounts, walau user sudah punya akun yang tepat tapi namanya beda dari hasil OCR
// (mis. layar SeaBank yang kebaca "Wisnu Nur Muhamad", bukan "SeaBank") -- akibatnya tiap
// scan selalu bikin akun baru. Sekarang pakai targetAccId yang dipilih (otomatis lewat
// _fuzzyAccountMatch() di scan(), atau manual lewat dropdown "Akun Tujuan" di preview).
const existing=(it.targetAccId&&it.targetAccId!=='__new__')?D.accounts.find(a=>a.id===it.targetAccId):null;
if(existing){
const txDelta=recalcAccBalance(existing.id)-(existing.baseBalance!==undefined?existing.baseBalance:(existing.balance||0));
existing.baseBalance=it.nominal-txDelta;
existing.balance=it.nominal;
// investDetail -- field DINAMIS (Modal Investasi/Keuntungan/Harga Beli/Jumlah Unit),
// cuma ditulis kalau scan berhasil membacanya (it.detail, lihat parseBibitScreen()) --
// akun bank/e-wallet/kantong biasa (it.detail null) TIDAK dapat field ini sama sekali,
// jadi 0 perubahan tampilan/perilaku utk akun yang bukan hasil scan investasi. Akun
// yang SUDAH punya investDetail dari scan sebelumnya & discan ulang tanpa detail (mis.
// dari layar bank biasa) sengaja TIDAK dihapus -- cuma di-update kalau ada data baru.
if(it.detail)existing.investDetail=Object.assign({},existing.investDetail||{},it.detail,{updatedAt:Date.now()});
updated++;
} else {
const acc={id:'acc_'+Date.now()+'_'+created,name:it.nama,emoji,baseBalance:it.nominal,balance:it.nominal,includeInBalance:true,jenis:'kas_bebas'};
if(it.detail)acc.investDetail=Object.assign({},it.detail,{updatedAt:Date.now()});
D.accounts.push(acc);
created++;
}
});
save();
closeModal('universalOcrModal');
// BUGFIX (laporan user): accModal (tombol "📷 Scan Universal" ada DI DALAM modal
// Tambah/Edit Akun ini) tidak pernah ditutup saat scan dibuka di atasnya -- akibatnya
// setelah "Impor yang Dicentang", yang balik kelihatan adalah form input Akun lagi
// (accModal masih 'open' di belakang), bukan kembali ke data/daftar Akun. Tutup juga
// accModal di sini kalau kebetulan masih terbuka.
closeModal('accModal');
if(typeof renderAccGrid==='function')renderAccGrid();
if(typeof populateAccFilters==='function')populateAccFilters();
if(typeof renderDashAccList==='function')renderDashAccList();
if(typeof renderLapAccList==='function')renderLapAccList();
// Batch 19 item 5: catat hasil impor di history entry paling baru (dibuat scan() di atas),
// biar UniversalScanHistory.list() bisa nunjukin "10 terbaca, 8 diimpor" bukan cuma "10
// terbaca". REUSE entry yang sama (unshift di scan()), bukan bikin entry duplikat.
const last=UniversalScanHistory._mem[0];
if(last)last.importedCount=selected.length;
toast('✅ '+selected.length+' akun diimpor dari scan ('+created+' baru, '+updated+' diupdate)');
}
};
function scanUniversal(){return UniversalScan.scan();}
