// ui/eie-dashboard.js — Kartu Status Ekonomi (§19). HANYA render, tidak
// pernah akses EIEStore/adapter langsung — selalu lewat EIEScoringEngine/
// MacroSyncService. Dipanggil dari DashboardHub.render() (pola "tambahan
// murni" sama seperti LifeOSHome.render()).

const EIEDashboard = {
  _rendering: false,
  // Status buka/tutup panel "Chart & Analisa" di kartu watchlist —
  // disimpan di memori JS (bukan localStorage) sengaja, cukup per-sesi
  // halaman terbuka, reset lagi ke tertutup tiap reload (pola sama dgn
  // `_rendering` di atas: state UI murni, bukan data yg perlu persist).
  _watchlistExpanded: false,

  async render() {
    const wrap = document.getElementById('eieWrap');
    if (!wrap) return; // container belum ada di halaman ini, aman diam2.
    if (this._rendering) return;
    this._rendering = true;
    try {
      await eieEnsureLoaded();
      // fase 3: nyalakan lagi notifikasi kalau user sudah pernah aktifkan
      // di sesi sebelumnya (sekali per sesi — bootstrap() sendiri no-op
      // aman kalau dipanggil berkali-kali karena NotificationService.enable()
      // sudah guard `if(this._enabled)return`).
      if (typeof EIENotifSettings !== 'undefined') EIENotifSettings.bootstrap();
      const today = new Date().toISOString().slice(0, 10);
      let snapshot = await EIEScoringEngine.getLatestSnapshot();
      // Recompute paling banyak 1x/hari — bukan tiap buka Dashboard Hub,
      // supaya tidak jadi kerja berat berulang tiap render. syncAndRecompute()
      // (bukan recomputeOnly()) supaya boundary harian ini juga jadi titik
      // auto-fetch USD/IDR (API publik) & IHSG (AI+web search) — lihat
      // MacroDataAdapter.refresh(); gagal fetch tetap fallback ke cache lama
      // secara diam-diam (tidak pernah melempar ke sini).
      if (!snapshot || snapshot.date !== today) {
        const result = await MacroSyncService.syncAndRecompute();
        snapshot = result.snapshot;
      }
      this._renderStatusCard(snapshot);
      this._renderWatchlistCard();
      if (typeof EIEInsightFeed !== 'undefined') EIEInsightFeed.render();
    } catch (e) {
      console.warn('[EIE] EIEDashboard.render() gagal:', e);
    } finally {
      this._rendering = false;
    }
  },

  _renderStatusCard(score) {
    const el = document.getElementById('eieStatusCard');
    if (!el || !score) return;
    const meta = STATUS_META[score.status] || STATUS_META.normal;
    const barColor = score.status === 'risiko_tinggi' ? 'var(--accent2)' : (score.status === 'waspada' ? 'var(--accent4)' : 'var(--accent3)');
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:28px;line-height:1;">${meta.icon}</div>
        <div>
          <div style="font-weight:600;font-size:15px;">${meta.label}</div>
          <div style="font-size:12.5px;opacity:.75;">Eksposur: ${score.economicExposureScore} · Kesehatan: ${score.personalEconomicHealthScore} · Risiko Makro: ${score.economicRiskIndex}</div>
        </div>
      </div>
      <div style="margin-top:8px;height:6px;border-radius:4px;background:var(--panel2,rgba(255,255,255,.08));overflow:hidden;">
        <div style="height:100%;width:${Math.max(4, Math.min(100, score.breakdown && score.breakdown.impactScore || 0))}%;background:${barColor};"></div>
      </div>
      <div style="margin-top:6px;font-size:11.5px;opacity:.6;">Diperbarui: ${score.date}</div>
      ${this._macroSourceHintHTML()}
      <button class="btn btn-ghost btn-sm u-mt8" data-action="eieManualSync" data-args='["$el"]'>🔄 Perbarui Kurs USD & IHSG Sekarang</button>
    `;
  },

  /**
   * Kartu "Daftar pantauan" (IHSG + USD/IDR) — tampilan meniru widget
   * watchlist saham (angka besar + panah naik/turun + sparkline utk item
   * utama, lalu grid kartu kecil di bawahnya). Murni presenter: baca dari
   * `MacroDataAdapter.getLatest()`/`getHistory()`, tidak pernah tulis balik.
   * Diam-diam no-op kalau container `#eieWatchlistCard` belum ada di
   * halaman (pola sama seperti `render()` di atas).
   */
  _renderWatchlistCard() {
    const el = document.getElementById('eieWatchlistCard');
    if (!el || typeof MacroDataAdapter === 'undefined') return;
    const latest = MacroDataAdapter.getLatest();
    const ihsg = latest.ihsg;
    const usd = latest.usdidr;
    if (!ihsg || !usd) return;
    const ihsgHist = MacroDataAdapter.getHistory('ihsg', 30).map((s) => s.value);
    const now = new Date();
    const jam = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-weight:600;font-size:15px;">Daftar pantauan Anda</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;opacity:.6;">
          <span>Diperbarui ${jam}</span>
          <button class="btn btn-ghost btn-sm" style="padding:2px 6px;" data-action="eieManualSync" data-args='["$el"]' aria-label="Segarkan">🔄</button>
        </div>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:32px;font-weight:700;line-height:1;">${this._fmtIndexValue(ihsg.value)}</div>
          <div style="margin-top:4px;font-size:12.5px;">
            <span style="opacity:.65;">IHSG · IDX</span>
            <span style="color:${this._trendColor(ihsg.trend)};font-weight:600;">${this._fmtChangePct(ihsg.changePct)}</span>
          </div>
        </div>
        ${this._trendBadgeHTML(ihsg.trend)}
      </div>
      ${this._sparklineHTML(ihsgHist, ihsg.trend, this._watchlistExpanded ? 110 : 56)}
      <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${this._watchlistMiniCardHTML('USD/IDR', 'Kurs', usd)}
      </div>
      <button class="btn btn-ghost btn-sm btn-full u-mt10" data-action="eieToggleWatchlistDetail">
        ${this._watchlistExpanded ? '▲ Sembunyikan Chart & Analisa' : '▼ Lihat Chart & Analisa AI'}
      </button>
      ${this._watchlistExpanded ? this._watchlistAiNoteHTML(ihsg, usd) : ''}
    `;
  },

  /** Kartu kecil 1 indikator (dipakai di grid bawah kartu watchlist utama). */
  _watchlistMiniCardHTML(label, exchange, snap) {
    return `
      <div style="background:var(--panel2,rgba(255,255,255,.06));border-radius:14px;padding:12px;">
        <div style="font-size:16.5px;font-weight:700;">${this._fmtIndexValue(snap.value)}</div>
        <div style="margin-top:2px;font-size:11.5px;opacity:.65;">${label}</div>
        <div style="margin-top:2px;font-size:11.5px;color:${this._trendColor(snap.trend)};font-weight:600;">${this._fmtChangePct(snap.changePct)}</div>
      </div>
    `;
  },

  /** Lingkaran panah naik/turun/datar di kanan atas — hijau naik, merah turun.
   * SEKARANG tombol beneran (dulu cuma <div> dekoratif, tidak mengarah kemana
   * pun) — tap membuka/menutup panel "Chart & Analisa" di bawahnya, sama
   * seperti tombol teks di bawah kartu. */
  _trendBadgeHTML(trend) {
    const bg = trend === 'up' ? 'var(--accent3)' : (trend === 'down' ? 'var(--accent2)' : 'var(--panel2,rgba(255,255,255,.15))');
    const arrow = trend === 'up' ? '↑' : (trend === 'down' ? '↓' : '→');
    return `<button data-action="eieToggleWatchlistDetail" aria-label="Lihat chart & analisa AI" style="width:38px;height:38px;border-radius:50%;background:${bg};border:none;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0;cursor:pointer;">${arrow}</button>`;
  },

  _trendColor(trend) {
    return trend === 'up' ? 'var(--accent3)' : (trend === 'down' ? 'var(--accent2)' : 'inherit');
  },

  _fmtIndexValue(v) {
    if (typeof v !== 'number') return '-';
    return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  },

  _fmtChangePct(pct) {
    if (typeof pct !== 'number') return '';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  },

  /** Sparkline SVG sederhana dari histori nilai (min. 2 titik supaya ada
   * garis). Kurang dari 2 titik -> string kosong, diam2 tidak render apa2
   * (belum pernah ada histori, mis. baru pertama kali sync). `h` (tinggi
   * px) bisa dibesarkan saat panel "Chart & Analisa" dibuka supaya lebih
   * mudah dibaca, default 56 (ukuran ringkas di kartu tertutup). */
  _sparklineHTML(values, trend, h) {
    if (!Array.isArray(values) || values.length < 2) return '';
    const w = 280;
    const height = h || 56;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = (max - min) || 1;
    const step = w / (values.length - 1);
    const pts = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const color = trend === 'down' ? 'var(--accent2)' : 'var(--accent3)';
    const fillPts = `0,${height} ${pts.join(' ')} ${w},${height}`;
    return `
      <div style="margin-top:8px;">
        <svg viewBox="0 0 ${w} ${height}" style="width:100%;height:${height}px;display:block;" preserveAspectRatio="none">
          <polygon points="${fillPts}" fill="${color}" opacity="0.12"></polygon>
          <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
        </svg>
      </div>
    `;
  },

  /**
   * Catatan "Analisa & Rekomendasi AI" utk kartu watchlist — heuristik
   * rule-based (BUKAN saran investasi berlisensi), pola & nada sama persis
   * dgn `PenyusutanAI`/`InvestAI` (icon + kalimat singkat, tanpa panggilan
   * API eksternal apa pun supaya selalu tersedia offline). Baca trend/
   * changePct IHSG & USD/IDR yg SUDAH dihitung `MacroDataAdapter`, tidak
   * pernah menghitung ulang/menebak angka baru.
   */
  _watchlistAiNoteHTML(ihsg, usd) {
    const notes = [];
    if (ihsg.trend === 'up') {
      notes.push({ icon: '📈', text: `IHSG naik ${this._fmtChangePct(ihsg.changePct)} dibanding data sebelumnya — sentimen pasar saham domestik sedang cenderung positif.` });
    } else if (ihsg.trend === 'down') {
      notes.push({ icon: '📉', text: `IHSG turun ${this._fmtChangePct(ihsg.changePct)} dibanding data sebelumnya — kalau kamu punya investasi saham/reksadana saham, ini wajar terjadi & bukan berarti harus buru-buru jual.` });
    } else {
      notes.push({ icon: '➖', text: 'IHSG relatif stabil (perubahan di bawah 0,05%) dibanding data sebelumnya.' });
    }
    if (usd.trend === 'up') {
      notes.push({ icon: '💱', text: `Rupiah melemah, USD/IDR naik jadi ${this._fmtIndexValue(usd.value)}. Barang impor, belanja luar negeri, atau cicilan berbasis USD bisa jadi lebih mahal — kalau ada rencana beli barang impor besar, pertimbangkan lebih cepat.` });
    } else if (usd.trend === 'down') {
      notes.push({ icon: '💱', text: `Rupiah menguat, USD/IDR turun jadi ${this._fmtIndexValue(usd.value)}. Momentum lumayan buat kebutuhan berbasis USD (belanja impor, DP kendaraan impor, dll).` });
    } else {
      notes.push({ icon: '💱', text: `Kurs USD/IDR relatif stabil di ${this._fmtIndexValue(usd.value)}.` });
    }
    if (ihsg.trend === 'up' && usd.trend === 'down') {
      notes.push({ icon: '✅', text: 'Kombinasi IHSG naik & Rupiah menguat biasanya menandakan kondisi makro yang cenderung mendukung — bukan jaminan, tapi sinyal cukup positif.' });
    } else if (ihsg.trend === 'down' && usd.trend === 'up') {
      notes.push({ icon: '⚠️', text: 'Kombinasi IHSG turun & Rupiah melemah bersamaan — kalau eksposurmu ke aset berisiko (saham/valas) lumayan besar, ini momen bagus utk cek ulang alokasi lewat kartu 💹 Performa Investasi.' });
    }
    const itemsHtml = notes.map((n) => `
      <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:12px;line-height:1.5;">
        <span>${n.icon}</span><span>${n.text}</span>
      </div>
    `).join('');
    return `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border,rgba(255,255,255,.08));">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;opacity:.6;margin-bottom:6px;">🤖 Analisa & Rekomendasi AI</div>
        ${itemsHtml}
        <div style="font-size:10.5px;opacity:.5;margin-top:2px;">Catatan otomatis berbasis data terakhir, bukan saran investasi berlisensi.</div>
      </div>
    `;
  },

  /** Baris kecil status sumber data USD/IDR & IHSG (auto-api/auto-ai/manual/belum
   * disinkron) supaya user tahu kenapa angkanya belum berubah kalau, mis., API
   * key AI di Pengaturan belum diisi (IHSG tidak bisa auto tanpa itu). */
  _macroSourceHintHTML() {
    try {
      const cache = (typeof MacroDataAdapter !== 'undefined' && MacroDataAdapter.getLatest()) || {};
      const label = (id, name) => {
        const s = cache[id];
        if (!s) return `${name}: belum ada data`;
        if (s.source === 'auto-api' || s.source === 'auto-ai') return `${name}: auto ✓`;
        if (s.source === 'manual-input') return `${name}: manual`;
        return `${name}: belum disinkron`;
      };
      return `<div style="margin-top:2px;font-size:11px;opacity:.55;">${label('usdidr', 'USD/IDR')} · ${label('ihsg', 'IHSG')}</div>`;
    } catch (e) {
      return '';
    }
  },
};

/** Tombol "▼ Lihat Chart & Analisa AI" / lingkaran panah tren di kartu
 * watchlist — toggle buka/tutup panel chart lebih besar + catatan AI.
 * State disimpan di `EIEDashboard._watchlistExpanded` (murni in-memory),
 * lalu render ulang HANYA kartu watchlist (bukan seluruh dashboard) supaya
 * ringan & tidak mengganggu kartu lain yg sedang tampil. */
function eieToggleWatchlistDetail() {
  EIEDashboard._watchlistExpanded = !EIEDashboard._watchlistExpanded;
  EIEDashboard._renderWatchlistCard();
}

/** Tombol manual "🔄 Perbarui Kurs USD & IHSG" — dipanggil dari data-action
 * lewat dispatcher global (features-helpers-global-security.js), $el = elemen
 * tombol itu sendiri supaya bisa dikasih status loading/disabled sementara. */
async function eieManualSync(btn) {
  const originalLabel = btn ? btn.textContent : null;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memperbarui…'; }
  try {
    await eieEnsureLoaded();
    await MacroSyncService.syncAndRecompute();
    await EIEDashboard.render();
    if (typeof toast === 'function') toast('✅ Data kurs & IHSG diperbarui');
  } catch (e) {
    console.warn('[EIE] eieManualSync() gagal:', e);
    if (typeof toast === 'function') toast('⚠️ Gagal update, tetap pakai data sebelumnya');
  } finally {
    const stillBtn = document.getElementById('eieStatusCard') ? document.querySelector('#eieStatusCard [data-action="eieManualSync"]') : null;
    if (stillBtn) { stillBtn.disabled = false; }
    else if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}
