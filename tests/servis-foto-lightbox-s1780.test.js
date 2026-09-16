'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctxFor(D, document) {
  return loadSource(['modules/vehicle/servis.js'], {
    D, document, curVehicleId: 'v1', _photoDraft: [], save() {}, toast() {}, escapeHtml: (s) => String(s),
    uid: () => 'x', closeModal() {}, renderDashboard() {}, renderKeuangan() {}, AIBus: { emit() {} },
  }, ['Servis']);
}

test('S1780: openHistoryPhoto membuat lightbox untuk foto riwayat yang valid', () => {
  const D={servisLogs:[{id:'s1',vehicleId:'v1',foto:['data:image/png;base64,AAA']} ]};
  const nodes=[];
  const body={appendChild(n){nodes.push(n);}};
  const document={body, createElement(){return {style:{},setAttribute(){},appendChild(){},addEventListener(){},focus(){},remove(){}};}, getElementById(){return null;}, addEventListener(){}, removeEventListener(){}};
  const ctx=ctxFor(D,document);
  assert.equal(ctx.Servis.openHistoryPhoto('s1',0),true);
  assert.equal(nodes.length,1);
  assert.equal(nodes[0].id,'servisPhotoLightbox');
});

test('S1780: openHistoryPhoto menolak id/foto yang tidak tersedia', () => {
  const D={servisLogs:[{id:'s1',vehicleId:'v1',foto:[]} ]};
  const document={body:{appendChild(){}},createElement(){throw new Error('tidak boleh membuat lightbox');},getElementById(){return null;},addEventListener(){},removeEventListener(){}};
  const ctx=ctxFor(D,document);
  assert.equal(ctx.Servis.openHistoryPhoto('s1',0),false);
  assert.equal(ctx.Servis.openHistoryPhoto('missing',0),false);
});

test('S1783: siklus buka/tutup lightbox berulang tidak meninggalkan keydown listener', () => {
  const D={servisLogs:[{id:'s1',vehicleId:'v1',foto:['data:image/png;base64,AAA']} ]};
  let activeKeys=0, created=0, currentBox=null;
  const body={appendChild(n){created++;currentBox=n;}};
  const document={
    body,
    createElement(){
      const node={style:{},setAttribute(){},appendChild(){},addEventListener(){},focus(){},remove(){}};
      node.remove=()=>{currentBox=null;};
      return node;
    },
    getElementById(id){return id==='servisPhotoLightbox'?currentBox:null;},
    addEventListener(type){if(type==='keydown')activeKeys++;},
    removeEventListener(type){if(type==='keydown')activeKeys--;},
  };
  const ctx=ctxFor(D,document);
  for(let i=0;i<50;i++){
    assert.equal(ctx.Servis.openHistoryPhoto('s1',0),true);
    ctx.Servis._closePhotoLightbox();
  }
  assert.equal(created,50);
  assert.equal(activeKeys,0,'tidak boleh ada keydown listener tersisa setelah 50 siklus');
});
