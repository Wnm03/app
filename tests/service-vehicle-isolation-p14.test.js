const assert=require('assert');const fs=require('fs');const path=require('path');
const tx=fs.readFileSync(path.join(__dirname,'..','modules','finance','tx-servis.js'),'utf8');
const br=fs.readFileSync(path.join(__dirname,'..','modules','shared','backup-restore.js'),'utf8');
assert(tx.includes('txVehicleId&&vehicleId&&txVehicleId!==vehicleId'));
assert(tx.includes('t.vehicleId&&s.vehicleId&&t.vehicleId!==s.vehicleId'));
assert(br.includes('s.vehicleId&&linkedTx.vehicleId&&s.vehicleId!==linkedTx.vehicleId'));
assert(br.includes(".filter(t=>!s.vehicleId||!t.vehicleId||t.vehicleId===s.vehicleId)"));
assert(br.includes('s.vehicleId&&t.vehicleId&&s.vehicleId!==t.vehicleId'));
console.log('P14 PASS');
