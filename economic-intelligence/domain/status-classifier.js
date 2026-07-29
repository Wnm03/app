// domain/status-classifier.js — Pure function skor -> Economic Status.
// (Sebelumnya "weather-classifier.js"/istilah "Economic Weather" — diganti
// ke istilah "status"/"kondisi" ekonomi, konsisten dgn label yang memang
// sudah dipakai di UI ("Kondisi Ekonomi", lihat #eieWrap di index.html),
// bukan metafora cuaca. Bentuk data & threshold TIDAK berubah, murni
// rename identifier/istilah.)
// Tidak ada I/O. Lihat §8 dokumen desain.

function classifyEconomicStatus(EES, PEHS, ERI) {
  const impactScore = Math.max(0, Math.min(100, (EES * 0.5 + ERI * 0.5) - (PEHS * 0.3)));
  let status;
  if (impactScore < 35) status = 'normal';
  else if (impactScore < 65) status = 'waspada';
  else status = 'risiko_tinggi';
  return { status, impactScore: Math.round(impactScore * 10) / 10 };
}

const STATUS_META = {
  normal:        { icon: '🟢', label: 'Normal' },
  waspada:       { icon: '🟡', label: 'Waspada' },
  risiko_tinggi: { icon: '🔴', label: 'Risiko Tinggi' },
};
