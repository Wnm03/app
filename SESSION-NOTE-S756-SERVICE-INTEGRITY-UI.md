# S756 — Service Integrity UI Wiring

- Added a read-only integrity summary card to the Car Notes → Servis tab.
- The card invokes `ServiceIntegrityReconciler.reconcile({services:D.servisLogs,transactions:D.transactions})` during the existing `renderCnTab()` refresh path.
- Healthy state shows an OK message; detected issues show compact issue labels.
- No data mutation or automatic repair is performed.
