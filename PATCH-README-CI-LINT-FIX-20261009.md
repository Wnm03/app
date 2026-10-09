# CI lint fixes — 2026-10-09

Patch target: `app-main (12).zip` snapshot.

## Changes

1. `eslint.config.js`: include `**/*.test.js` in the Node/CommonJS ESLint override. This covers test files placed in the repository root, including `s2228-accumulated-baseline-integrity.test.js` and `test-runner-checkpoint-integrity-s1777.test.js`, so `__dirname`, `require`, and other Node globals are recognized for those files.
2. `ai-chat.js`: document and locally suppress `no-unused-vars` for `editChatAction` and `saveChatActionEdit`. They are called through string-based `data-action` dispatch, which static unused-variable analysis cannot reliably see. Function names are deliberately preserved because the HTML action names depend on them.

## Validation performed

- `node --check ai-chat.js` — passed.
- `node --check eslint.config.js` — passed.
- Static regression assertions for both handler names, data-action references, and ESLint override — passed.

## Not claimed

ESLint itself and the complete CI/release gates were not run in this environment because project dependencies (`node_modules/.bin/eslint`) are not installed. Run `npm run check` and the production release workflow before treating the patch as CI-approved.
