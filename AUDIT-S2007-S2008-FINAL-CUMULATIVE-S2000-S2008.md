# AUDIT-S2007-S2008 — FINAL CUMULATIVE S2000–S2008

## Status
**IMPLEMENTED + VERIFIED (read-only data audit; no backup data mutated).**

## Scope
- S2007: canonical `Kategori Sparepart → ServiceComponent → Master Category` reconciliation.
- S2008: reminder category projection + history-count/baseline wording reconciliation.
- Historical service facts are preserved; no automatic legacy interval fabrication.

## Backup inventory
- Categories: **74**
- Vehicles: **3**
- Service history rows: **87**
- Active reminder categories without explicit serviceComponentId: **29**
- Canonical history rows missing all interval/next-due snapshots: **8**
- History/category vehicle mismatches detected: **1**
- Duplicate canonical component groups: **5**

## Category classification
- CANONICAL: **45**
- REVIEW_INTERVAL_CONFLICT: **5**
- REVIEW_NO_CANONICAL: **17**
- SAFE_EXACT_LINK: **7**

## Category matrix (74 rows)

| ID | Nama | Vehicle | Status | Component | Master | Interval km | Interval bulan | Reminder |
|---|---|---|---|---|---|---:|---:|---|
| sp_oli_mesin | Oli Mesin | veh_1786495602140 | CANONICAL | oli-mesin | servis-mesin | 1500 |  | YES |
| sp_filter_oli | Filter Oli | veh_1786495602140 | CANONICAL | filter-oli | servis-mesin | 10000 |  | YES |
| sp_oli_gardan | Oli Gardan/Transmisi | veh_1 | CANONICAL | oli-gardan | final-gear | 8000 |  | YES |
| sp_busi | Busi | veh_1782969767698 | CANONICAL | busi | servis-mesin | 8000 |  | YES |
| sp_filter_udara | Filter Udara | veh_1782969767698 | CANONICAL | filter-udara | filter-udara | 10000 |  | YES |
| sp_kampas_rem_depan | Kampas Rem Depan | veh_1782969767698 | CANONICAL | kampas-rem-depan | sistem-pengereman | 10000 |  | YES |
| sp_kampas_rem_belakang | Kampas Rem Belakang | veh_1 | CANONICAL | kampas-rem-belakang | sistem-pengereman | 10000 |  | YES |
| sp_vbelt | V-Belt (CVT) | veh_1782969767698 | CANONICAL | v-belt-cvt | servis-cvt | 24000 |  | YES |
| sp_roller_cvt | Roller CVT | veh_1782969767698 | CANONICAL | roller-cvt | servis-cvt | 24000 |  | YES |
| sp_1782832357301 | Servis | veh_1786495602140 | REVIEW_NO_CANONICAL |  |  | 8000 |  | YES |
| sp_1783602359757 | Aki | veh_1786495602140 | REVIEW_INTERVAL_CONFLICT | aki | kelistrikan | 18000 |  | YES |
| sp_1786856323863 | ban | veh_1786495602140 | REVIEW_NO_CANONICAL |  |  | 100000 |  | YES |
| sp_1787281120314 | Oli Mesin | veh_1 | REVIEW_INTERVAL_CONFLICT | oli-mesin | servis-mesin | 1500 | 0 | YES |
| sp_1787635705426 | Oli Mesin | veh_1782969767698 | REVIEW_INTERVAL_CONFLICT | oli-mesin | servis-mesin | 1500 |  | YES |
| sp_1787742920680 | Ban depan 80/90 | veh_1 | REVIEW_NO_CANONICAL |  |  | 20000 | 0 | YES |
| sp_1787742991498_reko_0 | Busi | veh_1 | REVIEW_INTERVAL_CONFLICT | busi | servis-mesin | 8000 |  | YES |
| sp_1787742991498_reko_1 | Saringan udara | veh_1 | REVIEW_NO_CANONICAL |  |  | 16000 |  | YES |
| sp_1787742991499_reko_2 | Drive belt (v-belt CVT) | veh_1 | REVIEW_NO_CANONICAL |  |  | 32000 |  | YES |
| sp_1787742991499_reko_3 | Minyak rem | veh_1 | CANONICAL | minyak-rem | sistem-pengereman | 4000 | 0 | YES |
| sp_1787742991499_reko_4 | Cairan pendingin radiator (coolant) | veh_1 | CANONICAL | coolant | sistem-pendingin | 4000 | 0 | YES |
| sp_1787742991499_reko_5 | Pin brake pad (kampas rem) | veh_1 | REVIEW_NO_CANONICAL |  |  | 4000 |  | YES |
| sp_1787742991499_reko_6 | Seal Cvt | veh_1 | REVIEW_NO_CANONICAL |  |  | 8000 | 0 | YES |
| sp_1787742991499_reko_7 | Pully Cvt | veh_1 | REVIEW_NO_CANONICAL |  |  | 400 |  | YES |
| sp_1787742991499_reko_9 | Pully | veh_1 | REVIEW_NO_CANONICAL |  |  | 3300 |  | YES |
| sp_1787742991499_reko_10 | Servis Cvt | veh_1 | REVIEW_NO_CANONICAL |  |  | 8000 | 0 | YES |
| sp_1787742991499_reko_11 | Grease Cvt | veh_1 | REVIEW_NO_CANONICAL |  |  | 4400 | 0 | YES |
| sp_1787742991499_reko_12 | Tutup Pully | veh_1 | REVIEW_NO_CANONICAL |  |  | 24000 | 0 | YES |
| sp_1787742991499_reko_14 | Filter Udara | veh_1 | SAFE_EXACT_LINK | filter-udara | filter-udara | 16000 |  | YES |
| sp_1787742991499_reko_15 | Roller CVT | veh_1 | SAFE_EXACT_LINK | roller-cvt | servis-cvt | 24000 |  | YES |
| sp_1787742991499_reko_16 | Filter Oli | veh_1 | SAFE_EXACT_LINK | filter-oli | servis-mesin | 10000 |  | YES |
| sp_1787742991500_reko_17 | Oli Gardan | veh_1 | REVIEW_NO_CANONICAL |  |  | 8000 |  | YES |
| sp_1787742991500_reko_18 | Aki | veh_1 | SAFE_EXACT_LINK | aki | kelistrikan | 15000 |  | YES |
| sp_1787742991500_reko_19 | Kampas Rem | veh_1 | REVIEW_NO_CANONICAL |  |  | 4000 |  | YES |
| sp_1787742991500_reko_20 | V-Belt CVT | veh_1 | SAFE_EXACT_LINK | v-belt-cvt | servis-cvt | 32000 |  | YES |
| sp_1787742991500_reko_21 | Ban Depan | veh_1 | CANONICAL | ban-depan | roda | 20000 |  | YES |
| sp_1789132698355 | Slidepiece cvt | veh_1 | REVIEW_NO_CANONICAL |  |  | 2800 | 0 | YES |
| sp_1789187300197 | Ban Belakang | UNIVERSAL | CANONICAL | ban-belakang | roda | 100000 |  | YES |
| sp_1789187398583 | Pembersihan Rumah CVT | UNIVERSAL | SAFE_EXACT_LINK | pembersihan-rumah-cvt | servis-cvt | 8000 |  | YES |
| sp_component_rantai-keteng-tensioner | Rantai Keteng & Tensioner | UNIVERSAL | CANONICAL | rantai-keteng-tensioner | servis-mesin | 0 | 0 | NO |
| sp_component_filter-kawat-oli-mesin | Filter Kawat Oli Mesin (Oil Strainer Screen) | UNIVERSAL | CANONICAL | filter-kawat-oli-mesin | servis-mesin | 12000 | 0 | YES |
| sp_component_paking-knalpot | Paking (Gasket) Knalpot | UNIVERSAL | CANONICAL | paking-knalpot | servis-mesin | 15000 | 0 | NO |
| sp_component_slide-piece-cvt | Slide Piece CVT | veh_1 | CANONICAL | slide-piece-cvt | servis-cvt | 8000 | 0 | YES |
| sp_component_boss-pulley-drive-face | Boss Pulley & Drive Face | veh_1 | CANONICAL | boss-pulley-drive-face | servis-cvt | 8000 | 0 | YES |
| sp_component_kampas-kopling-ganda | Kampas Kopling Ganda | veh_1 | CANONICAL | kampas-kopling-ganda | servis-cvt | 24000 | 0 | YES |
| sp_component_mangkok-kopling-ganda | Mangkok Kopling Ganda | veh_1 | CANONICAL | mangkok-kopling-ganda | servis-cvt | 8000 | 0 | YES |
| sp_component_seal-driven-face | Seal Driven Face (O-Ring & Karet) | veh_1 | CANONICAL | seal-driven-face | servis-cvt | 12000 | 0 | YES |
| sp_component_per-sentri | Per Sentri | veh_1 | CANONICAL | per-sentri | servis-cvt | 0 | 0 | NO |
| sp_component_per-cvt | Per CVT (weight/kick starter spring) | veh_1 | CANONICAL | per-cvt | servis-cvt | 0 | 0 | NO |
| sp_component_bearing-bak-cvt | Bearing Bak CVT | veh_1 | CANONICAL | bearing-bak-cvt | servis-cvt | 0 | 0 | NO |
| sp_component_busa-filter-cvt | Busa Filter CVT | UNIVERSAL | CANONICAL | busa-filter-cvt | servis-cvt | 8000 | 0 | NO |
| sp_component_throttle-body | Throttle Body (bersihkan) | veh_1 | CANONICAL | throttle-body | sistem-injeksi-pgmfi | 8000 | 0 | YES |
| sp_component_isc | Idle Speed Control (ISC) | UNIVERSAL | CANONICAL | isc | sistem-injeksi-pgmfi | 8000 | 0 | YES |
| sp_component_injector | Injector (bersihkan) | UNIVERSAL | CANONICAL | injector | sistem-injeksi-pgmfi | 0 | 0 | NO |
| sp_component_filter-fuel-pump | Filter Fuel Pump (Saringan Bensin) | UNIVERSAL | CANONICAL | filter-fuel-pump | sistem-bahan-bakar | 12000 | 0 | YES |
| sp_component_selang-tutup-tangki | Cek Selang & Tutup Tangki | UNIVERSAL | CANONICAL | selang-tutup-tangki | sistem-bahan-bakar | 0 | 0 | NO |
| sp_component_coolant | Coolant | veh_1 | CANONICAL | coolant | sistem-pendingin | 4000 | 24 | YES |
| sp_component_radiator-water-pump | Radiator & Water Pump (cek/flush) | UNIVERSAL | CANONICAL | radiator-water-pump | sistem-pendingin | 0 | 0 | NO |
| sp_component_thermostat | Thermostat | UNIVERSAL | CANONICAL | thermostat | sistem-pendingin | 0 | 0 | NO |
| sp_component_selang-rem | Selang Rem | UNIVERSAL | CANONICAL | selang-rem | sistem-pengereman | 0 | 48 | YES |
| sp_component_oli-shockbreaker | Oli Shockbreaker Depan | UNIVERSAL | CANONICAL | oli-shockbreaker | suspensi | 15000 | 0 | YES |
| sp_component_engine-mounting-bushing-arm | Engine Mounting & Bushing Arm | UNIVERSAL | CANONICAL | engine-mounting-bushing-arm | suspensi | 12000 | 0 | YES |
| sp_component_aki | Aki | UNIVERSAL | CANONICAL | aki | kelistrikan | 15000 | 0 | YES |
| sp_component_saklar-sistem-penerangan | Saklar & Sistem Penerangan | UNIVERSAL | CANONICAL | saklar-sistem-penerangan | kelistrikan | 4000 | 0 | YES |
| sp_component_relay-sekring | Relay & Sekring (Fuse) | UNIVERSAL | CANONICAL | relay-sekring | kelistrikan | 12000 | 0 | YES |
| sp_component_bearing-roda | Bearing Roda | UNIVERSAL | CANONICAL | bearing-roda | roda | 0 | 0 | NO |
| sp_component_kabel-gas-standar-kunci | Cek Kabel Gas/Rem Belakang/Standar/Kunci Kontak | UNIVERSAL | CANONICAL | kabel-gas-standar-kunci | body-kontrol | 8000 | 0 | YES |
| sp_1789383320818 | Kampas Rem Depan | UNIVERSAL | REVIEW_INTERVAL_CONFLICT | kampas-rem-depan | sistem-pengereman | 10000 |  | YES |
| sp_1789631596959 | oli gardan | UNIVERSAL | REVIEW_NO_CANONICAL |  |  | 8000 |  | YES |
| sp_component_cakram-rem-depan | Cakram Rem Depan | UNIVERSAL | CANONICAL | cakram-rem-depan | sistem-pengereman | 4000 | 0 | YES |
| sp_component_kaliper-rem-depan | Kaliper Rem Depan | UNIVERSAL | CANONICAL | kaliper-rem-depan | sistem-pengereman | 4000 | 0 | YES |
| sp_component_master-rem-reservoir | Master Rem & Reservoir | UNIVERSAL | CANONICAL | master-rem-reservoir | sistem-pengereman | 4000 | 0 | YES |
| sp_component_tromol-rem-belakang | Tromol Rem Belakang | UNIVERSAL | CANONICAL | tromol-rem-belakang | sistem-pengereman | 4000 | 0 | YES |
| sp_1789711538031 | pentil ban | UNIVERSAL | REVIEW_NO_CANONICAL |  |  | 100000 |  | YES |
| sp_1790219939309 | Oli Gardan/Final Drive | UNIVERSAL | SAFE_EXACT_LINK | oli-gardan | final-gear | 8000 |  | YES |

