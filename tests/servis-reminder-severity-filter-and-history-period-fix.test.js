const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {readServisSource}=require('./helpers/carNotesSource');
const js=readServisSource();
const vehicleCoreJs=fs.readFileSync(path.join(__dirname,'..','modules','vehicle','vehicle-core.js'),'utf8');
const helpersJs=fs.readFileSync(path.join(__dirname,'..','modules','shared','features-helpers-global-security.js'),'utf8');

// =====================================================================
// Baseline (fix awal, Sep 2026): tombol "Riwayat" di kartu Pengingat kini
// memaksa cnPeriode ke 'selamanya' sebelum render, supaya riwayat part
// tidak pernah tersaring habis oleh chip periode (Harian/Mingguan/Bulanan/
// Tahunan) yang kebetulan masih aktif dari sesi sebelumnya.
// =====================================================================
assert(js.includes("openHistoryFromReminder(categoryId,componentId){"),'openHistoryFromReminder harus tetap ada');
let historyFnBody;
{
  const start=js.indexOf('openHistoryFromReminder(categoryId,componentId){');
  const end=js.indexOf('\n},',start);
  historyFnBody=js.slice(start,end);
  assert(historyFnBody.includes("cnPeriode='selamanya'"),'openHistoryFromReminder harus memaksa cnPeriode ke selamanya');
  assert(historyFnBody.includes("getElementById('cnPeriodeChips')"),'openHistoryFromReminder harus sinkronkan UI chip periode');
  assert(historyFnBody.includes('[data-args*="selamanya"]'),'openHistoryFromReminder harus set chip Selamanya jadi active');
  assert(historyFnBody.includes("getElementById('cnCustomRange')"),'openHistoryFromReminder harus sembunyikan input custom range');
}

// Fix awal: kartu Pengingat Servis per Part punya filter status
// (Semua/Terlewat/Segera/Mendekati/Aman), bukan cuma filter kategori.
assert(js.includes('activeReminderSeverityFilter:null,'),'state activeReminderSeverityFilter harus ada, default null (Semua)');
assert(js.includes('reminderSeverityChipsHtml(counts){'),'reminderSeverityChipsHtml harus ada');
['🔍 Semua','🔴 Terlewat','🟠 Segera','🔵 Mendekati','🟢 Aman'].forEach(label=>{
  assert(js.includes(label),`chip status "${label}" harus ada di reminderSeverityChipsHtml`);
});

// renderReminder() harus menghitung counts, menerapkan filter severity ke
// displayRows (bukan mengubah urutan/isi `rows` mentah -- 0 regresi kalau
// chip baru tidak disentuh), dan menampilkan pesan kosong khusus.
assert(js.includes('const reminderSeverityCounts={total:rows.length,lewat:rows.filter(r=>r.status===\'terlewat\'||r.status===\'jatuh_tempo\').length,segera:rows.filter(r=>r.status===\'segera\').length,mendekati:rows.filter(r=>r.status===\'mendekati\').length,aman:rows.filter(r=>r.status===\'aman\').length};'),'reminderSeverityCounts harus dihitung dari rows (setelah filter kategori, sebelum filter severity)');
assert(js.includes("const displayRows=!rfSeverity?rows:rows.filter(r=>rfSeverity==='lewat'?(r.status==='terlewat'||r.status==='jatuh_tempo'):r.status===rfSeverity);"),'displayRows harus hasil filter severity dari rows');
assert(js.includes('Tidak ada part dengan status ini pada kategori yang dipilih.'),'pesan empty state khusus filter severity harus ada');
assert(js.includes('displayRows.map(r=>`'),'template kartu harus me-render displayRows (bukan lagi rows mentah)');

// Object baris hasil map kategori membawa `status` mentah supaya bisa
// dipetakan ke bucket severity di atas.
assert(js.includes('nextDueKm,nextDueDate,dueLabel,status};'),'row object hasil map kategori harus menyertakan field status');

// =====================================================================
// Saran #1 (audit lanjutan): cnPeriode dipisah per sub-tab (BBM vs Servis)
// lewat cnPeriodeByTab, supaya paksa 'selamanya' dari tombol "Riwayat"
// TIDAK ikut mereset filter periode BBM.
// =====================================================================
assert(helpersJs.includes("let cnPeriodeByTab={bbm:'selamanya',servis:'selamanya'};"),'cnPeriodeByTab harus dideklarasikan dgn default selamanya utk bbm & servis');

