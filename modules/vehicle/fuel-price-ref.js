// modules/vehicle/fuel-price-ref.js — Sesi 749: FuelPriceRef, referensi harga BBM
// nasional (1 angka per jenis, bukan per SPBU/wilayah) + tombol "Cek Update via AI",
// pola SAMA PERSIS RefAI (modules/finance/pajak-pbb-zakat.js, GROUP_A — sudah dimuat
// lebih dulu krn app-bundle-a.min.js di-load sebelum app-bundle-b.min.js di index.html,
// jadi aman reuse RefAI._parseJSON tanpa forward-reference).
//
// Scope sesi ini: object FuelPriceRef murni (data model D.fuelPriceRef + check/apply/
// populate/onSelectChange) + default data D.fuelPriceRef (4 salinan features-helpers-
// global-security.js, pola sama D.pajakZakat). BELUM disentuh sesi ini (menyusul,
// per rencana): markup modal (`fuelRefModal`, dropdown "Jenis BBM" di bbmModal/
// txBbmFields) & wiring car-notes.js (BBM.openModal)/tx-bbm.js.
//
// ID DOM yang DIASUMSIKAN oleh check()/renderDraft()/applySelected() di bawah
// (akan dibuat sesi modal menyusul, lihat modules/shared/modals.js pola refAiModal/
// refAiBody/refAiCheckBtn/refAiApplyBtn):
//   - modal:      fuelRefModal
//   - body list:  fuelRefBody
//   - tombol cek: fuelRefCheckBtn
//   - tombol OK:  fuelRefApplyBtn
// populateSelect()/onSelectChange() TIDAK bergantung ke ID-ID di atas — dipanggil
// dengan ID <select> apa pun yang dikirim si caller (dropdown "Jenis BBM" di
// bbmModal & txBbmFields sesi menyusul akan pakai ID beda tapi manggil fungsi yg sama).
const FuelPriceRef={
_draft:null,
// Sesi fix (laporan user: "Rekomendasi Harga BBM tidak sync ke Harga/Liter"):
// context field mana yg sedang aktif waktu tombol "🔄 Cek Update Harga BBM via
// AI" ditekan -- diisi oleh check(selectId,hargaId) & dipakai applySelected()
// utk langsung mengisi ulang field harga yg SEDANG DIBUKA setelah user tap
// "✅ Terapkan yang Dicentang". Tanpa ini, applySelected() cuma menulis ke
// D.fuelPriceRef (referensi tersimpan) tapi field harga di form (txBbmHargaL /
// bbmHarga) tidak pernah di-refresh -- kelihatan spt "gak sync" padahal
// datanya sudah tersimpan, cuma field yg lagi diisi tetap nilai lama sampai
// dropdown Jenis BBM diganti-ganti manual (yg baru trigger onSelectChange()).
_activeCtx:null,
ITEMS:[
{key:'pertalite',label:'Pertalite'},
{key:'pertamax',label:'Pertamax'},
{key:'pertamaxTurbo',label:'Pertamax Turbo'},
{key:'pertaminaDex',label:'Pertamina Dex'},
{key:'dexlite',label:'Dexlite'},
{key:'solar',label:'Solar (Bio Solar/Subsidi)'}
],
systemPrompt(){
// Dibangun otomatis dari FuelPriceRef.ITEMS, pola sama persis RefAI.systemPrompt()
// (modules/finance/pajak-pbb-zakat.js) supaya nambah jenis BBM baru di masa depan
// tidak perlu tulis ulang skema JSON manual.
const schema=FuelPriceRef.ITEMS.map(it=>`  "${it.key}": {"value": <angka Rp per liter TERBARU utk "${it.label}", atau null kalau tidak ketemu/tidak yakin>, "source": "<nama situs/lembaga & info singkat>", "tanggal": "<tanggal harga ini berlaku>"}`).join(',\n');
return `Kamu asisten riset utk aplikasi keuangan keluarga Indonesia. Tugasmu HANYA mencari harga resmi BBM Pertamina TERBARU (harga rata-rata/acuan nasional, BUKAN per SPBU/wilayah spesifik) utk 6 jenis berikut lewat web search, lalu balas HANYA dalam format JSON valid (tanpa teks lain, tanpa markdown code fence, tanpa komentar):
{
${schema}
}
Kalau salah satu tidak ketemu/tidak yakin, isi value dengan null dan jelaskan alasannya singkat di source. JANGAN mengarang angka kalau tidak ketemu di hasil pencarian.`;
},
async check(selectId,hargaId){
// Simpan konteks field yg aktif SEBELUM apa pun lain terjadi (termasuk return
// awal krn belum ada API Key) supaya applySelected() tetap tau field mana yg
// harus di-refresh nanti kalau user isi API Key dulu lalu tap Cek lagi.
FuelPriceRef._activeCtx=(selectId||hargaId)?{selectId:selectId||null,hargaId:hargaId||null}:null;
const btn=document.getElementById('fuelRefCheckBtn')||document.getElementById('txFuelRefCheckBtn');
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){toast('⚠️ Belum ada API Key. Isi dulu di Pengaturan → AI Asisten.');return;}
FuelPriceRef._draft=null;
const applyBtn=document.getElementById('fuelRefApplyBtn'); if(applyBtn)applyBtn.disabled=true;
document.getElementById('fuelRefBody').innerHTML='<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Mencari harga BBM terbaru via web search... (bisa 10-30 detik)</div></div>';
openModal('fuelRefModal');
if(btn){btn.disabled=true;btn.textContent='🔍 Mencari...';}
try{
const r=await callAIProviderRaw(FuelPriceRef.systemPrompt(),[{role:'user',content:'Cari & kasih harga BBM Pertamina terbaru (6 jenis) sesuai format JSON yang diminta.'}],{maxTokens:2048,webSearch:true});
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
document.getElementById('fuelRefBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal hubungi ${label}: ${escapeHtml(r.errMsg||'error tidak diketahui')}${aiErrorHint(provider,r.status)}</div></div>`;
return;
}
const textOut=r.text;
const parsed=RefAI._parseJSON(textOut);
if(!parsed){
document.getElementById('fuelRefBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Balasan AI tidak bisa dibaca sebagai data harga BBM. Coba lagi.</div></div>`;
return;
}
FuelPriceRef._draft=parsed;
FuelPriceRef.renderDraft();
}catch(e){
document.getElementById('fuelRefBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal cek: ${escapeHtml(e.message||String(e))}</div></div>`;
}finally{
if(btn){btn.disabled=false;btn.textContent='🔄 Cek Update Harga BBM via AI';}
D.fuelPriceRef.lastCheckedAt=todayStr();
save();
}
},
renderDraft(){
const body=document.getElementById('fuelRefBody');
const fp=D.fuelPriceRef;
const d=FuelPriceRef._draft||{};
let anyValid=false;
body.innerHTML=FuelPriceRef.ITEMS.map(it=>{
const cur=fp[it.key];
const item=d[it.key];
if(!item||item.value===null||item.value===undefined||!isFinite(Number(item.value))||Number(item.value)<=0){
return `<div class="u-r10 u-mb8" style="padding:10px;background:var(--surface3)">
          <div class="u-fw700 u-fs13 u-mb2">${it.label}</div>
          <div class="u-fs11 u-t2">⚠️ AI tidak menemukan nilai yang cukup yakin${item&&item.source?': '+escapeHtml(item.source):''}. Nilai tersimpan tetap ${cur?fmtFull(cur):'(belum ada)'}.</div>
        </div>`;
}
anyValid=true;
const changed=cur===null||cur===undefined||Math.round(Number(item.value))!==Math.round(cur);
return `<div class="u-r10 u-mb8" style="padding:10px;background:var(--surface3)">
        <label class="u-flex u-gap8 u-aifs u-pointer">
          <input type="checkbox" data-refkey="${it.key}" ${changed?'checked':''} style="margin-top:3px">
          <div class="u-flex1">
            <div class="u-fw700 u-fs13">${it.label}</div>
            <div class="u-fs12 u-mt2">${changed?`<span class="u-ctext3" style="text-decoration:line-through">${cur?fmtFull(cur):'(belum ada)'}</span> → <b class="green">${fmtFull(Number(item.value))}</b>`:`<span>${fmtFull(Number(item.value))}</span> <span class="u-ctext3">(sama dgn tersimpan)</span>`}</div>
            <div class="u-fs11 u-t2" style="margin-top:3px">📌 ${escapeHtml(item.source||'Sumber tidak disebutkan')}${item.tanggal?' · '+escapeHtml(String(item.tanggal)):''}</div>
          </div>
        </label>
      </div>`;
}).join('')+`<div class="u-fs11 u-ctext3 u-mt4 u-lh14">⚠️ Harga acuan nasional, bisa beda per SPBU/wilayah — verifikasi sendiri ke pertamina.com/MyPertamina sebelum dipakai sebagai patokan pasti.</div>`;
const applyBtn=document.getElementById('fuelRefApplyBtn'); if(applyBtn)applyBtn.disabled=!anyValid;
},
applySelected(){
if(!FuelPriceRef._draft){toast('⚠️ Belum ada hasil cek');return;}
const fp=D.fuelPriceRef;
const checked=[...document.querySelectorAll('#fuelRefBody input[type=checkbox]:checked')];
if(!checked.length){toast('⚠️ Centang minimal 1 jenis BBM yang mau diterapkan');return;}
let n=0;
checked.forEach(cb=>{
const key=cb.dataset.refkey;
const item=FuelPriceRef._draft[key];
if(!item||item.value===null||item.value===undefined||!isFinite(Number(item.value))||Number(item.value)<=0)return;
fp[key]=Math.round(Number(item.value));
fp.refSources=fp.refSources||{};
fp.refSources[key]={source:item.source||'',tanggal:item.tanggal||''};
n++;
});
save();
FuelPriceRef._refreshActiveHargaField();
closeModal('fuelRefModal');
toast(`✅ ${n} harga BBM diperbarui dari hasil cek AI`);
},
// Sesi fix: isi ulang field Harga/Liter yg SEDANG DIBUKA (txBbmHargaL di
// txBbmFields, atau bbmHarga di bbmModal) dari D.fuelPriceRef sesuai jenis
// BBM yg SEDANG DIPILIH di dropdown Jenis BBM-nya -- SELALU disinkronkan ke
// nilai tersimpan terbaru utk jenis itu (bukan cuma kalau jenis itu ikut
// dicentang di ronde cek ini), sama spt semangat onSelectChange(): field
// harga mengikuti apa pun yg tersimpan di D.fuelPriceRef utk jenis yg lagi
// dipilih. Dipanggil dari applySelected() setelah D.fuelPriceRef ditulis,
// pola sama persis bagian akhir onSelectChange() (isi value + dispatch
// 'input' biar syncTxBbmAmt()/syncBbmHargaChanged() ikut jalan & Jumlah Rp
// ke-update).
_refreshActiveHargaField(){
const ctx=FuelPriceRef._activeCtx;
if(!ctx||!ctx.selectId||!ctx.hargaId)return;
const sel=document.getElementById(ctx.selectId);
const hEl=document.getElementById(ctx.hargaId);
if(!sel||!hEl)return;
const type=sel.value;
if(!FuelPriceRef.ITEMS.find(it=>it.key===type))return;
const val=D.fuelPriceRef[type];
if(val===null||val===undefined||!isFinite(Number(val))||Number(val)<=0)return;
hEl.value=Math.round(Number(val));
if(typeof hEl.dispatchEvent==='function'&&typeof Event!=='undefined'){
try{hEl.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
}
},
// Isi <select id="selectId"> dgn 6 jenis BBM (FuelPriceRef.ITEMS), value terpilih
// mengikuti D.fuelPriceRef.lastTypeByVehicle[vehicleId] kalau vehicleId dikirim &
// kendaraan itu sudah pernah punya pilihan sendiri (Sesi 755 -- lihat SESSION-NOTE
// S755: sebelumnya lastType 1 field global dipakai bareng semua kendaraan, jadi
// motor isi Pertalite lalu buka modal BBM mobil ikut default Pertalite juga).
// Fallback berjenjang: per-kendaraan -> D.fuelPriceRef.lastType (global, dropdown
// TANPA vehicleId dikirim, mis. pemanggil lama) -> 'pertalite'.
populateSelect(selectId,vehicleId){
const el=document.getElementById(selectId);
if(!el)return;
const fp=D.fuelPriceRef||{};
const byVeh=vehicleId&&fp.lastTypeByVehicle?fp.lastTypeByVehicle[vehicleId]:null;
const cur=byVeh||fp.lastType||'pertalite';
el.innerHTML=FuelPriceRef.ITEMS.map(it=>`<option value="${it.key}">${escapeHtml(it.label)}</option>`).join('');
el.value=cur;
},
// Dipanggil saat dropdown "Jenis BBM" berubah: simpan pilihan sbg D.fuelPriceRef.lastType
// (default dropdown berikutnya, dipertahankan utk pemanggil lama yg belum kirim
// vehicleId) & -- kalau vehicleId dikirim (Sesi 755) -- JUGA sbg
// D.fuelPriceRef.lastTypeByVehicle[vehicleId], supaya tiap kendaraan ingat jenis
// BBM-nya sendiri (motor Pertalite, mobil Pertamax, dst, tidak saling menimpa).
// (opsional) isi field harga `hargaId` dari referensi tersimpan utk jenis itu kalau
// ada & valid. Field harga sengaja tidak di-hardcode ke 'bbmHarga' — dikirim si
// caller (car-notes.js BBM.openModal / tx-bbm.js) biar 1 fungsi ini dipakai bareng
// di bbmModal & txBbmFields sekaligus.
// Dipanggil SESUDAH populateSelect() saat mengedit catatan BBM lama yang belum
// punya field `jenis` tersimpan (record dari sebelum fitur ini ada) -- supaya
// dropdown TIDAK diam-diam menampilkan default lastType (yang bisa membuat user
// tanpa sadar "menetapkan" jenis utk catatan yang aslinya tidak diketahui jenisnya
// begitu ditekan Simpan). Murni UI (tambah 1 opsi placeholder value kosong &
// pilih opsi itu) -- 0 data ditulis, guard opts.jenis!=='' di recordBbmLog()
// (tx-bbm.js) sudah menjamin value kosong ini TIDAK menimpa apa pun saat disimpan.
selectUnknown(selectId){
const el=document.getElementById(selectId);
if(!el)return;
if(!el.querySelector('option[value=""]')){
const opt=document.createElement('option');
opt.value='';
opt.textContent='❓ Belum Diketahui';
el.insertBefore(opt,el.firstChild);
}
el.value='';
},
onSelectChange(selectId,hargaId,vehicleId){
const sel=document.getElementById(selectId);
if(!sel)return;
const type=sel.value;
if(!FuelPriceRef.ITEMS.find(it=>it.key===type))return;
D.fuelPriceRef.lastType=type;
if(vehicleId){
D.fuelPriceRef.lastTypeByVehicle=D.fuelPriceRef.lastTypeByVehicle||{};
D.fuelPriceRef.lastTypeByVehicle[vehicleId]=type;
}
save();
if(!hargaId)return;
const val=D.fuelPriceRef[type];
if(val===null||val===undefined||!isFinite(Number(val))||Number(val)<=0)return;
const hEl=document.getElementById(hargaId);
if(!hEl)return;
hEl.value=Math.round(Number(val));
if(typeof hEl.dispatchEvent==='function'&&typeof Event!=='undefined'){
try{hEl.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
}
}
};
if (typeof FuelPriceRef !== 'undefined') window.FuelPriceRef = FuelPriceRef;
