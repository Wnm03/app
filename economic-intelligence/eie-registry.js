// eie-registry.js — Plugin registry EIE. Dimuat PALING AKHIR (lihat urutan
// load di scripts/build.js), supaya EIE_RULES bawaan (rules/rule-definitions.js)
// sudah tersedia untuk diregistrasi sbg default.
//
// - registerIndicator(): daftar sumber data makro custom (fase 2, dipakai
//   kalau ada indikator baru selain 6 inti — contoh §20 "Harga Nikel").
// - registerRule(): daftar rule custom TANPA mengubah rule-engine.js.
//   Rule bawaan (EIE_RULES) otomatis ikut lewat getRules().
//
// PENTING: file ini TIDAK melakukan apa pun terhadap FEATURE_REGISTRY
// (dashboard-hub-registry.js) di fase 1 — belum ada kartu/menu UI EIE yang
// didaftarkan (sesuai permintaan implementasi bertahap: mulai dari yang
// ringan/senyap dulu). Titik integrasi UI menyusul di fase 2.

const EIERegistry = {
  _customIndicators: {},
  _customRules: [],

  registerIndicator(id, def) {
    if (!id || typeof def !== 'object') throw new Error('[EIE] registerIndicator butuh (id, def)');
    this._customIndicators[id] = def;
  },

  registerRule(rule) {
    const errors = validateRuleShape(rule);
    if (errors.length) {
      console.warn('[EIE] registerRule ditolak, rule tidak valid:', rule && rule.id, errors);
      return false;
    }
    rule.enabled = rule.enabled !== false;
    this._customRules.push(rule);
    return true;
  },

  getRules() {
    return EIE_RULES.concat(this._customRules);
  },

  getCustomIndicators() {
    return this._customIndicators;
  },
};
