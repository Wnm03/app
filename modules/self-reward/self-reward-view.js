// self-reward-view.js — UI layer untuk Self Reward Engine. Memisahkan render/DOM
// Dipindah ke modules/self-reward/self-reward-view.js (Sesi 12 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// dari logic MURNI di self-reward-engine.js (lihat catatan di kepala file itu:
// "Tidak ada DOM/render di file ini... taruh di file terpisah, pola sama dgn
// dashboard-hub-favorit.js vs dashboard-hub-favorit-view.js"). File ini HANYA
// membaca API publik SelfReward.getSettings()/saveSettings()/evaluate() — TIDAK
// pernah baca/tulis D.selfReward langsung, dan TIDAK mengubah satu baris pun di
// self-reward-engine.js.
//
// ENTRY POINT: didaftarkan sbg fitur di FEATURE_REGISTRY (dashboard-hub-registry.js,
// kategori 'personal', key 'per-self-reward') dgn target:{action:'SelfRewardView.open'}
// — pola PERSIS sama dgn 'per-worthit' (WorthIt.open). Saat kartu itu diklik di
// grid Dashboard Hub ATAU hasil Search, dashHubNavigateToFeature() memanggil
// SelfRewardView.open() lewat _dashHubCallAction() (mekanisme yang sama dipakai
// seluruh fitur modal-only lain, lihat dashboard-hub.js) — TIDAK ada perubahan ke
// dashboard-hub.js/dashboard-hub-search.js itu sendiri, murni tambahan data di
// registry.
//
// MODAL: elemen #selfRewardModal ditempel ke document.body lewat
// document.createElement (SEKALI, idempoten via ensureMounted()) — SENGAJA
// TIDAK lewat pipeline modals.js MODAL_HTML[]/document.write(...) di
// index.html/app_production.html, supaya modul ini tidak perlu menyentuh file
// yang dijaga ketat oleh test parity HTML (tests/modal-html-parity.test.js,
// dashboard-hub-registry.test.js, dst — lihat juga instruksi "jangan refactor
// di luar kebutuhan UI ini"). Begitu elemen itu ada di DOM, dia dibuka/ditutup
// lewat openModal()/closeModal() GLOBAL yang sama dipakai semua modal lain
// (modal-navigasi.js), dan pakai classname yang SAMA (.overlay/.modal/
// .modal-title/.modal-close/.fg/.fl/.fi/.btn dari styles.css, pola markup
// disalin dari accModal di modals.js) — jadi tampilannya konsisten dgn modal
// lain tanpa perlu nambah CSS baru.
//
// PEMISAHAN PURE vs DOM (pola sama dgn dashboard-hub-favorit-view.js):
//   - buildEvaluationView()/buildSettingsFormHtml()/buildModalBodyHtml() di
//     bawah MURNI (terima data, kembalikan object/string) — dites lewat
//     loadSource() biasa, tanpa DOM.
//   - SelfRewardView.mount()/open()/close()/render()/saveSettingsFromForm()
//     baca/tulis DOM — "ranahnya smoke-test/manual QA" (lihat catatan di
//     tests/helpers/loadSource.js), dites lewat fakeDom yang scope-nya
//     getElementById() (bukan createElement/document.body sungguhan).

const SELF_REWARD_LEVEL_LABEL = {
  1: 'Level 1 — Standar',
  2: 'Level 2 — Sehat',
  3: 'Level 3 — Sangat Sehat',
};

function _srFmtRp(n) {
  return typeof fmt === 'function' ? fmt(n) : 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}
function _srEsc(s) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s);
}

