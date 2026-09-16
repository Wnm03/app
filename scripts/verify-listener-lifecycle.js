#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['modules/shared/app-init-runtime.js','self-test.js','reminder-notif.js'];
const bad=[];
for(const f of files){const p=path.join(root,f);if(!fs.existsSync(p))continue;const s=fs.readFileSync(p,'utf8');
 const counts={visibility:(s.match(/addEventListener\(['"]visibilitychange['"]/g)||[]).length,freeze:(s.match(/addEventListener\(['"]freeze['"]/g)||[]).length,pagehide:(s.match(/addEventListener\(['"]pagehide['"]/g)||[]).length};
 for(const [k,v] of Object.entries(counts)) if(v>1) bad.push(`${f}: duplicate ${k} listeners (${v})`);
}
if(bad.length){console.error(bad.join('\n'));process.exit(1)} console.log('LISTENER LIFECYCLE CONTRACT: PASS');
