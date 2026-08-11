// lifeos-link-registry.js — relasi implisit-by-convention di D dibuat
// eksplisit di SATU tempat (Gap #9, personal-life-os-blueprint.md).
//
// PENTING: murni data deklaratif. `match`/lookup di sini hanya MEMBACA
// D — tidak pernah menulis. Dikonsumsi oleh review-adapter.js &
// goal-adapter.js untuk tahu entri mana yang "sebenarnya sama".

const LIFEOS_LINK_REGISTRY = [
  {
    key: 'dana-darurat',
    label: 'Dana Darurat',
    links: [
      { arr: 'targets', match: (t) => t.isDanaDarurat },
      { arr: 'lifeBalanceSnapshots', note: 'komponen skor Dana Darurat — field persis perlu dicek ulang di hidup-seimbang.js sebelum dipakai' },
    ],
  },
  // Tambahkan relasi lain di sini kalau ditemukan (mis. Wishlist item yang
  // juga tercatat di Skor Hidup Seimbang sebagai No-Spend goal, dst) —
  // jangan hardcode relasi baru di file adapter/service manapun.
];

function lifeOSFindLink(key) {
  return LIFEOS_LINK_REGISTRY.find((l) => l.key === key) || null;
}
