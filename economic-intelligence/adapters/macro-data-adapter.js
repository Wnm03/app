// adapters/macro-data-adapter.js — Normalisasi data makro dari berbagai
// sumber, dgn fallback cache (offline-first, §16 dokumen desain).
//
// FASE 1 (MVP, "senyap"): TIDAK ada fetch ke API eksternal apa pun. Nilai
// makro diisi dari eie-store (manual cache). Kalau cache masih kosong
// (pemakaian pertama), dipakai seed placeholder yang DITANDAI TEGAS
// `isStale:true, source:'seed-belum-disinkron'` — supaya skor/insight yang
// dihasilkan tidak pernah diam-diam dikira data pasar real-time.
//
// FASE 2 (aktif): `refresh()` sekarang benar-benar fetch 2 indikator yang
// punya sumber otomatis — lihat `_autoFetchUsdIdr()` (API kurs publik) &
// `_autoFetchIhsgViaAI()` (AI + web search, pakai API key AI yg sudah ada
// di Pengaturan). 4 indikator lain (inflasi/bi_rate/emas/bbm) tetap manual
// lewat `setManualValue()` — tidak ada sumber gratis yang cukup andal.

const EIE_MACRO_INDICATORS = ['usdidr', 'inflasi', 'bi_rate', 'ihsg', 'emas', 'bbm'];

// Seed placeholder — HANYA dipakai kalau eie-store benar-benar belum
// pernah diisi (first run). Angka diambil dari kisaran umum, BUKAN data
// live, dan wajib direfresh/diinput manual oleh user/admin di fase 2 UI.
function _eieSeedMacro() {
  const now = Date.now();
  const seed = {
    usdidr:  { value: 16250, prevValue: 16250, unit: 'IDR' },
    inflasi: { value: 3.0,   prevValue: 3.0,   unit: '%' },
    bi_rate: { value: 6.0,   prevValue: 6.0,   unit: '%' },
    ihsg:    { value: 7200,  prevValue: 7200,  unit: 'poin' },
    emas:    { value: 1950000, prevValue: 1950000, unit: 'IDR/gram' },
    bbm:     { value: 12500, prevValue: 12500, unit: 'IDR/liter' },
  };
  const out = {};
  Object.keys(seed).forEach((id) => {
    const s = seed[id];
    out[id] = {
      indicatorId: id, value: s.value, prevValue: s.prevValue, changePct: 0, trend: 'flat',
      unit: s.unit, source: 'seed-belum-disinkron', fetchedAt: now, isStale: true,
    };
  });
  return out;
}

function _eieComputeTrend(value, prevValue) {
  if (!prevValue) return { changePct: 0, trend: 'flat' };
  const changePct = ((value - prevValue) / prevValue) * 100;
  const trend = changePct > 0.05 ? 'up' : (changePct < -0.05 ? 'down' : 'flat');
  return { changePct, trend };
}

