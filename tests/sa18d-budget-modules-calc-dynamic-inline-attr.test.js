'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('fs'); const path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const B=r('budget.js'), C=r('modules/shared/modules-calc.js');
test('SA18d: budget.js total/child category handlers are CSP-safe data-onchange',()=>{assert.match(B,/data-onchange="onBudgetCatTotalToggle" data-onchange-args='\["\$el"\]'/); assert.equal((B.match(/data-onchange="onBudgetCatChildToggle"/g)||[]).length,2); assert.doesNotMatch(B,/(?<!data-)on(?:change|click)="onBudgetCat(?:TotalToggle|ChildToggle)\(/);});
test('SA18d: modules-calc total category handler is CSP-safe data-onchange',()=>{assert.match(C,/data-onchange="onFiCatTotalToggle" data-onchange-args='\["\$el"\]'/); assert.doesNotMatch(C,/(?<!data-)onchange="onFiCatTotalToggle\(/);});
