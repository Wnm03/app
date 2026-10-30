# Dashboard — Fix Data Ganda #3 (Widget Shop di Dashboard Hub)

## Masalah
4 widget di Dashboard Hub (`#page-dashboard-hub`) tampil dengan angka
**100% sama** dengan yang sudah tampil di tab **Shop → Laporan/Statistik**:

| Widget Dashboard Hub | Duplikat di Shop → Laporan | Sumber |
|---|---|---|
| Dana Kelolaan | `DanaKelolaanPresenter.renderStatistik()` | `DanaKelolaan.summary()` |
| Shop Business Engine | `#shopBizEngineBody` | `ShopBusinessEnginePresenter.summary()` |
| Pengiriman Shop (Trip) | `TripPresenter.renderTab()` | `TripPresenter.summary()` |
| Alur Bisnis Shop | `BusinessFlowPresenter.renderTab()` | gabungan 2 di atas |

Bug tambahan: 4 wrap ini juga belum terdaftar di `SECTION_GROUPS`
(dashboard-hub.js), jadi selalu tampil di SEMUA sub-tab Dashboard Hub
(Ringkasan/Fitur/Widget/Insight) sekaligus.

## Fix
Pola sama persis `DASHBOARD-DEDUP.md` fix #1/#2 — tidak hapus kode:
- `dashboard-hub.js` — hapus 4 panggilan `.render()` (Dana Kelolaan/
  Insight, ShopBusinessEnginePresenter, TripPresenter,
  BusinessFlowPresenter) dari `DashboardHub.render()`. Fungsi presenter
  sendiri TETAP ada (dipakai `renderTab()` di tab Shop & test lama).
- `styles.css` — tambah `#danaKelolaanWrap,#shopBusinessEngineWrap,
  #tripPresenterWrap,#businessFlowWrap{display:none!important;}`.
- Live-refresh (`modules-render.js`, `_safeRender` block) TIDAK disentuh —
  cuma memanggil presenter yang sama, tidak menulis ke container manapun
  yang sekarang disembunyikan; efeknya sudah tidak relevan tapi dibiarkan
  demi 0 risiko (functionally no-op).

## Belum disentuh (kandidat sesi berikutnya)
`PropertyManagementPresenter`/`RentalManagementPresenter`/
`AssetPortfolioPresenter`/`AssetMaintenancePresenter` — TIDAK duplikat di
tab manapun (cuma ada di Dashboard), tapi domainnya Aset. Saran: pindah ke
tab **Aset** (pola sama Sesi 133 Finance/Vehicle) di sesi terpisah, biar
Dashboard makin ringkas.

## Verifikasi
```
node --test
# 1144/1145 pass — 1 fail (self-test.js, ReferenceError: window is not
# defined) sudah ada SEBELUM patch ini juga (bukan regresi, script
# browser-only ikut kescan node --test).

node scripts/build.js dashboard-dedup-shop-widgets-fix
# ✅ Build selesai & lolos cek sintaks bundle, ?v=745
```
