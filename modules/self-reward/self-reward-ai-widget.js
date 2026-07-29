// self-reward-ai-widget.js — Widget Rekomendasi AI di dalam modal Self Reward.
// Dipindah ke modules/self-reward/self-reward-ai-widget.js (Sesi 12 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// MODUL BARU — tidak mengubah API/behavior self-reward-engine.js maupun
// self-reward-view.js yang sudah ada; file ini HANYA menambah satu section
// baru ("🤖 Rekomendasi AI") ke body modal yang sudah ada, dengan cara yang
// sama seperti self-reward-view.js membaca D via method global opsional
// (guard `typeof x!=='undefined'`), supaya tetap aman dites berdiri sendiri.
//
// TUJUAN: sinkron ke SEMUA fitur analisa yang sudah ada di app (bukan cuma
// 6 syarat SelfReward.evaluate()), lalu diringkas jadi rekomendasi teks yang
// actionable & berprioritas:
//   - SelfReward.evaluate()      -> budget/cashflow/dana darurat/investasi/utang/tagihan
//   - Investment.portfolioSummary() -> alokasi aset & ROI portofolio
//   - D.cobek (Order/shop)       -> tren profit toko 30 hari terakhir
//   - D.vehicles (vehicle-core)  -> servis/pajak kendaraan yang mendekati jatuh tempo
//   - D.pensiun / D.eduFunds     -> progres dana pensiun & dana pendidikan
// Semua sumber data diakses lewat guard `typeof X!=='undefined'` (pola sama
// dgn self-reward-engine.js) supaya modul ini tidak pernah melempar error
// walau salah satu modul lain belum termuat.
//
// PEMISAHAN PURE vs DOM (pola sama dgn self-reward-view.js):
//   - SelfRewardAI.generateRecommendations()/buildWidgetHtml() MURNI (terima/
//     kembalikan data, tanpa DOM) -> gampang dites via loadSource().
//   - SelfRewardAI.mountInto(bodyEl) satu-satunya fungsi yang sentuh DOM,
//     dipanggil dari self-reward-view.js setelah #selfRewardModalBody ditulis.

function _sraiFmtRp(n) {
  return typeof fmt === 'function' ? fmt(n) : 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}
function _sraiEsc(s) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s);
}

