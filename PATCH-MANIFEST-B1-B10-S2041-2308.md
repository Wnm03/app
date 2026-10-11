# Patch Manifest — B1–B10 / S2041-2308 + E2E Diagnostics (cumulative)

Tanggal audit: 11 Oktober 2026.

- Baseline: `app-main (18).zip` (build 2295).
- Baseline ZIP SHA-256: `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`
- Runtime build tetap: `s2041-1-part-sot-hardening-2308` (`?v=2308`, `kw-cache-v2308`). Follow-up ini hanya mengubah harness E2E dan dokumentasi/tes diagnostiknya; tidak mengubah runtime bundle.
- Full suite paksa ulang: **8.781 tes, 8.780 pass, 0 fail, 1 skipped; 64/64 shard lulus, exit 0**.
- Tes terarah B1–B10 + diagnostik E2E: **15/15 pass**.
- Release gate: satu eksekusi selesai dan mencetak **RELEASE GATE LOLOS** (lint 0 error, SOT 412 runtime source, version/HTML/SW sync, bundle freshness PASS). Pengulangan foreground berikutnya timeout saat ESLint masih berjalan sebelum ringkasan; ulangi gate di runner stabil sebelum rilis produksi.
- Browser E2E: **exit 4 — `net::ERR_BLOCKED_BY_ADMINISTRATOR`** pada navigasi origin lokal. Ini kegagalan lingkungan, bukan PASS dan bukan bukti bug aplikasi; UI aktual belum terverifikasi.
- Daftar penghapusan: kosong.
- File unik dalam ZIP: **70** (termasuk manifest); entri checksum payload: **69** (manifest mengecualikan checksum dirinya sendiri).

## SHA-256 payload

