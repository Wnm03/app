// S1876 regression fixtures: content-identical records with different IDs must
// be distinguishable from legitimate same-date/same-amount records.
const assert = require('assert');
function fp(value, omit=['id','idempotencyKey','createdAt','updatedAt']) {
  const normalize = v => Array.isArray(v) ? v.map(normalize) : (v && typeof v === 'object' ? Object.keys(v).sort().reduce((o,k)=>{ if(!omit.includes(k)) o[k]=normalize(v[k]); return o; },{}) : v);
  return JSON.stringify(normalize(value));
}
const base = {vehicleId:'veh_1',date:'2025-07-17',item:'Oli Mesin',km:10000,cost:50000,note:'',categoryId:'cat_1'};
assert.strictEqual(fp({...base,id:'a',idempotencyKey:'k1'}), fp({...base,id:'b',idempotencyKey:'k2'}));
assert.notStrictEqual(fp({...base,id:'a'}), fp({...base,cost:60000,id:'b'}));
assert.notStrictEqual(fp({...base,id:'a'}), fp({...base,km:10100,id:'b'}));
assert.notStrictEqual(fp({...base,id:'a'}), fp({...base,date:'2025-07-18',id:'b'}));
console.log('duplicate-data-regression: PASS');