// buildEvaluationView(evalResult) — murni: ubah hasil SelfReward.evaluate()
// (bentuknya beda antara eligible:true/false, lihat self-reward-engine.js)
// jadi satu bentuk data tampilan yang seragam & gampang dirender.
function buildEvaluationView(evalResult) {
  const reasons = (evalResult.reasons || []).map((r) => ({
    label: r.label,
    ok: !!r.ok,
    icon: r.ok ? '✅' : '❌',
  }));
  if (evalResult.eligible) {
    return {
      eligible: true,
      statusIcon: '🎉',
      statusTitle: 'Eligible — Kamu Layak Self Reward!',
      reasons,
      priorities: [],
      levelLabel: SELF_REWARD_LEVEL_LABEL[evalResult.rewardLevel] || `Level ${evalResult.rewardLevel}`,
      maxRewardFormatted: _srFmtRp(evalResult.maxReward),
      surplusFormatted: _srFmtRp(evalResult.surplus),
    };
  }
  return {
    eligible: false,
    statusIcon: '🚫',
    statusTitle: 'Belum Layak Self Reward',
    reasons,
    priorities: evalResult.priorities || [],
    levelLabel: null,
    maxRewardFormatted: null,
    surplusFormatted: null,
  };
}

// buildSettingsFormHtml(settings) — murni: markup form pengaturan level %/
// grace-days, pre-filled dari SelfReward.getSettings(). Field & id mengikuti
// pola .fg/.fl/.fi yang sama dgn form lain (mis. accModal di modals.js).
function buildSettingsFormHtml(settings) {
  return `
    <div class="fg"><label class="fl">Level 1 — Reward (%)</label><input type="number" class="fi" id="srLevel1Pct" min="0" step="0.5" value="${settings.level1Pct}"></div>
    <div class="fg"><label class="fl">Level 2 — Reward (%)</label><input type="number" class="fi" id="srLevel2Pct" min="0" step="0.5" value="${settings.level2Pct}"></div>
    <div class="fg"><label class="fl">Level 3 — Reward (%)</label><input type="number" class="fi" id="srLevel3Pct" min="0" step="0.5" value="${settings.level3Pct}"></div>
    <div class="fg"><label class="fl">Toleransi Utang Telat (hari)</label><input type="number" class="fi" id="srGraceUtang" min="0" step="1" value="${settings.graceDaysUtang}"></div>
    <div class="fg"><label class="fl">Toleransi Tagihan Telat (hari)</label><input type="number" class="fi" id="srGraceTagihan" min="0" step="1" value="${settings.graceDaysTagihan}"></div>
    <button type="button" class="btn btn-primary btn-full u-p14" data-action="SelfRewardView.saveSettingsFromForm">Simpan Pengaturan</button>
  `;
}

// buildModalBodyHtml(evalResult, settings) — murni: gabungkan status/alasan/
// prioritas/level/maksimum reward + form pengaturan jadi satu HTML siap pakai
// utk #selfRewardModalBody.
function buildModalBodyHtml(evalResult, settings) {
  const v = buildEvaluationView(evalResult);
  const reasonsHtml = v.reasons.map((r) => `<div class="fg" style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span>${r.icon}</span><span style="font-size:13px">${_srEsc(r.label)}</span></div>`).join('');
  const prioritiesHtml = v.priorities.length
    ? `<div class="fg" style="background:var(--accent2-soft);border-radius:12px;padding:10px 14px;margin:10px 0">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">🎯 Prioritas yang Harus Diselesaikan</div>
        ${v.priorities.map((p) => `<div style="font-size:12px;color:var(--text2);margin-bottom:3px">• ${_srEsc(p)}</div>`).join('')}
      </div>`
    : '';
  const rewardHtml = v.eligible
    ? `<div class="fg" style="background:var(--accent-soft);border-radius:12px;padding:12px 14px;margin:10px 0">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px">${_srEsc(v.levelLabel)}</div>
        <div style="font-size:20px;font-weight:700;color:var(--accent)">${v.maxRewardFormatted}</div>
        <div style="font-size:11px;color:var(--text2)">Maksimum reward (dari surplus bulanan ${v.surplusFormatted})</div>
      </div>`
    : '';
  return `
    <div class="fg" style="text-align:center;margin-bottom:10px">
      <div style="font-size:32px">${v.statusIcon}</div>
      <div style="font-weight:700;font-size:15px">${_srEsc(v.statusTitle)}</div>
    </div>
    ${rewardHtml}
    ${prioritiesHtml}
    <div class="fg" style="font-weight:600;font-size:12px;color:var(--text2);margin:12px 0 6px">Rincian Kondisi Finansial</div>
    ${reasonsHtml}
    <div class="fg" style="font-weight:600;font-size:12px;color:var(--text2);margin:16px 0 6px">⚙️ Pengaturan</div>
    ${buildSettingsFormHtml(settings)}
  `;
}

