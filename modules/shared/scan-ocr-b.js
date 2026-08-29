// scan-ocr-b.js — bagian KEDUA dari modules/shared/scan-ocr.js (audit ukuran
// file, sesi lanjutan setelah split transaksi.js). Titik potong bersih:
// TEPAT SETELAH `function scanBillMultiItems(){return BillMultiScan.scan();}`
// (di depan header komentar "==== UniversalScan (Sesi 125) ===="). Murni
// deklarasi function/const top-level, TIDAK butuh Object.assign — cukup
// dimuat SETELAH scan-ocr.js (urutan dijaga di scripts/build.js, entri baru
// tepat setelah file utama).
//
// Isi: seluruh fitur UniversalScan (Sesi 125) — scan screenshot BANK/
// E-WALLET/BIBIT/JAGO (Kantong) buat isi Akun otomatis: detectScreenType*(),
// parseBankScreen/parseWalletScreen/parseWalletNominal/parseBibitScreen/
// extractBibitKeuntungan/parseJagoPocketScreen, _fuzzyAccountMatch,
// runUniversalScanParser/validateUniversalScanItem, getOcrMinConfidence/
// setOcrMinConfidence, UniversalScanHistory, object UniversalScan, &
// scanUniversal().
//
// Referensi ke ocrRecognize()/normalizeOcrNumber()/extractLabeledAmount()/
// D/save()/recalcAccBalance()/openModal()/closeModal() dkk (didefinisikan
// di scan-ocr.js atau file lain) tetap aman: di browser, let/var/function
// top-level pada <script> klasik berbagi satu global lexical scope lintas
// file, dan fungsi di sini baru dieksekusi (bukan diparse) setelah semua
// script selesai dimuat.


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
//
function parseBankScreen(text){
if(!text)return null;
// BUGFIX (laporan user: scan layar SeaBank -- "Total Saldo Rp 148.602" -- nominal
// kebaca "1" doang, bukan 148602): screenshot asli punya angka saldo dalam FONT BESAR/
// BOLD; di font semacam ini Tesseract kerap salah menyimpulkan jarak antar-karakter
// sbg batas kata/baris, jadi "148.602" pecah di teks OCR jadi beberapa potongan
// terpisah spasi/newline (mis. "1" lalu "48.602" di "baris" lain). Regex LAMA
// `(\d[\d.,]*)` cuma menangkap potongan pertama yg contiguous ("1") lalu berhenti di
// whitespace pertama -- SALAH TAFSIR whitespace itu sbg akhir angka, padahal itu
// masih 1 angka yg sama yg dipecah OCR. Fix: regex sekarang boleh menangkap SAMPAI 3
// potongan digit tambahan yg HANYA dipisah whitespace (bukan huruf/kata lain) setelah
// potongan pertama -- lalu semua whitespace di dalam hasil match dibuang SEBELUM
// dikirim ke normalizeOcrNumber(), supaya potongan2 itu disambung jadi 1 angka utuh
// lagi. Kalau OCR kebetulan TIDAK memecah angkanya (kasus umum/lama), perilaku 0
// berubah (potongan tambahan itu opsional, `{0,3}`).
const mPrimary=text.match(/total\s*saldo[^\d]{0,20}(\d[\d.,]*(?:\s+\d[\d.,]*){0,3})/i);
const m=mPrimary||text.match(/\bsaldo\b[^\d]{0,20}(\d[\d.,]*(?:\s+\d[\d.,]*){0,3})/i);
const nominalRaw=m?normalizeOcrNumber(m[1].replace(/\s+/g,'')):NaN;
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
const _scanEpoch=_scanEpochNow();
const result=await ocrRecognize(file);
if(_scanEpochStale(_scanEpoch))return;
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
if (typeof UniversalScan !== 'undefined') window.UniversalScan = UniversalScan;
function scanUniversal(){return UniversalScan.scan();}
