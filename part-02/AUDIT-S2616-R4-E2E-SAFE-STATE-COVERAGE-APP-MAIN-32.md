# Audit S2616-R4 — cakupan E2E state aman dan state data rusak

Celah yang ditutup: R3 hanya menguji kartu Alokasi Dana Aman pada state terkunci default (kiriman mingguan aktif). R4 menguji state nominal investasi aman dan empat state terkunci akibat data rusak/cadangan kurang pada Chromium nyata.

Prasyarat fixture yang ditemukan: kiriman = 0; akun SELF `includeInBalance`; target `isDanaDarurat` dengan akun cadangan yang terisi; cache saldo dan forecast harus diinvalidasi (`invalidateAccBalCache()` dan `invalidateCashflowForecastCache()`), kalau tidak, kartu terkunci `CASH_SNAPSHOT_MISMATCH` karena snapshot forecast basi.

Batas: skenario memakai fixture sintetis, bukan data pengguna; tidak memverifikasi alur input data melalui form. Hasil dari sandbox pemeriksa, bukan dari lingkungan target rilis.