## Duplicate canonical component groups
- vehicle=veh_1 component=oli-gardan: categories=[sp_oli_gardan, sp_1790219939309], deterministic survivor=sp_oli_gardan
- vehicle=veh_1 component=coolant: categories=[sp_1787742991499_reko_4, sp_component_coolant], deterministic survivor=sp_component_coolant
- vehicle=veh_1 component=aki: categories=[sp_1787742991500_reko_18, sp_component_aki], deterministic survivor=sp_component_aki
- vehicle=veh_1782969767698 component=kampas-rem-depan: categories=[sp_kampas_rem_depan, sp_1789383320818], deterministic survivor=sp_kampas_rem_depan
- vehicle=veh_1786495602140 component=aki: categories=[sp_1783602359757, sp_component_aki], deterministic survivor=sp_component_aki

## Safety rules applied
1. Explicit valid `serviceComponentId` is canonical.
2. Exact-name legacy mapping is only `SAFE_EXACT_LINK` when the canonical interval does not conflict with the persisted category interval.
3. Interval conflicts are `REVIEW_INTERVAL_CONFLICT`; they are never auto-merged.
4. Ambiguous names are never auto-mapped.
5. Historical `intervalKmAtService` / `nextDue*` values are never fabricated or overwritten.
6. Duplicate canonical categories are projected to one deterministic reminder row; source data remains unchanged.

