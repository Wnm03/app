# SA1-REKONSTRUKSI (v1566) — Menutup gap fondasi SA1 yang hilang dari baseline sebelum SA9

## Latar belakang

`SESSION-NOTE-AKUMULASI-SA1-SA8.md` (patch SA8) mencatat berkali-kali (bagian
"Catatan penting" di SA6/SA7/SA8) bahwa ZIP full-source yang dipakai sebagai
baseline seri SA1–SA8 **tidak pernah benar-benar memiliki** fondasi dispatcher
SA1 (`_dataActionResolveArgs` / `_dataActionInputChangeHandler` di
`modules/shared/features-helpers-global-security.js`, + file test-nya).
Full suite di baseline itu selalu mentok di 5534/5534, bukan 5544/5544 yang
diklaim SESSION-NOTE SA1 asli.

Konsekuensinya: 89 elemen `data-oninput`/`data-onchange` yang sudah
dimigrasi SA2–SA8 di `index.html` **idle** — masih jalan HANYA karena inline
handler lama (`onchange=`, dst.) belum dihapus & `unsafe-inline` masih aktif
di CSP. Begitu SA9 mencabut `unsafe-inline`, seluruh 89 elemen ini akan mati
diam-diam kalau dispatcher-nya tidak benar-benar ada.

## Verifikasi gap (sebelum perbaikan)

```
grep -n "_dataActionInputChangeHandler\|_dataActionResolveArgs" \
  modules/shared/features-helpers-global-security.js
→ 0 match (hanya _dataActionClickHandler yang ada)
```

## Perbaikan

1. Rekonstruksi 2 fungsi persis sesuai spesifikasi SESSION-NOTE SA1 di
   `modules/shared/features-helpers-global-security.js`:
   - `_dataActionResolveArgs(argsRaw, el, e)` — resolver token args
     (`$el`, `$event`, `$nav:`, `$value`→`el.value`, `$checked`→`el.checked`);
     JSON args tidak valid → return `null` (silent no-op di pemanggil, bukan
     throw).
   - `_dataActionInputChangeHandler(e)` — listener `input`+`change` di
     `document` (capture phase, sama pola dgn dispatcher click), baca
     `data-oninput`/`data-onchange` sesuai `e.type`, plus
     `-Args` (JSON array), dukung comma-separated function names, error
     handling & toast meniru kontrak `_dataActionClickHandler`.
   - Sengaja dipisah total dari `_dataActionClickHandler`, tidak direfactor
     jadi 1 fungsi generik (sama seperti alasan asli di SESSION-NOTE SA1).
2. `tests/data-oninput-onchange-dispatcher.test.js` (baru, 10 test) —
   mengunci: fungsi tak ditemukan → toast; token `$value`/`$checked`;
   comma-separated fungsi; JSON args tidak valid → silent no-op; async
   reject → toast; throw sinkron → toast; routing `input` vs `change` tidak
   tertukar; jalur sukses → tidak ada toast. Ditulis dengan teknik brace-
   counting manual yang sama dengan `tests/data-action-dispatcher-toast.test.js`
   supaya menjalankan fungsi ASLI, bukan re-implementasi.
3. Patch markup akumulasi SA2–SA8 (dari `patch-SA8`) diterapkan DI ATAS
   fondasi yang sudah direkonstruksi: `index.html`, `app_production.html`,
   `sw.js`, `modules/dashboard-hub/dashboard-hub-settings.js`
   (window-expose `DashboardSettings`).
4. `node scripts/build.js` dijalankan ulang → versi tersinkron ke **1566**.

## Verifikasi (setelah perbaikan)

- `node --test tests/data-oninput-onchange-dispatcher.test.js` → **10/10 pass**.
- Full suite `node --test tests/*.test.js` → **5544 pass, 0 fail** (naik dari
  5534 di baseline lama — selisih 10 persis = jumlah test dispatcher baru,
  mengonfirmasi baseline lama memang tidak punya file test ini sama sekali,
  bukan sekadar gagal).
- `grep -oP '(?<!data-)(oninput|onchange|onclick)="[^"]*"' index.html` → **0**.
- `node scripts/verify-window-expose.js` → OK, **78 modul** (naik dari 77).
- `node scripts/verify-bundle-freshness.js` → kedua bundle segar.
- `node tests/verify-release-ready.js` (override lint+minify, alasan sandbox
  tanpa akses internet) → **LOLOS**.

## Temuan tambahan — inline handler DI LUAR cakupan audit 92

Selain 2 `onblur` yang SUDAH didokumentasikan sengaja dibiarkan (SA3/SA6:
`#dsExtra`, `#aaDana` — `evalAmtExpr(...)`), audit ulang `grep -oP
'(?<!data-)\bon[a-z]+="'` di `index.html` menemukan **3 inline handler lain**
yang TIDAK PERNAH masuk hitungan 92 sama sekali (bukan salah hitung — jenis
atributnya beda dari yang diaudit SA1: `onclick`/`onchange`/`oninput`):

- 2× `onerror="window.__moduleLoadFail('app-bundle-a.min.js')"` /
  `('app-bundle-b.min.js')` — fallback kalau bundle gagal dimuat (di tag
  `<script src="...">`).
- 1× `onkeydown="if(event.key==='Enter')sendChat()"` — kirim chat AI dgn
  Enter.

Total inline handler SEBENARNYA yang masih ada di `index.html` setelah SA8:
**5** (2 `onblur` + 2 `onerror` + 1 `onkeydown`), bukan 0. Migrasi markup
92/92 (SA1–SA8) memang tuntas untuk cakupannya sendiri, tapi cakupan itu
tidak pernah didefinisikan sebagai "semua inline handler di file" — lihat
rekomendasi di bawah sebelum SA9.

## Carry-forward ke SA9

SA9 (penutup: hapus `unsafe-inline` dari CSP) BELUM aman dijalankan hanya
dengan patch ini. Selain pre-syarat yang sudah terpenuhi (fondasi dispatcher
SA1 aktif + 89 elemen data-oninput/data-onchange + 1 data-action), SA9 WAJIB
juga menangani 5 inline handler di atas (2 onblur + 2 onerror + 1 onkeydown)
sebelum CSP diperketat — lihat rekomendasi terpisah.