const SelfRewardAI = {

  // ---------- Sumber data per-domain (masing-masing aman berdiri sendiri) ----------

  // Portofolio investasi: flag kalau alokasi terlalu terkonsentrasi (>60% di
  // satu jenis instrumen) atau ROI negatif.
  _analyzeInvestasi() {
    if (typeof Investment === 'undefined') return [];
    const holdings = Investment.getHoldings ? Investment.getHoldings() : [];
    if (!holdings.length) return [];
    const summary = Investment.portfolioSummary ? Investment.portfolioSummary() : null;
    const out = [];
    if (summary && summary.roiPct < 0) {
      out.push({
        icon: '📉',
        text: `Portofolio investasi sedang minus ${summary.roiPct.toFixed(1)}% (unrealized). Bukan alasan panik, tapi jangan tambah alokasi ke instrumen yang sama dulu sebelum ditinjau.`,
        priority: 2,
      });
    }
    if (typeof Investment.assetAllocation === 'function' && summary) {
      const alloc = Investment.assetAllocation();
      const dominant = (alloc || []).find((a) => a.pct >= 60);
      if (dominant) {
        out.push({
          icon: '⚖️',
          text: `${Math.round(dominant.pct)}% portofolio menumpuk di ${dominant.type}. Pertimbangkan diversifikasi supaya risikonya lebih menyebar.`,
          priority: 3,
        });
      }
    }
    return out;
  },

  // Toko/Cobek: bandingkan profit 30 hari terakhir vs 30 hari sebelumnya.
  _analyzeShop() {
    if (typeof D === 'undefined' || !Array.isArray(D.cobek) || !D.cobek.length) return [];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const getTime = (c) => (c.date ? new Date(c.date).getTime() : (c.createdAt || 0));
    const recent = D.cobek.filter((c) => now - getTime(c) <= 30 * day);
    const prev = D.cobek.filter((c) => {
      const t = now - getTime(c);
      return t > 30 * day && t <= 60 * day;
    });
    const sum = (list) => list.reduce((s, c) => s + (c.profit || 0), 0);
    const recentProfit = sum(recent);
    const prevProfit = sum(prev);
    if (!recent.length && !prev.length) return [];
    if (prevProfit > 0 && recentProfit < prevProfit * 0.7) {
      const dropPct = Math.round((1 - recentProfit / prevProfit) * 100);
      return [{
        icon: '🏪',
        text: `Profit toko 30 hari terakhir (${_sraiFmtRp(recentProfit)}) turun ${dropPct}% dibanding 30 hari sebelumnya (${_sraiFmtRp(prevProfit)}). Cek harga modal/ongkir atau volume pesanan.`,
        priority: 2,
      }];
    }
    if (prevProfit > 0 && recentProfit > prevProfit * 1.2) {
      return [{
        icon: '🎉',
        text: `Profit toko naik dari ${_sraiFmtRp(prevProfit)} jadi ${_sraiFmtRp(recentProfit)} bulan ini — momentum bagus untuk konsisten dipertahankan.`,
        priority: 4,
      }];
    }
    return [];
  },

  // Kendaraan: pajak/servis yang jatuh temponya dekat (≤30 hari).
  _analyzeVehicle() {
    if (typeof D === 'undefined' || !Array.isArray(D.vehicles) || !D.vehicles.length) return [];
    const today = new Date();
    const out = [];
    D.vehicles.forEach((v) => {
      const dueFields = [
        { key: 'pajakDue', label: 'Pajak STNK' },
        { key: 'servisDue', label: 'Servis berkala' },
      ];
      dueFields.forEach((f) => {
        const dueStr = v[f.key];
        if (!dueStr) return;
        const due = new Date(dueStr + 'T00:00:00');
        const daysLeft = Math.round((due - today) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 30) {
          out.push({
            icon: '🚗',
            text: `${f.label} ${_sraiEsc(v.name || 'kendaraan')} jatuh tempo ${daysLeft} hari lagi (${dueStr}). Siapkan dananya sebelum dipakai untuk self reward.`,
            priority: 1,
          });
        }
      });
    });
    return out;
  },

  // Dana pensiun & dana pendidikan: kalau progresnya jauh di bawah jadwal,
  // itu sinyal untuk lebih konservatif soal self reward meski syarat dasar
  // (SelfReward.evaluate) sudah lolos.
  _analyzeJangkaPanjang() {
    const out = [];
    if (typeof D !== 'undefined' && D.pensiun && D.pensiun.aktif && D.pensiun.targetDana > 0) {
      const kontribusi = D.pensiun.kontribusiBulanan || 0;
      if (kontribusi <= 0) {
        out.push({
          icon: '🏖️',
          text: 'Target dana pensiun sudah diatur tapi kontribusi bulanan masih Rp0. Alokasikan sebagian sebelum menaikkan level self reward.',
          priority: 2,
        });
      }
    }
    if (typeof D !== 'undefined' && Array.isArray(D.eduFunds) && typeof EduFund !== 'undefined') {
      D.eduFunds.forEach((f) => {
        try {
          const c = EduFund.calc(f);
          const pct = c.fv > 0 ? (c.terkumpul / c.fv) * 100 : 0;
          if (pct < 30) {
            out.push({
              icon: '🎓',
              text: `Dana pendidikan "${_sraiEsc(f.name)}" baru terkumpul ${Math.round(pct)}% menuju target tahun ${f.tahunTarget}. Prioritaskan nabung ~${_sraiFmtRp(c.pmtBulanan)}/bln dulu.`,
              priority: 2,
            });
          }
        } catch (e) { /* abaikan entri yang tidak lengkap */ }
      });
    }
    return out;
  },

  // ---------- Gabungan lintas-domain berdasarkan SelfReward.evaluate() ----------
  // Menerjemahkan hasil 6 syarat dasar jadi rekomendasi actionable (bukan
  // cuma ok/tidak-ok) — dipakai bareng hasil _analyze*() di atas.
  _fromEvaluation(evalResult) {
    if (!evalResult) return [];
    if (!evalResult.eligible) {
      return (evalResult.priorities || []).map((p) => ({
        icon: '🎯',
        text: `Selesaikan dulu: ${p}.`,
        priority: 1,
      }));
    }
    const out = [{
      icon: '✅',
      text: `Kondisi finansial mendukung self reward di ${['', 'Level 1', 'Level 2', 'Level 3'][evalResult.rewardLevel] || ''} — batas aman sekitar ${_sraiFmtRp(evalResult.maxReward)} dari surplus bulanan.`,
      priority: 3,
    }];
    if (evalResult.rewardLevel >= 3) {
      out.push({
        icon: '🌟',
        text: 'Skor kekuatan finansial sangat sehat. Selain self reward, ini juga momen bagus menambah porsi investasi/dana darurat sekali lagi.',
        priority: 4,
      });
    }
    return out;
  },

  // ---------- API utama ----------
  // generateRecommendations(evalResult?) — MURNI: gabungkan semua domain,
  // urutkan dari prioritas tertinggi (angka lebih kecil = lebih penting),
  // maksimum 6 item supaya widget tidak kepanjangan.
  generateRecommendations(evalResult) {
    const ev = evalResult || (typeof SelfReward !== 'undefined' ? SelfReward.evaluate() : null);
    const all = [
      ...SelfRewardAI._fromEvaluation(ev),
      ...SelfRewardAI._analyzeVehicle(),
      ...SelfRewardAI._analyzeJangkaPanjang(),
      ...SelfRewardAI._analyzeShop(),
      ...SelfRewardAI._analyzeInvestasi(),
    ];
    return all.sort((a, b) => a.priority - b.priority).slice(0, 6);
  },

  // buildWidgetHtml(recommendations) — MURNI: markup section widget, pakai
  // classname yang sama dgn section lain di self-reward-view.js (.fg, dst)
  // supaya konsisten tanpa CSS baru.
  buildWidgetHtml(recommendations) {
    const list = recommendations && recommendations.length ? recommendations : null;
    const itemsHtml = list
      ? list.map((r) => `<div class="fg" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">
          <span>${r.icon}</span><span style="font-size:12px;line-height:1.5">${_sraiEsc(r.text)}</span>
        </div>`).join('')
      : `<div class="fg" style="font-size:12px;color:var(--text2)">Belum cukup data untuk rekomendasi. Isi transaksi, budget, dan target dulu ya.</div>`;
    return `
      <div class="fg" style="font-weight:600;font-size:12px;color:var(--text2);margin:16px 0 6px">🤖 Rekomendasi AI</div>
      <div id="selfRewardAiList">${itemsHtml}</div>
    `;
  },

  // mountInto(bodyEl) — SATU-SATUNYA fungsi yang sentuh DOM. Dipanggil dari
  // self-reward-view.js: appendChild widget HTML setelah body modal ditulis,
  // TIDAK menimpa/mengubah HTML yang sudah ada di sana.
  mountInto(bodyEl) {
    if (!bodyEl || typeof document === 'undefined') return;
    const html = SelfRewardAI.buildWidgetHtml(SelfRewardAI.generateRecommendations());
    const wrap = document.createElement('div');
    wrap.id = 'selfRewardAiWidget';
    wrap.innerHTML = html;
    bodyEl.appendChild(wrap);
  },
};

if (typeof window !== 'undefined') {
  window.SelfRewardAI = SelfRewardAI;
}
