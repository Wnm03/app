#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const dirs=['modules','scripts'];const files=[];function walk(d){for(const n of fs.readdirSync(path.join(ROOT,d))){const p=path.join(ROOT,d,n),s=fs.statSync(p);if(s.isDirectory()&&!['node_modules','.git','.test-checkpoints'].includes(n))walk(path.join(d,n));else if(/\.js$/.test(n))files.push(p);}}
for(const d of dirs)if(fs.existsSync(path.join(ROOT,d)))walk(d);
const names=new Map();for(const f of files){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/(?:function\s+|(?:const|let|var)\s+)([A-Za-z_$][\w$]*)\s*(?:=\s*(?:function|\([^)]*\)\s*=>)|\()/g)){const n=m[1];if(n.length<5)continue;const a=names.get(n)||[];a.push(path.relative(ROOT,f));names.set(n,a);}}
const candidates=[...names.entries()].filter(([,v])=>new Set(v).size>1).sort((a,b)=>a[0].localeCompare(b[0]));
console.log(`DUPLICATE CODE AUDIT: ${files.length} JS files scanned; ${candidates.length} repeated symbol names (advisory only).`);
for(const [n,v] of candidates.slice(0,80))console.log(`  ${n}: ${[...new Set(v)].join(', ')}`);
