// dashboard-hub.js — Dashboard Feature Hub (blueprint-dashboard-hub.md §5)
// Dipindah ke modules/dashboard-hub/dashboard-hub.js (Sesi 11 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
//
// STATUS (update v1.0-stabilization, build v234): sejak Tahap 4, halaman ini
// SUDAH jadi landing page default (satu-satunya class="page active" saat
// startup, lihat tests/dashboard-hub-default-landing.test.js) & tombol
// Beranda di bottom-nav sudah menunjuk ke sini. page-dashboard lama TIDAK
// dihapus — tetap ada di DOM (cuma tidak aktif), krn sebagian shortcut (mis.
// "Saldo Akun") datanya belum dipindah ke hub. Entry cadangan "🧭 Buka
// Dashboard Hub" di Pengaturan > Diagnostik juga masih sengaja dipertahankan
// (peninggalan Tahap 1, kini jadi jalur akses cadangan) — lihat catatan di
// index.html/app_production.html & tests/dashboard-hub-default-landing.test.js.
// Semua navigasi kartu fitur REUSE showPage/setKeuanganTab/setShopTab/
// setCnTab/setPajakTab/setSettingsTab/toggleStgGroup yang sudah ada — tidak
// menulis ulang logic halaman manapun (blueprint §5, §7).
//
// PENTING — Opsi 1 (keputusan sesi lampau, DIAMENDEMEN 2x): semula
// dashboard-hub-registry.js TIDAK diubah, semua kategori tanpa nav-item
// sendiri (Bisnis, Aset, Personal, Backup) dinavigasikan ke tab/kartu di
// salah satu dari 7 page ber-nav-item. Sesi berikutnya kategori "Aset"
// DIPISAH jadi page:'aset' TERSENDIRI (lihat page-aset di
// index.html/app_production.html), awalnya TANPA nav-item bottom-nav
// sendiri. Sesi INI: nav-item bottom-nav slot index 3 (dulu "AI") DIGANTI
// jadi "Aset" — jadi sekarang page:'aset' PUNYA nav-item sendiri, dan
// page:'ai' yang TIDAK LAGI punya nav-item sendiri (dibuka murni lewat
// showPage('ai', null) dari widget/kartu AI). FEATURE_REGISTRY[].navIdx
// TETAP index KATEGORI taksonomi §1 (0-9), BUKAN index nav-item bottom-nav —
// memakai cat.navIdx langsung ke showPage(page, navItems[cat.navIdx]) akan
// salah highlight nav-item utk kategori yang tidak py nav-item sendiri.
// Sebagai gantinya dipakai lookup lokal PAGE_NAV_IDX di bawah, dikunci ke
// NAMA PAGE (target.page), bukan ke kategori.

const PAGE_NAV_IDX = {
  dashboard: 0,
  'dashboard-hub': 0,
  keuangan: 1,
  shop: 2,
  aset: 3,
  carnotes: 4,
  pajak: 5,
  // 'ai' SENGAJA tidak dimasukkan lagi: slot nav-item index 3 sudah diganti
  // jadi "Aset" (lihat index.html/app_production.html bottom-nav). Halaman
  // 'ai' sekarang murni dibuka lewat showPage('ai', null) dari kartu
  // Dashboard Hub / widget AI, TIDAK punya nav-item bottom-nav sendiri.
  // navItems[PAGE_NAV_IDX['ai']] otomatis jadi undefined -> showPage()
  // dipanggil dgn el=null, aman (lihat showPage() di modal-navigasi.js).
  //
  // 'settings' JUGA SENGAJA tidak dimasukkan lagi (sesi ini): nav-item
  // "Setelan" di bottom-nav sudah dihapus, Pengaturan sekarang dibuka lewat
  // ikon ⚙️ icon-only di header (sebelah tombol Backup) supaya bottom-nav
  // cukup 6 slot & halaman Pengaturan sendiri jadi split-tab (bukan
  // accordion, lihat .stg-tabpanel & setSettingsTab() di
  // pengaturan-search.js). navItems[PAGE_NAV_IDX['settings']] otomatis jadi
  // undefined -> showPage() dipanggil dgn el=null, aman, sama seperti 'ai'.
};

// Index tombol tab (.cn-tab) sesuai URUTAN DOM asli di tiap halaman —
// diverifikasi lewat grep ke index.html (lihat komentar TAB REFERENSI di
// dashboard-hub-registry.js untuk daftar tab yang valid per page).
const KEU_TAB_IDX = { kelola: 0, tagihan: 1, budget: 2, utangpiutang: 3, asetproyek: 4, laporan: 5 };
// BUGFIX (Sesi 264, ditemukan sewaktu audit navigasi shop Business
// Intelligence): 'laporan'/'bi' TIDAK ADA di peta ini sejak dulu — padahal
// #page-shop sudah py 8 tab (bukan 6) sejak tab Laporan (lama) & tab
// Business Intelligence (Sesi 250) ditambahkan. Akibatnya
// dashHubNavigateToFeature({page:'shop', tab:'laporan'/'bi', ...}) selalu
// resolve ke `tabs[undefined]` -> setShopTab(t, undefined) -> crash di
// `el.classList.add('active')` (lihat cobek-io.js). Ditambahkan sesuai
// urutan DOM asli 8 tombol #page-shop .cn-tab (index.html).
const SHOP_TAB_IDX = { kasir: 0, jual: 1, etalase: 2, produsen: 3, riwayat: 4, pelanggan: 5, laporan: 6, bi: 7 };
// BUGFIX (Sesi 158, ditemukan sewaktu wiring deep-link sub-tab baru):
// CN_TAB_IDX dulu {bbm:0, servis:1} — stale sejak Sesi 157 (page-carnotes
// jadi 4 tab: insight/bbm/servis/pajak, BUKAN 2 lagi). Efeknya cosmetic
// (pane yang ditampilkan tetap benar krn setCnTab() pakai `t`, bukan
// index tombol -- tapi tombol yang di-marking `active` SALAH, mis. target
// tab:'bbm' malah menyalakan tombol index 0 = "Insight AI"). Diperbaiki
// jadi urutan DOM asli 4 tab (lihat komentar "Sesi 157" di
// app_production.html/index.html).
const CN_TAB_IDX = { insight: 0, bbm: 1, servis: 2, pajak: 3 };
const PAJAK_TAB_IDX = { zakat: 0, pajak: 1 };
const ASET_TAB_IDX = { ringkasan: 0, buku: 1, analisis: 2, manajemen: 3 };
// Sub-tab nested DI DALAM tab 'laporan' (page keuangan) — lihat setLaporanTab
// di tx-list-cashflow.js & catatan split 2026-07-17 di CLAUDE.md.
const LAPORAN_SUBTAB_IDX = { ringkasan: 0, aruskas: 1, transaksi: 2 };
// Sub-tab nested DI DALAM tab 'kelola' (page keuangan) — lihat setKelolaTab
// di tx-list-cashflow.js & catatan split 2026-07-17 (bagian ke-3) di CLAUDE.md.
const KELOLA_SUBTAB_IDX = { ringkasan: 0, transaksi: 1, pengaturan: 2 };
// Sub-tab nested DI DALAM tab 'pajak' (page pajak) — lihat setPjkTab di
// features-sheets-pwa-selftest.js & catatan split 2026-07-17 (bagian ke-4)
// di CLAUDE.md.
const PJK_SUBTAB_IDX = { pph21: 0, pbb: 1 };
// Sub-tab nested DI DALAM tab 'insight' (page carnotes) — lihat
// setCnInsightTab di vehicle-core.js & catatan split Sesi 158.
const CNI_SUBTAB_IDX = { ringkasan: 0, rekomendasi: 1 };
// Sub-tab nested DI DALAM tab 'bbm' (page carnotes) — lihat setCnBbmTab
// di vehicle-core.js & catatan split Sesi 158.
const CNB_SUBTAB_IDX = { ringkasan: 0, analisis: 1 };

