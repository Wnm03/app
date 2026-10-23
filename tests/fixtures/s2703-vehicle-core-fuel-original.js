// S2703 — salinan BEKU fungsi lama dari vehicle-core.js baseline app-main (36) (sebelum memo/optimasi).
// Hanya dipakai tes diferensial tests/s2703-fuel-infer-cache.test.js; JANGAN diubah.
function estimateKmPerDay(vehicleId){
const points=[
...D.kmLogs.filter(k=>k.vehicleId===vehicleId&&k.date&&isFinite(k.km)).map(k=>({date:k.date,km:k.km})),
...D.bbmLogs.filter(b=>b.vehicleId===vehicleId&&b.date&&isFinite(b.km)&&b.km>0).map(b=>({date:b.date,km:b.km}))
].sort((a,b)=>new Date(a.date)-new Date(b.date));
if(points.length<2)return null;
const first=points[0],last=points[points.length-1];
const days=(new Date(last.date)-new Date(first.date))/86400000;
const kmDiff=last.km-first.km;
if(days<3||kmDiff<=0)return null;
return kmDiff/days;
}

function getFuelFullTankSegments(vehicleId){
const all=(D.bbmLogs||[]).filter(b=>b.vehicleId===vehicleId&&Number.isFinite(Number(b.km))&&Number(b.km)>0&&Number.isFinite(Number(b.liter))&&Number(b.liter)>0).map(b=>({...b,km:Number(b.km),liter:Number(b.liter),cost:Number(b.cost),harga:Number(b.harga)}));
const full=all.filter(b=>b.fullTank).sort((a,b)=>a.km-b.km);
if(full.length<2)return[];
const segments=[];
for(let i=1;i<full.length;i++){
const start=full[i-1],end=full[i];
const km=end.km-start.km;
if(km<=0)continue;
const fills=all.filter(b=>b.km>start.km&&b.km<=end.km);
const liters=fills.reduce((sum,b)=>sum+b.liter,0);
if(liters<=0)continue;
let cost=0,costedLiter=0;
for(const b of fills){
 if(Number.isFinite(b.cost)&&b.cost>0){cost+=b.cost;costedLiter+=b.liter;}
 else if(Number.isFinite(b.harga)&&b.harga>0){cost+=b.harga*b.liter;costedLiter+=b.liter;}
}
segments.push({startKm:start.km,endKm:end.km,km,liter:liters,cost,costedLiter,kmPerLiter:km/liters,fillCount:fills.length});
}
return segments;
}

