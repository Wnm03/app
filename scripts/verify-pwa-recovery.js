#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const fail=[];
function req(re,why){if(!re.test(sw))fail.push(why)}
req(/event\.waitUntil\(/,'install/activate must use waitUntil');
req(/cache\.addAll\(PRECACHE_URLS\)/,'install must precache declared core assets');
req(/self\.clients\.claim\(\)/,'activate must claim clients');
req(/caches\.keys\(\)/,'activate must enumerate old caches');
req(/filter\(\(key\) => key !== CACHE_NAME\)/,'activate must retain only current cache');
req(/const cached = await caches\.match\(event\.request\)/,'offline path must check cache');
req(/if \(cached\) return cached/,'offline path must return cached response');
req(/new Response\(/,'offline cache miss must return a Response');
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log('PWA RECOVERY CONTRACT: PASS');
