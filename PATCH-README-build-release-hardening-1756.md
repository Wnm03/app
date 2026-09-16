# Car Notes build/release hardening — cumulative baseline 18

Implemented in this patch:
- production build path supports `--require-minify`; missing esbuild is a hard failure for release builds
- auto-version detection reads source constants, both HTML files, and SW cache, using the highest numeric suffix
- explicit numeric versions cannot downgrade the active version and inherit the current version prefix
- canonical `release:preflight` = strict build + release gate
- deterministic/resumable 32-shard full-test runner with per-shard checkpoints and watchdog
- Service SoT gate now invokes the deterministic full-test runner instead of a single long-running test process
- permanent Theme Pro deletion manifest retained; retired Pro files/tests are removed from active tree
- build/version monotonicity regression test added
- production setup instructions document the one-time Machine C `npm install --save-dev esbuild` step

Environment limitation:
- this sandbox has no network/package cache, so esbuild could not be installed here; release gate therefore correctly blocks minification/lint until dependencies are installed on the networked development machine.

Verified here:
- deterministic full suite: 6792/6792 PASS
- Service SoT gate: PASS
- Car Notes integrity: PASS; Theme Pro forbidden=0; duplicate IDs=0; canonical Servis=1
- Car Notes performance guard: PASS
- bundle freshness: PASS
- window expose: PASS
- source/bundle syntax: PASS
- HTML/SW version: 1756 synchronized
