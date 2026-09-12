# PATCH-CATEGORY-SOT-19

Cumulative patch dari S18 untuk konsolidasi filter Category -> Component tanpa membuat SoT baru.

## Perubahan S19
1. **Pengingat Servis**: filter kategori servis + komponen. Filter hanya mengubah tampilan kartu reminder; interval/urgency tetap memakai SoT kategori + override kendaraan yang sudah ada. Komponen tidak menjadi interval SoT.
2. **Stok Sparepart**: filter kategori servis + komponen berbasis `ServiceInputCatalog.infer()`. Read-only; tidak mengubah `D.partsStock` atau taxonomy.
3. **Katalog Suku Cadang**: search handler yang sebelumnya direferensikan markup sekarang tersedia, plus filter kategori/komponen read-only berbasis `ServiceInputCatalog`.
4. **Service Trend**: ketika filter aktif, baris bulanan ikut dihitung ulang dari `VehicleTrendAPI.serviceLogs()` sehingga `rows[].service/total` konsisten dengan filter; tanpa filter perilaku lama tetap.

## SoT guard
- `D.servisLogs` tetap canonical Service Event.
- `checklist[].itemId` tetap fakta komponen yang benar-benar dipilih.
- Category/masterCategory hanya filter/group, bukan bukti semua komponen dikerjakan.
- Tidak menambah service category/component ke Tagihan.
- Tidak mengarang data OEM/pabrikan baru.

## Validasi
- S19 static SoT/filter checks: **10/10 PASS**
- S18 service/dashboard/finance filter: **6/6 PASS**
- S17 filter: **3/3 PASS**
- S16 category/component checklist: **3/3 PASS**
- S16 Finance checklist: **1/1 PASS**
- S15 ServiceInputCatalog: **5/5 PASS**
- S13 lifecycle: **7/7 PASS**
- Service interval SoT: **3/3 PASS**
- Build: **PASS**, kedua bundle `node --check` PASS, index/app_production sinkron, versi **v1657**.

## Catatan build
Environment ini tidak memiliki `esbuild`, sehingga bundle hasil build **valid tetapi belum diminify**. Build warning pre-existing tentang empty catch blocks, AUDIT_MATRIX stale, dan oversized source files tetap ada.

## Batasan
Full regression seluruh suite belum dinyatakan PASS; baseline sebelumnya memiliki failure/timeout yang bukan berasal dari S18/S19. Jangan gunakan status patch ini sebagai bukti full regression green.