// Resolve string action ("openTxModal" atau "WorthIt.open") jadi pemanggilan
// fungsi nyata, dgn `this` yg benar kalau namespaced (pola sama dgn
// dispatcher data-action global di features-helpers-global-security.js).
// Tahap 3, Langkah 8 — helper murni baca-saja, dipakai render() utk state
// awal ★ tiap kartu. Sengaja guarded (typeof check): file ini juga dipakai
// tests/dashboard-hub.test.js tanpa DashboardHubFavorit di-inject, harus
// tetap aman (dianggap "tidak ada yang difavoritkan"), bukan throw.
function _dashHubIsFav(key) {
  if (typeof DashboardHubFavorit === 'undefined') return false;
  return DashboardHubFavorit.getFavoritKeys().indexOf(key) !== -1;
}

function _dashHubCallAction(name) {
  if (!name) return;
  const path = String(name).split('.');
  let owner = window, fn = window;
  for (const p of path) { owner = fn; fn = fn ? fn[p] : undefined; }
  if (typeof fn === 'function') fn.call(owner);
  else console.warn('DashboardHub: action tidak ditemukan:', name);
}

// BUGFIX (goTo ke widget di sub-tab Dashboard Hub yang sedang tidak aktif):
// beberapa target.goTo (mis. advisorCard/lifeBalanceCard/refleksiCard/
// dashFiCard ada di dalam #dashboardHubPinnedWrap -- tab "Widget"; lifeOSWrap
// ada di dalam grup "Insight") hidup di DALAM container yang di-toggle
// u-dnone oleh DashboardHub.applySectionTab() (lihat SECTION_GROUPS di
// method itu). Kalau user sedang di sub-tab lain (mis. "Fitur") lalu klik
// kartu yang goTo-nya ada di sub-tab "Widget", scrollIntoView() ke elemen
// yang leluhurnya u-dnone TIDAK melakukan apa-apa (elemen tidak
// ter-render/invisible) -- showPage() di atas SUDAH keburu reset scroll ke
// 0 duluan, jadi user cuma mendarat di paling atas halaman (Hero/Tangga
// Ternak Uang yang SELALU tampil di atas subtab), terlihat seperti "semua
// kartu Fitur mengarah ke Tangga Keuangan". Peta di bawah 100% REUSE
// (bukan duplikasi keputusan baru) daftar SECTION_GROUPS yang sudah ada di
// DashboardHub.applySectionTab() -- kalau salah satu daftar itu berubah,
// peta ini WAJIB disamakan lagi.
const DASHHUB_GOTO_SECTION_MAP = {
  dashHubSummaryGrid: 'ringkasan',
  dashHubAnalyticsRow: 'ringkasan',
  dashHubFavoritSection: 'fitur',
  dashHubMainGridCard: 'fitur',
  dashboardHubPinnedWrap: 'widget',
  lifeOSWrap: 'insight',
  eieWrap: 'insight',
  crossDashWrap: 'insight',
  crossBriefWrap: 'insight',
  crossInsightWrap: 'insight',
  personalOverviewWrap: 'insight',
  crossWidgetsWrap: 'insight',
  lifePriorityWrap: 'insight',
};

// Jalan naik dari elemen goTo lewat parentElement sampai ketemu id yang
// terdaftar di DASHHUB_GOTO_SECTION_MAP (atau habis/null kalau memang
// goTo-nya bukan bagian dari section manapun -- mis. Hero/Tangga Keuangan
// yang memang selalu tampil, tidak butuh switch tab apa pun).
function _dashHubResolveGoToSection(goToId) {
  let el = document.getElementById(goToId);
  while (el) {
    if (Object.prototype.hasOwnProperty.call(DASHHUB_GOTO_SECTION_MAP, el.id)) {
      return DASHHUB_GOTO_SECTION_MAP[el.id];
    }
    el = el.parentElement;
  }
  return null;
}

function dashHubNavigateToFeature(target) {
  if (!target) return;
  if (!target.page) {
    // Fitur modal-only (mis. WorthIt.open), tidak attach ke page manapun.
    if (target.action) _dashHubCallAction(target.action);
    return;
  }
  const navItems = document.querySelectorAll('.nav-item');
  showPage(target.page, navItems[PAGE_NAV_IDX[target.page]] || null);

  if (target.tab) {
    if (target.page === 'keuangan') {
      const tabs = document.querySelectorAll('#page-keuangan .cn-tab');
      setKeuanganTab(target.tab, tabs[KEU_TAB_IDX[target.tab]]);
      if (target.tab === 'laporan' && target.subtab) {
        const subtabs = document.querySelectorAll('#keuanganTab-laporan .lap-subtab');
        setLaporanTab(target.subtab, subtabs[LAPORAN_SUBTAB_IDX[target.subtab]]);
      } else if (target.tab === 'kelola' && target.subtab) {
        const subtabs = document.querySelectorAll('#keuanganTab-kelola .kel-subtab');
        setKelolaTab(target.subtab, subtabs[KELOLA_SUBTAB_IDX[target.subtab]]);
      }
    } else if (target.page === 'shop') {
      const tabs = document.querySelectorAll('#page-shop .cn-tab');
      setShopTab(target.tab, tabs[SHOP_TAB_IDX[target.tab]]);
    } else if (target.page === 'carnotes') {
      const tabs = document.querySelectorAll('#page-carnotes .cn-tab');
      setCnTab(target.tab, tabs[CN_TAB_IDX[target.tab]]);
      if (target.tab === 'insight' && target.subtab) {
        const subtabs = document.querySelectorAll('#cnTab-insight .cni-subtab');
        setCnInsightTab(target.subtab, subtabs[CNI_SUBTAB_IDX[target.subtab]]);
      } else if (target.tab === 'bbm' && target.subtab) {
        const subtabs = document.querySelectorAll('#cnTab-bbm .cnb-subtab');
        setCnBbmTab(target.subtab, subtabs[CNB_SUBTAB_IDX[target.subtab]]);
      }
    } else if (target.page === 'pajak') {
      const tabs = document.querySelectorAll('#page-pajak .cn-tab');
      setPajakTab(target.tab, tabs[PAJAK_TAB_IDX[target.tab]]);
      if (target.tab === 'pajak' && target.subtab) {
        const subtabs = document.querySelectorAll('#pajakTab-pajak .pjk-subtab');
        setPjkTab(target.subtab, subtabs[PJK_SUBTAB_IDX[target.subtab]]);
      }
    } else if (target.page === 'aset') {
      const tabs = document.querySelectorAll('#page-aset .cn-tab');
      setAsetTab(target.tab, tabs[ASET_TAB_IDX[target.tab]]);
    }
  }

  if (target.group) {
    const g = document.getElementById(target.group);
    if (g && g.classList.contains('stg-tabpanel') && typeof setSettingsTab === 'function') {
      if (g.classList.contains('u-dnone')) setSettingsTab(g.dataset.tab);
    } else if (g && typeof toggleStgGroup === 'function' && !g.classList.contains('open')) {
      toggleStgGroup(target.group);
    }
  }

  // goTo/action dijadwalkan sedikit belakangan (pola sama dgn goToList() di
  // filter-laporan.js) supaya DOM halaman tujuan sempat selesai dirender.
  setTimeout(() => {
    if (target.goTo) {
      if (target.page === 'dashboard-hub' && typeof DashboardHub !== 'undefined' && typeof DashboardHub.setSectionTab === 'function') {
        const section = _dashHubResolveGoToSection(target.goTo);
        if (section) DashboardHub.setSectionTab(section);
      }
      const el = document.getElementById(target.goTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.remove('flash-highlight');
        void el.offsetWidth;
        el.classList.add('flash-highlight');
        setTimeout(() => el.classList.remove('flash-highlight'), 1200);
      }
    }
    if (target.action) _dashHubCallAction(target.action);
  }, 150);
}

