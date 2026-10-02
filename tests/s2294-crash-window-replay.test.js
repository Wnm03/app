const {execFileSync}=require('child_process');
const path=require('path');
const script=path.join(__dirname,'..','scripts','s2294-crash-window-replay.js');
const out=execFileSync(process.execPath,[script],{encoding:'utf8'});
if(!/S2294: 14\/14 PASS/.test(out)) throw new Error(out);
console.log('s2294-crash-window-replay: PASS');
