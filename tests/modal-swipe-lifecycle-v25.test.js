const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const ROOT=path.resolve(__dirname,'..');
const files=[
  'modules/shared/modal-navigasi.js',
  'modules/asset/modal-navigasi.js'
];

test('V25/S30: enableSwipeToDismiss has per-handle idempotent cleanup guard',()=>{
  for(const rel of files){
    const s=fs.readFileSync(path.join(ROOT,rel),'utf8');
    assert.match(s,/const _swipeDismissCleanupByHandle=typeof WeakMap==='function'\?new WeakMap\(\):null;/,
      `${rel}: cleanup registry missing`);
    assert.match(s,/if\(_swipeDismissCleanupByHandle&&_swipeDismissCleanupByHandle\.has\(handle\)\)return;/,
      `${rel}: duplicate-bind guard missing`);
    assert.match(s,/_swipeDismissCleanupByHandle\.set\(handle,\(\)=>\{/,
      `${rel}: handle cleanup registration missing`);
    assert.match(s,/window\.removeEventListener\('mousemove',onMove\)/,
      `${rel}: window mousemove cleanup missing`);
    assert.match(s,/window\.removeEventListener\('mouseup',onEnd\)/,
      `${rel}: window mouseup cleanup missing`);
  }
});

test('V25: swipe listener set remains centralized and does not use anonymous rebinding guard bypass',()=>{
  const s=fs.readFileSync(path.join(ROOT,'modules/shared/modal-navigasi.js'),'utf8');
  const start=s.indexOf('function enableSwipeToDismiss(overlayId)');
  const end=s.indexOf('\nfunction openQS',start);
  assert.ok(start>=0 && end>start,'enableSwipeToDismiss block not found');
  const block=s.slice(start,end);
  assert.equal((block.match(/^handle\.addEventListener\(/gm)||[]).length,5);
  assert.equal((block.match(/^window\.addEventListener\(/gm)||[]).length,2);
  assert.match(s,/_swipeDismissCleanupByHandle/);
});
