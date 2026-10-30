# SESSION NOTE — S749 (fitur "Referensi Harga BBM via AI", Sesi 1/3)

**Baseline:** app-main v1572 + `PATCH-s748-akumulasi-modern-theme-light-fix-v1576.zip`
(v1576), digabung penuh sebelum menambah pekerjaan baru (full AKUMULASI, sesuai
standing instruksi — bukan delta sesi ini saja).

## 0. Verifikasi akumulasi base (sebelum kerja baru)
- Base gabungan (app-main v1572 + patch S748 v1576) dijalankan full suite:
  **5603/5603 pass, 0 fail.** Base bersih, siap dipakai.

## 1. Scope sesi ini
Rencana fitur "Referensi Harga BBM via AI" dibagi 3 sesi (scope besar: data
schema baru, 2 modal, 2 file logic, 4 salinan default-data — pola "1 sesi 1
target"). **Sesi ini (1/3) murni fondasi data + logic**, BELUM ada UI:

1. **Baru** `modules/vehicle/fuel-price-ref.js` — object `FuelPriceRef`
   (pola sama persis `RefAI`, `modules/finance/pajak-pbb-zakat.js`):
   - `ITEMS`: 6 jenis BBM (Pertalite, Pertamax, Pertamax Turbo, Pertamina Dex,
     Dexlite, Solar/Bio Solar) — 1 harga acuan nasional per jenis, bukan per
     SPBU/wilayah.
   - `systemPrompt()` — skema JSON dibangun otomatis dari `ITEMS`.
   - `check()` — web search via `callAIProviderRaw`, **reuse `RefAI._parseJSON`**
     (aman krn `pajak-pbb-zakat.js` di GROUP_A, dimuat sebelum GROUP_B tempat
     `fuel-price-ref.js` berada — app-bundle-a.min.js di-load sebelum
     app-bundle-b.min.js di index.html).
   - `renderDraft()` / `applySelected()` — checkbox per jenis BBM, tulis ke
     `D.fuelPriceRef[key]` + `refSources[key]`.
   - `populateSelect(selectId)` / `onSelectChange(selectId, hargaId)` — BARU,
     tidak ada padanan di `RefAI` (kebutuhan spesifik dropdown "Jenis BBM" yg
     dipakai bareng di 2 modal beda, bbmModal & txBbmFields, sesi menyusul).
     Sengaja generik (terima ID apa pun), tidak hardcode ke `bbmHarga`.
   - `window.FuelPriceRef = FuelPriceRef` (window-expose, walau belum ada
     `data-action` yg memanggilnya sesi ini — disiapkan lebih awal).
2. **Data default** `D.fuelPriceRef` ditambahkan ke **4 salinan**
   `features-helpers-global-security.js` (shared/asset/finance/shop), tepat
   setelah baris `D.pajakZakat` — pola SAMA PERSIS:
   `{pertalite,pertamax,pertamaxTurbo,pertaminaDex,dexlite,solar}` (semua
   `null` di awal), `lastType:'pertalite'`, `lastCheckedAt:null`,
   `refSources:{}`.
3. `scripts/build.js` — daftarkan `modules/vehicle/fuel-price-ref.js` di
   GROUP_B, tepat setelah `vehicle-core.js`.
4. Test baru `tests/fuel-price-ref.test.js` (14 test) — harness `loadSource`
   pola sama `pajak-pbb-zakat-crud.test.js`: `ITEMS`/`systemPrompt()`,
   `check()` (sukses/gagal-API/gagal-parse/tanpa-API-key), `applySelected()`
   (tanpa draft/tanpa centang/normal), `populateSelect()`/`onSelectChange()`
   (termasuk fallback `lastType` & kasus harga referensi belum ada).
   - Catatan teknis: 2 assertion awal sempat gagal krn `deepEqual` lintas-
     realm (objek/array yang dibuat di dalam sandbox `vm` beda identitas
     prototype dari realm Node test) — di-fix dengan JSON-roundtrip sebelum
     dibandingkan, bukan bug di kode `fuel-price-ref.js` sendiri.

**BELUM dikerjakan sesi ini (menyusul sesi 2 & 3 sesuai rencana):**
- Sesi 2: `modules/shared/modals.js` — `<select>` "Jenis BBM" di `bbmModal`
  (dekat `bbmHarga`) & `txBbmFields` (panel BBM `txModal`), + tombol
  "🔄 Cek Update Harga BBM via AI" + modal `fuelRefModal`/`fuelRefBody`/
  `fuelRefCheckBtn`/`fuelRefApplyBtn` (ID-ID ini sudah diasumsikan di
  `fuel-price-ref.js` sesi ini, lihat komentar header file).
- Sesi 3: `car-notes.js` (`BBM.openModal`) & `modules/finance/tx-bbm.js` —
  default dropdown ke `FuelPriceRef.lastType` (panggil `populateSelect()`),
  simpan `fuelType` di tiap log BBM.

## 2. Verifikasi
- Test baru: **14/14 pass** (`tests/fuel-price-ref.test.js`).
- Full suite: **5617/5617 pass** (5603 + 14 baru), 0 fail.
- `node scripts/verify-window-expose.js` → OK (78 modul dipakai via
  data-action, semua ter-expose — `FuelPriceRef` sendiri belum dipakai via
  data-action sesi ini jadi tidak masuk hitungan, tapi window-expose-nya
  sudah disiapkan).
- `node scripts/build.js 1577` → versi disamakan ke 5 file source + bundle
  a/b + HTML + `sw.js`, sintaks bundle valid (`node --check`), html-sync OK.
- `node scripts/verify-release-ready.js` → gate `html-sync` ✅, `version-sync`
  ✅. Gate `lint`/`minify` di-override manual (eslint/esbuild tidak tersedia
  di sandbox ini, sama persis kondisi S748 & sesi-sesi sebelumnya — dicatat
  di `docs/RELEASE-GATE-LOG.md`).

## 3. Isi ZIP patch sesi ini (AKUMULASI penuh dari patch S748 v1576 + perubahan sesi ini)
File yang BERUBAH/BARU sesi ini (di luar itu = identik dgn patch S748):
- `modules/vehicle/fuel-price-ref.js` (BARU)
- `modules/shared/features-helpers-global-security.js` (+`D.fuelPriceRef` default, +versi 1577)
- `modules/asset/features-helpers-global-security.js` (+`D.fuelPriceRef` default)
- `modules/finance/features-helpers-global-security.js` (+`D.fuelPriceRef` default)
- `modules/shop/features-helpers-global-security.js` (+`D.fuelPriceRef` default)
- `scripts/build.js` (daftarkan file baru di GROUP_B)
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js` (versi
  disamakan ke 1577 oleh `build.js`, 0 logic diubah)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild v1577, TANPA
  minifikasi — esbuild tidak tersedia di sandbox ini)
- `index.html`, `app_production.html`, `sw.js` (`?v=1577`)
- `tests/fuel-price-ref.test.js` (BARU, 14 test)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis oleh build.js)
