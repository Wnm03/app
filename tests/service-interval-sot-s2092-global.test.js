const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("fs");
const path=require("path");

test("S2092 removes direct legacy interval authority from production consumers",()=>{
 const files=["modules/vehicle/sparepart-servis.js","modules/vehicle/sparepart-servis-ui.js","modules/vehicle/service-history-multicategory-sync-s2037.js","modules/vehicle/service-history-component-explorer-s2006.js","modules/vehicle/service-history-checklist-edit-s2036.js","modules/vehicle/servis.js"];
 for(const f of files){const s=fs.readFileSync(path.join(__dirname,"..",f),"utf8");assert.doesNotMatch(s,/intervalOverrides\s*\[/,f+" masih membaca vehicle.intervalOverrides langsung");}
});
test("S2092 policy delegates to single interval SOT",()=>{const s=fs.readFileSync(path.join(__dirname,"..","modules/vehicle/service-interval-policy.js"),"utf8");assert.match(s,/ServiceIntervalSOT/);assert.doesNotMatch(s,/vehicleOverride\.intervalKm/);});
test("S2092 separates historical snapshot from active interval",()=>{const s=fs.readFileSync(path.join(__dirname,"..","modules/vehicle/service-interval-sot.js"),"utf8");assert.match(s,/intervalKmAtService remains a snapshot/);assert.match(s,/serviceIntervals/);});
test("S2092 exposes manual and AI as explicit active-SOT writers",()=>{const s=fs.readFileSync(path.join(__dirname,"..","modules/vehicle/service-interval-sot.js"),"utf8");assert.match(s,/setManual/);assert.match(s,/setAiRecommendation/);assert.match(s,/source:\'manual\'/);assert.match(s,/source:\'ai-rekomendasi\'/);});
