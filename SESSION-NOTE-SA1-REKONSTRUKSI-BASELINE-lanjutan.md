# SA1-REKONSTRUKSI — Sesi Lanjutan (v1567): menutup 3 dari 5 inline handler di luar cakupan audit 92

Sesi ini lanjutan langsung dari `SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE.md`
(v1566), bagian "Temuan tambahan" & "Carry-forward ke SA9". Menutup 3 dari 5
inline handler yang ditemukan di luar cakupan audit 92 handler asli SA1-SA8.

## Perubahan

### 1. Dispatcher diperluas: `blur` & `keydown`
`_dataActionInputChangeHandler` (`modules/shared/features-helpers-global-security.js`)
diperluas dari 2 event (`input`/`change`) jadi 4, lewat lookup tabel:
```
const attrName = {input:'oninput', change:'onchange', blur:'onblur', keydown:'onkeydown'}[e.type];
if(!attrName) return; // event.type lain (mis. 'focus') diabaikan, TIDAK throw
```
2 listener baru didaftarkan di `document`, capture phase, pola identik dgn
`input`/`change` yang sudah ada:
```
document.addEventListener('blur', _dataActionInputChangeHandler, true);
document.addEventListener('keydown', _dataActionInputChangeHandler, true);
```
`_dataActionResolveArgs` TIDAK berubah — token `$el`/`$event`/`$value`/
`$checked`/`$nav:` sudah cukup generik untuk kebutuhan blur & keydown (blur
di sini pakai args literal string, keydown pakai `$event`).

Kenapa aman didaftarkan sebagai listener terpisah, bukan reuse listener yang
sama secara implisit: `addEventListener` capture-phase di `document` TETAP
menangkap `blur`, walau `blur` tidak bubble — capture phase jalan LEBIH DULU
saat event turun ke target, tidak bergantung sifat bubble event-nya. Sudah
diverifikasi lewat test (lihat di bawah).

### 2. Migrasi 2× `onblur` (sudah didokumentasikan sengaja dibiarkan sejak SA3/SA6)
- `#dsExtra` — `onblur="evalAmtExpr('dsExtra')"` →
  `data-onblur="evalAmtExpr" data-onblur-args='["dsExtra"]'` (args literal
  string, BUKAN token `$value` — `evalAmtExpr` butuh id field, bukan isinya).
- `#aaDana` — `onblur="evalAmtExpr('aaDana')"` →
  `data-onblur="evalAmtExpr" data-onblur-args='["aaDana"]'`.

Kedua elemen ini tetap punya `data-oninput` terpisah (`onDsExtraInput` /
`AlokasiAset.onDanaInput`) dari sesi sebelumnya — `input` dan `blur` dua
event independen di elemen yang sama, dispatcher me-route keduanya lewat
`e.type` seperti halnya `input` vs `change` sebelumnya.

### 3. Migrasi 1× `onkeydown` (chat Enter-to-send)
- `#chatInput` — `onkeydown="if(event.key==='Enter')sendChat()"` tidak bisa
  langsung jadi `data-onkeydown="sendChat"` karena logikanya bersyarat
  (cek `event.key`). Fungsi wrapper baru ditambahkan di `ai-chat.js`:
  ```
  function chatInputEnterSend(e){if(e&&e.key==='Enter')sendChat();}
  ```
  lalu markup: `data-onkeydown="chatInputEnterSend" data-onkeydown-args='["$event"]'`.
  Kondisi `key==='Enter'` tetap dicek DI DALAM fungsi target (bukan
  di dispatcher generik) — dispatcher tetap tidak tahu apa-apa soal
  semantik "Enter", cuma meneruskan `$event` apa adanya, konsisten dgn
  filosofi dispatcher yang murni resolve+invoke.

### 4. TIDAK dikerjakan sesi ini (2 sisa dari 5 temuan)
2× `onerror="window.__moduleLoadFail('app-bundle-X.min.js')"` pada tag
`<script src="app-bundle-a/b.min.js">` TIDAK bisa dimigrasi ke dispatcher
manapun — dispatcher itu sendiri hidup DI DALAM bundle yang errornya mau
ditangkap; kalau bundle gagal load, dispatcher juga tidak pernah terdaftar,
jadi `data-onerror` di elemen manapun percuma. Solusinya beda kelas dari
data-oninput/onchange/onblur/onkeydown: file eksternal baru
`modules/shared/bundle-load-guard.js` (IIFE kecil, load SEBELUM bundle
besar) yang:
1. Baca `data-guard-src` (nama file bundle asli) & `data-guard-id` dari
   `<script>` guard itu sendiri (`document.currentScript`).
2. `document.write()` tag `<script src="...">` yang sebenarnya, PERSIS di
   posisi yang sama (mempertahankan sifat blocking/sinkron yang penting
   karena banyak `document.write(MODAL_HTML[...])` di bawahnya bergantung
   pada fungsi yang didefinisikan bundle).
3. Pasang `addEventListener('error', ...)` pada tag yang baru ditulis itu —
   SEGERA setelah `document.write`, supaya tidak ada race dengan browser
   yang sudah keburu memutuskan gagal.

`index.html` diubah dari:
```
<script src="app-bundle-a.min.js?v=N" onerror="window.__moduleLoadFail('app-bundle-a.min.js')"></script>
```
jadi:
```
<script src="modules/shared/bundle-load-guard.js?v=N" data-guard-src="app-bundle-a.min.js?v=N" data-guard-id="appBundleAScript"></script>
```
(dan sekali lagi untuk bundle-b). Ini BUKAN migrasi ke dispatcher SA1 —
kelasnya beda (event pada elemen `<script>` sebelum app boot, bukan
event pada form control setelah app jalan) — jadi TIDAK menambah jumlah
`data-onX` di hitungan manapun.

