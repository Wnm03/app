#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const bad=[];function walk(rel){const abs=path.join(ROOT,rel);for(const n of fs.readdirSync(abs)){if(['node_modules','.git','.test-checkpoints','backups'].includes(n))continue;const p=path.join(abs,n),s=fs.statSync(p);if(s.isDirectory())walk(path.join(rel,n));else if(/(?:\.tmp$|\.swp$|~$|\.bak$)/.test(n)||/^core\.\d+$/.test(n))bad.push(path.relative(ROOT,p));}}
walk('.');if(bad.length){console.error('PATCH CONTAMINATION FAILED');bad.forEach(x=>console.error('  '+x));process.exit(1);}console.log('PATCH CONTAMINATION PASS — no temporary/editor/crash artifacts detected.');
