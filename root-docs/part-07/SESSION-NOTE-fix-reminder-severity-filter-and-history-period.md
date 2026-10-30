# Sesi: Fix filter waktu Riwayat per Part + tambah filter status Pengingat Servis

Konteks: audit atas permintaan N (screenshot kartu "🔔 Pengingat Servis per
Part", tab Catatan Kendaraan). Dua temuan, dua perbaikan, satu patch.

## Fix 1 — Filter waktu "Riwayat" per part tidak fungsional

**Sebelum:** Tombol "🧾 Riwayat" di tiap kartu Pengingat
(`Servis.openHistoryFromReminder()`) hanya men-set filter kategori/komponen.
Filter periode (chip Harian/Mingguan/Bulanan/Tahunan/Selamanya di atas tab —
`cnPeriode` / `getCnRange()`) tetap memakai nilai terakhir yang aktif di tab
tersebut. Kalau user sebelumnya sempat pindah ke periode sempit (mis.
"Bulanan") untuk keperluan lain (mis. cek BBM bulan ini), lalu tap "Riwayat"
dari kartu part tertentu, riwayat servis part itu bisa tampak **kosong**
walau datanya ada — karena log lama di luar rentang periode ikut tersaring,
padahal siklus servis 1 part (bulan–tahun) jarang muat di jendela waktu
sesempit itu.

**Sesudah:** `openHistoryFromReminder()` sekarang memaksa `cnPeriode`
kembali ke `'selamanya'` (plus sinkron visual chip + sembunyikan input
custom range) sebelum memanggil `Servis.renderList()`. Riwayat yang dibuka
dari kartu Pengingat SELALU menampilkan histori lengkap part tsb lebih dulu;
user tetap bebas mempersempit lagi manual lewat chip periode kalau perlu.

0 perubahan ke `setCnPeriode()`/`getCnRange()` itu sendiri — cuma titik
panggil baru di `openHistoryFromReminder()`.

## Fix 2 — Pengingat Servis menampilkan semua kategori tanpa filter status

**Audit:** `renderReminder()` sebelumnya hanya menyaring kategori berdasarkan
kategori master/komponen — **tidak ada filter status sama sekali**. Semua
kategori dengan interval aktif ditampilkan (aman s/d terlewat), diurutkan
ascending berdasarkan sisa km/hari (paling mendesak duluan). Tidak ada cara
mempersempit ke yang mendesak saja, berbeda dari Riwayat yang sudah punya
chip actionType.

**Perbaikan:**
- Tambah chip filter status: `🔍 Semua` / `🔴 Terlewat` / `🟠 Segera` /
  `🔵 Mendekati` / `🟢 Aman`, masing-masing dengan angka jumlah — pola sama
  persis `renderActionTypeChips()` yang sudah ada (reuse class `chip`, 0 CSS
  baru).
- State baru `Servis.activeReminderSeverityFilter` (default `null` = Semua,
  0 regresi kalau chip ini tidak pernah disentuh).
- Badge jumlah "(N Terlewat)" di judul kartu untuk quick-glance tanpa perlu
  scroll, tampil hanya kalau ada yang terlewat.
- Pesan empty-state khusus ("Tidak ada part dengan status ini pada kategori
  yang dipilih.") saat kombinasi filter kategori + status menghasilkan 0
  hasil, dibedakan dari empty-state kategori yang sudah ada.
- Object baris (row) yang dipetakan dari tiap kategori sekarang menyertakan
  field `status` mentah (`terlewat`/`jatuh_tempo`/`segera`/`mendekati`/`aman`)
  supaya bisa dipetakan ke bucket filter — field ini sebelumnya dihitung tapi
  tidak pernah ikut dikembalikan ke object baris.

## Sesi lanjutan (audit rekomendasi N-lanjutan, Sep 2026)

5 catatan audit susulan (belum dikerjakan saat itu, ditulis eksplisit sbg
saran) — semuanya dikerjakan sesi ini, akumulasi ke patch yang sama.

### Saran #1 — `cnPeriode` dipakai bareng BBM & Servis

**Sebelum:** `cnPeriode` (chip Harian/Mingguan/Bulanan/Tahunan/Selamanya)
adalah 1 variabel GLOBAL dipakai bareng oleh sub-tab BBM & Servis dalam tab
Catatan Kendaraan. Fix 1 di atas (paksa `'selamanya'` saat tap "Riwayat")
punya efek samping: kalau user abis itu pindah ke sub-tab BBM di sesi yang
sama, filter periode BBM ikut ke-reset ke "Selamanya" juga — bukan bug
tersembunyi (chip tetap kesinkron secara visual) tapi tetap efek samping
yang bisa membingungkan.

**Sesudah:** Periode kini disimpan PER sub-tab lewat `cnPeriodeByTab =
{bbm:'selamanya', servis:'selamanya'}` (BARU, di
`modules/shared/features-helpers-global-security.js`, satu bundel dgn
deklarasi `cnPeriode` lama). `cnPeriode` sendiri TETAP ADA & tetap satu-
satunya variabel yang dibaca `getCnRange()`/`renderList()` (0 perubahan ke
fungsi itu) — cuma sekarang disinkronkan dari `cnPeriodeByTab[tab aktif]`
di 2 titik (`modules/vehicle/vehicle-core.js`):
- `setCnPeriode(p,el)` — tiap user ganti chip, nilainya ditulis balik ke
  `cnPeriodeByTab[curCnTab]` (bukan cuma `cnPeriode` global).
- `setCnTab(t,el)` — tiap pindah sub-tab bbm↔servis, `cnPeriode` (+ UI chip
  `#cnPeriodeChips` + visibilitas `#cnCustomRange`) disinkronkan ulang dari
  `cnPeriodeByTab[t]` (fallback `'selamanya'` kalau tab belum punya entry).

`openHistoryFromReminder()` (`car-notes.js`) sekarang menimpa
`cnPeriodeByTab.servis` saja (BUKAN `cnPeriodeByTab.bbm`) — filter BBM
tidak lagi ikut ke-reset lewat jalur ini.

### Saran #2 — Toast konfirmasi saat periode dipaksa "Selamanya"

Karena perubahan periode di `openHistoryFromReminder()` terjadi diam-diam
di balik tombol "🧾 Riwayat", ditambahkan `toast('Menampilkan seluruh
riwayat (periode direset ke Selamanya)')` — reuse fungsi global `toast()`
(`modules/shared/format-tema.js`) yang sudah ada, 0 komponen UI baru.
Toast HANYA muncul kalau periode benar-benar berubah (dicek via
`cnPeriode!=='selamanya'` SEBELUM ditimpa) — supaya tap "Riwayat" beruntun
dari beberapa part berbeda tidak dobel-notif.

### Saran #3 — Badge judul kartu cuma hitung "Terlewat"

Badge di judul "🔔 Pengingat Servis per Part" sebelumnya cuma menghitung
`lewat` (Terlewat/Jatuh tempo). Kategori "Segera" (oranye, akan jatuh
tempo) sama pentingnya utk quick-glance tanpa scroll — sekarang badge
menggabungkan kedua angka yang non-zero, mis. `(3 Terlewat · 2 Segera)`,
`(2 Segera)` (kalau 0 Terlewat), atau disembunyikan total kalau keduanya 0
(perilaku lama saat semua aman/mendekati).

### Saran #4 — Section "🩺 Perawatan berbasis kondisi" tidak ikut ter-filter status

Section ini (item berjadwal kondisi, bukan interval km/waktu) SENGAJA di
luar perhitungan severity (lihat komentar `conditionCats`/
`filteredConditionCats` yang sudah ada) — jadi tetap tampil apa adanya
walau user memilih chip status (mis. "🔴 Terlewat"), tanpa penjelasan.
Ditambahkan label kecil `(selalu tampil, di luar filter status)` di
sebelah judul section, HANYA muncul saat ada chip status aktif
(`Servis.activeReminderSeverityFilter` bukan `null`) — supaya tidak jadi
noise visual saat filter default "Semua".

### Saran #5 — `activeReminderSeverityFilter` tidak tersimpan

Beda dari `activeMasterCategoryFilter` (filter kategori master Riwayat
Servis) yang sudah dipersist lewat `_saveMasterCategoryFilterPrefs()`,
pilihan chip status Pengingat kembali ke "Semua" tiap pindah tab/reload.
Ditambahkan `_loadReminderSeverityFilterPrefsOnce()` /
`_saveReminderSeverityFilterPrefs()` dgn key storage terpisah
(`servisReminderSeverityFilterPrefs`) — pola & alasan (localStorage manual,
bukan `FilterPrefsStore`) SAMA PERSIS versi kategori master. Fail-open ke
`null` ("Semua") kalau data storage rusak/tak dikenal.

**Trade-off yang disadari & didiskusikan eksplisit:** kalau preferensi
tersimpan BUKAN "Semua" (mis. sesi lalu terakhir pilih "🔴 Terlewat"), part
berstatus lain bisa terkesan "hilang" sampai user sadar & ganti chip
sendiri — ini konsekuensi wajar dari persist filter apa pun (sama seperti
`activeMasterCategoryFilter` yang sudah lebih dulu begini), bukan bug baru.

## File yang diubah
- `car-notes.js` — Fix 1, Fix 2 (sesi awal) + saran #1 (bagian
  `openHistoryFromReminder`), #2, #3, #4, #5 (sesi lanjutan).
- `modules/vehicle/vehicle-core.js` — **BARU disentuh sesi lanjutan.**
  `setCnPeriode()` & `setCnTab()` disesuaikan utk saran #1 (sinkronisasi
  `cnPeriode` ↔ `cnPeriodeByTab` per sub-tab).
