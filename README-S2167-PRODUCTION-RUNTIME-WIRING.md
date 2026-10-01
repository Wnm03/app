# S2167 — Production Runtime Wiring

Production bundle dan UI Service/Reminder/History sekarang dipaksa melewati projection SOT runtime S2166 untuk canonical identity dan active-vehicle scope.

**Focused:** 9/9 PASS.

**Production minification:** belum tersertifikasi karena `esbuild` tidak tersedia di environment validasi.
