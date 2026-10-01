import test from 'node:test';
import assert from 'node:assert/strict';
test('A-S2184 Shop canonical writer primitives',()=>{
  globalThis.D={products:[]};
  globalThis.ProductRepository={
    createProduct:f=>({ok:true,product:{id:'p1',name:f.name||'',stock:f.stock||0,...f}}),
    saveProduct:(a,p)=>({ok:true,products:[...a.filter(x=>x.id!==p.id),p]}),
    updateProduct:(p,c)=>({ok:true,product:{...p,...c}}),
    mutateDelete:(a,id)=>({ok:true,products:a.filter(x=>x.id!==id)}),
    mutateStockDelta:(p,d)=>{p.stock=(p.stock||0)+d;return{ok:true,stock:p.stock}},
    mutateSetHargaProdusen:(p,k,v)=>{(p.hargaByProdusen??={})[k]=v;return{ok:true}}
  };
  const W={create(f){const cr=ProductRepository.createProduct(f);const sr=ProductRepository.saveProduct(D.products,cr.product);D.products=sr.products;return cr.product},update(p,c){const u=ProductRepository.updateProduct(p,c);D.products=ProductRepository.saveProduct(D.products,u.product).products;return u.product},remove(id){D.products=ProductRepository.mutateDelete(D.products,id).products}};
  const p=W.create({name:'X'});assert.equal(D.products.length,1);W.update(p,{name:'Y'});assert.equal(D.products.length,1);assert.equal(D.products[0].name,'Y');D.products.push({id:'p2'});W.remove('p1');assert.deepEqual(D.products.map(x=>x.id),['p2']);const stock={id:'p2',stock:2};ProductRepository.mutateStockDelta(stock,3);assert.equal(stock.stock,5);ProductRepository.mutateSetHargaProdusen(stock,'s1',120);assert.equal(stock.hargaByProdusen.s1,120);
});
