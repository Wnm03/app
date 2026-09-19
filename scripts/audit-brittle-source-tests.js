#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');const DIR=path.join(ROOT,'tests');
const patterns=[/\.(?:includes|indexOf)\(\s*['"][^'"]*(?:\w+\(\);|function\s+\w+\(\))/,/(?:assert\.(?:match|ok)|ok)\([^\n]*(?:save\(\);|restoreBatch\(\);|_restoreMarkDomain\(\)|refreshAfterMutation\()/];
let hits=0;for(const file of fs.readdirSync(DIR).filter(f=>f.endsWith('.test.js')).sort()){const lines=fs.readFileSync(path.join(DIR,file),'utf8').split(/\n/);lines.forEach((line,i)=>{if(patterns.some(r=>r.test(line))){hits++;console.log(`${file}:${i+1}: ${line.trim()}`);}})}
console.log(`SOURCE-TEST HYGIENE: ${hits} potentially brittle literal assertions found (advisory only).`);
