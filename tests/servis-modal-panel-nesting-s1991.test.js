'use strict';
// S1991: regression for Edit Catatan Servis sheet collapsing to ~1/3 width on the "Pengingat" tab.
// Root cause: a stray </div> closed .modal early, so #servisReminderPanel became a flex sibling of
// .modal inside the row-flex .overlay and squeezed the sheet. Panels must all live inside .modal.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'../modules/shared/modals.js'),'utf8');
const MODAL_HTML=new Function('return '+src.match(/const MODAL_HTML = (\[[\s\S]*?\]);\s*\n/)[1])();
const VOID=new Set(['br','input','img','hr','meta','link','source','col','area','base','embed','param','track','wbr']);

// Minimal quote-aware tag walker -> element list with depth/parent + balance diagnostics.
function analyze(html){
  const re=/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const stack=[],nodes=[];let stray=0,m;
  while((m=re.exec(html))){
    const closing=m[1]==='/',tag=m[2].toLowerCase(),attrs=m[3];
    if(closing){
      if(VOID.has(tag))continue;
      if(stack.length&&stack[stack.length-1].tag===tag)stack.pop();
      else stray++;
      continue;
    }
    const id=(attrs.match(/\sid=["']([^"']+)["']/)||[])[1]||null;
    const cls=(attrs.match(/\sclass=["']([^"']*)["']/)||[])[1]||'';
    const node={tag,id,cls,depth:stack.length,parent:stack.length?stack[stack.length-1]:null};
    nodes.push(node);
    if(!VOID.has(tag)&&!/\/\s*$/.test(attrs))stack.push(node);
  }
  return {nodes,unclosed:stack.length,stray};
}
const has=(n,c)=>n.cls.split(/\s+/).includes(c);

test('S1991 servisModal: semua panel tab berada di dalam .modal (bukan sibling .modal)',()=>{
  const html=MODAL_HTML.find(h=>h.includes('id="servisModal"'));
  assert.ok(html,'servisModal markup ditemukan');
  const {nodes}=analyze(html);
  const overlay=nodes.find(n=>n.id==='servisModal');
  const modal=nodes.find(n=>n.parent===overlay&&has(n,'modal'));
  assert.ok(modal,'.modal adalah anak langsung overlay');
  for(const id of ['servisEditTabs','servisDetailPanel','servisReminderPanel','servisHistoryPanel','servisAuditPanel']){
    const el=nodes.find(n=>n.id===id);
    assert.ok(el,id+' ada');
    assert.equal(el.parent,modal,id+' harus anak langsung .modal');
  }
});

test('S1991 servisModal: overlay hanya punya satu anak langsung (.modal) dan markup seimbang',()=>{
  const html=MODAL_HTML.find(h=>h.includes('id="servisModal"'));
  const {nodes,unclosed,stray}=analyze(html);
  const overlay=nodes.find(n=>n.id==='servisModal');
  const kids=nodes.filter(n=>n.parent===overlay);
  assert.equal(kids.length,1,'overlay flex-row: anak selain .modal akan menyempitkan sheet');
  assert.ok(has(kids[0],'modal'));
  assert.equal(stray,0,'tidak ada </div> berlebih');
  assert.equal(unclosed,0,'tidak ada tag belum tertutup');
});

test('S1991 audit semua modal: satu overlay = satu .modal, markup seimbang',()=>{
  const bad=[];
  for(const html of MODAL_HTML){
    const {nodes,unclosed,stray}=analyze(html);
    const root=nodes[0];
    if(!root||!has(root,'overlay')&&!has(root,'calc-overlay')&&!has(root,'qs-modal-overlay'))continue;
    const kids=nodes.filter(n=>n.parent===root);
    if(kids.length!==1||unclosed||stray)bad.push(`${root.id||root.cls}: kids=${kids.length} unclosed=${unclosed} stray=${stray}`);
  }
  assert.deepEqual(bad,[]);
});
