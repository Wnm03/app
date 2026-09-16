'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'..','modules','ai','ai-core.js'),'utf8');const service=fs.readFileSync(path.join(__dirname,'..','modules','ai','ai-service.js'),'utf8');
test('S1783: AIBus mencegah double subscription dan membersihkan event kosong',()=>{assert.match(core,/includes\(handler\)/);assert.match(core,/delete this\._listeners\[eventName\]/);});
test('S1783: AIService menyimpan unsubscribe handle dan punya unwireEvents',()=>{assert.match(service,/_subscriptions/);assert.match(service,/unwireEvents\(\)/);assert.match(service,/splice\(0\)/);});
