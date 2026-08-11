// rules/rule-schema.js — Validasi struktur Rule (§9.1). Dipakai oleh
// EIERegistry.registerRule() supaya rule custom (plugin, §20) tidak bisa
// masuk dalam bentuk yang salah dan mendiamkan error di tengah evaluasi.

const EIE_VALID_SEVERITIES = ['info', 'warning', 'critical'];

function validateRuleShape(rule) {
  const errors = [];
  if (!rule || typeof rule !== 'object') return ['Rule harus berupa object'];
  if (!rule.id || typeof rule.id !== 'string') errors.push('Rule.id wajib string');
  if (!rule.category || typeof rule.category !== 'string') errors.push('Rule.category wajib string');
  if (typeof rule.condition !== 'function') errors.push('Rule.condition wajib function (macro,user,ctx)=>boolean');
  if (typeof rule.action !== 'function') errors.push('Rule.action wajib function (macro,user,ctx)=>{message,recommendationId}');
  if (!EIE_VALID_SEVERITIES.includes(rule.severity)) errors.push('Rule.severity wajib salah satu dari: ' + EIE_VALID_SEVERITIES.join(', '));
  if (typeof rule.weight !== 'number') errors.push('Rule.weight wajib number');
  if (typeof rule.cooldownDays !== 'number' || rule.cooldownDays < 0) errors.push('Rule.cooldownDays wajib number >= 0');
  return errors;
}
