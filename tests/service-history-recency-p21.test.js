const assert=require('assert');
function parseServiceDateOnly(value){const m=String(value??'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const y=+m[1],mo=+m[2]-1,d=+m[3],o=new Date(y,mo,d);return o.getFullYear()===y&&o.getMonth()===mo&&o.getDate()===d?o:null;}
function compareServiceHistoryRecency(a,b){
 const da=parseServiceDateOnly(a&&a.date),db=parseServiceDateOnly(b&&b.date),av=!!da,bv=!!db;
 if(av!==bv)return av?-1:1;if(av){const d=db-da;if(d)return d;}
 const ak=Number(a&&a.km),bk=Number(b&&b.km),akv=Number.isFinite(ak),bkv=Number.isFinite(bk);
 if(akv!==bkv)return akv?-1:1;if(akv&&bk!==ak)return bk-ak;
 return String(b&&b.id||'').localeCompare(String(a&&a.id||''));
}
let logs=[{id:'old',date:'2026-01-01',km:80000},{id:'backdated',date:'2025-12-31',km:90000},{id:'same-a',date:'2026-02-01',km:85000},{id:'same-b',date:'2026-02-01',km:86000}];
logs.sort(compareServiceHistoryRecency);assert.equal(logs[0].id,'same-b');assert.equal(logs[1].id,'same-a');
logs=[{id:'valid',date:'2026-03-01',km:70000},{id:'invalid',date:'not-a-date',km:120000}];logs.sort(compareServiceHistoryRecency);assert.equal(logs[0].id,'valid');
logs=[{id:'a',date:'2026-01-01',km:80000},{id:'b',date:'2026-01-01',km:80000}];logs.sort(compareServiceHistoryRecency);assert.ok(['a','b'].includes(logs[0].id));
console.log('P21 3/3 PASS');
