#!/usr/bin/env node
'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const r=spawnSync(process.execPath,[path.join(__dirname,'verify-release-ready.js')],{stdio:'inherit'});
if(r.status!==0){console.error('RELEASE-GATE-CLOSURE: BLOCKED — verify-release-ready masih memiliki blocker.');process.exit(r.status||1);}
console.log('RELEASE-GATE-CLOSURE: PASS');