// ================== HERO CARD (Sprint 1 Tahap 2, lihat HERO-CARD.md) ==================
// DashboardHubHero — MURNI TAMPILAN, tidak ada business logic baru. Nilai yang
// ditampilkan (nama profil, saldo semua akun, pemasukan/pengeluaran bulan
// berjalan) dibaca dari D.profile/D.transactions yang sudah ada:
//   - totalSaldoAkun() (akun.js) dipakai APA ADANYA, tanpa duplikasi logic saldo.
//   - Agregasi pemasukan/pengeluaran bulan berjalan memakai pola yang SAMA
//     PERSIS dengan yang sudah dipakai berulang di app ini (mis.
//     renderDashboard()/renderDashLaporanMini() di modules-render.js,
//     FinCoach.renderDash() di features-aiwidget-reminder-gdrive-search.js):
//     filter D.transactions ke bulan+tahun berjalan, jumlahkan per type. Ini
//     BUKAN aturan bisnis baru — cuma baca ulang data yang sudah dihitung
//     dengan cara yang sama di banyak tempat lain.
// Semua akses ke D/totalSaldoAkun/fmt di-guard pakai typeof check (pola sama
// dengan _dashHubIsFav() di atas) supaya file ini tetap aman dipakai
// tests/dashboard-hub.test.js yang me-load dashboard-hub.js sendirian tanpa
// D/akun.js/format-tema.js ikut di-load.
// _dashHubMonthTxShared() — SATU-SATUNYA tempat filter+agregasi transaksi
// bulan berjalan dihitung untuk seluruh baris Dashboard Hub (Hero, Summary,
// Analytics). Sebelumnya logika ini di-copy-paste identik 3x (lihat
// DASHBOARD-DEDUP.md) karena masing-masing Tahap sengaja tidak menyentuh
// Tahap sebelumnya — risikonya kalau satu diedit tanpa yang lain, angka yang
// tampil di 3 tempat itu bisa jadi beda-beda padahal sama-sama mengklaim
// "Bulan Ini". Konsolidasi ini TIDAK mengubah signature/perilaku
// _dashHubHeroMonthTx()/_dashHubSummaryMonthTx()/_dashHubAnalyticsMonthTx()
// (nama & bentuk return per fungsi tetap sama, cuma isinya sekarang
// delegasi ke sini) — DashboardHubHero/Summary/Analytics tetap 3 object
// terpisah seperti sebelumnya (lihat test "...tetap terpisah dari...").
function _dashHubMonthTxShared() {
  if (typeof D === 'undefined' || !D.transactions) return { inc: 0, exp: 0, count: 0 };
  const now = new Date(), m = now.getMonth(), y = now.getFullYear();
  const txM = D.transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  const inc = txM.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = txM.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { inc, exp, count: txM.length };
}

function _dashHubHeroMonthTx() {
  const { inc, exp } = _dashHubMonthTxShared();
  return { inc, exp };
}

const DashboardHubHero = {
  render() {
    const greetEl = document.getElementById('dashHubHeroGreet');
    const dateEl = document.getElementById('dashHubHeroDate');
    const saldoEl = document.getElementById('dashHubHeroSaldo');
    const incEl = document.getElementById('dashHubHeroInc');
    const expEl = document.getElementById('dashHubHeroExp');
    if (!greetEl || !dateEl || !saldoEl || !incEl || !expEl) return;

    const nama = (typeof D !== 'undefined' && D.profile && D.profile.nama) ? D.profile.nama : 'W';
    greetEl.textContent = 'Halo, ' + nama + ' 👋';

    dateEl.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const saldo = (typeof totalSaldoAkun === 'function') ? totalSaldoAkun() : null;
    saldoEl.textContent = saldo === null ? '—' : (saldo < 0 ? '-' : '') + money(Math.abs(saldo));
    saldoEl.className = 'dashhub-hero-balance-val' + (saldo !== null && saldo < 0 ? ' red' : '');

    const { inc, exp } = _dashHubHeroMonthTx();
    incEl.textContent = money(inc);
    expEl.textContent = money(exp);
  },
};

// ================== SUMMARY CARDS (Sprint 1 Tahap 5, lihat DASHBOARD-SUMMARY.md) ==================
// DashboardHubSummary — MURNI TAMPILAN, tidak ada business logic baru. Baris
// kartu ringkas kecil tepat di bawah Quick Actions, menampilkan 4 angka yang
// SUDAH dihitung dengan pola yang SAMA PERSIS di tempat lain (mis.
// FinCoach.renderDash() di features-aiwidget-reminder-gdrive-search.js, yang
// menampilkan persis "Pemasukan/Pengeluaran/Bersih/Jumlah transaksi" dari
// D.transactions bulan berjalan). _dashHubSummaryMonthTx() SENGAJA
// menduplikasi pola filter bulan berjalan yang sama dengan
// _dashHubHeroMonthTx() (Hero Card, Tahap 2) alih-alih memodifikasi/mereuse
// fungsi Hero secara langsung — supaya Hero Card (constraint: tidak diubah)
// benar-benar tidak tersentuh sama sekali oleh Tahap 5. Semua akses ke
// D/fmt di-guard pakai typeof check (pola sama dgn _dashHubIsFav()/
// DashboardHubHero di atas) supaya file ini tetap aman dipakai
// tests/dashboard-hub.test.js yang me-load dashboard-hub.js sendirian.
function _dashHubSummaryMonthTx() {
  return _dashHubMonthTxShared();
}