| Path | SHA-256 | Bytes |
|---|---|---:|
| `AUDIT-BUG-B1-B10-IMPLEMENTASI-S2041-2308.md` | `e44db9b69bc2e75f6e96a5e2500ea395539b929c2b22434874244497c1f944dd` | 7467 |
| `AUDIT-BUG-B1-B4-IMPLEMENTASI-S2041-2305.md` | `4d693ce36190233e6bd7f63cccabe8f99579eb02eac778f32742dac60b7d25de` | 6795 |
| `AUDIT-BUG-B5-B10-LANJUTAN-S2041-2307.md` | `9c6f513f055cf1b1b6daf8d3b44c04b1be342c2a6a5076d207eacb7bc0dcb61b` | 4114 |
| `FILE-HASHES-SHA256.txt` | `dcff774941c8a57daa7e002f57e489ed1c52de2e1de84a5cd37dd9cf4177f42c` | 12345 |
| `PATCH-MANIFEST-B1-B10-S2041-2307.md` | `01443eb3459d16458fedf758efb9a9ab93303a55221a8deb1be1c13ae1e8131c` | 8884 |
| `PATCH-MANIFEST-B1-B4-S2041-2305.md` | `8786311c5ee29ee8900dbd2fae12be1a96dfb9bcd939b84ec7935c6185a50a89` | 8303 |
| `app-bundle-a.min.js` | `452c03eb35393b7d26b7ab25abb34aa64bf1eca829f56e8c402fffd0bab63072` | 1035278 |
| `app-bundle-b.min.js` | `dbdd6a80f76620d03d607c587547226935be6ea35c2928cf4eb1318c4cbeb75c` | 2446992 |
| `app_production.html` | `63e2d9ca0c2295e9644d2b99a1777391883c0e864d6b7961d9f9652c07bd0d90` | 313498 |
| `budget.js` | `e7d036f3060911caa7352d12035f488352e8825070a244a6b5350d1fbcb6e5f3` | 33096 |
| `chat-action-handlers.js` | `d0ed8ca9a0fa983424f838f87b2e2a9ba0ec08f78a1b18272daf40ad57893447` | 10556 |
| `docs/COVERAGE-PER-MODULE.md` | `aefd9df87324d6b1587408b08786f989589cda555667ec97e78624fe925825f4` | 1781 |
| `docs/FILE-MAP.md` | `185171c016a09a9123df12fb3d53b0ae6d273fe00466cfff47aebc4305abff24` | 1084809 |
| `e2e/README.md` | `938c20e3310b55c1c8f4f424667841c85a94dd0feab4ee58a612be6da4c6a686` | 964 |
| `e2e/diagnostics.js` | `2f47363e62189cc6d541edb41ee0f025e1026845ed0d8fcd3ff2cf83252095d0` | 379 |
| `e2e/run-e2e.js` | `16e8239e8d998b7d513844a76d43ee38e02d818b7f2e973fa1df3e6432b1f64e` | 11910 |
| `economic-intelligence/engine/scoring-engine.js` | `112a138832d4039da02ce066245b50a42df96f2791ae7677efbbe9a30fd206f7` | 2777 |
| `economic-intelligence/ui/eie-dashboard.js` | `a839256a0eb1e2a2d2630e4825615bf302dcf80d2b516d649384f874279162b6` | 14930 |
| `index.html` | `5a5524a4bb40e5b44bd9fafa72b51e12b257d3c39f240932a3ae82fbb3a69053` | 313305 |
| `laporan-export.js` | `0f3916981774b98929a77b975886868ee0717ac111efd9548fc762f9e5dafcc2` | 7988 |
| `lifeos/ui/review.js` | `602232e000349dc164def140ec30e0b664681839589b17765fbe9264d47128ec` | 1419 |
| `modules/asset/aset.js` | `a5f8b239d19b2a3a88c78eb1f27dc7be64081fff93cb095e8441df2f0090551d` | 95183 |
| `modules/asset/investasi-list-view.js` | `f50a7944a35358f0354de116d3585da57672d7e85ec25e38fac5c2ded38b50cd` | 56155 |
| `modules/asset/investasi-tx-view.js` | `7928eceb7c6828eae20ec7e5de04a5d7c0f67797bf8db70114eb04de1e199d20` | 11664 |
| `modules/asset/investasi-watch-view.js` | `75af9161106b02af81756aadfce5119ffda5cb37091398b75aa2f1b63f0ebf43` | 9493 |
| `modules/asset/investasi.js` | `4a301fe28ffd0ea9c63e46fc76b89c89e2d98f9202186ef2db142c5f6ae6d674` | 54534 |
| `modules/business/kasir.js` | `189b9443ef501479cc17e5223e6e23f794f1144d9b43057fc82fad3ba2a8fc01` | 23389 |
| `modules/business/sewakios.js` | `1bf49d289833d0147c1aff802de6f35fa55813d5249372e0b4b74c8631c7817f` | 14315 |
| `modules/business/tukang-absensi.js` | `48253cb235a972d145be07ae3e2a4029f09492ba06e6cee0360483ce013ce383` | 40589 |
| `modules/finance/edukasi-dana.js` | `e96f3f5c82548a4ba8481957921a6fd1bc734e1accf00047c072c9d31ae7bfbf` | 11366 |
| `modules/finance/pajak-pbb-zakat.js` | `9d0a66f6520de9dea7256c576a911c6e00b687992b093cf4101976c41d5d4a43` | 24784 |
| `modules/finance/piutang-utang.js` | `9a349364f978858e82a245aa0241af490b167025b3ad6e70294c5fc9e2542b60` | 77331 |
| `modules/finance/tagihan-kalender.js` | `d1c3eeafd6615db1b861587ac704c3ef3e8ce7b03f5452a7ae043e6266daf7dc` | 100255 |
| `modules/finance/transaksi-b.js` | `dbfaf4ac36b23bd262bc95ebf19690c1524072c7a4d4d88ce396a8c0c8ad2f82` | 56262 |
| `modules/finance/transaksi.js` | `2d973dd4d3f8103c151b3b47f88d4067bbf2ec0ab1228f2e998712c7f37df25d` | 82370 |
| `modules/finance/tx-stok-sparepart.js` | `a65d49abf18d264d18cd077c376a8c5fdfeb1a0d530c3950f701ed7612f2eeaf` | 27934 |
| `modules/finance/worthit.js` | `72f9ca7204aee995218c9b4a1c959883ecbf80ea62856c4d7e2c74292424cd18` | 41567 |
| `modules/home/renovasi.js` | `d80af1c98a3b86dfdbfb2d5c9038f9dab47d6776b719ea089a1cbaccf66e5ef5` | 31019 |
| `modules/self-reward/self-reward-engine.js` | `330cfe53fa35bf9dd185be6c504f2b9d58fe47e3022d208b499e3cf27b83ff15` | 10191 |
| `modules/shared/backup-restore.js` | `701cdabeb20b4fecbdef3d48b74ca178df07ebdfce4fdda0958835b14b51225d` | 87971 |
| `modules/shared/data-archive.js` | `3c8ebcc932ce75722eb7bfaf2fb6e5639d46dc490ea11d3893d403c5bb0d43ae` | 8709 |
| `modules/shared/features-helpers-global-security.js` | `3c5d97ccacd6b58a50441cab7247082be359272738e108c62f5aeb990872f233` | 109743 |
| `modules/shared/format-tema.js` | `33962eb720a4b1f4e44a994372b77df7d985e3c5c60bebe4eb4427cfe9ae89c6` | 15932 |
| `modules/shared/modals.js` | `8353f5190f3d1c16736f5818f4b04bbb856c472f84e1c8479ad1c9e0ad611e20` | 300959 |
| `modules/shared/modules-calc.js` | `9a94d20e783e9d425be91ebac5defb3589ca7bc8bb927e76a1a9c8f933aff4e7` | 72723 |
| `modules/shared/modules-render.js` | `9ce7d4318fbb300d864fbb2837043b3873aedbea9711e18adc32e41de43becd7` | 104855 |
| `modules/shared/scan-ocr.js` | `2b077a08a17bb2a74eb13392474af0ab52811656555feee6c29d40423ad16103` | 60169 |
| `modules/shop/business-flow-presenter-inventory.js` | `12f28fabfdc0242eb6b14e4e11de35825827e196ca4112c1a863fe22db6848c1` | 70400 |
| `modules/shop/cobek-etalase.js` | `fc549c815865174cdaa35767ab92b7ee01d2c9757496c153d67a75a5735c7a3e` | 55460 |
| `modules/shop/cobek-io.js` | `006e7843dcf56f3a827009be118b90be7e2c336a31effbc056f81149047897dd` | 37155 |
| `modules/shop/cobek-order.js` | `af24915bfd8ea4d7e8f621a009d3f151edb73b76a5af801036dfd44f9a46f73e` | 58124 |
| `modules/shop/cobek-tx-cart.js` | `e87d9acd14cdefe9d2ee0e979c72dc3cb715059d3503419563776dade7f6fea6` | 36922 |
| `modules/vehicle/fuel-compare.js` | `e5759f54f64e19c0a1ac64d84a73e671a1d4f3cf5deab2fba48090d30adf7ee2` | 21442 |
| `modules/vehicle/fuel-dashboard.js` | `192758cc335a1afc7aac6c33541c1ea46f7424e63951f8dc3952c5b6dc0ec187` | 18514 |
| `modules/vehicle/part-crud-s2041.js` | `b3d87da844db08da2a4e4ea33d9e67e150a4aea012599fccdab49558bf2dcb60` | 25496 |
| `modules/vehicle/service-event-sot.js` | `5b8fb081c4b6cfc5886fa08592956243be1098ddc8b724644dfdd19d4be7eb84` | 12390 |
| `modules/vehicle/service-legacy-maintenance.js` | `2084338e4a653ece8cb9df7f64c4e5ac9781a39cfa37f62de895beab4d31e298` | 7013 |
| `modules/vehicle/servis.js` | `232a767012d1399d0319b4f968d72b2a56c316e02d5b5400040f921b1349e816` | 177532 |
| `modules/vehicle/sparepart-servis-b.js` | `4637c3ec093915208c694887bb28feec6335ecf19f45cebcf3a2e01c7c058e65` | 50759 |
| `modules/vehicle/stock-command-sot.js` | `10b762c01304415dffc95aa0ca1f085bb540a3ce800105f7f89d53848f49163e` | 14194 |
| `modules/vehicle/vehicle-core.js` | `0b775e68c53428fbeff29b2502b770b3bc72e22e1ee1977a79469e56ee7e6d6b` | 86879 |
| `modules/vehicle/vehicle-sot-fleet-integrity.js` | `ad3dcedfe6dd322d6a9932034e920190f795556f752665b539e4170ae7d7859d` | 10216 |
| `pajak-aset-ui-wrappers.js` | `0e90405be61c3a49ea492548897d9ea2ed6842e5e2b450291003d7c37922a4cf` | 12278 |
| `sw.js` | `0e02a8c7919dc18d5d5431d99707016b35808680e899caae9af0fc88820a98db` | 3631 |
| `tests/bugfix-b1-b4-regression.test.js` | `d68471e6864a612e5b61c9e170753963252667c685b062d8c448183cb0faf735` | 6073 |
| `tests/bugfix-b5-b8-decimal-id-regression.test.js` | `7d9b4c298a2bc16a8cff6ee631232e2cf87c2d835fc3b9a23ee4c76d6caccdec` | 6469 |
| `tests/bugfix-b9-b10-behavioral-2308.test.js` | `0dd4f9950bc9dd2c600355e4b70b1f321f3662f0a68618642c6d86d7a744e1f5` | 2930 |
| `tests/bugfix-b9-b10-shop-pajak-regression.test.js` | `5cb7da2fffdd80518cf0a3b71b729e9db275e22749db008c28e92c105cde02ba` | 2440 |
| `tests/e2e-harness-diagnostics.test.js` | `7e6615d6dc26fd3677c466f1b2632f05aa46fff4548deac21a12911afb67e244` | 665 |

