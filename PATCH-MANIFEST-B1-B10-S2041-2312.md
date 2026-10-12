# Patch Manifest — S2041-2312 (cumulative: B1–B10 + UI/UX S2311 + parsePzNum + E2E 390px)

Tanggal audit: 11 Oktober 2026.

- Baseline: `app-main (18).zip` (build 2295), SHA-256 `6785b407d22478107954bbbacbabc599638a532b1565c0d3a77c1b4843fcccbe`
- Runtime build: `s2041-1-part-sot-hardening-2312` (`?v=2312`, `kw-cache-v2312`).
- Full suite paksa ulang: **8.790 tes, 8.789 pass, 0 fail, 1 skipped**. Release gate: **LOLOS** (lint 0 error). E2E: **PASS 16/16**.
- Daftar penghapusan: kosong.
- File unik dalam ZIP: **87**; entri checksum payload: **86**.

## SHA-256 payload

| Path | SHA-256 | Bytes |
|---|---|---:|
| `AUDIT-BUG-B1-B10-IMPLEMENTASI-S2041-2308.md` | `e44db9b69bc2e75f6e96a5e2500ea395539b929c2b22434874244497c1f944dd` | 7467 |
| `AUDIT-BUG-B1-B10-IMPLEMENTASI-S2041-2309.md` | `d235bfce3dfb767046fbef446ae6a8f9cbdeb5ab8786af6015f5c24033bb6ee3` | 2514 |
| `AUDIT-BUG-B1-B4-IMPLEMENTASI-S2041-2305.md` | `4d693ce36190233e6bd7f63cccabe8f99579eb02eac778f32742dac60b7d25de` | 6795 |
| `AUDIT-BUG-B5-B10-LANJUTAN-S2041-2307.md` | `9c6f513f055cf1b1b6daf8d3b44c04b1be342c2a6a5076d207eacb7bc0dcb61b` | 4114 |
| `AUDIT-LANJUTAN-S2041-2312.md` | `afb4109d1e97b1070427f0740b1664de9d4e4b266aec2e11e9a47a95d4dd84a1` | 1829 |
| `AUDIT-RANTAI-S2041-2311.md` | `39bd4424c1552fbab4cce0fa9df162d19f93dfa2046bb2929b67842c1dc46062` | 2174 |
| `AUDIT-UIUX-S2311.md` | `69e8a693638d624cc63d25b1a995d9f47b0c2861dc97811484c2572e474ae9ef` | 3182 |
| `FILE-HASHES-SHA256.txt` | `3f8e0a0394ebd3c48bfd9bec343b36c22009ee2ce37beb3b39c0843464936cae` | 12345 |
| `PATCH-MANIFEST-B1-B10-S2041-2307.md` | `01443eb3459d16458fedf758efb9a9ab93303a55221a8deb1be1c13ae1e8131c` | 8884 |
| `PATCH-MANIFEST-B1-B10-S2041-2308.md` | `0b9478bfd64f4deeb136247c19b9de4d347b42edb2b3a662580e73c3e82cd576` | 11960 |
| `PATCH-MANIFEST-B1-B10-S2041-2309.md` | `4bdc5311f3973fe1ef7551e65e1da9de3f8bfcca0136ae1ecb29a7bbd6ab9915` | 11588 |
| `PATCH-MANIFEST-B1-B10-S2041-2311.md` | `8d1ecb51e82989f54c067aae5ea7c7200e9fa1ae00085ec6c65f1cc3f0745852` | 13259 |
| `PATCH-MANIFEST-B1-B4-S2041-2305.md` | `8786311c5ee29ee8900dbd2fae12be1a96dfb9bcd939b84ec7935c6185a50a89` | 8303 |
| `PATCH-MANIFEST-S2311.txt` | `31a61ad18cd751f78da5de52d56f5b8480c1c433e054000c46004aeafed58521` | 2255 |
| `app-bundle-a.min.js` | `d35a4c250947c3dc32756b321134d1dafc371dd5685ec99262a13bf0c1ec6dcb` | 1035278 |
| `app-bundle-b.min.js` | `608e633a6f445f432e073f914067d62a7a8d231bb4bdb17c82b62803648bbdd3` | 2447674 |
| `app_production.html` | `06f6c06c9cd734b8e08f4bf053b4b77e5993368e161f5a2a55600a07956fbaa0` | 314123 |
| `budget.js` | `e7d036f3060911caa7352d12035f488352e8825070a244a6b5350d1fbcb6e5f3` | 33096 |
| `chat-action-handlers.js` | `8441a11bbcd04bb4f618087aeeb920063f7e29757d1231405b337d3e921f49dc` | 10556 |
| `docs/COVERAGE-PER-MODULE.md` | `1ff9323a5c61cfc362590f277a41d97c1e2693b639fc271201c905aa4b75fef4` | 1781 |
| `docs/FILE-MAP.md` | `b51beb856a82ab28c48b37eb08cee2a8c92de66a6e30ea25e3de75ad98a3943b` | 1085361 |
| `docs/RELEASE-GATE-LOG.md` | `10a0c5c40de493c0b82f3b0efe164f9eb3bf49a65b29ed29c25d162a9513b6dd` | 85006 |
| `e2e/README.md` | `938c20e3310b55c1c8f4f424667841c85a94dd0feab4ee58a612be6da4c6a686` | 964 |
| `e2e/diagnostics.js` | `2f47363e62189cc6d541edb41ee0f025e1026845ed0d8fcd3ff2cf83252095d0` | 379 |
| `e2e/run-e2e.js` | `fdb254227b406e0c0cd86934f325e6464211fd5072d3f76f3315978d70dd318a` | 14620 |
| `economic-intelligence/engine/scoring-engine.js` | `112a138832d4039da02ce066245b50a42df96f2791ae7677efbbe9a30fd206f7` | 2777 |
| `economic-intelligence/ui/eie-dashboard.js` | `a839256a0eb1e2a2d2630e4825615bf302dcf80d2b516d649384f874279162b6` | 14930 |
| `index.html` | `06dff3fe13fcc44e9881f5d3a039e6e7e3ee0151566dac3026ef7abbabe31d44` | 313930 |
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
| `modules/shared/action-wrappers.js` | `0e90f3365826e7fa7e1057d4d4db68063c80129398b0cc97f12da7dce55f7c13` | 14730 |
| `modules/shared/backup-restore.js` | `701cdabeb20b4fecbdef3d48b74ca178df07ebdfce4fdda0958835b14b51225d` | 87971 |
| `modules/shared/data-archive.js` | `3c8ebcc932ce75722eb7bfaf2fb6e5639d46dc490ea11d3893d403c5bb0d43ae` | 8709 |
| `modules/shared/features-helpers-global-security.js` | `5c1842ddcc86ea47f3033fcf6903c997acc2158d91af29ff6864cd56141649b6` | 109743 |
| `modules/shared/format-tema.js` | `33962eb720a4b1f4e44a994372b77df7d985e3c5c60bebe4eb4427cfe9ae89c6` | 15932 |
| `modules/shared/modals.js` | `ab4507dc734528235834db977e7e26e058d7d52f8a4c3572c75b9a09b1c4c63a` | 300959 |
| `modules/shared/modules-calc.js` | `f22267ff90bee331eb2cc479e7a48a1ce2993346e80372711389d67072186b72` | 72723 |
| `modules/shared/modules-render.js` | `56da70d30e08390779135d1b8b87ed1a524b5e65915be7a66cc43bc485474918` | 104855 |
| `modules/shared/scan-ocr.js` | `2b077a08a17bb2a74eb13392474af0ab52811656555feee6c29d40423ad16103` | 60169 |
| `modules/shop/business-flow-presenter-inventory.js` | `12f28fabfdc0242eb6b14e4e11de35825827e196ca4112c1a863fe22db6848c1` | 70400 |
| `modules/shop/cobek-etalase.js` | `fc549c815865174cdaa35767ab92b7ee01d2c9757496c153d67a75a5735c7a3e` | 55460 |
| `modules/shop/cobek-io.js` | `006e7843dcf56f3a827009be118b90be7e2c336a31effbc056f81149047897dd` | 37155 |
| `modules/shop/cobek-order.js` | `af24915bfd8ea4d7e8f621a009d3f151edb73b76a5af801036dfd44f9a46f73e` | 58124 |
| `modules/shop/cobek-tx-cart.js` | `e87d9acd14cdefe9d2ee0e979c72dc3cb715059d3503419563776dade7f6fea6` | 36922 |
| `modules/vehicle/fuel-card.js` | `350496c69c2a292fa36c2ee3d22c06e75f191f4cccb19edb0906a53122491fbe` | 31194 |
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
| `pajak-aset-ui-wrappers.js` | `b25da4783f3c9abc06b3f61c0c048650caa4ad2254426a85538048ff1c603c69` | 12714 |
| `scripts/verify-patch-integrity.js` | `5a637f50bbb2f957d6372b36e725ecd5920bfc2d3bf0ee3edadc0a2590bf187a` | 2269 |
| `styles.css` | `8279e19909caefc42f46cae07b9e8611b4fb659b88ab2250d8c49d36db997458` | 179570 |
| `sw.js` | `aeee8dfa14e39baeabe8fbb927b247d303ea60bbf0017bc6a4ac92aea759cf74` | 3631 |
| `tests/bugfix-b1-b4-regression.test.js` | `d68471e6864a612e5b61c9e170753963252667c685b062d8c448183cb0faf735` | 6073 |
| `tests/bugfix-b5-b8-decimal-id-regression.test.js` | `f1ccf8f4e2be17c73e0960e455330a65d7b3ad8bb6fc838a1c20259a5dcfe7d3` | 7877 |
| `tests/bugfix-b9-b10-behavioral-2308.test.js` | `0dd4f9950bc9dd2c600355e4b70b1f321f3662f0a68618642c6d86d7a744e1f5` | 2930 |
| `tests/bugfix-b9-b10-shop-pajak-regression.test.js` | `5cb7da2fffdd80518cf0a3b71b729e9db275e22749db008c28e92c105cde02ba` | 2440 |
| `tests/e2e-harness-diagnostics.test.js` | `7e6615d6dc26fd3677c466f1b2632f05aa46fff4548deac21a12911afb67e244` | 665 |
| `tests/fuel-card.test.js` | `3f13c7fdf2e512a4c8fa57cfe084ce362ae37a18ce3db087ecf667dde5007d0a` | 40183 |
| `tests/grad-accent-token-scope.test.js` | `fcd16d6c1bdf82a5869e65c7ceaf2b3dd2b142a96d21cdac1d8a9c6f59110aa4` | 1544 |
| `tests/s2311-uiux-priority-fixes.test.js` | `0dda28d5b639a8221a21568d3270268a5768b348a625092aaee0d1fef4def66a` | 2358 |
| `tests/s2550-fuel-visibility-carnotes.test.js` | `10193b9a923d98f27ea38111db455428576cc647ba4d651976e247b528bdb247` | 3851 |

