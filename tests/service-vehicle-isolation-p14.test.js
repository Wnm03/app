const assert=require('assert');const fs=require('fs');const path=require('path');
const tx=fs.readFileSync(path.join(__dirname,'..','modules','finance','tx-servis.js'),'utf8');
const br=fs.readFileSync(path.join(__dirname,'..','modules','shared','backup-restore.js'),'utf8');
/* S2433.2: guard isolasi kini membandingkan sebagai string (id campuran angka/string) */
assert(tx.includes('txVehicleId&&vehicleId&&String(txVehicleId)!==String(vehicleId)'));
assert(tx.includes('t.vehicleId&&s.vehicleId&&String(t.vehicleId)!==String(s.vehicleId)'));
assert(br.includes('s.vehicleId&&linkedTx.vehicleId&&s.vehicleId!==linkedTx.vehicleId'));
assert(br.includes(".filter(t=>!s.vehicleId||!t.vehicleId||t.vehicleId===s.vehicleId)"));
assert(br.includes('s.vehicleId&&t.vehicleId&&s.vehicleId!==t.vehicleId'));
console.log('P14 PASS');
