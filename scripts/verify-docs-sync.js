#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=path.resolve(__dirname,'..');
const base=['index.html','app_production.html','sw.js','styles.css','modern-ui-layer.css','minimal-ui-theme.css','pwa-ui-layer.css','nav-scroll.js','manifest.json'];
for(const n of fs.readdirSync(root).filter(x=>/^icon-.*\.svg$/.test(x)))base.push(n);
for(const n of ['modal-write.js','boot-early.js','segmented-control.js','bundle-load-guard.js','smoke-test.js'])base.push('modules/shared/'+n);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const bad=[];for(const f of base){const a=path.join(root,f),b=path.join(root,'docs',f);if(!fs.existsSync(a)||!fs.existsSync(b)||hash(a)!==hash(b))bad.push(f)}if(bad.length){console.error('DOCS-SYNC: FAIL\n'+bad.join('\n'));process.exit(1)}console.log(`DOCS-SYNC: PASS (${base.length} files)`);
