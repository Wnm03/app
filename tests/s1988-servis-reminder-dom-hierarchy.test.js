'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

function servisModalChunk(){
  const src=fs.readFileSync(path.join(root,'modules/shared/modals.js'),'utf8');
  const start=src.indexOf('servisModal');
  const end=src.indexOf('torsiModal',start);
  assert.ok(start>=0&&end>start,'servisModal tidak ditemukan');
  return src.slice(start,end);
}

test('S1988 servis modal: semua panel tab berada di dalam satu .modal canonical',()=>{
  const chunk=servisModalChunk();
  const modalOpen=chunk.indexOf('<div class=\\"modal\\">');
  const reminder=chunk.indexOf('servisReminderPanel');
  const history=chunk.indexOf('servisHistoryPanel');
  const audit=chunk.indexOf('servisAuditPanel');
  assert.ok(modalOpen>=0&&reminder>modalOpen&&history>reminder&&audit>history);
});

test('S1988 servis modal: reminder tidak lagi menjadi sibling .modal',()=>{
  const chunk=servisModalChunk();
  const reminderCount=chunk.split('servisReminderPanel').length-1;
  assert.equal(reminderCount,1);
  assert.ok(chunk.indexOf('servisReminderPanel')>chunk.indexOf('<div class=\\"modal\\">'));
});