const DashboardHubSummary = {
  render() {
    const el = document.getElementById('dashHubSummaryGrid');
    if (!el) return;

    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const { inc, exp, count } = _dashHubSummaryMonthTx();
    const net = inc - exp;

    const cards = [
      { label: 'Pemasukan Bulan Ini', value: money(inc), cls: 'green' },
      { label: 'Pengeluaran Bulan Ini', value: money(exp), cls: 'red' },
      { label: 'Bersih Bulan Ini', value: (net < 0 ? '-' : '') + money(Math.abs(net)), cls: net < 0 ? 'red' : 'green' },
      { label: 'Jumlah Transaksi', value: String(count), cls: '' },
    ];

    el.innerHTML = cards.map((c) => `
      <div class="dashhub-summary-card">
        <div class="dashhub-summary-label">${escapeHtml(c.label)}</div>
        <div class="dashhub-summary-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
      </div>
    `).join('');
  },
};

// ================== DASHBOARD ANALYTICS (Sprint 1 Tahap 7, lihat DASHBOARD-ANALYTICS.md) ==================
// DashboardHubAnalytics — MURNI TAMPILAN, tidak ada business logic baru.
// Baris kartu horizontal kecil tepat di bawah Summary Cards, menampilkan
// angka yang SUDAH bisa dihitung dari D.transactions bulan berjalan dgn
// pola filter bulan berjalan yang SAMA PERSIS dengan _dashHubHeroMonthTx()
// (Hero Card, Tahap 2) dan _dashHubSummaryMonthTx() (Summary Cards, Tahap
// 5). _dashHubAnalyticsMonthTx() SENGAJA menduplikasi pola tsb (alih-alih
// memanggil fungsi Hero/Summary secara langsung) supaya kedua komponen itu
// (constraint: tidak diubah) benar-benar tidak tersentuh oleh Tahap 7 ini
// — pola sama persis dgn alasan _dashHubSummaryMonthTx() di Tahap 5 (lihat
// komentar di atas DashboardHubSummary). Semua akses ke D/fmt di-guard
// pakai typeof check (pola sama dgn DashboardHubHero/DashboardHubSummary
// di atas) supaya file ini tetap aman dipakai
// tests/dashboard-hub.test.js yang me-load dashboard-hub.js sendirian.
function _dashHubAnalyticsMonthTx() {
  return _dashHubMonthTxShared();
}

const DashboardHubAnalytics = {
  render() {
    const el = document.getElementById('dashHubAnalyticsRow');
    if (!el) return;

    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const { inc, exp, count } = _dashHubAnalyticsMonthTx();
    const net = inc - exp;
    const total = inc + exp;
    // Persentase pemasukan vs pengeluaran — cuma bisa dihitung kalau ada
    // nominal (total > 0), sesuai instruksi "jika sudah bisa dihitung".
    const incPct = total > 0 ? Math.round((inc / total) * 100) : null;
    const expPct = total > 0 ? Math.round((exp / total) * 100) : null;

    // BUGFIX/UX (sesi ini): Saldo Bersih negatif (pengeluaran > pemasukan
    // bulan berjalan) tadinya cuma dibedakan lewat warna teks (.red), sama
    // rata secara visual dgn kartu netral lain -> mudah kelewat pas scroll.
    // Ditambah 2 penanda, keduanya 100% REUSE pola yang SUDAH ADA di app:
    // (1) varian background/border ".dashhub-analytics-card--warn" (pola
    //     sama dgn .bill-banner: var(--accent2-soft)/var(--accent2), lihat
    //     styles.css) supaya kartu ini menonjol tanpa warna baru;
    // (2) 1 baris saran singkat dari cashflowActionSuggestion() yang SUDAH
    //     ADA (modules/finance/tagihan-kalender.js, dipakai jg di
    //     Proyeksi Arus Kas) -- 0 rumus/saran baru ditulis di sini. Guard
    //     typeof supaya aman kalau tagihan-kalender.js belum di-load
    //     (mis. tests/dashboard-hub.test.js yang me-load file ini sendirian).
    const netNegatif = net < 0;
    const netSaran = netNegatif && typeof cashflowActionSuggestion === 'function'
      ? cashflowActionSuggestion(Math.abs(net), new Date().getDate())
      : '';

    const cards = [
      { label: 'Transaksi Bulan Ini', value: String(count), cls: '' },
      { label: 'Total Pemasukan', value: money(inc), cls: 'green' },
      { label: 'Total Pengeluaran', value: money(exp), cls: 'red' },
      { label: 'Saldo Bersih', value: (net < 0 ? '-' : '') + money(Math.abs(net)), cls: net < 0 ? 'red' : 'green', warn: netNegatif, sub: netSaran },
      { label: 'Pemasukan vs Pengeluaran', value: incPct === null ? '—' : (incPct + '% : ' + expPct + '%'), cls: '' },
    ];

    el.innerHTML = cards.map((c) => `
      <div class="dashhub-analytics-card${c.warn ? ' dashhub-analytics-card--warn' : ''}">
        <div class="dashhub-analytics-label">${escapeHtml(c.label)}</div>
        <div class="dashhub-analytics-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
        ${c.sub ? '<div class="dashhub-analytics-sub">⚠️ ' + escapeHtml(c.sub) + '</div>' : ''}
      </div>
    `).join('');
  },
};

// ================== DASHBOARD OWNERSHIP SUMMARY (Sesi 236) ==================
// DashboardHubOwnershipSummary — MURNI TAMPILAN, 0 kalkulasi/engine baru.
// Kartu kecil di Dashboard yang menampilkan hitungan 5 tipe kepemilikan
// (SELF/INVESTOR/CUSTOMER/FAMILY/THIRD_PARTY). Reuse PENUH
// OwnershipSettingsPresenter.summary() (S229-230, sudah menggabungkan
// D.accounts/assets/investments/vehicles & memanggil
// OwnershipEngine.countByType() apa adanya) — TIDAK ada agregasi/rumus
// baru di sini, TIDAK ada perubahan apa pun di OwnershipEngine atau
// OwnershipSettingsPresenter. `ORDER` di bawah CUMA urutan tampilan kartu
// ini (spesifikasi eksplisit SELF/INVESTOR/CUSTOMER/FAMILY/THIRD_PARTY,
// beda dari urutan internal OwnershipEngine.TYPES) — label tetap 100%
// dari OwnershipEngine.label(), angka tetap 100% dari summary().counts.
// Guard typeof (pola sama persis OwnershipSettingsPresenter.render()) ->
// container/presenter belum ada = aman diam2, tidak throw.
const DASHHUB_OWNERSHIP_SUMMARY_ORDER = ['SELF', 'INVESTOR', 'CUSTOMER', 'FAMILY', 'THIRD_PARTY'];