## Verifikasi
- `tests/data-oninput-onchange-dispatcher.test.js` bertambah 3 test (10→13):
  routing `blur` benar (tidak ikut memicu `data-oninput` di elemen yang
  sama), kondisi Enter di dalam `chatInputEnterSend` ditangani benar (Tab
  tidak memicu, Enter memicu), `event.type` di luar 4 yang didukung
  diabaikan dengan aman (tidak throw, tidak ada efek).
- Full suite `node --test tests/*.test.js` → **5547 pass, 0 fail** (naik 3
  dari 5544, persis = 3 test baru).
- `grep -oP '(?<!data-)\bon[a-z]+="[^"]*"' index.html` → **0 baris**
  (sebelumnya cuma diverifikasi utk `onclick`/`onchange`/`oninput`; sekarang
  diverifikasi TANPA batasan jenis atribut, dan hasilnya benar-benar nol).
- `node scripts/build.js` → versi tersinkron ke **1567**.
- `node scripts/verify-window-expose.js` → OK, tetap 78 modul (tidak ada
  modul baru yang perlu window-expose).
- `node scripts/verify-bundle-freshness.js` → kedua bundle segar.
- `node tests/verify-release-ready.js` (override lint+minify, sandbox tanpa
  internet) → **LOLOS**.

## Carry-forward ke SA9

Setelah sesi ini, SEMUA inline event handler ATRIBUT di `index.html` — bukan
cuma 92 yang diaudit SA1, tapi genuinely semua jenis atribut `on*=` — sudah
**0** (`grep -oP '(?<!data-)\bon[a-z]+="[^"]*"'` → 0 baris).

**TAPI ini baru separuh dari yang dibutuhkan `unsafe-inline` dicabut penuh.**
`grep -c '<script>' index.html` (tanpa atribut `src`, isinya JS langsung di
body tag) → **104 blok**. CSP `script-src` yang benar-benar tanpa
`'unsafe-inline'` memblokir SEMUA inline `<script>...</script>` juga, bukan
cuma atribut `onX=` — 104 blok ini seluruhnya akan berhenti jalan begitu
`unsafe-inline` dicabut, TIDAK PEDULI dispatcher `data-action`/`data-oninput`
dkk sudah 100% terpasang. Migrasi seri SA1-SA8 (dan sesi ini) hanya pernah
menyasar atribut event inline (`onclick=`/`onchange=`/`oninput=`/`onblur=`/
`onkeydown=`) — cakupannya TIDAK PERNAH termasuk isi `<script>` block itu
sendiri, karena "92 handler" yang diaudit SA1 secara definisi cuma
menghitung atribut, bukan baris kode di dalam tag `<script>`.

Opsi yang lazim untuk `<script>` block inline (di luar cakupan dispatcher
SA1 sepenuhnya, murni strategi CSP, BUKAN PR untuk seri SA1-SA9 ini):
1. **Nonce per-request** (`script-src 'nonce-<random>'`) — butuh server
   men-generate nonce baru tiap request & suntik ke tiap tag `<script>`;
   TIDAK cocok untuk app statis/PWA yang di-serve sebagai file HTML polos
   tanpa server-side rendering (nonce yang sama dipakai berkali-kali =
   sama lemahnya dengan tidak pakai nonce sama sekali).
2. **Hash-based** (`script-src 'sha256-<hash>'`) — hitung hash SHA-256 tiap
   blok `<script>` persis apa adanya (termasuk whitespace), tambahkan ke
   CSP; TAPI 104 hash berbeda-beda per build (karena versi `?v=N` & isi
   kode berubah tiap sesi) berarti CSP header/meta tag ikut berubah TIAP
   BUILD -- perlu langkah baru di `scripts/build.js` utk auto-generate hash
   & suntik ke CSP.
3. **Konsolidasi & eksternalisasi** — pindahkan seluruh 104 blok jadi 1
   (atau beberapa) file `.js` eksternal, sama seperti pola migrasi
   `modules/shared/*.js` yang sudah lama dipakai proyek ini. Paling
   konsisten dgn arsitektur yang sudah ada (semua logic sudah dipisah ke
   `modules/`), tapi usahanya jauh lebih besar dari seri SA1-SA8 (bukan
   cuma ganti atribut, tapi mindahkan & mem-verifikasi urutan eksekusi
   ratusan baris boot script termasuk `document.write` yang bergantung
   urutan parse).

**Rekomendasi konkret:** jangan gabungkan keputusan CSP `<script>` block ke
dalam "SA9" yang selama ini didefinisikan sebagai penutup migrasi
attribute-only. Jadikan sesi/epic terpisah (mis. "SA10: eksternalisasi
inline `<script>` block") dengan audit awal sendiri (skala 104 blok, bukan
92 handler) sebelum mulai — supaya tidak mengulang pola "baseline tidak
lengkap" yang 3× terjadi di seri SA1-SA8 kemarin. SA9 (cabut `unsafe-inline`
UNTUK ATRIBUT EVENT SAJA, kalau CSP mendukung pemisahan
`script-src`/`script-src-attr`) sudah aman dijalankan sekarang dari sisi
dispatcher & markup atribut.
