# GitHub Manual Upload Order

1. Upload/replace `scripts/build.js` with the file in this patch.
2. Upload `modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js`.
3. Upload `tests/service-history-lifecycle-s2027-s2030-app-main.test.js`.
4. Upload `docs/reference/*` and patch documentation as desired.
5. Do not upload any full APP MAIN bundle/HTML/SW from this patch.

The build entry is inserted immediately after `modules/vehicle/service-event-sot.js`.