- `modules/shared/features-helpers-global-security.js` — **BARU disentuh
  sesi lanjutan.** Deklarasi `cnPeriodeByTab` (saran #1), ditaruh persis di
  sebelah deklarasi `cnPeriode` lama.
- `tests/s679-scroll-flash-14-tabswitch-regression.test.js` — **disentuh
  sesi lanjutan**, BUKAN logic app, murni perbaikan mock test (lihat
  komentar di `makeFakeEl()`): mock `document.getElementById` di suite ini
  selalu mengembalikan 1 fake element yang sama utk id APA PUN, jadi
  `setCnTab()` versi baru (yang memanggil
  `getElementById('cnPeriodeChips').querySelectorAll(...)`) sempat bikin 12
  test generik di file ini gagal dgn `querySelectorAll is not a function`
  — murni limitasi mock, bukan regresi scroll-fix yang sedang diuji test
  itu. Ditambahkan stub no-op `querySelectorAll`/`querySelector` ke
  `makeFakeEl()`.

## File baru
- `tests/servis-reminder-severity-filter-and-history-period-fix.test.js` —
  ditulis ulang (masih gaya source-check yang sama), sekarang membaca 3
  file (`car-notes.js`, `modules/vehicle/vehicle-core.js`,
  `modules/shared/features-helpers-global-security.js`) & menambah
  assertion utk kelima saran lanjutan di atas, selain assertion Fix 1/Fix 2
  yang sudah ada.

## Test
Full suite: `node --test tests/*.test.js` → **6738 pass / 0 fail**
(termasuk seluruh assertion baru/diperbarui di atas). Tidak ada
`app-bundle-a/b.min.js` yang diregenerasi dalam patch ini — jalankan
`node scripts/build.js` sebelum deploy ke produksi supaya bundle ikut
memuat perubahan `car-notes.js` / `vehicle-core.js` /
`features-helpers-global-security.js`.
