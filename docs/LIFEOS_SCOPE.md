# LIFEOS_SCOPE.md — Batas scope LifeOS

Ditambahkan Sesi 26 (2026-07-18).

## Di dalam scope LifeOS

- **Registry** — `lifeos/lifeos-registry.js` (taksonomi murni data:
  `LIFEOS_AREAS`, `LIFEOS_TODAY_SOURCES`, `LIFEOS_GOAL_SOURCES`,
  `LIFEOS_PROJECT_LEGACY_SOURCE`, `LIFEOS_REVIEW_SOURCES`,
  `LIFEOS_KNOWLEDGE_REF_SOURCE`), `lifeos-link-registry.js`.
- **Adapter** — `lifeos/adapters/*.js` (area/today/goal/project/
  review/knowledge). Read-only terhadap `D`, registry-driven adalah
  pola yang disukai (lihat `docs/PROJECT_STATE.md` § LifeOS utk status
  per adapter — belum semua registry-driven).
- **Knowledge** — `lifeos/ui/knowledge.js`,
  `lifeos/services/knowledge-service.js`, `LifeOSStore.knowledge`.
- **Goal** — `lifeos/ui/goals.js`, `lifeos/adapters/goal-adapter.js`.
- **Dashboard** — `lifeos/ui/lifeos-home.js` (`LifeOSHome.render()`,
  satu titik integrasi ke `dashboard-hub.js`), `lifeos-store.js`.
- **Review** — `lifeos/ui/review.js`,
  `lifeos/services/review-service.js`, `LifeOSStore.reviewLog`.
- **Plugin** — `lifeos/plugins/lifeos-plugin-manifest.js`,
  `lifeos-plugin-validation.js`, `lifeos-plugin-registry.js`,
  `lifeos-plugin-loader.js` (Sesi 65, Batch 5, MVP: manifest metadata +
  validasi + registry in-memory + loader batch), `lifeos/ui/plugins.js`
  (Sesi 66, Plugin UI: list/register/unregister), `lifeos-plugin-runtime.js`
  (Sesi 69, Plugin Runtime MVP: state machine lifecycle
  loaded→enabled⇄disabled→unloaded, capability validation, error
  isolation hook onEnable/onDisable) — TIDAK ada eksekusi kode plugin
  arbitrer (manifest tanpa `entry`, Runtime tidak `eval`/`import()`
  apa pun)/Marketplace, menyusul kalau ada keputusan produk lanjutan.
- **Life Objects** — `lifeos/services/life-object-service.js`,
  `lifeos/ui/life-objects.js` (panel ke-7), `lifeos-object-ref.js`
  (resolver/validator `sourceRef`). `LIFEOS_OBJECT_REF_SOURCES`
  (`lifeos-registry.js`) 7/7 domain terdaftar: goal/project/knowledge/
  review/**finance** (Sesi 71, Batch 6 — "Finance Domain Foundation",
  baca `D.transactions` langsung, TIDAK ada adapter
  `lifeos/adapters/*.js` terpisah, sama pola dgn domain `review`)/
  **financeAccount**/**financeCategory** (Sesi 73, Batch 6 — "Finance
  Account & Finance Category Foundation", baca `D.accounts`/
  `D.categories.income`+`.expense` langsung, pola sama persis domain
  `finance`, TIDAK ada adapter baru; jump-to-source reuse
  `openAccModal(idx)`/`openCatModal(idx,type)` yang SUDAH ADA).

## Di luar scope LifeOS

Apa pun di luar 8 kategori di atas BUKAN scope LifeOS — termasuk:

- Smart AI/Smart Logistics (`modules/ai/*`, `modules/logistics/*`) —
  track terpisah, lihat `docs/AI_SCOPE.md`. LifeOS boleh DIBACA dari AI
  (mis. rencana Target Summary reuse `goalAdapterList()`, lihat
  `docs/PRODUCT_DECISIONS.md`) tapi arahnya SATU jalur — AI membaca
  LifeOS, bukan sebaliknya, dan LifeOS tidak boleh punya dependency
  balik ke `modules/ai/*`.
- Modul aplikasi inti (`modules/finance/*`, `modules/business/*`, dst)
  — LifeOS hanya BOLEH membaca (`D.*`) lewat adapter, TIDAK PERNAH
  menulis balik. Ini aturan arsitektur permanen ("zero-touch terhadap
  `D`"), lihat `docs/PRODUCT_DECISIONS.md` § LifeOS.
- **Finance Intelligence Foundation (Sesi 74)** &
  **Finance Dashboard & AI Hook Foundation (Sesi 75)** — Batch 6, tapi
  BUKAN scope LifeOS: `modules/finance/finance-intelligence.js`
  (`FinanceIntelligence`) & `modules/finance/finance-dashboard.js`
  (`FinanceDashboard`) murni bagian `modules/finance/*` (Dashboard
  Hub), TIDAK menyentuh `LIFEOS_OBJECT_REF_SOURCES`/`LifeOSStore`/
  `lifeos/*` sama sekali. Dicatat di sini semata utk transparansi
  batas — JANGAN disalahartikan sbg perluasan scope LifeOS.

## Aturan arsitektur permanen

LifeOS TIDAK PERNAH menulis ke `D`. Data milik LifeOS sendiri disimpan
lewat `LifeOSStore` (`lifeos-store.js`), namespace penyimpanan terpisah
total dari `D`, dipersist lewat key IDBStore sendiri (`'lifeos:store'`).
Lihat `README.md` § LifeOS > Catatan Zero-Touch untuk detail penuh —
JANGAN diaudit ulang, aturan ini sudah diverifikasi berkali-kali di
sesi-sesi sebelumnya.
