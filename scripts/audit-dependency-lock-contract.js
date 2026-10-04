#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const hasLock=fs.existsSync(path.join(ROOT,'package-lock.json'))||fs.existsSync(path.join(ROOT,'npm-shrinkwrap.json'));
const release=fs.readFileSync(path.join(ROOT,'scripts/release.sh'),'utf8');
const requiresLock=/package-lock\.json.*npm-shrinkwrap\.json/.test(release)&&/dependency graph release/.test(release)&&/exit 1/.test(release);
const buildRelease=typeof pkg.scripts?.['build:release']==='string' && pkg.scripts['build:release'].includes('--require-minify');
console.log('S2426 DEPENDENCY LOCK CONTRACT');
console.log(`lockfile-present: ${hasLock?'PASS':'BLOCK (environment has no lockfile)'}`);
console.log(`release-script-lock-gate: ${requiresLock?'PASS':'FAIL'}`);
console.log(`build:release-requires-minify: ${buildRelease?'PASS':'FAIL'}`);
if(!requiresLock||!buildRelease) process.exit(1);