const DashboardHubOwnershipSummary = {
  render() {
    const el = document.getElementById('dashHubOwnershipSummaryList');
    if (!el) return;
    if (typeof OwnershipSettingsPresenter === 'undefined') {
      el.innerHTML = '<div class="u-hint10">Ownership Engine belum tersedia.</div>';
      return;
    }
    const s = OwnershipSettingsPresenter.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="u-hint10">Ownership Engine belum tersedia.</div>';
      return;
    }
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    const row = (t) => {
      const label = (typeof OwnershipEngine !== 'undefined') ? OwnershipEngine.label(t) : t;
      const count = s.counts[t] || 0;
      return '<div class="setting-item"><div><div class="setting-label">' + esc(label) + '</div></div>'
        + '<div class="u-fs14 u-fw600">' + count + '</div></div>';
    };

    // UX (sesi ini): kategori bernilai 0 (mis. Investor/Pelanggan/Keluarga
    // semua 0) makan tempat scroll tanpa info baru. Kategori >0 SELALU
    // tampil langsung; kategori 0 disembunyikan di balik toggle "Lihat
    // semua kategori", pola collapse yang SUDAH ADA (sama persis dgn
    // card-collapse-toggle/toggleCardCollapse() dipakai ~40+ kartu lain di
    // app ini, lihat modal-navigasi.js) -- 0 mekanisme collapse baru.
    // Kalau semua kategori kebetulan 0 atau semua kebetulan >0, toggle
    // tidak ada gunanya (tidak ada yg perlu disembunyikan) -> tampilkan
    // semua apa adanya, tanpa toggle.
    const filled = DASHHUB_OWNERSHIP_SUMMARY_ORDER.filter((t) => (s.counts[t] || 0) > 0);
    const zero = DASHHUB_OWNERSHIP_SUMMARY_ORDER.filter((t) => (s.counts[t] || 0) === 0);

    if (!filled.length || !zero.length) {
      el.innerHTML = DASHHUB_OWNERSHIP_SUMMARY_ORDER.map(row).join('');
      return;
    }

    el.innerHTML = filled.map(row).join('')
      + '<div class="setting-item">'
      + '<div class="setting-label u-t2">Lihat semua kategori</div>'
      + '<span class="card-collapse-toggle collapsed" id="dashHubOwnershipZero-chev" data-action="toggleCardCollapse" data-args=\'["dashHubOwnershipZero","$event"]\' aria-label="Buka/tutup bagian">▾</span>'
      + '</div>'
      + '<div class="card-collapse-body collapsed" id="dashHubOwnershipZero-cbody">'
      + zero.map(row).join('')
      + '</div>';
  },
};

// ================== SHOP MINI SUMMARY (Sesi 250) ==================
// ShopMiniSummary — MURNI TAMPILAN + navigasi, 0 rumus baru, 0 field D
// baru. Menggantikan 3 wrap detail (#shopBusinessEngineWrap/
// #tripPresenterWrap/#businessFlowWrap) yang DIPINDAH APA ADANYA ke tab
// baru #shopTab-bi ("Business Intelligence") di #page-shop (lihat
// index.html/app_production.html + cobek-io.js setShopTab()). Beranda
// sekarang cukup menampilkan 3 angka ringkas (Omzet/Profit/Stok Menipis)
// — 100% REUSE ShopBusinessEnginePresenter.summary() (S199, modules/shop/
// shop-business-engine-presenter.js), yang sendiri sudah 100% delegasi ke
// ProfitEngine.summarize() (omzet/untung, ownership SELF-only, pola Sesi
// 194) & InventoryEngine.restockScan() (jumlah produk perlu direstock =
// "Stok Menipis") — TIDAK membaca D langsung, TIDAK menghitung ulang apa
// pun. Guard typeof (pola sama persis DashboardHubOwnershipSummary di
// atas) supaya aman dipakai standalone di tests tanpa D/ShopBusinessEnginePresenter.
const ShopMiniSummary = {
  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },
  render() {
    const el = document.getElementById('shopMiniSummaryGrid');
    if (!el) return;
    if (typeof ShopBusinessEnginePresenter === 'undefined') {
      el.innerHTML = '<div class="u-hint10">Shop Business Engine belum tersedia.</div>';
      return;
    }
    const s = ShopBusinessEnginePresenter.summary();
    const omzet = (s.profit && s.profit.ok) ? s.profit.omzet : 0;
    const untung = (s.profit && s.profit.ok) ? s.profit.untung : 0;
    const stokMenipis = (s.purchase && s.purchase.ok) ? s.purchase.itemCount : 0;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    const cards = [
      { label: 'Omzet Bulan Ini', value: this._money(omzet), cls: '' },
      { label: 'Profit Bulan Ini', value: this._money(untung), cls: untung < 0 ? 'red' : 'green' },
      { label: 'Stok Menipis', value: String(stokMenipis), cls: stokMenipis > 0 ? 'red' : '' },
    ];
    el.innerHTML = cards.map((c) => `
      <div class="findash-card">
        <div class="findash-card-body">
          <div class="findash-card-label">${esc(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${esc(c.value)}</div>
        </div>
      </div>
    `).join('');
  },
};

