#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const files=[];function walk(rel){const abs=path.join(ROOT,rel);if(!fs.existsSync(abs))return;for(const n of fs.readdirSync(abs)){const p=path.join(abs,n),s=fs.statSync(p);if(s.isDirectory())walk(path.relative(ROOT,p));else if(/\.js$/.test(n))files.push(p);}}walk('modules');
const out=[];for(const f of files){const lines=fs.readFileSync(f,'utf8').split(/\r?\n/);lines.forEach((l,i)=>{if(/addEventListener\s*\(/.test(l)&&!/removeEventListener/.test(l))out.push({file:path.relative(ROOT,f),line:i+1,text:l.trim().slice(0,180)});});}
console.log(`EVENT LISTENER AUDIT: ${out.length} addEventListener sites.`);out.slice(0,200).forEach(x=>console.log(`${x.file}:${x.line} ${x.text}`));