assert(vehicleCoreJs.includes("function setCnPeriode(p,el){"),'setCnPeriode harus tetap ada');
{
  const start=vehicleCoreJs.indexOf('function setCnPeriode(p,el){');
  const end=vehicleCoreJs.indexOf('\n}',start);
  const fnBody=vehicleCoreJs.slice(start,end);
  assert(fnBody.includes("cnPeriodeByTab[curCnTab]=p"),'setCnPeriode harus menyimpan periode ke cnPeriodeByTab milik tab yang aktif');
}
assert(vehicleCoreJs.includes("function setCnTab(t,el){"),'setCnTab harus tetap ada');
{
  const start=vehicleCoreJs.indexOf('function setCnTab(t,el){');
  const end=vehicleCoreJs.indexOf('\nfunction ',start+10);
  const fnBody=vehicleCoreJs.slice(start,end);
  assert(fnBody.includes('cnPeriode=(typeof cnPeriodeByTab'),'setCnTab harus menyinkronkan cnPeriode dari cnPeriodeByTab[tab baru] saat ganti tab');
  assert(fnBody.includes("cnPeriodeByTab[t])?cnPeriodeByTab[t]:'selamanya'"),'setCnTab harus fallback ke selamanya kalau tab belum punya entry di cnPeriodeByTab');
}
// openHistoryFromReminder (car-notes.js) kini menimpa cnPeriodeByTab.servis
// saja, BUKAN seluruh cnPeriodeByTab -- supaya BBM tidak ikut ke-reset.
assert(historyFnBody.includes('cnPeriodeByTab.servis=\'selamanya\''),'openHistoryFromReminder harus menimpa cnPeriodeByTab.servis, bukan cnPeriodeByTab.bbm');
assert(!historyFnBody.includes('cnPeriodeByTab.bbm'),'openHistoryFromReminder TIDAK BOLEH menyentuh cnPeriodeByTab.bbm (0 efek samping ke filter periode BBM)');

// =====================================================================
// Saran #2 (audit lanjutan): toast konfirmasi saat periode dipaksa ke
// 'selamanya' dari tombol "Riwayat" -- HANYA saat benar-benar berubah.
// =====================================================================
assert(historyFnBody.includes("const _periodeBerubah=cnPeriode!=='selamanya';"),'openHistoryFromReminder harus mendeteksi apakah periode benar-benar berubah sebelum ditimpa');
assert(historyFnBody.includes("if(_periodeBerubah&&typeof toast==='function')toast('Menampilkan seluruh riwayat (periode direset ke Selamanya)');"),'openHistoryFromReminder harus menampilkan toast konfirmasi hanya saat periode berubah');

// =====================================================================
// Saran #3 (audit lanjutan): badge judul kartu Pengingat kini menghitung
// "Segera" juga, bukan cuma "Terlewat".
// =====================================================================
assert(js.includes("if(reminderSeverityCounts.lewat)reminderBadgeParts.push(`${reminderSeverityCounts.lewat} Terlewat`);"),'badge harus menyertakan jumlah Terlewat kalau >0');
assert(js.includes("if(reminderSeverityCounts.segera)reminderBadgeParts.push(`${reminderSeverityCounts.segera} Segera`);"),'badge harus menyertakan jumlah Segera kalau >0');
assert(js.includes("const reminderBadgeHtml=reminderBadgeParts.length?` <span class=\"red u-fw700 u-fs11\" title=\"Jumlah part berstatus Terlewat/Jatuh tempo & Segera\">(${reminderBadgeParts.join(' · ')})</span>`:'';"),'reminderBadgeHtml harus digabung dari bagian yang non-zero saja');
assert(js.includes('🔔 Pengingat Servis per Part${reminderBadgeHtml}'),'judul kartu Pengingat harus memakai reminderBadgeHtml');

// =====================================================================
// Saran #4 (audit lanjutan): section "🩺 Perawatan berbasis kondisi" diberi
// label kecil saat filter status sedang aktif, supaya jelas section itu
// SELALU tampil di luar filter (bukan glitch).
// =====================================================================
assert(js.includes('🩺 Perawatan berbasis kondisi${rfSeverity?\' <span class="u-fs10 u-t2 u-fw400">(selalu tampil, di luar filter status)</span>\':\'\'}'),'section kondisi harus diberi label kecil saat rfSeverity aktif');

// =====================================================================
// Saran #5 (audit lanjutan): activeReminderSeverityFilter kini dipersist
// ke localStorage (pola sama persis _saveMasterCategoryFilterPrefs()),
// supaya tidak reset ke "Semua" tiap pindah tab/reload.
// =====================================================================
assert(js.includes("setReminderSeverityFilter(v){Servis.activeReminderSeverityFilter=v||null;Servis._saveReminderSeverityFilterPrefs();Servis.renderReminder();},"),'setReminderSeverityFilter harus memanggil _saveReminderSeverityFilterPrefs() sebelum render ulang');
assert(js.includes("_reminderSeverityFilterStorageKey:'servisReminderSeverityFilterPrefs',"),'storage key khusus filter status Pengingat harus ada & terpisah dari filter kategori master');
assert(js.includes('_loadReminderSeverityFilterPrefsOnce(){'),'_loadReminderSeverityFilterPrefsOnce harus ada');
assert(js.includes('_saveReminderSeverityFilterPrefs(){'),'_saveReminderSeverityFilterPrefs harus ada');
assert(js.includes('Servis._loadReminderSeverityFilterPrefsOnce();'),'renderReminder() harus memanggil _loadReminderSeverityFilterPrefsOnce() sebelum menghitung counts/displayRows');
{
  const start=js.indexOf('_loadReminderSeverityFilterPrefsOnce(){');
  const end=js.indexOf('\n},',start);
  const fnBody=js.slice(start,end);
  assert(fnBody.includes("['lewat','segera','mendekati','aman']"),'_loadReminderSeverityFilterPrefsOnce harus hanya menerima 4 nilai severity yang valid (null/\"Semua\" tidak perlu disimpan)');
  assert(fnBody.includes('catch(err){'),'_loadReminderSeverityFilterPrefsOnce harus fail-open (try/catch) kalau localStorage korup/tidak tersedia');
}

console.log('Fix filter waktu riwayat per part + filter status Pengingat Servis (+ 5 saran lanjutan): PASS');
