const fs=require('fs');
const cn=fs.readFileSync('car-notes.js','utf8');
let n=0,ok=0;function t(name,v){n++;if(v)ok++;else{console.error('FAIL',name);process.exitCode=1;}}
t('edit finance event has post-commit catch/outbox',cn.includes("V35: service edit finance event failed after commit; queued for reconciliation")&&cn.includes("type:'finance.updated',payload:_postCommitFinanceEvent"));
t('create finance event has post-commit catch/outbox',cn.includes("V35: service create finance event failed after commit; queued for reconciliation")&&cn.includes("const _createFinanceEvent={txId,category:txCat,type:'expense',amount:cost,kind:'servis'}"));
t('last service fallback is date-only deterministic',cn.includes("String(b.date||'').localeCompare(String(a.date||''))||Number(b.km||0)-Number(a.km||0)||String(b.id||'').localeCompare(String(a.id||''))"));
t('no bare create finance emit remains',!cn.includes("if(txId&&typeof AIBus!==\"undefined\")AIBus.emit('finance.updated'"));
console.log(`${ok}/${n} PASS`);
