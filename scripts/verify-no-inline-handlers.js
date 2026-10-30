#!/usr/bin/env node
'use strict';
// Gate: tidak boleh ada handler inline sungguhan (on*="...") di sumber runtime; CSP script-src-attr 'none' akan memblokirnya diam-diam.
const { scan } = require('./inline-handler-scan');
const bad = scan().filter(r => r.real > 0);
if (bad.length) { console.error('NO-INLINE-HANDLERS: FAIL\n' + bad.map(r => ` - ${r.file}: ${r.real}`).join('\n')); process.exit(1); }
console.log('NO-INLINE-HANDLERS: PASS');
