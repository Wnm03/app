const assert=require('assert');
function projection(logs,curKm,intervalKm){
  const last=logs.length?logs.slice().sort((a,b)=>b.date.localeCompare(a.date))[0].km:null;
  const next=last!=null?last+intervalKm:null;
  const sisa=next!=null?next-curKm:null;
  return {last,next,sisa};
}
let logs=[{id:'s1',date:'2026-01-01',km:80000}];
let r=projection(logs,82000,5000); assert.deepStrictEqual(r,{last:80000,next:85000,sisa:3000});
logs=[]; r=projection(logs,82000,5000); assert.strictEqual(r.next,null);
logs=[{id:'s1',date:'2026-01-01',km:80000},{id:'s2',date:'2026-09-10',km:85000}];
r=projection(logs,85000,5000); assert.deepStrictEqual(r,{last:85000,next:90000,sisa:5000});
console.log('P19 3/3 PASS');