## Daftar file penerapan (SOT)

BEGIN_APPLY_FILES
AUDIT-BUG-B1-B10-IMPLEMENTASI-S2041-2308.md
AUDIT-BUG-B1-B10-IMPLEMENTASI-S2041-2309.md
AUDIT-BUG-B1-B4-IMPLEMENTASI-S2041-2305.md
AUDIT-BUG-B5-B10-LANJUTAN-S2041-2307.md
AUDIT-LANJUTAN-S2041-2312.md
AUDIT-RANTAI-S2041-2311.md
AUDIT-UIUX-S2311.md
FILE-HASHES-SHA256.txt
PATCH-MANIFEST-B1-B10-S2041-2307.md
PATCH-MANIFEST-B1-B10-S2041-2308.md
PATCH-MANIFEST-B1-B10-S2041-2309.md
PATCH-MANIFEST-B1-B10-S2041-2311.md
PATCH-MANIFEST-B1-B10-S2041-2312.md
PATCH-MANIFEST-B1-B4-S2041-2305.md
PATCH-MANIFEST-S2311.txt
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
budget.js
chat-action-handlers.js
docs/COVERAGE-PER-MODULE.md
docs/FILE-MAP.md
docs/RELEASE-GATE-LOG.md
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
modules/shared/action-wrappers.js
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
modules/vehicle/fuel-card.js
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
scripts/verify-patch-integrity.js
styles.css
sw.js
tests/bugfix-b1-b4-regression.test.js
tests/bugfix-b5-b8-decimal-id-regression.test.js
tests/bugfix-b9-b10-behavioral-2308.test.js
tests/bugfix-b9-b10-shop-pajak-regression.test.js
tests/e2e-harness-diagnostics.test.js
tests/fuel-card.test.js
tests/grad-accent-token-scope.test.js
tests/s2311-uiux-priority-fixes.test.js
tests/s2550-fuel-visibility-carnotes.test.js
END_APPLY_FILES

## Aturan penerapan

- Terapkan ke root `app-main/`; kumulatif, menggantikan ZIP 2309, S2311, dan 2311.
- Tidak menyertakan `node_modules`, `backups/`, checkpoint tes.
