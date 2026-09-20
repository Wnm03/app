'use strict';
// Shared fixture for tests that used to read the hardcoded checklist literals in
// modules/vehicle/servis-checklist.js.
//
// Since S1863/S1864 that file is a runtime PROJECTION of the canonical Service
// Master (data/database-kategori-komponen-servis.json ->
// modules/vehicle/service-master-data.generated.js). Any vm context that runs
// servis-checklist.js must therefore load the generated data first (the browser
// bundle does the same), otherwise SERVICE_CHECKLIST_GROUPS is empty.
//
// LEGACY_CHECKLIST_IDS freezes the original 50 KZR components (S1863 baseline).
// The cumulative master is a strict superset: 50 legacy + 52 catalog-expansion
// components = 102. Contract tests assert BOTH halves so neither can regress.
const fs=require('fs');
const path=require('path');

const ROOT=path.join(__dirname,'..','..');
const GENERATED_REL='modules/vehicle/service-master-data.generated.js';
const CHECKLIST_REL='modules/vehicle/servis-checklist.js';

const LEGACY_CHECKLIST_IDS=Object.freeze([
  "oli-mesin", "filter-oli", "busi", "celah-klep",
  "rantai-keteng-tensioner", "kompresi-mesin", "filter-kawat-oli-mesin", "paking-knalpot",
  "v-belt-cvt", "slide-piece-cvt", "boss-pulley-drive-face", "roller-cvt",
  "kampas-kopling-ganda", "mangkok-kopling-ganda", "seal-driven-face", "per-sentri",
  "pelumasan-cvt-grease", "per-cvt", "pembersihan-rumah-cvt", "bearing-bak-cvt",
  "busa-filter-cvt", "throttle-body", "isc", "injector",
  "filter-fuel-pump", "selang-tutup-tangki", "coolant", "radiator-water-pump",
  "thermostat", "kampas-rem-depan", "minyak-rem", "kampas-rem-belakang",
  "cakram-rem-depan", "kaliper-rem-depan", "master-rem-reservoir", "tromol-rem-belakang",
  "selang-rem", "kebocoran-shock", "oli-shockbreaker", "engine-mounting-bushing-arm",
  "stel-grease-komstir", "aki", "saklar-sistem-penerangan", "relay-sekring",
  "ban-depan", "ban-belakang", "bearing-roda", "filter-udara",
  "oli-gardan", "kabel-gas-standar-kunci",
]);
const MASTER_COMPONENT_COUNT=102;
const MASTER_GROUP_COUNT=13;
const LEGACY_LINKCAT_COUNT=44;
const MASTER_LINKCAT_COUNT=46;

function masterGroups(){
  return require(path.join(ROOT,GENERATED_REL)).SERVICE_CHECKLIST_GROUPS;
}
function masterItems(){
  return masterGroups().flatMap(g=>g.items||[]);
}
// Generated source without its top-level 'use strict' so it can be concatenated
// with legacy (sloppy-mode) sources without changing their semantics.
function generatedSource(){
  return fs.readFileSync(path.join(ROOT,GENERATED_REL),'utf8').replace(/^'use strict';[ \t]*\r?\n/m,'');
}
function checklistSource(){
  return fs.readFileSync(path.join(ROOT,CHECKLIST_REL),'utf8');
}
// generated master + checklist, ready for a single vm.runInContext().
function checklistSourceWithMaster(){
  return generatedSource()+'\n'+checklistSource();
}

module.exports={
  LEGACY_CHECKLIST_IDS,MASTER_COMPONENT_COUNT,MASTER_GROUP_COUNT,
  LEGACY_LINKCAT_COUNT,MASTER_LINKCAT_COUNT,
  masterGroups,masterItems,generatedSource,checklistSource,checklistSourceWithMaster,
};