## Known review examples
- Servis (sp_1782832357301) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Aki (sp_1783602359757) — no explicit canonical component; **REVIEW**, not auto-mapped.
- ban (sp_1786856323863) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Oli Mesin (sp_1787281120314) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Oli Mesin (sp_1787635705426) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Ban depan 80/90 (sp_1787742920680) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Busi (sp_1787742991498_reko_0) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Saringan udara (sp_1787742991498_reko_1) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Drive belt (v-belt CVT) (sp_1787742991499_reko_2) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Pin brake pad (kampas rem) (sp_1787742991499_reko_5) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Seal Cvt (sp_1787742991499_reko_6) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Pully Cvt (sp_1787742991499_reko_7) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Pully (sp_1787742991499_reko_9) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Servis Cvt (sp_1787742991499_reko_10) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Grease Cvt (sp_1787742991499_reko_11) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Tutup Pully (sp_1787742991499_reko_12) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Filter Udara (sp_1787742991499_reko_14) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Roller CVT (sp_1787742991499_reko_15) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Filter Oli (sp_1787742991499_reko_16) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Oli Gardan (sp_1787742991500_reko_17) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Aki (sp_1787742991500_reko_18) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Kampas Rem (sp_1787742991500_reko_19) — no explicit canonical component; **REVIEW**, not auto-mapped.
- V-Belt CVT (sp_1787742991500_reko_20) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Slidepiece cvt (sp_1789132698355) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Pembersihan Rumah CVT (sp_1789187398583) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Kampas Rem Depan (sp_1789383320818) — no explicit canonical component; **REVIEW**, not auto-mapped.
- oli gardan (sp_1789631596959) — no explicit canonical component; **REVIEW**, not auto-mapped.
- pentil ban (sp_1789711538031) — no explicit canonical component; **REVIEW**, not auto-mapped.
- Oli Gardan/Final Drive (sp_1790219939309) — no explicit canonical component; **REVIEW**, not auto-mapped.

## Runtime fix
- Reminder category projection now uses the S2007/S2008 reconciliation layer before legacy fallback dedupe.
- Duplicate canonical components such as `coolant` are deterministically projected once, preferring the canonical component name and vehicle scope.
- A reminder card with history rows but no reset-eligible baseline now says **“Belum ada riwayat yang mereset interval”** instead of falsely saying **“Belum pernah dicatat”**.

## Session preservation
- S2000–S2006 cumulative source/release remains the baseline.
- S2007/S2008 add only the reconciliation module, integration, tests, audit script and this report.
- No previous session artifact is deleted or rewritten.

## Important boundary
The remaining legacy/review categories are intentionally not mass-mapped because their historical identity or interval evidence is insufficient. They require explicit business confirmation before any stored-data migration.

## Verdict
**S2007/S2008 code layer: PASS. Data cleanup: SAFE PARTIAL only; unresolved legacy rows remain review-only by design.**
