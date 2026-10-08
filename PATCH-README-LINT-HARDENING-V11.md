# V11 — cumulative release-gate lint hardening

- Fix duplicate `files` key in ESLint flat config.
- Add browser globals `CSS` and `globalThis`.
- Declare optional AI recovery-outbox hooks used behind `typeof` guards.
- Remove duplicate service interval audit/repair declarations in the canonical SOT.
- Keep `no-undef` and `no-redeclare` as hard errors; no release-gate bypass.
- Keep root `collect-app-globals.js` in DELETE-FILES.txt.

IMPORTANT: the root `collect-app-globals.js` must be physically deleted before
release-check (or apply DELETE-FILES.txt first). A ZIP overlay cannot delete an
existing file by itself.
