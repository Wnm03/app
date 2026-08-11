# Sesi 1 — Rencana Potong `features-sheets-pwa-selftest.js` (2408 baris)

> **Catatan pembaruan (sesi lanjutan setelah Sesi 3):** rencana di bawah ini
> berhasil dieksekusi apa adanya, TAPI `self-test-cases.js` (blok 3a) dan
> `self-test-runtime.js` (blok 3b) belakangan digabung ulang jadi **satu
> file `self-test.js`** — keduanya ternyata bukan JS yang valid berdiri
> sendiri (blok 3a berhenti di tengah sebuah `try{}` yang belum ditutup,
> blok 3b menyambungnya lewat `} finally {`), yang bikin linter/`node
> --check` per-file selalu false-positive error & app berisiko crash total
> kalau urutan pemuatan berubah. Isi/urutan kode tidak berubah sama sekali
> (murni concat 2 file jadi 1), hanya jumlah filenya yang berkurang dari 5
> jadi 4 untuk domain hasil potong Sesi 3. Dokumen di bawah ini DIBIARKAN
> apa adanya sebagai arsip rencana asli — lihat `build.js` (GROUP_B) untuk
> daftar file yang benar-benar dipakai saat ini.

Belum ada kode diubah. Ini murni audit titik potong untuk Sesi 2 & 3.

## Struktur isi saat ini (5 blok, urut sesuai baris)

| Blok | Baris | Isi | ~Baris |
|---|---|---|---:|
| 1 | 1–234 | Google Sheets sync: `sheetsInitTokenClient`, `sheetsEnsureAuth`, `sheetsConnectOnly`, `sheetsSyncNow`/pull, `SHEETS_ROW_BUFFER`, `SHEETS_WRITE_CHUNK` | 234 |
| 2 | 235–296 | PWA setup: `setupPWA()` (manifest + service worker inline) | 62 |
| 3a | 297–854 | `getSelfTestCases()` — daftar besar self-test case | 558 |
| 3b | 855–2253 | Runtime self-test lain: badge, nav-smoke, modal-sweep specs, z-index stacking check | 1399 |
| 4 | 2254–2401 | Wrapper tipis UI: `parsePzNum`/`parseDecStr`/`normalizeOcrNumber`, tab pajak/zakat, delegasi ke `Zakat`/`PPh21`/`Aset`/`Piutang`/`Debt`/`DebtStrategy`/`Kekayaan`/`PBB` | 148 |
| 5 | 2402–2408 | `Object.assign(window,{...banyak modul...}); init();` — titik bootstrap utama app | 7 |

Catatan blok 5: ini BUKAN harus jadi file terakhir di seluruh bundle (`dashboard-hub*`, `lifeos/*`, `economic-intelligence/*` di `build.js` memang dimuat SESUDAH file ini sejak awal, dan itu sudah normal/sudah jalan). Syaratnya cuma: 5 file hasil potong harus tetap berurutan menggantikan posisi `features-sheets-pwa-selftest.js` yang lama di array `GROUP_B`, urutan blok 1→2→3a→3b→4→5 dipertahankan (blok 4 & 5 butuh blok 1-3 & modul lain sudah ke-load).

## Rencana nama file baru (Sesi 2 & 3)

- Sesi 2: `sheets-sync.js` (blok 1) + `pwa-setup.js` (blok 2) — kecil, resiko rendah dulu.
- Sesi 3: `self-test-cases.js` (blok 3a) + `self-test-runtime.js` (blok 3b) + `pajak-aset-ui-wrappers.js` (blok 4) + `app-bootstrap.js` (blok 5, isinya cuma Object.assign+init()).

Domain akhir (mengikuti struktur folder yang sudah disepakati):
- `sheets-sync.js`, `pwa-setup.js`, `self-test-cases.js`, `self-test-runtime.js`, `app-bootstrap.js` → `/modules/shared`
- `pajak-aset-ui-wrappers.js` → tetap `/modules/shared` untuk sekarang (isinya wrapper lintas domain finance+asset yang tipis, tidak worth dipecah lagi)

## Test yang perlu di-update path-nya nanti (masih pakai nama file lama)

9 file test manggil `loadSource([...,'features-sheets-pwa-selftest.js',...])`:
`dashboard-hub-favorit-view.test.js`, `dashboard-hub.test.js`, `gold-emas-zakat.test.js`, `hidup-seimbang.test.js`, `ongkir-window-expose.test.js`, `parse-angka.test.js`, `pricereko-widget-window-expose.test.js`, `scan-ocr-paylater.test.js`, `window-expose-audit.test.js`

Tiap file ini akan perlu diganti jadi array beberapa nama file baru (tergantung fungsi apa yang dia butuh — dicek satu-satu di Sesi 2/3, bukan asal ganti nama).

## Yang dikerjakan Sesi 2
Eksekusi potong blok 1+2 saja (`sheets-sync.js`, `pwa-setup.js`), update `build.js`, kedua HTML (kalau ada referensi langsung — dicek dulu), update test yang kena, `npm run check` hijau, ZIP.
