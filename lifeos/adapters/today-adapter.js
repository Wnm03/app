// adapters/today-adapter.js — READ-ONLY. TODAY bukan penyimpanan sendiri,
// cuma lensa waktu di atas AREAS/PROJECTS/GOALS (lihat
// personal-life-os-blueprint.md Langkah 2). Depends on: lifeos-registry.js
// (LIFEOS_TODAY_SOURCES). Tidak pernah menulis ke D.
//
// todayAdapterList() SEKARANG registry-driven: iterasi LIFEOS_TODAY_SOURCES
// (bukan blok if/forEach hardcoded per sumber) lalu dispatch ke builder di
// TODAY_SOURCE_BUILDERS berdasar `key` registry — kalau builder untuk 1 key
// belum ada, key itu dilewati (aman, tidak throw), TIDAK ada key yang
// diproses tanpa terdaftar di registry duluan. Ini bikin LIFEOS_TODAY_SOURCES
// benar-benar dikonsumsi otomatis (bukan cuma dokumentasi) — lihat
// README.md § LifeOS > Status Implementasi.
//
// Builder selfcare/payroll/tukang di bawah ini murni REUSE field D yang
// sudah ada (dipakai modul lamanya masing-masing) + helper murni yang
// sudah ada (getWeekRange/todayStr/dateToISO) — TIDAK ada rumus/aturan
// bisnis baru, dan TIDAK memanggil fungsi yang baca/tulis DOM
// (checkWeeklySalaryReset() dkk sengaja tidak dipanggil dari sini, krn itu
// bukan fungsi murni — lihat modules/business/reset-gaji-mingguan.js).

function todaySourceBills(D) {
  const items = [];
  (D.bills || []).forEach((b) => {
    if (b.dueDate && isDueSoon(b.dueDate)) {
      items.push({ id: `bills:${b.id}`, sourceKind: 'bills', sourceId: b.id, label: b.name, dueDate: b.dueDate });
    }
  });
  return items;
}

function todaySourceReminders(D) {
  const items = [];
  (D.reminders || []).forEach((r) => {
    if (!r.done) items.push({ id: `reminders:${r.id}`, sourceKind: 'reminders', sourceId: r.id, label: r.text || r.title });
  });
  return items;
}

// selfcare — reuse D.refleksi.selfCareLog (bentuk & field sama persis dgn
// yang dibaca SelfCareReko.compute() di modules/home/refleksi-selfcare.js:
// map tanggal ISO -> array id item checklist). Urgent hari ini = checklist
// hari ini masih kosong/belum diisi sama sekali.
function todaySourceSelfcare(D) {
  const ref = D.refleksi;
  if (!ref || typeof dateToISO !== 'function') return [];
  const today = dateToISO(new Date());
  const log = ref.selfCareLog || {};
  const doneToday = (log[today] || []).length > 0;
  if (doneToday) return [];
  return [{
    id: 'selfcare:today',
    sourceKind: 'selfcare',
    sourceId: today,
    label: 'Checklist Self-Care & Jurnal Syukur hari ini',
  }];
}

// payroll — reuse getWeekRange() (helper murni, sudah ada di
// modules/business/reset-gaji-mingguan.js) + field D.workDays/
// D.lastResetPromptDate yang SAMA PERSIS dipakai checkWeeklySalaryReset()
// utk menentukan kapan notif reset gaji mingguan muncul — versi di sini
// murni baca kondisinya tanpa efek samping DOM/openModal (checkWeeklySalaryReset
// sendiri tidak dipanggil krn itu bukan fungsi murni).
function todaySourcePayroll(D) {
  if (typeof getWeekRange !== 'function') return [];
  const now = new Date();
  if (now.getDay() !== 6) return []; // sama dgn checkWeeklySalaryReset(): cuma relevan hari Sabtu
  if (typeof todayStr === 'function' && D.lastResetPromptDate === todayStr()) return []; // sudah pernah ditawarkan hari ini
  const { start, end } = getWeekRange(now);
  const weekDays = (D.workDays || []).filter((w) => {
    const d = new Date(w.date);
    return d >= start && d <= end;
  });
  if (!weekDays.length) return [];
  const total = weekDays.reduce((s, w) => s + (w.total || 0), 0);
  return [{
    id: 'payroll:weekly-reset',
    sourceKind: 'payroll',
    sourceId: null,
    label: `Gajian mingguan belum di-reset (${weekDays.length} hari absensi, total ${total})`,
  }];
}

// tukang — reuse D.tukangWorkers (daftar pekerja aktif) + D.tukangAbsensi
// (entri absensi harian, field `date`/`workerId` sama persis dgn yang
// dibaca modules/business/tukang-absensi.js). Urgent hari ini = pekerja
// yang belum ada entri absensi utk tanggal hari ini.
function todaySourceTukang(D) {
  const workers = D.tukangWorkers || [];
  if (!workers.length || typeof dateToISO !== 'function') return [];
  const today = dateToISO(new Date());
  const absensi = D.tukangAbsensi || [];
  const recordedIds = new Set(absensi.filter((a) => a.date === today).map((a) => String(a.workerId)));
  return workers
    .filter((w) => !recordedIds.has(String(w.id)))
    .map((w) => ({
      id: `tukang:${w.id}`,
      sourceKind: 'tukang',
      sourceId: w.id,
      label: `Absensi ${w.name} belum dicatat hari ini`,
    }));
}

const TODAY_SOURCE_BUILDERS = {
  bills: todaySourceBills,
  reminders: todaySourceReminders,
  selfcare: todaySourceSelfcare,
  payroll: todaySourcePayroll,
  tukang: todaySourceTukang,
};

function todayAdapterList(D) {
  const items = [];
  const sources = typeof LIFEOS_TODAY_SOURCES !== 'undefined' ? LIFEOS_TODAY_SOURCES : [];
  sources.forEach((src) => {
    const builder = TODAY_SOURCE_BUILDERS[src.key];
    if (typeof builder !== 'function') return;
    items.push(...builder(D));
  });
  return items;
}

function isDueSoon(dateStr, withinDays = 3) {
  const due = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diffDays <= withinDays;
}