const SelfRewardView = {
  _mounted: false,

  // ensureMounted() — menempel #selfRewardModal ke document.body SEKALI
  // (idempoten). Aman dipanggil berkali-kali/dari environment tanpa DOM
  // (semua akses document di-guard).
  ensureMounted() {
    if (this._mounted) return;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    if (typeof document.getElementById === 'function' && document.getElementById('selfRewardModal')) {
      this._mounted = true;
      return;
    }
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'selfRewardModal';
    if (typeof el.setAttribute === 'function') {
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'selfRewardModal-title');
    }
    el.innerHTML = '<div class="modal">'
      + '<div class="modal-handle"></div>'
      + '<div class="modal-title" id="selfRewardModal-title"><span>🎁 Self Reward</span>'
      + '<button class="modal-close" data-action="closeModal" data-args=\'["selfRewardModal"]\' aria-label="Tutup">✕</button></div>'
      + '<div id="selfRewardModalBody"></div>'
      + '</div>';
    if (document.body && typeof document.body.appendChild === 'function') {
      document.body.appendChild(el);
    }
    this._mounted = true;
  },

  // open() — SATU-SATUNYA entry point publik dipanggil dari luar (data-action
  // "SelfRewardView.open", didaftarkan lewat FEATURE_REGISTRY). Pola sama
  // persis dgn WorthIt.open().
  open() {
    this.ensureMounted();
    this.render();
    if (typeof openModal === 'function') openModal('selfRewardModal');
  },

  close() {
    if (typeof closeModal === 'function') closeModal('selfRewardModal');
  },

  // render() — evaluasi ulang SelfReward.evaluate()/getSettings() lalu tulis
  // ke #selfRewardModalBody. Dipanggil dari open() & tiap kali pengaturan
  // disimpan, supaya hasil evaluasi & form selalu sinkron dgn D terkini.
  render() {
    if (typeof document === 'undefined' || typeof SelfReward === 'undefined') return;
    const body = document.getElementById('selfRewardModalBody');
    if (!body) return;
    body.innerHTML = buildModalBodyHtml(SelfReward.evaluate(), SelfReward.getSettings());
    // Widget Rekomendasi AI (self-reward-ai-widget.js) — opsional, di-guard
    // supaya render() tetap aman kalau file itu belum/tidak dimuat.
    if (typeof SelfRewardAI !== 'undefined') SelfRewardAI.mountInto(body);
  },

  // saveSettingsFromForm() — SATU-SATUNYA jalur UI utk menyimpan pengaturan
  // (tombol "Simpan Pengaturan" di buildSettingsFormHtml). Delegasi penuh ke
  // SelfReward.saveSettings() (API publik yang sudah ada, TIDAK diubah) —
  // file ini tidak pernah menulis ke D.selfReward secara langsung.
  saveSettingsFromForm() {
    if (typeof document === 'undefined' || typeof SelfReward === 'undefined') return;
    const readNum = (id, fallback) => {
      const el = document.getElementById(id);
      const v = el ? parseFloat(el.value) : NaN;
      return isFinite(v) ? v : fallback;
    };
    const current = SelfReward.getSettings();
    SelfReward.saveSettings({
      level1Pct: readNum('srLevel1Pct', current.level1Pct),
      level2Pct: readNum('srLevel2Pct', current.level2Pct),
      level3Pct: readNum('srLevel3Pct', current.level3Pct),
      graceDaysUtang: readNum('srGraceUtang', current.graceDaysUtang),
      graceDaysTagihan: readNum('srGraceTagihan', current.graceDaysTagihan),
    });
    if (typeof toast === 'function') toast('✅ Pengaturan Self Reward disimpan');
    this.render();
  },
};

if (typeof window !== 'undefined') {
  window.SelfRewardView = SelfRewardView;
}
