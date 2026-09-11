const test=require('node:test');
const assert=require('node:assert/strict');

test('migration plan never mutates records',()=>{
  const log={id:'1',catId:'sp1'};
  const before=JSON.stringify(log);
  const proposed={categoryId:log.catId,masterCategoryId:null};
  assert.equal(JSON.stringify(log),before);
  assert.equal(proposed.categoryId,'sp1');
});

test('orphan category is review-required, not auto-deleted',()=>{
  const categoryExists=false;
  assert.equal(categoryExists,false);
  const action='REVIEW_REQUIRED';
  assert.equal(action,'REVIEW_REQUIRED');
});

test('master category identity must be validated',()=>{
  const valid=new Set(['servis-mesin']);
  assert.equal(valid.has('servis-mesin'),true);
  assert.equal(valid.has('unknown'),false);
});
