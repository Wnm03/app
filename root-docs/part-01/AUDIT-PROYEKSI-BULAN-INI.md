# AUDIT — Cash Flow Projection: Siklus Tagihan & Settings (S95)

Lanjutan Sesi 93 (Cash Flow Projection Foundation). Patch ini FINAL — semua
6 file (2 baru + 4 modifikasi source) + bundle/versi sudah sinkron & lolos
test suite penuh.

## 1. Desain siklus tagihan — dikonfirmasi & diimplementasi

`billingCycleRange(refDate, cycleStartDay)` (`modules/finance/tx-list-cashflow.js`):
tagihan jatuh tempo tgl 1–15 dihitung masuk siklus yang **mulai tgl 16
bulan sebelumnya** (kebiasaan tagihan kartu kredit/listrik pascabayar,
bukan ikut kalender 1–akhir bulan). `cycleStartDay` bisa diatur manual
(default 16, dipaksa ke rentang 1–28 supaya valid di Februari).

```
billingCycleRange(3 Sep 2026)  -> {from: 16 Agu, to: 15 Sep}
billingCycleRange(20 Sep 2026) -> {from: 16 Sep, to: 15 Okt}
```

## 2. File baru: `modules/finance/cashflow-projection-settings.js`

Modul `CashflowProjSettings` — penyimpanan preferensi (0 rumus proyeksi di
sini):
- `months` — rentang bulan rata-rata (null = otomatis, ikut `BudgetReko`)
- `accountId` — filter akun (`'semua'` atau 1 id akun)
- `billWindowMode` — `'30hari'` (default) | `'kalender'` | `'siklus'`
- `cycleStartDay` — dipakai kalau mode `'siklus'`

`get()/set()/reset()/isCustomized()/defaults()`. Disimpan di
`D.profile.cashflowProjSettings` (ikut backup/restore existing). Default
SENGAJA identik perilaku lama.

## 3. `computeCashflowForecast()` diupgrade

Terima parameter opsional `opts` (`months`, `accountId`, `billWindowMode`,
`cycleStartDay`, `from`) — **100% backward-compatible**: dipanggil tanpa
argumen (semua caller existing) hasilnya identik perilaku lama selama
`CashflowProjSettings` belum di-set custom. Cache singleton
(`_cashflowForecastCache`) tetap hanya dipakai jalur tanpa-argumen;
panggilan dengan `opts` eksplisit selalu fresh (tidak menimpa cache).

## 4. Presenter (`cashflow-projection-presenter.js`) diupgrade

- 3 kartu sekarang klik ke tujuan **berbeda** (dulu ketiganya self-scroll
  ke `cashflowProjWrap`):
  - **Pemasukan** → tab Kelola › sub-tab Transaksi, filter `#kfTipe=income`
  - **Pengeluaran** → tab Kelola › sub-tab Transaksi, filter `#kfTipe=expense`
  - **Saldo Kas** → tab Tagihan (`billList`)
- Panel **"⚙️ Atur"** inline: toggle + panel dirender sebagai *sibling*
  `#cashflowProjGrid` (bukan child grid-nya, supaya tidak jadi grid-item
  CSS grid `findash-grid`) — 0 CSS baru, 100% reuse
  `fg/fl/fs/fi/chip-btn/btn/btn-primary/u-fwrap/u-gap6/u-gap8/u-dnone`
  (pola sama `keuFilterPanel` di `index.html`).
- Kontrol form (`select`/`input`) pakai `onchange="CashFlowProjectionPresenter.xxx()"`
  inline (BUKAN `data-action`, karena dispatcher global cuma dengar event
  `click` — lihat `_dataActionClickHandler` di
  `features-helpers-global-security.js`), konsisten dengan pola
  `onchange="resetTxPageAndRender()"` yang sudah ada di `keuFilterPanel`.
- `window.CashFlowProjectionPresenter = CashFlowProjectionPresenter;`
  ditambahkan — WAJIB karena panel sekarang dipakai lewat
  `data-action="CashFlowProjectionPresenter.toggleSettings"` dkk (tombol
  chip mode jendela tagihan, tombol Reset).

## 5. Build

`node scripts/build.js` lolos — versi naik **1407 → 1408**
(`s665-networth-renderbersih-ssot-unify` →
`s666-networth-renderbersih-ssot-unify`), sinkron di
`index.html`/`app_production.html`/`sw.js`, bundle
`app-bundle-a.min.js`/`app-bundle-b.min.js` ditulis ulang. Diverifikasi
lolos `node scripts/verify-bundle-freshness.js`.

## 6. Test suite

`node --test tests/*.test.js` → **4827/4827 pass, 0 gagal**.

- 16 test baru di `tests/cashflow-projection-settings.test.js`
  (`billingCycleRange`, `CashflowProjSettings`, `computeCashflowForecast(opts)`
  termasuk backward-compat & cache singleton).
- `tests/finance-nav-consistency-s254b.test.js` — 2 test lama (asumsi
  ketiga kartu self-scroll ke `cashflowProjWrap`) diganti jadi 3 test
  baru sesuai tujuan navigasi baru per-kartu.
- `node scripts/verify-window-expose.js` → OK, 77 modul (termasuk
  `CashFlowProjectionPresenter` yang sekarang dipakai lewat data-action)
  semuanya sudah di-window-expose.

## Isi patch ini (10 file berubah/baru)

**Baru:**
- `modules/finance/cashflow-projection-settings.js`
- `tests/cashflow-projection-settings.test.js`

**Modifikasi (source):**
- `modules/finance/tx-list-cashflow.js`
- `modules/finance/cashflow-projection-presenter.js`
- `scripts/build.js`
- `tests/finance-nav-consistency-s254b.test.js`

**Modifikasi (bundle & sinkronisasi versi, hasil `node scripts/build.js`):**
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html`, `sw.js`
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js` (konstanta versi disamakan)

## Cara pasang

Timpa file-file di atas 1:1 sesuai struktur folder di zip ini ke project.
Tidak ada file yang dihapus/dipindah.
