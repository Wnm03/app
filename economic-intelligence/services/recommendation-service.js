// services/recommendation-service.js — mapping recommendationId -> aksi
// konkret (deep link ke fitur app existing yang SUDAH ada, bukan fitur
// baru). Data-only map + 1 fungsi baca, tidak ada state/I/O.
//
// `target` di sini mengikuti pola sama dgn FEATURE_REGISTRY di
// dashboard-hub-registry.js ({ page, tab?, goTo? }) supaya bisa dipanggil
// lewat fungsi navigasi yang sama, TIDAK menduplikasi mekanisme navigasi
// baru. Fase 2 UI (klik baris rekomendasi -> dashHubNavigateToFeature())
// sudah tersambung, lihat ui/eie-insight-feed.js.

const EIE_RECOMMENDATIONS = {
  'REC-REVIEW-BUDGET-IMPORT': {
    label: 'Cek anggaran kategori impor/BBM',
    target: { page: 'keuangan', tab: 'laporan' },
  },
  'REC-DELAY-VEHICLE-PURCHASE': {
    label: 'Tunda dulu rencana kredit kendaraan baru',
    target: { page: 'carnotes' },
  },
  'REC-BOOST-EMERGENCY-FUND': {
    label: 'Tambah alokasi ke Target Dana Darurat',
    target: { page: 'dashboard-hub', goTo: 'lifeBalanceCard' },
  },
  'REC-REVIEW-FLOATING-DEBT': {
    label: 'Review Buku Utang & strategi pelunasan',
    target: { page: 'keuangan', tab: 'kelola' },
  },
  'REC-REVIEW-PORTFOLIO': {
    label: 'Cek alokasi portofolio investasi',
    target: { page: 'dashboard-hub' }, // investasi.js belum ada halaman UI sendiri per audit fase 1
  },
};

const RecommendationService = {
  getById(recommendationId) {
    return EIE_RECOMMENDATIONS[recommendationId] || null;
  },
};
