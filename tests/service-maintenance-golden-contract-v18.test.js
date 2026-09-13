const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function load(){
 const ctx={console,window:{},D:{sparepartCats:[]}};
 vm.createContext(ctx);
 const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis-checklist.js'),'utf8');
 vm.runInContext(src+'\nthis.__groups=SERVICE_CHECKLIST_GROUPS;',ctx,{filename:'servis-checklist.js'});
 return ctx;
}
const GOLDEN_IDS=[
 'oli-mesin',
 'filter-oli',
 'busi',
 'celah-klep',
 'rantai-keteng-tensioner',
 'kompresi-mesin',
 'filter-kawat-oli-mesin',
 'paking-knalpot',
 'v-belt-cvt',
 'slide-piece-cvt',
 'boss-pulley-drive-face',
 'roller-cvt',
 'kampas-kopling-ganda',
 'mangkok-kopling-ganda',
 'seal-driven-face',
 'per-sentri',
 'pelumasan-cvt-grease',
 'per-cvt',
 'pembersihan-rumah-cvt',
 'bearing-bak-cvt',
 'busa-filter-cvt',
 'throttle-body',
 'isc',
 'injector',
 'filter-fuel-pump',
 'selang-tutup-tangki',
 'coolant',
 'radiator-water-pump',
 'thermostat',
 'kampas-rem-depan',
 'minyak-rem',
 'kampas-rem-belakang',
 'selang-rem',
 'kebocoran-shock',
 'oli-shockbreaker',
 'engine-mounting-bushing-arm',
 'stel-grease-komstir',
 'aki',
 'saklar-sistem-penerangan',
 'relay-sekring',
 'ban-depan',
 'ban-belakang',
 'bearing-roda',
 'filter-udara',
 'oli-gardan',
 'kabel-gas-standar-kunci'
];

test('v18 golden checklist contract remains 46 unique components',()=>{
 const c=load();
 const groups=c.__groups||[];
 const items=groups.flatMap(g=>g.items||[]);
 assert.equal(groups.length,13,'master category count drifted');
 assert.equal(items.length,46,'checklist component count drifted');
 const ids=items.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length,'duplicate checklist id');
 assert.deepEqual([...ids].sort(),[...new Set(ids)].sort(),'checklist IDs changed unexpectedly');
 assert.deepEqual([...ids].sort(),[...GOLDEN_IDS].sort(),'canonical checklist IDs changed unexpectedly');
});

test('v18 golden critical action contracts remain stable',()=>{
 const c=load(); const items=(c.__groups||[]).flatMap(g=>g.items||[]);
 const byId=Object.fromEntries(items.map(x=>[x.id,x]));
 assert.equal(byId['busi'].actionMode,'alternate');
 assert.equal(byId['kompresi-mesin'].actionMode,'none');
 assert.equal(byId['rantai-keteng-tensioner'].actionMode,'periksa-conditional');
 assert.equal(byId['kabel-gas-standar-kunci'].intervalKm,8000);
 assert.equal(byId['oli-mesin'].intervalKm,4000);
});

test('v18 golden IDs have no accidental accumulated-list contamination',()=>{
 const c=load(); const items=(c.__groups||[]).flatMap(g=>g.items||[]);
 const ids=new Set(items.map(x=>x.id));
 const accumulated=['filter-oli','filter-kawat-oli-mesin','paking-knalpot','slide-piece-cvt','boss-pulley-drive-face','mangkok-kopling-ganda','seal-driven-face','per-sentri','pelumasan-cvt-grease','bearing-bak-cvt','busa-filter-cvt','filter-fuel-pump','oli-shockbreaker','engine-mounting-bushing-arm','saklar-sistem-penerangan','relay-sekring'];
 for(const id of accumulated) assert.equal(ids.has(id),true,`expected accumulated id missing: ${id}`);
});
