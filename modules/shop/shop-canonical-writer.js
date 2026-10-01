// ShopCanonicalWriter — A-S2184
// Canonical mutation boundary for Shop product master. Keeps D.products schema
// unchanged and delegates validation/mutation semantics to ProductRepository.
const ShopCanonicalWriter={
 _D(){return(typeof D!=='undefined'&&D)?D:null},
 _repo(){return(typeof ProductRepository!=='undefined')?ProductRepository:null},
 _products(){const d=this._D();if(!d)return[];if(!Array.isArray(d.products))d.products=[];return d.products},
 create(fields={}){const d=this._D(),r=this._repo();if(!d||!r)return{ok:false,reason:'Shop canonical dependencies belum siap'};const cr=r.createProduct(fields);if(!cr.ok)return cr;const sr=r.saveProduct(this._products(),cr.product);if(!sr.ok)return sr;d.products=sr.products;return{ok:true,product:cr.product,products:d.products}},
 upsert(product){const d=this._D(),r=this._repo();if(!d||!r)return{ok:false,reason:'Shop canonical dependencies belum siap'};const sr=r.saveProduct(this._products(),product);if(!sr.ok)return sr;d.products=sr.products;return{ok:true,product,products:d.products}},
 update(product,changes){const r=this._repo();if(!r)return{ok:false,reason:'ProductRepository belum siap'};const ur=r.updateProduct(product,changes);if(!ur.ok)return ur;return this.upsert(ur.product)},
 removeById(id){const d=this._D(),r=this._repo();if(!d||!r)return{ok:false,reason:'Shop canonical dependencies belum siap'};const rr=r.mutateDelete(this._products(),id);if(!rr.ok)return rr;d.products=rr.products;return{ok:true,products:d.products}},
 replaceSnapshot(rows){const d=this._D();if(!d||!Array.isArray(rows))return{ok:false,reason:'Shop canonical snapshot invalid'};d.products=rows;return{ok:true,products:d.products}},
 stockDelta(product,delta,meta={}){const r=this._repo();return r?r.mutateStockDelta(product,delta,meta):{ok:false,reason:'ProductRepository belum siap'}},
 setStock(product,value,meta={}){const r=this._repo();return r?r.mutateSetStock(product,value,meta):{ok:false,reason:'ProductRepository belum siap'}},
 setPrice(product,field,value){const r=this._repo();return r?r.mutateSetPrice(product,field,value):{ok:false,reason:'ProductRepository belum siap'}},
 setField(product,field,value){const r=this._repo();return r?r.mutateSetField(product,field,value):{ok:false,reason:'ProductRepository belum siap'}},
 setSupplierPrice(product,supplierId,value){const r=this._repo();return r?r.mutateSetHargaProdusen(product,supplierId,value):{ok:false,reason:'ProductRepository belum siap'}},
 deleteSupplierPrice(product,supplierId){const r=this._repo();return r?r.mutateDeleteHargaProdusen(product,supplierId):{ok:false,reason:'ProductRepository belum siap'}}
};
if(typeof window!=='undefined')window.ShopCanonicalWriter=ShopCanonicalWriter;
