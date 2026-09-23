'use strict';
/* S1910–S1920 accumulated gate. Pure deterministic checks; no app data mutation. */
const fs=require('fs');const path=require('path');
const ROOT=path.join(__dirname,'..');
function load(file){return require(path.join(ROOT,file));}
const Timeline=load('modules/vehicle/service-condition-timeline-sot.js');
const Compat=load('modules/vehicle/service-part-compatibility-sot.js');
const Idem=load('modules/vehicle/service-event-idempotency-sot.js');
const Reminder=load('modules/vehicle/reminder-lifecycle.js');
const Isolation=load('modules/vehicle/vehicle-isolation-audit-sot.js');
const Intel=load('modules/vehicle/maintenance-intelligence-v2-sot.js');
const Ingest=load('modules/vehicle/service-ingestion-provenance-sot.js');
const Evidence=load('modules/vehicle/service-evidence-pack-sot.js');
const Roundtrip=load('modules/vehicle/service-roundtrip-sot.js');
const sample={vehicles:[{id:'v1'}],servisLogs:[{id:'s1',vehicleId:'v1',serviceComponentId:'c1',date:'2026-01-01',km:1000,conditionResult:'baik',sourceType:'manual'},{id:'s2',vehicleId:'v1',serviceComponentId:'c1',date:'2026-06-01',km:5000,conditionResult:'aus',sourceType:'manual',idempotencyKey:'k1'}],transactions:[],reminders:[]};
const checks=[];function ok(name,cond){if(!cond)throw new Error(name);checks.push(name);}
const t=Timeline.summarize(sample.servisLogs,'v1','c1');ok('S1910 timeline',t.count===2&&t.observations[1].delta===2);
const parts=[{id:'p1',serviceComponentIds:['c1'],compatibleVehicleIds:['v1']}];ok('S1911 compatible',Compat.resolve(parts,'v1','c1','p1').ok);ok('S1911 rejects mismatch',!Compat.resolve(parts,'v1','c1','p9').ok);
ok('S1912 key',Idem.key({vehicleId:'v1',serviceComponentId:'c1',date:'2026-01-01'})==='service:v1:c1:2026-01-01:default:');ok('S1913 no reopen',!Reminder.transition('COMPLETED','ACTIVE').ok);
ok('S1914 isolation',Isolation.audit(sample).ok);ok('S1915 intelligence',Intel.analyze(sample.servisLogs,'v1','c1').count===2);const prev=Ingest.preview({date:'2026-09-01',item:'Ganti Oli'},{sourceType:'ocr',sourceRef:'scan-1'});ok('S1916 preview',prev.ok&&prev.requiresConfirmation&&!Ingest.toServiceEvent(prev.candidate).ok);ok('S1917 evidence',Evidence.build(sample).counts.services===2);ok('S1920 roundtrip',Roundtrip.certify(sample).ok);
const source=fs.readFileSync(path.join(ROOT,'modules/vehicle/servis.js'),'utf8');ok('S1918 source budget',source.split(/\r?\n/).length<=1900);const repeated=fs.readdirSync(path.join(ROOT,'modules/vehicle')).filter(x=>x.endsWith('.js')).length;ok('S1919 module inventory',repeated>0);
console.log(`Car Notes advanced integrity: PASS (${checks.length} checks; S1910–S1920)`);