## Daftar file penerapan (SOT)

BEGIN_APPLY_FILES
AUDIT-BUG-B1-B10-IMPLEMENTASI-S2041-2308.md
AUDIT-BUG-B1-B4-IMPLEMENTASI-S2041-2305.md
AUDIT-BUG-B5-B10-LANJUTAN-S2041-2307.md
FILE-HASHES-SHA256.txt
PATCH-MANIFEST-B1-B10-S2041-2307.md
PATCH-MANIFEST-B1-B10-S2041-2308.md
PATCH-MANIFEST-B1-B4-S2041-2305.md
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
budget.js
chat-action-handlers.js
docs/COVERAGE-PER-MODULE.md
docs/FILE-MAP.md
e2e/README.md
e2e/diagnostics.js
e2e/run-e2e.js
economic-intelligence/engine/scoring-engine.js
economic-intelligence/ui/eie-dashboard.js
index.html
laporan-export.js
lifeos/ui/review.js
modules/asset/aset.js
modules/asset/investasi-list-view.js
modules/asset/investasi-tx-view.js
modules/asset/investasi-watch-view.js
modules/asset/investasi.js
modules/business/kasir.js
modules/business/sewakios.js
modules/business/tukang-absensi.js
modules/finance/edukasi-dana.js
modules/finance/pajak-pbb-zakat.js
modules/finance/piutang-utang.js
modules/finance/tagihan-kalender.js
modules/finance/transaksi-b.js
modules/finance/transaksi.js
modules/finance/tx-stok-sparepart.js
modules/finance/worthit.js
modules/home/renovasi.js
modules/self-reward/self-reward-engine.js
modules/shared/backup-restore.js
modules/shared/data-archive.js
modules/shared/features-helpers-global-security.js
modules/shared/format-tema.js
modules/shared/modals.js
modules/shared/modules-calc.js
modules/shared/modules-render.js
modules/shared/scan-ocr.js
modules/shop/business-flow-presenter-inventory.js
modules/shop/cobek-etalase.js
modules/shop/cobek-io.js
modules/shop/cobek-order.js
modules/shop/cobek-tx-cart.js
modules/vehicle/fuel-compare.js
modules/vehicle/fuel-dashboard.js
modules/vehicle/part-crud-s2041.js
modules/vehicle/service-event-sot.js
modules/vehicle/service-legacy-maintenance.js
modules/vehicle/servis.js
modules/vehicle/sparepart-servis-b.js
modules/vehicle/stock-command-sot.js
modules/vehicle/vehicle-core.js
modules/vehicle/vehicle-sot-fleet-integrity.js
pajak-aset-ui-wrappers.js
sw.js
tests/bugfix-b1-b4-regression.test.js
tests/bugfix-b5-b8-decimal-id-regression.test.js
tests/bugfix-b9-b10-behavioral-2308.test.js
tests/bugfix-b9-b10-shop-pajak-regression.test.js
tests/e2e-harness-diagnostics.test.js
END_APPLY_FILES

## Aturan penerapan

- Terapkan ke root `app-main/` dengan mempertahankan struktur path.
- ZIP berisi hanya file baru/berubah dibanding baseline dan dokumen akumulasi yang berubah. Tidak ada file baseline yang diminta dihapus.
- Tidak menyertakan `node_modules`, checkpoint/temporary test files, atau bundle backup iterasi.
- Jangan menyatakan E2E lulus: browser policy memblokir navigasi lokal. Jalankan `npm run test:e2e` di lingkungan yang mengizinkan origin lokal untuk menyelesaikan penerimaan UI.
