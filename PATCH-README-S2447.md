# S2447 — PDF.js security mitigation + strict release-final gate

Baseline: app-main (53), cumulative chain through S2446.

Repairs:
- Mitigate CVE-2024-4367 in the retained PDF.js 3.11.174 integration by forcing `isEvalSupported: false` for every PDF document load.
- Strengthen `scripts/release-final-gate.js` so the final gate invokes the strict release-readiness gate without lint/minify overrides.

Evidence:
- Mozilla PDF.js advisory: affected <= 4.1.392; workaround is `isEvalSupported: false`; patched release is 4.2.67.
- Regression: `tests/s2447-pdfjs-security-and-final-gate.test.js`.
- Existing vehicle catalog import suite remains green.
