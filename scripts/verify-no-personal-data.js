#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'); const errors=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git'].includes(ent.name))continue;const p=path.join(dir,ent.name),rel=path.relative(root,p).split(path.sep).join('/');if(ent.isDirectory()){walk(p);continue;}if(/^backup-keluarga-.*\.json$/i.test(ent.name))errors.push(`${rel}: nama backup pribadi`);if(ent.name.endsWith('.json')&&!/^(config|data)\//.test(rel)){try{const s=fs.readFileSync(p,'utf8');if(/"transactions"/.test(s)&&/"accounts"/.test(s))errors.push(`${rel}: memuat transactions dan accounts`);}catch(e){errors.push(`${rel}: tidak terbaca (${e.code||e.message})`)}}}}
walk(root);if(errors.length){console.error('NO-PERSONAL-DATA: FAIL\n'+errors.map(x=>' - '+x).join('\n'));process.exit(1)}console.log('NO-PERSONAL-DATA: PASS');
