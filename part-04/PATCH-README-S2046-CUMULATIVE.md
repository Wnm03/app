# S2046 — Service Test Regression Fixes (Cumulative)

Overlay kumulatif untuk `app-main (27)`, melanjutkan patch S2045.

## Perbaikan
- S2012/S2016: History sekarang konsisten memakai canonical service-component resolver, termasuk legacy history yang belum memiliki `serviceComponentId`.
- S2016: daftar komponen History juga menggunakan resolver yang sama sehingga komponen legacy tidak hilang dari filter.
- S2016: Reminder → Riwayat tetap lintas seluruh session kendaraan untuk komponen yang dipilih.
- S2034: empty `catch {}` di audit diberi komentar yang menjelaskan bahwa lookup bersifat optional.
- ServiceInputCatalog caller hardening: caller `groups` tidak lagi direferensikan sebagai function reference pada guard; pemanggilan tetap menghasilkan array.

## Verifikasi
- Service/Servis test set: **648/648 PASS, 0 FAIL**.
- Targeted S2012/S2016/S2034/groups tests: **14/14 PASS**.
- `node --check` pada file production yang diubah: PASS.
- Tidak membuat atau menyertakan full-release bundle.
