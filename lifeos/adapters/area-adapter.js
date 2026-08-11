// adapters/area-adapter.js — READ-ONLY. Ringkasan per AREA (lifeos-registry.js:
// LIFEOS_AREAS) — murni menjumlah panjang tiap D.* yang terdaftar di
// `dSources` per area. Tidak ada skor/logic bisnis baru, cuma menghitung
// jumlah item yang sudah ada di D. Tidak pernah menulis ke D.
//
// Depends on: lifeos-registry.js (LIFEOS_AREAS). Sebelum file ini dibuat,
// LIFEOS_AREAS hanya deklaratif — tidak dikonsumsi kode apa pun (lihat
// README.md § LifeOS > Status Implementasi). Adapter ini adalah konsumen
// otomatis pertama: kalau LIFEOS_AREAS bertambah/berkurang entri, hasil
// areaAdapterList() otomatis ikut berubah tanpa perlu ubah file ini.

function areaAdapterList(D) {
  const areas = typeof LIFEOS_AREAS !== 'undefined' ? LIFEOS_AREAS : [];
  return areas.map((area) => {
    const itemCount = (area.dSources || []).reduce((sum, key) => {
      const arr = D[key];
      return sum + (Array.isArray(arr) ? arr.length : 0);
    }, 0);
    return {
      key: area.key,
      label: area.label,
      icon: area.icon,
      itemCount,
    };
  });
}

function areaAdapterFindOne(D, key) {
  return areaAdapterList(D).find((a) => a.key === key) || null;
}
