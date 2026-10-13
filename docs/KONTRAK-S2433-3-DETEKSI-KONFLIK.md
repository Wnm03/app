# Kontrak S2433.3 — deteksi konflik `jenis` vs `vehicleType` (NON-MUTATIF)

Status: FINAL (disetujui pemilik, 2026-10-13) — kontrak = DETEKSI & PERINGATAN SAJA. Tidak ada perubahan source produksi, bundle, data, snapshot SOT, atau provisioning.
Implementasi: `scripts/lib-deteksi-konflik-jenis-vehicletype.js` (fungsi murni, tidak dimuat aplikasi).

| Kondisi | Kategori | Catatan |
|---|---|---|
| konsisten | (tidak ada temuan) | |
| keduanya motor/mobil, berbeda | `konflik_jenis_vs_vehicletype` | ditinjau, tidak ada pemenang otomatis |
| berbeda & salah satu `listrik` | `beda_lintas_konsep_perlu_kontrak_domain` | tidak disamakan sebelum kontrak domain |
| tepat satu field kosong | `data_tidak_lengkap` (+`fieldKosong`) | bukan konflik |
| kedua field kosong | `tanpa_tipe` | |
| nilai di luar motor/mobil/listrik | `nilai_tidak_valid` (per field) | tidak ikut dihitung konflik |
| `sot.vehicleType` != (vehicleType‖jenis) | `snapshot_beda_dari_sumber` | terpisah |
| profil model (opsional) != nilai efektif | `profil_model_beda_dari_tersimpan` | hanya dicatat, tidak menimpa |

Satu kendaraan boleh punya beberapa temuan. Tiap temuan memuat: `id`, `index` (identitas stabil cadangan), `nama`,
nilai aktual `jenis` & `vehicleType` (ternormalisasi huruf kecil), `snapshot`, `modelId`, `kategori`, `sumber`.

Invarian: (1) input tidak diubah (diuji dengan objek beku); (2) idempoten/deterministik; (3) tanpa I/O;
(4) tidak memanggil provisioning, backup/restore, ataupun konsumen (Shop-Katalog, Torsi, servis, komponen).
Belum diputuskan (butuh audit data nyata + keputusan domain): kebijakan PENYELESAIAN konflik.

## Keputusan final (2026-10-13)
1. Deteksi dan peringatan saja. Tidak ada rekonsiliasi/normalisasi otomatis; tidak ada perubahan source pada kondisi sekarang.
2. Kendaraan lama yang hanya punya `jenis` (vehicleType kosong) = `data_tidak_lengkap`, BUKAN konflik; data tidak diubah untuk melengkapi field.
3. Pertentangan nyata antara `jenis`, `vehicleType`, profil model, atau snapshot SOT dilaporkan sebagai temuan; tidak ada nilai "pemenang" otomatis.
4. Rekonsiliasi hanya dengan persetujuan terpisah, setelah audit sumber kebenaran, dampak, dan strategi pemulihan.
5. Batas bukti: satu backup, 4 kendaraan. Hasil nol-konflik TIDAK membuktikan konflik mustahil terjadi.
