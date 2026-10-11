# Patch Manifest — B1–B4 / S2041-2305

Patch kumulatif dari `app-main (18).zip` (baseline build 2295) ke `s2041-1-part-sot-hardening-2305`.

- Baseline ZIP SHA-256: `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`
- File dalam blok apply: 55 (52 file aplikasi/artefak berubah + tes regresi + laporan audit + manifest)
- Daftar delete: kosong; tidak ada penghapusan aplikasi yang dibutuhkan untuk patch ini.
- Full suite: 8.770 tes, 8.769 lulus, 0 gagal, 1 skipped.
- `npm run release-check`: PASS; build versi 2305; `FILE-HASHES-SHA256.txt --check`: 110 entri valid.
- Browser E2E/manual UI belum dijalankan; lihat batasan dalam laporan audit.

## SHA-256 payload

Hash manifest ini sendiri tidak dicantumkan untuk menghindari referensi checksum sirkular; file ini termasuk dalam daftar apply.

| Path | SHA-256 |
|---|---|
| `AUDIT-BUG-B1-B4-IMPLEMENTASI-S2041-2305.md` | `4d693ce36190233e6bd7f63cccabe8f99579eb02eac778f32742dac60b7d25de` |
| `FILE-HASHES-SHA256.txt` | `f7c687c9fd280d551c92f88d12e2bca40d13547037e60beb61924dccba79e22e` |
| `app-bundle-a.min.js` | `bcc3ab115a745041365f663a2a2ecafb311ecf82792849f2538f17cb5d7dcae3` |
| `app-bundle-b.min.js` | `e8b7251898ea4664c2a1769a8a07a7d0e843af8fcfb716d08b97f05e2faa1d22` |
| `app_production.html` | `c820f7d9493159d835b134d43ceac24b5000a8fb526c2781b087c1d0110925fa` |
| `budget.js` | `e7d036f3060911caa7352d12035f488352e8825070a244a6b5350d1fbcb6e5f3` |
| `chat-action-handlers.js` | `d9dbaadac7625d71d47c04c57ac834fab90c94d3329b5fc13ff0dae42979470d` |
| `docs/COVERAGE-PER-MODULE.md` | `7caa52dd4ee482f85ec84be3b7cd25206250dfcfccb1499bd8dd971da3ff5152` |
| `docs/FILE-MAP.md` | `b39e30e237f91656e12913520275083cc7036c5911b339a44d66858edeb700f1` |
| `economic-intelligence/engine/scoring-engine.js` | `112a138832d4039da02ce066245b50a42df96f2791ae7677efbbe9a30fd206f7` |
| `economic-intelligence/ui/eie-dashboard.js` | `a839256a0eb1e2a2d2630e4825615bf302dcf80d2b516d649384f874279162b6` |
| `index.html` | `35a31831cae1ba9ea2693bf2ea57ca38bb87aecedf2e60241a615e462ac8c13c` |
| `laporan-export.js` | `0f3916981774b98929a77b975886868ee0717ac111efd9548fc762f9e5dafcc2` |
| `lifeos/ui/review.js` | `602232e000349dc164def140ec30e0b664681839589b17765fbe9264d47128ec` |
| `modules/asset/aset.js` | `f4313f92e39e78932b9fd2a72889a5b9cec011e20df848ace9d04a721077f983` |
| `modules/asset/investasi-tx-view.js` | `61a8717a209638ba6ca871966feb392407ea4fd3160b4d328b1c68d0fbff03f8` |
| `modules/asset/investasi.js` | `4a301fe28ffd0ea9c63e46fc76b89c89e2d98f9202186ef2db142c5f6ae6d674` |
| `modules/business/kasir.js` | `189b9443ef501479cc17e5223e6e23f794f1144d9b43057fc82fad3ba2a8fc01` |
| `modules/business/sewakios.js` | `1bf49d289833d0147c1aff802de6f35fa55813d5249372e0b4b74c8631c7817f` |
| `modules/business/tukang-absensi.js` | `48253cb235a972d145be07ae3e2a4029f09492ba06e6cee0360483ce013ce383` |
| `modules/finance/pajak-pbb-zakat.js` | `07503a69b955daec665cef4451928e4d01e1bf18117c0a616a82e658c088a455` |
| `modules/finance/piutang-utang.js` | `94eb5c42ecf5c7f0b47f205942ac5450cb5e366d9ebbfd06916b6359ff5f6a08` |
| `modules/finance/tagihan-kalender.js` | `d1c3eeafd6615db1b861587ac704c3ef3e8ce7b03f5452a7ae043e6266daf7dc` |
| `modules/finance/transaksi-b.js` | `dbfaf4ac36b23bd262bc95ebf19690c1524072c7a4d4d88ce396a8c0c8ad2f82` |
| `modules/finance/transaksi.js` | `2d973dd4d3f8103c151b3b47f88d4067bbf2ec0ab1228f2e998712c7f37df25d` |
| `modules/finance/tx-stok-sparepart.js` | `a65d49abf18d264d18cd077c376a8c5fdfeb1a0d530c3950f701ed7612f2eeaf` |
| `modules/finance/worthit.js` | `72f9ca7204aee995218c9b4a1c959883ecbf80ea62856c4d7e2c74292424cd18` |
| `modules/home/renovasi.js` | `d80af1c98a3b86dfdbfb2d5c9038f9dab47d6776b719ea089a1cbaccf66e5ef5` |
| `modules/self-reward/self-reward-engine.js` | `330cfe53fa35bf9dd185be6c504f2b9d58fe47e3022d208b499e3cf27b83ff15` |
| `modules/shared/backup-restore.js` | `701cdabeb20b4fecbdef3d48b74ca178df07ebdfce4fdda0958835b14b51225d` |
| `modules/shared/data-archive.js` | `3c8ebcc932ce75722eb7bfaf2fb6e5639d46dc490ea11d3893d403c5bb0d43ae` |
| `modules/shared/features-helpers-global-security.js` | `f95853b9ffd9a762665b7ebfe47f7d2a626ce1f3ca0939b35534f01eaaf2b946` |
| `modules/shared/format-tema.js` | `33962eb720a4b1f4e44a994372b77df7d985e3c5c60bebe4eb4427cfe9ae89c6` |
| `modules/shared/modals.js` | `8948af9f079c3e416c4917a0af10f9402c71f1bb4cfcf5cb1ed974a19c89fbc6` |
| `modules/shared/modules-calc.js` | `2e18967ddd5c5071d302ebaeb98612b3421a97c93bb07a2b311b9f8431226c81` |
| `modules/shared/modules-render.js` | `5952c0d9d283b60404237b802c9300ed439a8c51db83c7d9bdd558ad0bc3dacd` |
| `modules/shared/scan-ocr.js` | `2b077a08a17bb2a74eb13392474af0ab52811656555feee6c29d40423ad16103` |
| `modules/shop/business-flow-presenter-inventory.js` | `12f28fabfdc0242eb6b14e4e11de35825827e196ca4112c1a863fe22db6848c1` |
| `modules/shop/cobek-etalase.js` | `fc549c815865174cdaa35767ab92b7ee01d2c9757496c153d67a75a5735c7a3e` |
| `modules/shop/cobek-io.js` | `006e7843dcf56f3a827009be118b90be7e2c336a31effbc056f81149047897dd` |
| `modules/shop/cobek-order.js` | `71a64a05ac048d163111f5d3ea05ae023b0806d36253e4f85791cbc94e087b9f` |
| `modules/vehicle/fuel-compare.js` | `e5759f54f64e19c0a1ac64d84a73e671a1d4f3cf5deab2fba48090d30adf7ee2` |
| `modules/vehicle/fuel-dashboard.js` | `192758cc335a1afc7aac6c33541c1ea46f7424e63951f8dc3952c5b6dc0ec187` |
| `modules/vehicle/part-crud-s2041.js` | `b3d87da844db08da2a4e4ea33d9e67e150a4aea012599fccdab49558bf2dcb60` |
| `modules/vehicle/service-event-sot.js` | `5b8fb081c4b6cfc5886fa08592956243be1098ddc8b724644dfdd19d4be7eb84` |
| `modules/vehicle/service-legacy-maintenance.js` | `2084338e4a653ece8cb9df7f64c4e5ac9781a39cfa37f62de895beab4d31e298` |
| `modules/vehicle/servis.js` | `232a767012d1399d0319b4f968d72b2a56c316e02d5b5400040f921b1349e816` |
| `modules/vehicle/sparepart-servis-b.js` | `4637c3ec093915208c694887bb28feec6335ecf19f45cebcf3a2e01c7c058e65` |
| `modules/vehicle/stock-command-sot.js` | `10b762c01304415dffc95aa0ca1f085bb540a3ce800105f7f89d53848f49163e` |
| `modules/vehicle/vehicle-core.js` | `0b775e68c53428fbeff29b2502b770b3bc72e22e1ee1977a79469e56ee7e6d6b` |
| `modules/vehicle/vehicle-sot-fleet-integrity.js` | `ad3dcedfe6dd322d6a9932034e920190f795556f752665b539e4170ae7d7859d` |
| `pajak-aset-ui-wrappers.js` | `4ba620c8137be71f9fec796c649806a52faa20a3e1bd66351518789b05470d15` |
| `sw.js` | `17e7e7a3518176c5cb8b69b077d0f419c2d9977534d540e69d471ab10210ca9e` |
| `tests/bugfix-b1-b4-regression.test.js` | `d68471e6864a612e5b61c9e170753963252667c685b062d8c448183cb0faf735` |

## Apply file list

BEGIN_APPLY_FILES
AUDIT-BUG-B1-B4-IMPLEMENTASI-S2041-2305.md
FILE-HASHES-SHA256.txt
PATCH-MANIFEST-B1-B4-S2041-2305.md
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
budget.js
chat-action-handlers.js
docs/COVERAGE-PER-MODULE.md
docs/FILE-MAP.md
economic-intelligence/engine/scoring-engine.js
economic-intelligence/ui/eie-dashboard.js
index.html
laporan-export.js
lifeos/ui/review.js
modules/asset/aset.js
modules/asset/investasi-tx-view.js
modules/asset/investasi.js
modules/business/kasir.js
modules/business/sewakios.js
modules/business/tukang-absensi.js
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
END_APPLY_FILES

BEGIN_DELETE_FILES
END_DELETE_FILES
