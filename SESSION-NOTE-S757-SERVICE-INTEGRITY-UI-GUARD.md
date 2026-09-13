# S757 — Service Integrity UI Guard

- Hardened `renderServiceIntegrityCard()` against missing or throwing checker implementations.
- Uses safe array inputs for `D.servisLogs` and `D.transactions`.
- Shows a neutral unavailable state rather than breaking the Servis tab.
- No data mutation or automatic repair.
