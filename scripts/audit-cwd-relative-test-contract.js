'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const TESTS=path.join(ROOT,'tests');
const files=fs.readdirSync(TESTS).filter(f=>f.endsWith('.test.js')).sort();
const re=/fs\.readFileSync\(\s*['\"]([^/][^'\"]*)['\"]|fs\.existsSync\(\s*['\"]([^/][^'\"]*)['\"]/g;
let hits=0;
for(const f of files){const s=fs.readFileSync(path.join(TESTS,f),'utf8');let m;while(re.exec(s))hits++;}
const runner=fs.readFileSync(path.join(ROOT,'scripts/run-full-test.js'),'utf8');
const pinned=runner.includes("spawn(process.execPath,['--test','--test-reporter=tap',...list],{cwd:ROOT");
console.log(`CWD-RELATIVE TEST READS: ${hits}`);
console.log(`TEST RUNNER ROOT-CWD PIN: ${pinned?'PASS':'FAIL'}`);
if(!pinned)process.exit(1);
