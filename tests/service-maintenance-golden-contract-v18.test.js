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
 'oli-mesin','busi','celah-klep','rantai-keteng-tensioner','kompresi-mesin',
 'v-belt-cvt','roller-cvt','kampas-kopling-ganda','per-cvt','pembersihan-rumah-cvt',
 'filter-udara','coolant','throttle-body','isc','injector','thermostat',
 'kampas-rem-depan','kampas-rem-belakang','minyak-rem','stel-grease-komstir',
 'bearing-roda','aki','kabel-gas-standar-kunci','selang-tutup-tangki','radiator-water-pump',
 'selang-rem','kebocoran-shock','ban-depan','ban-belakang','celah-klep'
];

test('v18 golden checklist contract remains 30 unique components',()=>{
 const c=load();
 const groups=c.__groups||[];
 const items=groups.flatMap(g=>g.items||[]);
 assert.equal(groups.length,13,'master category count drifted');
 assert.equal(items.length,30,'checklist component count drifted');
 const ids=items.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length,'duplicate checklist id');
 assert.deepEqual([...ids].sort(),[...new Set(ids)].sort(),'checklist IDs changed unexpectedly');
});

test('v18 golden critical action contracts remain stable',()=>{
 const c=load(); const items=(c.__groups||[]).flatMap(g=>g.items||[]);
 const byId=Object.fromEntries(items.map(x=>[x.id,x]));
 assert.equal(byId['busi'].actionMode,'alternate');
 assert.equal(byId['kompresi-mesin'].actionMode,'none');
 assert.equal(byId['rantai-keteng-tensioner'].actionMode,'periksa-conditional');
 assert.equal(byId['kabel-gas-standar-kunci'].intervalKm,null);
 assert.equal(byId['oli-mesin'].intervalKm,4000);
});

test('v18 golden IDs have no accidental accumulated-list contamination',()=>{
 const c=load(); const items=(c.__groups||[]).flatMap(g=>g.items||[]);
 const ids=new Set(items.map(x=>x.id));
 const forbidden=['filter-oli','filter-kawat-oli-mesin','paking-knalpot','slide-piece-cvt','boss-pulley-drive-face','mangkok-kopling-ganda','seal-driven-face','per-sentri','pelumasan-cvt-grease','bearing-bak-cvt','busa-filter-cvt','filter-fuel-pump','oli-shockbreaker','engine-mounting-bushing-arm','saklar-sistem-penerangan','relay-sekring'];
 for(const id of forbidden) assert.equal(ids.has(id),false,`contaminated id returned: ${id}`);
});
