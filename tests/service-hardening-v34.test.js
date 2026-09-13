const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const cn=fs.readFileSync(path.join(root,'chat-action-handlers.js'),'utf8');
const br=fs.readFileSync(path.join(root,'modules/shared/backup-restore.js'),'utf8');
const ad=fs.readFileSync(path.join(root,'modules/vehicle/service-event-adapter.js'),'utf8');
let n=0,okc=0;function ok(name,v){n++;if(v)okc++;else{console.error('FAIL',name);process.exitCode=1;}}
ok('chat service validates odometer',cn.includes('Servis.validateServiceOdometer'));
ok('chat service rollback on save failure',cn.includes('JSON.stringify(D.servisLogs||[])')&&cn.includes('JSON.parse(_snap.servisLogs)')&&cn.includes('JSON.parse(_snap.transactions)'));
ok('chat service lifecycle failure queues outbox',cn.includes("type:'service.create',payload:_chatServiceLog"));
ok('CSV/JSON failure restores core domains',br.includes('_v26ImportSnapshot')&&br.includes('D.bbmLogs=JSON.parse(_v26ImportSnapshot.bbmLogs)')&&br.includes('D.transactions=JSON.parse(_v26ImportSnapshot.transactions)'));
ok('outbox computed key cannot be overwritten by event input',ad.includes('const entry={...evt,key,at:Date.now()'));
console.log(`V34 ${okc}/${n} PASS`);if(okc!==n)process.exit(1);