const DashboardHub = {
  render() {
    const el = document.getElementById('dashboardHubGrid');
    if (!el) return;
    if (typeof FEATURE_REGISTRY === 'undefined' || !FEATURE_REGISTRY.length) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data fitur</div></div>';
      const mainGridCountEl0 = document.getElementById('dashHubMainGridCount');
      if (mainGridCountEl0) mainGridCountEl0.textContent = '0';
      return;
    }
    el.innerHTML = FEATURE_REGISTRY.map(cat => {
      const collapseKey = `dashHubCat-${cat.key}`;
      return `
      <div class="dashhub-cat" id="dashHubCat-${escapeHtml(cat.key)}">
        <div class="dashhub-cat-head" data-action="toggleCardCollapse" data-args='${escapeHtml(JSON.stringify([collapseKey, '$event']))}'>
          <div class="dashhub-cat-icon">${(typeof FeatureIcons !== 'undefined') ? FeatureIcons.render(cat.icon) : cat.icon}</div>
          <div>
            <div class="dashhub-cat-label">${escapeHtml(cat.label)}<span class="dashhub-cat-badge">${cat.features.length}</span></div>
            <div class="dashhub-cat-desc">${escapeHtml(cat.desc)}</div>
          </div>
          <span class="card-collapse-toggle" id="${collapseKey}-chev" data-action="toggleCardCollapse" data-args='${escapeHtml(JSON.stringify([collapseKey, '$event']))}' aria-label="Buka/tutup kategori">▾</span>
        </div>
        <div class="card-collapse-body" id="${collapseKey}-cbody">
          <div class="dashhub-feature-grid dashhub-feature-grid--icon">
            ${cat.features.map(f => `
              <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="DashboardHub.open" data-args='${escapeHtml(JSON.stringify([f.key]))}' title="${escapeHtml(f.desc || '')}">
                <div class="dashhub-fav-star${_dashHubIsFav(f.key) ? ' is-fav' : ''}" data-stop data-action="DashboardHubFavoritView.toggle" data-args='${escapeHtml(JSON.stringify([f.key]))}' role="button" tabindex="0" aria-label="${_dashHubIsFav(f.key) ? 'Hapus dari favorit: ' + escapeHtml(f.label) : 'Tambah ke favorit: ' + escapeHtml(f.label)}">★</div>
                <div class="dashhub-feature-icon">${(typeof FeatureIcons !== 'undefined') ? FeatureIcons.render(f.icon || cat.icon) : (f.icon || cat.icon)}</div>
                <div class="dashhub-feature-name">${escapeHtml(f.label)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Terapkan preferensi collapse per kategori (localStorage cardCollapsePrefs) —
    // pola sama persis dgn applyOneCardCollapsePref() dipanggil setelah render
    // kartu lain (lihat modules-render.js). Dipanggil per-kategori krn semua
    // kategori di-render sekaligus lewat 1 innerHTML di atas.
    if (typeof applyOneCardCollapsePref === 'function') {
      FEATURE_REGISTRY.forEach(cat => applyOneCardCollapsePref(`dashHubCat-${cat.key}`));
    }

    // Badge jumlah total fitur di header kartu collapse "Semua Fitur" (lihat
    // #dashHubMainGridCard di index.html/app_production.html). Tambahan
    // murni — cuma isi teks 1 elemen, tidak menyentuh grid di atas.
    const mainGridCountEl = document.getElementById('dashHubMainGridCount');
    if (mainGridCountEl) {
      const totalFeatures = FEATURE_REGISTRY.reduce((s, c) => s + c.features.length, 0);
      mainGridCountEl.textContent = String(totalFeatures);
    }

    // LifeOS (section terpisah, lihat #lifeOSWrap di index.html/
    // app_production.html & lifeos/ui/lifeos-home.js). Tambahan murni —
    // tidak mengubah baris manapun di atas.
    if (typeof LifeOSHome !== 'undefined') LifeOSHome.render();

    // Favorit (Tahap 3, Langkah 7-8, lihat dashboard-hub-favorit-view.js).
    // Tambahan murni, pola sama dgn LifeOSHome.render() di atas — tidak
    // mengubah baris manapun sebelum ini.
    if (typeof DashboardHubFavoritView !== 'undefined') DashboardHubFavoritView.render();

    // Hero Card (Sprint 1 Tahap 2, lihat HERO-CARD.md). Tambahan murni, pola
    // sama dgn LifeOSHome.render()/DashboardHubFavoritView.render() di atas —
    // tidak mengubah baris manapun sebelum ini.
    if (typeof DashboardHubHero !== 'undefined') DashboardHubHero.render();

    // Summary Cards (Sprint 1 Tahap 5, lihat DASHBOARD-SUMMARY.md). Tambahan
    // murni, pola sama dgn DashboardHubHero.render() di atas — tidak
    // mengubah baris manapun sebelum ini.
    if (typeof DashboardHubSummary !== 'undefined') DashboardHubSummary.render();

    // Dashboard Analytics (Sprint 1 Tahap 7, lihat DASHBOARD-ANALYTICS.md).
    // Tambahan murni, pola sama dgn DashboardHubSummary.render() di atas —
    // tidak mengubah baris manapun sebelum ini.
    if (typeof DashboardHubAnalytics !== 'undefined') DashboardHubAnalytics.render();

    // Finance Dashboard/Forecast/Budget Reco/Cashflow Proj/Financial
    // Goal/Invest Planner/Debt Optimizer/Retirement Planner/Health
    // Score/Risk Dashboard (Sesi 75/91-99, Batch 6/10) — DIPINDAH (Sesi
    // 133, permintaan eksplisit user "pindahkan insight AI ke tab
    // masing-masing fitur") ke renderKeuangan() (modules/shared/
    // modules-render.js), karena seluruhnya domain Keuangan (single-
    // feature) — bukan lintas-domain. Container HTML (#findashWrap dst)
    // ikut dipindah ke #page-keuangan (index.html/app_production.html).
    // TIDAK ada logic/rumus yang diubah, murni pindah LOKASI pemanggilan
    // render() + LOKASI container HTML. Presenter/API-nya sendiri 0
    // perubahan.

    // Property Management Foundation (S102, Batch 10 — presenter+UI
    // ditambahkan Sesi 132, lihat modules/asset/
    // property-management-presenter.js & #propertyManagementWrap di
    // index.html/app_production.html — audit menemukan API-nya sudah
    // ada sejak S102 tapi belum pernah dipanggil dari mana pun).
    // Tambahan murni, pola sama dgn FinancialRiskDashboardPresenter.
    // render() di atas — tidak mengubah baris manapun sebelum ini. 100%
    // reuse PropertyManagementAPI.summary() (S102), UI hanya presenter.
    // Property/Rental Management, Asset Portfolio, Asset Maintenance
    // (S101-104) — DIPINDAH (pola sama Sesi 133 Finance/Vehicle) ke tab
    // "Manajemen" di #page-aset (lihat renderPageContent('aset'),
    // modules/shared/modules-render.js). Container-nya sudah tidak ada
    // di Dashboard Hub, jadi panggilan .render() di sini juga dipindah
    // (bukan cuma disembunyikan) — fungsi presenter sendiri 0 perubahan.

    // Vehicle Dashboard/Insight/Brief/Alert/Insight Feed/Analytics/
    // Decision/Automation (Sesi 77-83, Batch 7) — DIPINDAH (Sesi 133,
    // permintaan eksplisit user "pindahkan insight AI ke tab masing-
    // masing fitur") ke renderCnTab() (modules/shared/modules-
    // render.js), karena seluruhnya domain Kendaraan/Car Notes (single-
    // feature) — bukan lintas-domain. Container HTML (#vehdashWrap dst)
    // ikut dipindah ke #page-carnotes (index.html/app_production.html).
    // TIDAK ada logic/rumus yang diubah, murni pindah LOKASI pemanggilan
    // render() + LOKASI container HTML. Presenter/API-nya sendiri 0
    // perubahan.

    // Finance & Vehicle Cross Integration Foundation (Sesi 87, Batch 8,
    // lihat #crossDashWrap/#crossInsightWrap di index.html/
    // app_production.html). Tambahan murni, pola sama dgn
    // VehicleAutomationPresenter.render() di atas — tidak mengubah baris
    // manapun sebelum ini. 100% reuse CrossAIHook.getAIHook() (gabungan
    // FinanceDashboard.getAIHook()+VehicleAIHook.fleetSummary()) +
    // FinanceIntelligence.insights()/VehicleIntelligence.insights(), UI
    // hanya presenter.
    if (typeof CrossDashboardCard !== 'undefined') CrossDashboardCard.render();
    if (typeof CrossInsightPresenter !== 'undefined') CrossInsightPresenter.render();

    // Unified AI Briefing Foundation (Sesi 88, Batch 8, lihat
    // #crossBriefWrap di index.html/app_production.html). Tambahan murni,
    // pola sama dgn CrossDashboardCard.render() di atas — tidak mengubah
    // baris manapun sebelum ini. 100% reuse UnifiedAIBriefing.generate()
    // (sendiri 100% reuse UnifiedSummaryAPI.summary() -> CrossAIHook.
    // getAIHook()), UI hanya presenter.
    if (typeof UnifiedBriefingPresenter !== 'undefined') UnifiedBriefingPresenter.render();

    // Personal Life Dashboard Foundation (Sesi 89, Batch 8, lihat
    // #personalOverviewWrap/#crossWidgetsWrap/#lifePriorityWrap di
    // index.html/app_production.html). Tambahan murni, pola sama dgn
    // UnifiedBriefingPresenter.render() di atas — tidak mengubah baris
    // manapun sebelum ini. 100% reuse LifeDashboardSummaryAPI.summary()
    // (sesi ini, sendiri 100% reuse UnifiedSummaryAPI.summary() +
    // UnifiedAIBriefing.generate(), Sesi 88), UI hanya presenter. Satu
    // panggilan (UnifiedDashboardHome.render()) yang di dalamnya
    // memanggil PersonalOverviewPresenter/CrossModuleWidgets/
    // LifePriorityPanel — lihat unified-dashboard-home.js.
    if (typeof UnifiedDashboardHome !== 'undefined') UnifiedDashboardHome.render();

    // Personal Decision Center Foundation (Sesi 90, Batch 8, lihat
    // #recommendationPanelWrap/#actionQueueWrap di index.html/
    // app_production.html). Tambahan murni, pola sama dgn
    // UnifiedDashboardHome.render() di atas — tidak mengubah baris
    // manapun sebelum ini. 100% reuse DecisionCenterAPI.summary() (sesi
    // ini, sendiri 100% reuse LifeDashboardSummaryAPI.summary() +
    // PriorityEngine.getItems(), Sesi 90, + FinanceIntelligence.
    // insights()/VehicleIntelligence.insights() difilter type==='warning'
    // — field final, bukan rule baru), UI hanya presenter. Satu
    // panggilan (DecisionCenterHome.render()) yang di dalamnya memanggil
    // RecommendationPanel/ActionQueue — lihat decision-center-home.js.
    if (typeof DecisionCenterHome !== 'undefined') DecisionCenterHome.render();

    // Economic Intelligence Engine (fase 2, lihat
    // Economic-Intelligence-Engine-Technical-Design.md & #eieWrap di
    // index.html/app_production.html). Tambahan murni, pola sama dgn
    // DashboardHubAnalytics.render() di atas — tidak mengubah baris
    // manapun sebelum ini. Async & self-guarded (try/catch di dalam
    // EIEDashboard.render()), jadi tidak memblokir render kartu lain.
    if (typeof EIEDashboard !== 'undefined') EIEDashboard.render();

    // Dana Kelolaan / Managed Funds Foundation (S195, lihat
    // #danaKelolaanWrap di index.html/app_production.html). Tambahan
    // murni, pola sama dgn PropertyManagementPresenter.render() di atas —
    // tidak mengubah baris manapun sebelum ini. 100% reuse
    // DanaKelolaan.summary() (S195, sendiri 100% reuse OwnershipEngine +
    // nilai akun/aset/investasi/shop yang sudah ada), UI hanya presenter.
    // Dana Kelolaan / Shop Business Engine / Pengiriman Shop / Alur Bisnis
    // Shop — DIPINDAH (dedup, permintaan user "cek dashboard dobel") ke
    // KHUSUS tab Shop -> Laporan/Statistik (Laporan.renderTab(), modules/
    // shop/cobek-order.js), karena angkanya 100% sama & sudah dirender di
    // sana juga (ShopBusinessEnginePresenter.renderTab()/TripPresenter.
    // renderTab()/BusinessFlowPresenter.renderTab()/DanaKelolaanPresenter.
    // renderStatistik()). Container-nya (#danaKelolaanWrap/
    // #shopBusinessEngineWrap/#tripPresenterWrap/#businessFlowWrap) di
    // Dashboard Hub disembunyikan via CSS (lihat styles.css), fungsi
    // .render() presenter TETAP ada (tidak dihapus) supaya test lama
    // (mis. shop-business-engine-integration.test.js) tetap lolos — pola
    // sama persis DASHBOARD-DEDUP.md fix #1.

    // Tab switcher "Semua Fitur"/"Pinned Widgets" (dashHubMainTabsRow) sudah
    // DIHAPUS 2026-07-17 — #dashHubMainGridCard & #dashboardHubPinnedWrap
    // sekarang cuma ditumpuk berurutan (masing-masing sudah collapsible
    // sendiri), tidak perlu toggle terpisah lagi.

    // Sub-tab Dashboard Hub (Fase 1, lihat CLAUDE.md "Split tab 🧭 Dashboard
    // Hub" & #dashHubSectionTabBtn-* di index.html/app_production.html).
    // Tambahan murni, dipanggil PALING AKHIR — pola "render semua dulu, baru
    // toggle visibility" yang sama.
    // S129 (Dashboard Settings): fallback 'ringkasan' hardcode sebelumnya
    // sekarang bisa dikonfigurasi user lewat DashboardSettings.getDefaultTab()
    // (Pengaturan → Tampilan → ⚙️ Pengaturan Dashboard → Tab Default). Tab
    // TERAKHIR dipakai (dashHubSectionTab) TETAP menang kalau sudah pernah
    // ada — ini cuma mengganti nilai fallback-nya, BUKAN mekanisme baru.
    // Guard typeof: DashboardSettings opsional, fallback ke 'ringkasan' persis
    // seperti sebelumnya kalau modul itu belum dimuat.
    const dashDefaultTab=(typeof DashboardSettings!=='undefined'&&typeof DashboardSettings.getDefaultTab==='function')?DashboardSettings.getDefaultTab():'ringkasan';
    this.applySectionTab(localStorage.getItem('dashHubSectionTab') || dashDefaultTab);

    // S129 (Dashboard Settings): terapkan Compact Mode/Card Density ke
    // #page-dashboard-hub tiap kali Dashboard Hub dirender ulang — tambahan
    // murni, tidak mengubah baris manapun di atas. Guard typeof sama pola
    // dgn pemanggilan widget opsional lain di render() ini (mis.
    // EIEDashboard.render()).
    if(typeof DashboardSettings!=='undefined')DashboardSettings.applyDashDisplayPrefs();
  },

  // Ganti sub-tab aktif & simpan pilihannya (localStorage key:
  // dashHubSectionTab).
  setSectionTab(tab) {
    localStorage.setItem('dashHubSectionTab', tab);
    this.applySectionTab(tab);
  },

  // Toggle visibility 3 kelompok section yang SUDAH ADA (tidak ada wrapper
  // <div> baru — lihat catatan panjang di index.html/app_production.html
  // persis di atas nav .dhb-subtabs) lewat class u-dnone yang sudah dipakai
  // di seluruh app ini. Hero Card/Tangga Ternak Uang/Quick Actions/Search
  // SENGAJA tidak masuk daftar manapun di bawah — tetap selalu tampil.
  applySectionTab(tab) {
    const SECTION_GROUPS = {
      ringkasan: ['dashHubSummaryGrid', 'dashHubAnalyticsRow', 'dashHubOwnershipSummaryCard'],
      fitur: ['dashHubFavoritSection', 'dashHubMainGridCard'],
      widget: ['dashboardHubPinnedWrap'],
      // Sesi 133: findashWrap/forecastWrap/budgetRecoWrap/cashflowProjWrap/
      // financialGoalWrap/investPlannerWrap/debtOptimizerWrap/
      // retirementPlannerWrap/financialHealthScoreWrap/
      // financialRiskDashboardWrap/vehdashWrap/vehinsightWrap/vehBriefWrap/
      // vehAlertWrap/vehInsightFeedWrap/vehAnalyticsWrap/vehDecisionWrap/
      // vehAutomationWrap DIKELUARKAN dari grup ini (dipindah ke tab
      // Keuangan/Car Notes masing-masing, container HTML-nya juga sudah
      // pindah — lihat catatan render() di atas). Sisa di grup ini murni
      // konten LINTAS-DOMAIN (Cross/LifeOS/EIE) yang tidak punya "rumah"
      // 1 fitur tunggal.
      // Sesi 158 (bugfix): #recommendationPanelWrap/#actionQueueWrap (Sesi
      // 90) didaftarkan ke grup ini — sebelumnya bocor tampil di semua
      // sub-tab. #propertyManagementWrap/#rentalManagementWrap/
      // #assetPortfolioWrap/#assetMaintenanceWrap (S101-104) yang tadinya
      // di grup ini SUDAH PINDAH ke tab "Manajemen" #page-aset (lihat
      // catatan migrasi di render(), atas), jadi dihapus dari daftar —
      // bukan lagi bagian dari Dashboard Hub sama sekali.
      insight: ['lifeOSWrap', 'eieWrap', 'shopMiniSummaryWrap', 'crossDashWrap', 'crossBriefWrap', 'crossInsightWrap', 'personalOverviewWrap', 'crossWidgetsWrap', 'lifePriorityWrap', 'recommendationPanelWrap', 'actionQueueWrap'],
    };
    Object.keys(SECTION_GROUPS).forEach((t) => {
      SECTION_GROUPS[t].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('u-dnone', t !== tab);
      });
    });

    // dashHubFavoritSection punya visibility SENDIRI yang data-driven
    // (disembunyikan total kalau belum ada key favorit tersimpan) — panggil
    // ulang render aslinya supaya keputusan itu tetap dihormati begitu
    // sub-tab "fitur" aktif lagi, bukan ketimpa jadi selalu-tampil oleh
    // toggle generik di atas.
    if (tab === 'fitur' && typeof DashboardHubFavoritView !== 'undefined') {
      DashboardHubFavoritView.render();
    }

    // Update tombol aktif.
    ['ringkasan', 'fitur', 'widget', 'insight'].forEach((t) => {
      const btn = document.getElementById(`dashHubSectionTabBtn-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
  },

  // Discoverability fix (audit navigasi: "Bottom nav cuma 6 slot, sebagian
  // fitur cuma bisa ditemukan lewat search"). Dipanggil dari chip baru
  // ".dashhub-explore-link" (di bawah search bar, index.html/
  // app_production.html). MURNI mengarahkan ke section "Semua Fitur" yang
  // SUDAH ADA (#dashHubMainGridCard, isi FEATURE_REGISTRY lengkap) — tidak
  // ada FEATURE_REGISTRY/grid baru. Sengaja TIDAK mengubah default sub-tab
  // ('ringkasan') atau default collapse ('tertutup') secara permanen —
  // keduanya keputusan sesi lampau — cuma switch tab (via setSectionTab()
  // publik, yang memang sudah PERSIST pilihan sama seperti klik tombol
  // subtab manapun) + reuse toggleCardCollapse kalau memang sedang tertutup.
  openAllFeatures() {
    this.setSectionTab('fitur');
    const body = document.getElementById('dashHubMainGrid-cbody');
    if (body && body.classList.contains('collapsed')) {
      toggleCardCollapse('dashHubMainGrid');
    }
    const card = document.getElementById('dashHubMainGridCard');
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  // Kontrak resolusi ADR-001 §4 — SATU-SATUNYA entry point publik navigasi.
  // Urutan (kategori dulu baru leaf) dipilih krn kategori himpunan lebih
  // kecil & lebih murah dicek; invariant uniqueness key global (§2.1,
  // dijaga tests/dashboard-hub-registry.test.js) menjamin urutan ini TIDAK
  // mengubah hasil apa pun kalau dibalik — leaf & cat.key tidak pernah
  // tabrakan. Parameter tetap diterima sbg "key" generik (bisa cat.key
  // ATAUPUN f.key) — nama parameter berubah dari `featureKey` ke `key`
  // murni penjelasan internal, bukan perubahan API publik (nama fungsi &
  // arity `open(x)` sama persis, dipanggil sama persis dari markup lewat
  // data-action="DashboardHub.open").
  open(key) {
    if (typeof FEATURE_REGISTRY === 'undefined') return;

    // 1. Cari dulu di antara cat.key seluruh kategori.
    const cat = FEATURE_REGISTRY.find((c) => c.key === key);
    if (cat) {
      if (cat.target) {
        // Ketemu, dan kategori itu punya target -> "app-level open".
        dashHubNavigateToFeature(cat.target);
        return;
      }
      // Ketemu, tapi kategori itu TIDAK punya target -> key valid sbg
      // identitas taksonomi (mis. 'personal', 'aset'), tapi bukan sesuatu
      // yang bisa "dibuka". SENGAJA beda pesan dari "key tidak ditemukan"
      // di bawah (§4 poin 1) supaya salah kurasi Favorit (pilih kategori
      // tanpa target) gampang dibedakan dari salah ketik key.
      console.warn('DashboardHub: kategori ini bukan target yang bisa dibuka langsung (belum diberi target):', key);
      return;
    }

    // 2. Tidak ketemu di kategori -> cari di antara f.key seluruh
    // cat.features di seluruh kategori (perilaku ini identik dgn
    // DashboardHub.open() sebelum Langkah 3, tidak berubah).
    for (const c of FEATURE_REGISTRY) {
      const f = c.features.find((x) => x.key === key);
      if (f) { dashHubNavigateToFeature(f.target); return; }
    }

    // 3. Tidak ketemu di kategori maupun leaf -> key benar-benar tidak
    // dikenal di registry manapun (perilaku lama, tidak berubah).
    console.warn('DashboardHub: featureKey tidak ditemukan di FEATURE_REGISTRY:', key);
  },
};