const MacroDataAdapter = {
  /**
   * Baca snapshot makro terbaru dari eie-store. Kalau kosong, isi seed
   * placeholder (ditandai isStale) TANPA menulis balik ke store secara
   * otomatis — biar eksplisit lewat refresh()/setManualValue() saja.
   * @returns {Object.<string, import('../domain/entities.js').MacroSnapshot>}
   */
  getLatest() {
    const store = eieGetStore();
    const cache = store.macroCache || {};
    const seed = _eieSeedMacro();
    // Merge PER-INDIKATOR (bukan all-or-nothing): sejak refresh() fase 2 bisa
    // sukses utk sebagian indikator (mis. usdidr auto-fetch OK tapi ihsg gagal
    // krn API key AI belum ada), cache yg cuma terisi SEBAGIAN itu normal —
    // indikator yg belum ada di cache tetap harus fallback ke seed masing2,
    // bukan jadi undefined.
    const out = {};
    EIE_MACRO_INDICATORS.forEach((id) => { out[id] = cache[id] || seed[id]; });
    return out;
  },

  /**
   * Input manual 1 indikator (dipakai admin/user di UI fase 2, atau utk
   * testing). Menulis ke eie-store lewat eieSave() — SATU-SATUNYA jalur
   * tulis macro cache.
   */
  async setManualValue(indicatorId, value, unit) {
    if (!EIE_MACRO_INDICATORS.includes(indicatorId)) {
      throw new Error('[EIE] indicatorId tidak dikenal: ' + indicatorId);
    }
    const store = eieGetStore();
    const prev = (store.macroCache && store.macroCache[indicatorId]) || null;
    const prevValue = prev ? prev.value : value;
    const { changePct, trend } = _eieComputeTrend(value, prevValue);
    const snapshot = {
      indicatorId, value, prevValue, changePct, trend,
      unit: unit || (prev && prev.unit) || '',
      source: 'manual-input', fetchedAt: Date.now(), isStale: false,
    };
    store.macroCache = store.macroCache || {};
    store.macroCache[indicatorId] = snapshot;
    store.macroHistory = store.macroHistory || {};
    store.macroHistory[indicatorId] = (store.macroHistory[indicatorId] || []).concat([snapshot]).slice(-365);
    await eieSave();
    return snapshot;
  },

  /**
   * Riwayat snapshot 1 indikator (dari `macroHistory`, ditulis tiap
   * `setManualValue()`/auto-fetch sukses) — dipakai utk sparkline di kartu
   * watchlist (`eie-watchlist-card.js`). Selalu array (bisa kosong kalau
   * indikator belum pernah disinkron sama sekali), diurut lama->baru,
   * dipotong ke `limit` entri TERBARU saja (default 30, cukup utk 1 bulan
   * kalau sync harian) supaya sparkline tidak perlu render ratusan titik.
   */
  getHistory(indicatorId, limit) {
    if (!EIE_MACRO_INDICATORS.includes(indicatorId)) return [];
    const store = eieGetStore();
    const hist = (store.macroHistory && store.macroHistory[indicatorId]) || [];
    const n = limit || 30;
    return hist.slice(-n);
  },

  /**
   * Fase 2: auto-update 2 indikator yang punya sumber otomatis —
   * usdidr (API kurs publik, tanpa API key) & ihsg (lewat AI + web search,
   * pakai API key AI yang SUDAH dikonfigurasi user di Pengaturan → Asisten
   * AI, `D.profile.apiKey`/`D.profile.apiProvider` — SATU-SATUNYA API key
   * yang dipunyai app ini, dipakai bersama dgn fitur AI lain lewat
   * `callAIProviderRaw()` di features-aiwidget-reminder-gdrive-search.js).
   * 4 indikator lain (inflasi/bi_rate/emas/bbm) TIDAK punya sumber gratis
   * yang cukup andal utk auto-fetch client-side, tetap manual lewat
   * `setManualValue()` seperti sebelumnya.
   * Tiap indikator di-guard try/catch SENDIRI-SENDIRI — gagal satu (mis.
   * offline, atau API key AI belum diisi) tidak boleh menghalangi yang lain
   * atau melempar error ke caller; selalu fallback ke cache lama per-indikator.
   */
  async refresh() {
    await Promise.allSettled([this._autoFetchUsdIdr(), this._autoFetchIhsgViaAI()]);
    return this.getLatest();
  },

  /** USD/IDR dari open.er-api.com — API publik gratis, tanpa API key, CORS-enabled. */
  async _autoFetchUsdIdr() {
    try {
      if (typeof fetch !== 'function') return null;
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      const rate = data && data.rates && data.rates.IDR;
      if (!res.ok || data.result !== 'success' || typeof rate !== 'number' || !(rate > 5000 && rate < 50000)) {
        throw new Error('Respons kurs tidak valid');
      }
      const snap = await this.setManualValue('usdidr', Math.round(rate), 'IDR');
      snap.source = 'auto-api';
      const store = eieGetStore();
      if (store.macroCache && store.macroCache.usdidr) store.macroCache.usdidr.source = 'auto-api';
      await eieSave();
      return snap;
    } catch (e) {
      console.warn('[EIE] auto-fetch USD/IDR gagal, pakai cache lama:', e.message || e);
      return null;
    }
  },

  /**
   * IHSG lewat AI + web search (Claude/Gemini web_search, provider & API
   * key ambil dari D.profile — sama seperti fitur AI lain). Balasan AI
   * diminta HANYA berupa JSON `{"value": <angka index>}` supaya gampang
   * diparse & divalidasi (rentang wajar 1000–20000) sebelum dipakai —
   * kalau AI balas ngaco/di luar rentang, dibuang & fallback cache lama,
   * TIDAK pernah ditulis ke store.
   */
  async _autoFetchIhsgViaAI() {
    try {
      if (typeof D === 'undefined' || !D.profile || !D.profile.apiKey) {
        return null; // API key AI belum diisi user di Pengaturan -> diam2 skip, bukan error.
      }
      if (typeof callAIProviderRaw !== 'function') return null;
      const sysPrompt = 'Kamu asisten yang HANYA bertugas mencari 1 angka: nilai penutupan/terkini '
        + 'IHSG (Indeks Harga Saham Gabungan, Bursa Efek Indonesia) HARI INI lewat pencarian web. '
        + 'Balas HANYA dengan JSON valid TANPA teks/markdown lain apa pun, format persis: '
        + '{"value": <angka index, contoh 7284.32>}';
      const r = await callAIProviderRaw(sysPrompt, [{ role: 'user', content: 'Berapa nilai IHSG terkini/penutupan hari ini?' }], { webSearch: true, maxTokens: 200 });
      if (!r || !r.ok || !r.text) throw new Error((r && r.errMsg) || 'balasan AI kosong');
      const cleaned = r.text.replace(/```json|```/g, '').trim();
      const match = cleaned.match(/\{[^}]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);
      const value = Number(parsed.value);
      if (!Number.isFinite(value) || value < 1000 || value > 20000) {
        throw new Error('nilai IHSG di luar rentang wajar: ' + parsed.value);
      }
      const snap = await this.setManualValue('ihsg', value, 'poin');
      snap.source = 'auto-ai';
      const store = eieGetStore();
      if (store.macroCache && store.macroCache.ihsg) store.macroCache.ihsg.source = 'auto-ai';
      await eieSave();
      return snap;
    } catch (e) {
      console.warn('[EIE] auto-fetch IHSG via AI gagal, pakai cache lama:', e.message || e);
      return null;
    }
  },
};
