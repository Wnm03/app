# PATCH S2024 — Service History Evidence Provenance

S2024 menambahkan `service-history-evidence-provenance-s2024.js` sebagai read-only traceability layer.

Fungsi utama:
- `provenance(log,cid)`
- `sessionProvenance(log)`
- `find(log,cid,kind)`
- `render(log,cid)`

Wiring:
- `index.html` / `app_production.html` → `?v=2024`
- service worker → `kw-cache-v2024`

Tidak mengubah schema, history, finance, foto, cost allocation, stock, reminder, import/export, atau SOT.

Test baru: `tests/service-history-evidence-provenance-s2024.test.js`.
