// keamanan-pin.js — Domain Keamanan: layar PIN (showPinScreen/checkPin/pinPress/pinBack/updatePinDots),
// Dipindah ke modules/shared/keamanan-pin.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// lockout percobaan PIN salah (PIN_MAX_ATTEMPTS/PIN_LOCK_DURATIONS_SEC/updatePinLockUI/dst), ganti PIN
// (gantiPin), dan enkripsi API key AI berbasis PIN (hashPin/encryptApiKeyWithPin/decryptApiKeyWithPin/
// persistApiKeyEncrypted/loadAndMigrateApiKeyOnUnlock).
// Dipindah dari features-helpers-global-security.js (v70) — dipilih sbg potongan kedua stlh
// kalkulator-input.js (v69) krn seluruh blok ini murni domain keamanan PIN & API key, TIDAK saling
// referensi ke domain lain di file asal (debug console, onboarding, format angka, dst) kecuali lewat
// variabel global saat runtime: D.profile (state, tetap di features-helpers-global-security.js), save(),
// safeSetItem(), toast(), showMain() (semua tetap di features-helpers-global-security.js), dan
// showPinPromptModal()/showAlertModal() (modal generik, tetap di features-helpers-global-security.js,
// dipanggil lewat gantiPin() saat tombol "Ganti PIN" diklik — bukan saat file dimuat).
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh D, save, safeSetItem,
// toast, showMain, showAlertModal, showPinPromptModal — semua variabel global dari file itu).
// PENTING: file ini HARUS dimuat SEBELUM kalkulator-input.js & sisa file GROUP_B lainnya butuh urutan yg
// sama seperti sebelumnya, lihat komentar "urutan load" di tiap file GROUP_B.
// FALLBACK SHA-256 murni JavaScript — dipakai HANYA saat crypto.subtle tidak tersedia (bug
// nyata ditemukan 2026-07-17: di context yang bukan "secure context" -- mis. iframe sandbox
// tanpa allow-same-origin di preview/artifact viewer, atau file:// lokal di sebagian browser --
// `crypto.subtle` = undefined, dan hashPin() sebelumnya 100% bergantung ke situ TANPA fallback
// & TANPA try/catch. Akibatnya: PIN onboarding macet total (tombol "Mulai Sekarang" seolah tidak
// merespons) tanpa pesan error apa pun ke user, krn promise di finishOnboard() reject diam-diam.
// Implementasi ini diverifikasi cocok 100% dgn Node crypto.createHash('sha256') utk berbagai
// panjang input (termasuk kasus tepi padding 55/56/57/63/64 byte). BUKAN pengganti keamanan
// crypto.subtle -- cuma memastikan fitur tetap jalan di context yg tidak mendukungnya, dgn
// tingkat proteksi yg sama scope-nya seperti catatan jujur di atas (PIN cuma menghalangi
// coba-coba lewat keypad UI, bukan proteksi kripto thd akses console langsung).
function _sha256Fallback(bytes){
const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
const l=bytes.length;
const withOne=l+1;
const padLen=(withOne%64<=56)?(56-withOne%64):(120-withOne%64);
const total=withOne+padLen+8;
const msg=new Uint8Array(total);
msg.set(bytes);
msg[l]=0x80;
const bitLenHi=Math.floor(l*8/0x100000000);
const bitLenLo=(l*8)>>>0;
const dv=new DataView(msg.buffer);
dv.setUint32(total-8,bitLenHi);
dv.setUint32(total-4,bitLenLo);
function rotr(x,n){return (x>>>n)|(x<<(32-n));}
for(let off=0;off<total;off+=64){
const w=new Uint32Array(64);
for(let i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
for(let i=16;i<64;i++){
const s0=rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3);
const s1=rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10);
w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
}
let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
for(let i=0;i<64;i++){
const S1=rotr(e,6)^rotr(e,11)^rotr(e,25);
const ch=(e&f)^((~e)&g);
const t1=(h+S1+ch+K[i]+w[i])>>>0;
const S0=rotr(a,2)^rotr(a,13)^rotr(a,22);
const maj=(a&b)^(a&c)^(b&c);
const t2=(S0+maj)>>>0;
h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
}
H=[(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
}
return H.map(x=>x.toString(16).padStart(8,'0')).join('');
}
async function hashPin(pin){
const data=new TextEncoder().encode('kwPinSalt_v1:'+String(pin));
if(typeof crypto!=='undefined'&&crypto.subtle&&crypto.subtle.digest){
try{
const buf=await crypto.subtle.digest('SHA-256',data);
return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}catch(e){
console.warn('crypto.subtle.digest gagal (context tidak secure?), pakai fallback SHA-256 murni JS:',e);
}
}
return _sha256Fallback(data);
}
// PIN MENTAH SESI (perbaikan keamanan 2026-07-10): dulu kunci enkripsi API key diturunkan dari
// localStorage.getItem('kw_pin') -- tapi itu HASH PIN yang tersimpan sebagai teks biasa di
// localStorage yang sama dgn API key terenkripsi. Siapa pun yang bisa baca localStorage (DevTools,
// XSS, ekstensi nakal, backup tidak terenkripsi) otomatis punya "kunci"-nya juga, tanpa perlu tahu
// PIN sama sekali -- enkripsinya jadi percuma. Sekarang kunci diturunkan dari PIN MENTAH yang cuma
// hidup di variabel ini selama sesi (di-set sesaat setelah PIN benar dimasukkan / dibuat), TIDAK
// PERNAH ditulis ke localStorage/IndexedDB. Otomatis hilang kalau tab ditutup/di-reload (PIN harus
// dimasukkan ulang lewat checkPin() lain kali, yang mengisi ulang variabel ini).
let _sessionRawPin=null;
function showPinScreen(){document.getElementById('onboard').style.display='none';const ps=document.getElementById('pinScreen');ps.classList.remove('u-dnone');ps.style.display='flex';pinBuffer='';const t=document.getElementById('pinScreenTitle');if(t)t.textContent='🏠 Keluarga '+(D.profile.nama||'W');updatePinLockUI();}
// LOCKOUT PERCOBAAN PIN (perbaikan keamanan 2026-07-10): sebelumnya tidak ada batas percobaan salah
// sama sekali -- PIN 4 digit bisa dicoba berkali-kali tanpa jeda lewat keypad di layar. Sekarang
// setelah PIN_MAX_ATTEMPTS kali salah BERTURUT-TURUT, keypad dikunci sementara dgn durasi yg makin
// lama tiap kali terulang (PIN_LOCK_DURATIONS_SEC, detik). CATATAN JUJUR soal batasannya: ini cuma
// menghalangi coba-coba lewat UI/keypad di layar -- BUKAN pengaman kripto. Siapa pun yang punya akses
// langsung ke JS console/localStorage tetap bisa hitung hash 10.000 kombinasi PIN dalam hitungan
// milidetik tanpa lewat fungsi ini sama sekali (lihat catatan di hashPin/checkPin). Nilainya di sini
// murni memperlambat orang yang literally mencet-mencet keypad di HP yang lagi dipegang.
const PIN_MAX_ATTEMPTS=5;
const PIN_LOCK_DURATIONS_SEC=[30,60,120,300,600]; // 30d, 1m, 2m, 5m, 10m; stage berikutnya tetap di durasi terakhir (10m)
function _pinLockState(){
return {
fails:parseInt(localStorage.getItem('kw_pin_fails')||'0',10)||0,
until:parseInt(localStorage.getItem('kw_pin_lock_until')||'0',10)||0,
stage:parseInt(localStorage.getItem('kw_pin_lock_stage')||'0',10)||0
};
}
function _pinLockRemainingMs(){
return Math.max(0,_pinLockState().until-Date.now());
}
function _formatLockDuration(ms){
const totalSec=Math.ceil(ms/1000);
const m=Math.floor(totalSec/60), s=totalSec%60;
return m>0?(m+' menit '+s+' detik'):(s+' detik');
}
let _pinLockTimer=null;
function updatePinLockUI(){
const msg=document.getElementById('pinLockMsg');
const pad=document.getElementById('pinPad');
const remaining=_pinLockRemainingMs();
if(_pinLockTimer){clearInterval(_pinLockTimer);_pinLockTimer=null;}
if(remaining<=0){
if(msg)msg.textContent='';
if(pad){pad.style.opacity='';pad.style.pointerEvents='';}
return;
}
if(pad){pad.style.opacity='0.35';pad.style.pointerEvents='none';}
const tick=()=>{
const left=_pinLockRemainingMs();
if(left<=0){
localStorage.removeItem('kw_pin_lock_until');
updatePinLockUI();
return;
}
if(msg)msg.textContent='🔒 Terlalu banyak PIN salah. Coba lagi dalam '+_formatLockDuration(left)+'.';
};
tick();
_pinLockTimer=setInterval(tick,1000);
}
function pinPress(k){
if(_pinLockRemainingMs()>0)return;
if(pinBuffer.length>=4)return;pinBuffer+=k;updatePinDots();if(pinBuffer.length===4)setTimeout(checkPin,120);
}
function pinBack(){if(_pinLockRemainingMs()>0)return;pinBuffer=pinBuffer.slice(0,-1);updatePinDots();}
function updatePinDots(){for(let i=0;i<4;i++)document.getElementById('pd'+i).classList.toggle('filled',i<pinBuffer.length);}
async function checkPin(){
if(_pinLockRemainingMs()>0){pinBuffer='';updatePinDots();return;}
const correct=localStorage.getItem('kw_pin');
const hashedInput=await hashPin(pinBuffer);
if(hashedInput===correct){
localStorage.removeItem('kw_pin_fails');localStorage.removeItem('kw_pin_lock_until');localStorage.removeItem('kw_pin_lock_stage');
_sessionRawPin=pinBuffer;document.getElementById('pinScreen').style.display='none';showMain();loadAndMigrateApiKeyOnUnlock();
}else{
pinBuffer='';updatePinDots();
const st=_pinLockState();
const fails=st.fails+1;
if(fails>=PIN_MAX_ATTEMPTS){
const stage=st.stage+1;
const durSec=PIN_LOCK_DURATIONS_SEC[Math.min(stage-1,PIN_LOCK_DURATIONS_SEC.length-1)];
localStorage.setItem('kw_pin_lock_until',String(Date.now()+durSec*1000));
localStorage.setItem('kw_pin_lock_stage',String(stage));
localStorage.setItem('kw_pin_fails','0');
toast('🔒 5x PIN salah. Coba lagi dalam '+_formatLockDuration(durSec*1000)+'.',4000);
updatePinLockUI();
}else{
localStorage.setItem('kw_pin_fails',String(fails));
toast('❌ PIN salah ('+fails+'/'+PIN_MAX_ATTEMPTS+' sebelum terkunci sementara)');
}
}
}
async function gantiPin(){
const oldPin=_sessionRawPin;
const p=await showPinPromptModal({title:'Ganti PIN',message:'Masukkan PIN baru (4 digit angka)'});
if(p&&p.length===4&&!isNaN(p)){
const newHashed=await hashPin(p);
try{
const rawEnc=localStorage.getItem(API_KEY_ENC_STORAGE_KEY);
if(rawEnc&&oldPin){
let encObj=null; try{encObj=JSON.parse(rawEnc);}catch(e){}
const decrypted=await decryptApiKeyWithPin(oldPin,encObj);
if(decrypted!==null){
const reEnc=await encryptApiKeyWithPin(p,decrypted);
safeSetItem(API_KEY_ENC_STORAGE_KEY,JSON.stringify(reEnc));
}
}
}catch(e){ console.warn('Gagal re-enkripsi API key saat ganti PIN:',e); }
if(safeSetItem('kw_pin',newHashed)){_sessionRawPin=p;toast('✅ PIN diubah');}
}else if(p)showAlertModal('PIN harus 4 digit angka!',{icon:'🔒',title:'PIN Belum Valid'});
}
const API_KEY_ENC_STORAGE_KEY='kw_apikey_enc';
const API_KEY_PBKDF2_ITER=100000;
function _b64FromBuf(buf){return btoa(String.fromCharCode(...new Uint8Array(buf)));}
function _bufFromB64(b64){const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr;}
async function _deriveApiKeyCryptoKey(pin,saltBuf){
const enc=new TextEncoder();
const baseKey=await crypto.subtle.importKey('raw',enc.encode(String(pin)),'PBKDF2',false,['deriveKey']);
return crypto.subtle.deriveKey(
{name:'PBKDF2',salt:saltBuf,iterations:API_KEY_PBKDF2_ITER,hash:'SHA-256'},
baseKey,
{name:'AES-GCM',length:256},
false,
['encrypt','decrypt']
);
}
async function encryptApiKeyWithPin(pin,plainText){
const salt=crypto.getRandomValues(new Uint8Array(16));
const iv=crypto.getRandomValues(new Uint8Array(12));
const key=await _deriveApiKeyCryptoKey(pin,salt);
const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plainText));
return {salt:_b64FromBuf(salt),iv:_b64FromBuf(iv),ct:_b64FromBuf(ct)};
}
async function decryptApiKeyWithPin(pin,encObj){
if(!encObj||!encObj.salt||!encObj.iv||!encObj.ct)return null;
try{
const key=await _deriveApiKeyCryptoKey(pin,_bufFromB64(encObj.salt));
const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:_bufFromB64(encObj.iv)},key,_bufFromB64(encObj.ct));
return new TextDecoder().decode(pt);
}catch(e){ console.warn('Gagal mendekripsi API key (PIN salah atau data rusak):',e); return null; }
}
let _apiKeyEncSaveTimer=null;
function persistApiKeyEncrypted(){
if(_apiKeyEncSaveTimer)clearTimeout(_apiKeyEncSaveTimer);
_apiKeyEncSaveTimer=setTimeout(async()=>{
try{
const pin=_sessionRawPin;
const plain=(D.profile&&D.profile.apiKey)||'';
if(!pin){return;}
if(!plain){ localStorage.removeItem(API_KEY_ENC_STORAGE_KEY); return; }
const enc=await encryptApiKeyWithPin(pin,plain);
safeSetItem(API_KEY_ENC_STORAGE_KEY,JSON.stringify(enc));
}catch(e){ console.warn('Gagal menyimpan API key terenkripsi:',e); }
},500);
}
async function loadAndMigrateApiKeyOnUnlock(){
try{
const pin=_sessionRawPin;
if(!pin||!D.profile)return;
const rawEnc=localStorage.getItem(API_KEY_ENC_STORAGE_KEY);
if(rawEnc){
let encObj=null; try{encObj=JSON.parse(rawEnc);}catch(e){}
let decrypted=await decryptApiKeyWithPin(pin,encObj);
if(decrypted===null){
// Fallback migrasi (perbaikan keamanan 2026-07-10): sebelum perbaikan ini, kunci enkripsi
// diturunkan dari HASH PIN yang tersimpan di localStorage (kw_pin), bukan dari PIN mentah.
// Coba buka pakai skema lama itu -- kalau berhasil, langsung re-enkripsi pakai skema baru
// (PIN mentah) supaya user TIDAK perlu isi ulang API key-nya, dan data lama otomatis
// "naik kelas" ke skema yang lebih aman begitu dibuka sekali.
const legacyPin=localStorage.getItem('kw_pin');
const legacyDecrypted=legacyPin?await decryptApiKeyWithPin(legacyPin,encObj):null;
if(legacyDecrypted!==null){
decrypted=legacyDecrypted;
const reEnc=await encryptApiKeyWithPin(pin,decrypted);
safeSetItem(API_KEY_ENC_STORAGE_KEY,JSON.stringify(reEnc));
}
}
if(decrypted!==null){ D.profile.apiKey=decrypted; }
else{ setTimeout(()=>toast('⚠️ API key AI perlu diisi ulang (PIN berubah / data rusak) — cek Pengaturan → AI Asisten',3600),400); }
} else if(D.profile.apiKey){
const enc=await encryptApiKeyWithPin(pin,D.profile.apiKey);
safeSetItem(API_KEY_ENC_STORAGE_KEY,JSON.stringify(enc));
save();
}
}catch(e){ console.warn('Gagal memuat/migrasi API key terenkripsi:',e); }
}
