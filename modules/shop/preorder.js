// preorder.js — Preorder Shop TAHAP 1 (tanpa uang / tanpa DP).
//
// Ruang lingkup tahap ini (disengaja sempit):
//   - product.preorder = {aktif, kuota, estimasi, catatan}  -> konfigurasi per produk
//   - D.preorders[]                                         -> antrean pesanan
//   - kuota (hanya menghitung preorder berstatus 'open'), buat, batal, penuhi
//   - "Penuhi" TIDAK menulis uang/stok sendiri: membuka modal Order yang sudah ada
//     (prefilled) dan Order._saveInner() memanggil recordShopSale() + syncShopSalePayment()
//     seperti penjualan biasa. Setelah sukses, Order memanggil Preorder.markFulfilled()
//     SEBELUM save() sehingga penjualan + status preorder tersimpan dalam satu save().
//   - TIDAK ADA DP, TIDAK ADA transaksi keuangan dari preorder itu sendiri (tahap berikutnya,
//     butuh preorderId eksplisit + reversal atomik).
//
// Status: 'open' -> 'fulfilled' (shopId terisi) | 'cancelled'. Hanya 'open' memakai kuota.
const Preorder={
  STATUS_OPEN:'open',
  _formKey:null,

  _list(){
    if(typeof D==='undefined'||!D)return [];
    if(!Array.isArray(D.preorders))D.preorders=[];
    return D.preorders;
  },
  _product(id){
    if(typeof D==='undefined'||!D||!Array.isArray(D.products))return null;
    return D.products.find(p=>p&&String(p.id)===String(id))||null;
  },
  _uid(){return (typeof uid==='function')?uid():('po'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));},
  _persist(){return !(typeof save==='function'&&save()===false);},
  _num(v){const n=Number(v);return Number.isFinite(n)?n:NaN;},

  // ---------- konfigurasi produk ----------
  config(product){
    const c=product&&product.preorder;
    if(!c||typeof c!=='object')return{aktif:false,kuota:null,estimasi:'',catatan:''};
    const k=c.kuota==null||c.kuota===''?null:Number(c.kuota);
    return{aktif:!!c.aktif,kuota:Number.isFinite(k)&&k>=0?k:null,estimasi:String(c.estimasi||''),catatan:String(c.catatan||'')};
  },
  openQty(productId){
    return this._list().reduce((s,po)=>po&&po.status==='open'&&String(po.productId)===String(productId)?s+(Number(po.qty)||0):s,0);
  },
  quota(productId){
    const p=this._product(productId);
    const c=this.config(p);
    const terpakai=this.openQty(productId);
    return{aktif:c.aktif,kuota:c.kuota,terpakai,sisa:c.kuota==null?null:Math.max(0,c.kuota-terpakai)};
  },
  setConfig(productId,cfg){
    const p=this._product(productId);
    if(!p)return{ok:false,message:'Produk tidak ditemukan'};
    cfg=cfg||{};
    let kuota=null;
    if(cfg.kuota!==undefined&&cfg.kuota!==null&&String(cfg.kuota).trim()!==''){
      kuota=this._num(cfg.kuota);
      if(!Number.isFinite(kuota)||kuota<0)return{ok:false,message:'Kuota tidak valid'};
    }
    const terpakai=this.openQty(productId);
    if(kuota!==null&&kuota<terpakai)return{ok:false,message:'Kuota ('+kuota+') lebih kecil dari preorder terbuka ('+terpakai+'). Batalkan/penuhi dulu atau naikkan kuota.'};
    const prev=p.preorder;
    p.preorder={aktif:!!cfg.aktif,kuota,estimasi:String(cfg.estimasi||'').trim(),catatan:String(cfg.catatan||'').trim()};
    if(!this._persist()){if(prev===undefined)delete p.preorder;else p.preorder=prev;return{ok:false,message:'Gagal menyimpan'};}
    return{ok:true,config:this.config(p)};
  },

  // ---------- buat ----------
  create(input){
    input=input||{};
    const p=this._product(input.productId);
    if(!p)return{ok:false,message:'Produk tidak ditemukan'};
    const key=input.idempotencyKey?String(input.idempotencyKey):'';
    if(key){
      const dup=this._list().find(po=>po&&po.idempotencyKey===key);
      if(dup)return{ok:true,duplicate:true,preorder:dup};
    }
    const c=this.config(p);
    if(!c.aktif)return{ok:false,message:'Preorder belum diaktifkan untuk '+p.name};
    const qty=this._num(input.qty);
    if(!Number.isFinite(qty)||qty<=0)return{ok:false,message:'Jumlah tidak valid'};
    const customer=input.customer||{};
    const name=String(customer.name||'').trim();
    if(!name)return{ok:false,message:'Nama pemesan wajib diisi'};
    const q=this.quota(p.id);
    if(q.sisa!==null&&qty>q.sisa)return{ok:false,message:'Kuota preorder '+p.name+' tidak cukup (sisa '+q.sisa+')'};
    const list=this._list();
    const po={
      id:this._uid(),productId:p.id,productName:p.name,qty,
      customer:{name,phone:String(customer.phone||'').trim(),address:String(customer.address||'').trim()},
      note:String(input.note||'').trim(),status:'open',
      date:(typeof todayStr==='function')?todayStr():'',createdAt:Date.now(),
      idempotencyKey:key||undefined,shopId:null
    };
    list.push(po);
    if(!this._persist()){list.pop();return{ok:false,message:'Gagal menyimpan'};}
    if(typeof this.refreshTabBadge==='function')this.refreshTabBadge();
    return{ok:true,preorder:po};
  },

  // ---------- batal ----------
  cancel(id,reason){
    const po=this._list().find(x=>x&&x.id===id);
    if(!po)return{ok:false,message:'Preorder tidak ditemukan'};
    if(po.status!=='open')return{ok:false,message:'Preorder sudah '+(po.status==='fulfilled'?'dipenuhi':'dibatalkan')};
    const snap={status:po.status,cancelledAt:po.cancelledAt,cancelReason:po.cancelReason};
    po.status='cancelled';po.cancelledAt=Date.now();po.cancelReason=String(reason||'').trim();
    if(!this._persist()){Object.assign(po,snap);return{ok:false,message:'Gagal menyimpan'};}
    if(typeof this.refreshTabBadge==='function')this.refreshTabBadge();
    return{ok:true,preorder:po};
  },

  // ---------- penuhi ----------
  // Validasi tanpa mutasi. items = baris keranjang Order (opsional, utk cek kecocokan produk).
  canFulfil(id,items){
    const po=this._list().find(x=>x&&x.id===id);
    if(!po)return{ok:false,message:'Preorder tidak ditemukan'};
    if(po.status!=='open')return{ok:false,message:'Preorder sudah '+(po.status==='fulfilled'?'dipenuhi':'dibatalkan')};
    const p=this._product(po.productId);
    if(!p)return{ok:false,message:'Produk preorder sudah tidak ada di Etalase'};
    if(Array.isArray(items)&&!items.some(it=>it&&String(it.productId)===String(po.productId)))
      return{ok:false,message:'Keranjang tidak memuat produk preorder ('+po.productName+')'};
    return{ok:true,preorder:po,product:p};
  },
  beginFulfil(id){
    const chk=this.canFulfil(id);
    if(!chk.ok){toast('⚠️ '+chk.message);return chk;}
    const{preorder:po,product:p}=chk;
    const stock=Number(p.stock);
    if(!Number.isFinite(stock)||stock<po.qty){
      const msg='Stok '+p.name+' belum cukup ('+(Number.isFinite(stock)?stock:0)+' dari '+po.qty+'). Restock dulu, baru penuhi.';
      toast('⚠️ '+msg);return{ok:false,message:msg};
    }
    if(typeof Order==='undefined'||typeof Order.openModal!=='function')return{ok:false,message:'Modal Order tidak tersedia'};
    Order.openModal();
    Order.preorderId=po.id;
    Order.items=[{productId:p.id,qty:po.qty,hargaOverride:null}];
    const set=(el,v)=>{const e=document.getElementById(el);if(e)e.value=v||'';};
    set('oCustName',po.customer&&po.customer.name);set('oCustPhone',po.customer&&po.customer.phone);set('oCustAddr',po.customer&&po.customer.address);
    set('oNote','Preorder: '+(po.note||po.productName));
    Order.renderItems();
    return{ok:true};
  },
  // Dipanggil Order._saveInner() SESUDAH penjualan+pembayaran sukses dan SEBELUM save().
  // Tidak memanggil save() sendiri: satu save() menyimpan penjualan dan status preorder bersamaan.
  markFulfilled(id,shopId){
    const po=this._list().find(x=>x&&x.id===id);
    if(!po||po.status!=='open')return{ok:false,message:'Preorder tidak dalam status terbuka'};
    po.status='fulfilled';po.fulfilledAt=Date.now();po.shopId=shopId||null;
    return{ok:true,preorder:po};
  },
  onSaleRemoved(shopId){
    if(typeof D==='undefined'||!D||!Array.isArray(D.preorders)||!shopId)return{ok:true,count:0};
    let count=0;
    D.preorders.forEach(po=>{if(po&&po.status==='fulfilled'&&String(po.shopId)===String(shopId)){po.status='open';delete po.fulfilledAt;po.shopId=null;count++;}});
    if(count&&typeof this.refreshTabBadge==='function')this.refreshTabBadge();
    return{ok:true,count};
  },
  cancelForProduct(productId,reason,options){
    const rows=this._list().filter(po=>po&&po.status==='open'&&String(po.productId)===String(productId));
    if(!rows.length)return{ok:true,count:0};
    const snapshots=rows.map(po=>({po,status:po.status,cancelledAt:po.cancelledAt,cancelReason:po.cancelReason}));
    rows.forEach(po=>{po.status='cancelled';po.cancelledAt=Date.now();po.cancelReason=String(reason||'').trim();});
    if(!(options&&options.deferPersist)&&!this._persist()){
      snapshots.forEach(x=>{x.po.status=x.status;if(x.cancelledAt===undefined)delete x.po.cancelledAt;else x.po.cancelledAt=x.cancelledAt;if(x.cancelReason===undefined)delete x.po.cancelReason;else x.po.cancelReason=x.cancelReason;});
      return{ok:false,message:'Gagal menyimpan pembatalan preorder'};
    }
    return{ok:true,count:rows.length,snapshots,deferred:!!(options&&options.deferPersist)};
  },

  summary(){
    const l=this._list();
    return{open:l.filter(x=>x&&x.status==='open').length,fulfilled:l.filter(x=>x&&x.status==='fulfilled').length,cancelled:l.filter(x=>x&&x.status==='cancelled').length};
  },

  // ---------- UI ----------
  _statusLabel(s){return s==='open'?'Terbuka':(s==='fulfilled'?'Dipenuhi':'Dibatalkan');},
  _productOptions(selectedId,onlyAktif){
    const prods=(typeof D!=='undefined'&&D&&Array.isArray(D.products))?D.products:[];
    return prods.filter(p=>p&&(!onlyAktif||this.config(p).aktif)).map(p=>`<option value="${escapeHtml(p.id)}"${String(p.id)===String(selectedId)?' selected':''}>${escapeHtml(p.name)}</option>`).join('')||'<option value="">'+(onlyAktif?'Belum ada produk preorder aktif':'Belum ada produk')+'</option>';
  },
  _buildSkeleton(host){
    host.innerHTML=`<div class="u-fs12 u-t2 u-mb8">Preorder tanpa DP: catat pesanan produk yang stoknya belum ada. Kuota hanya menghitung preorder yang masih terbuka. Saat stok sudah ada, tekan Penuhi untuk mencatat penjualan biasa.</div>
<div class="u-fs12 u-mb6"><b>Pengaturan produk</b></div>
<div class="fg"><select class="fs" id="poCfgProduct" aria-label="Produk" data-onchange="Preorder.onCfgProductChange" data-onchange-args='["$value"]'></select></div>
<label class="u-flex u-gap8 u-mb6"><input type="checkbox" id="poCfgAktif"> Preorder aktif untuk produk ini</label>
<div class="preorder-config-fields u-mb6"><div class="fg u-mb0"><label class="fl" for="poCfgKuota">Kuota</label><input class="fi" type="number" min="0" id="poCfgKuota" placeholder="Kuota" aria-label="Kuota (kosong = tanpa batas)"></div><div class="fg u-mb0"><label class="fl" for="poCfgEstimasi">Estimasi tersedia</label><input class="fi" type="date" id="poCfgEstimasi" aria-label="Estimasi tersedia"></div></div>
<button type="button" class="btn btn-ghost btn-sm u-mb10" data-action="Preorder.saveConfig">💾 Simpan pengaturan</button>
<div class="u-fs12 u-mb6"><b>Pesan preorder</b></div>
<div class="fg"><select class="fs" id="poProduct" aria-label="Produk preorder" data-onchange="Preorder.updateQuotaInfo"></select></div>
<div class="u-fs12 u-t2 u-mb6" id="poQuotaInfo" aria-live="polite"></div>
<div class="u-flex u-gap8 u-mb6"><input class="fi u-flex1" id="poName" placeholder="Nama pemesan" aria-label="Nama pemesan"><input class="fi u-flex1" id="poPhone" placeholder="Telepon" aria-label="Telepon" inputmode="tel"></div>
<div class="u-flex u-gap8 u-mb6"><input class="fi" style="width:90px" type="number" min="0" step="any" id="poQty" value="1" aria-label="Jumlah"><input class="fi u-flex1" id="poNote" placeholder="Catatan (opsional)" aria-label="Catatan"></div>
<button type="button" class="btn btn-primary btn-sm u-mb10" data-action="Preorder.submitForm">➕ Simpan preorder</button>
<div id="poList"></div>`;
    host.setAttribute('data-built','1');
  },
  render(){
    const host=document.getElementById('preorderPanel');
    if(!host)return;
    if(!(host.getAttribute&&host.getAttribute('data-built')==='1'&&host.innerHTML))this._buildSkeleton(host);
    // Hanya <select> & daftar yang disegarkan; kolom teks/angka tidak pernah dibangun ulang.
    const cfgSel=document.getElementById('poCfgProduct');
    if(cfgSel){const cur=cfgSel.value;cfgSel.innerHTML=this._productOptions(cur,false);if(cur)cfgSel.value=cur;this.onCfgProductChange(cfgSel.value,true);}
    const sel=document.getElementById('poProduct');
    if(sel){const cur=sel.value;sel.innerHTML=this._productOptions(cur,true);if(cur)sel.value=cur;}
    this.updateQuotaInfo();
    this.renderList();
    this.refreshTabBadge();
  },
  refreshTabBadge(){
    const el=document.getElementById('shopPreorderTabBadge');
    if(!el)return;
    const count=this.summary().open;
    el.textContent=count>0?'Preorder ('+count+' terbuka)':'';
    el.style.display=count>0?'inline-flex':'none';
  },
  onCfgProductChange(productId,keepIfUntouched){
    const c=this.config(this._product(productId));
    const a=document.getElementById('poCfgAktif'),k=document.getElementById('poCfgKuota'),e=document.getElementById('poCfgEstimasi');
    if(keepIfUntouched&&this._cfgShown===String(productId))return;
    this._cfgShown=String(productId);
    if(a)a.checked=c.aktif;if(k)k.value=c.kuota==null?'':c.kuota;if(e)e.value=c.estimasi;
  },
  saveConfig(){
    const sel=document.getElementById('poCfgProduct');
    if(!sel||!sel.value){toast('⚠️ Pilih produk');return;}
    const r=this.setConfig(sel.value,{aktif:document.getElementById('poCfgAktif').checked,kuota:document.getElementById('poCfgKuota').value,estimasi:document.getElementById('poCfgEstimasi').value});
    if(!r.ok){toast('⚠️ '+r.message);return;}
    this._cfgShown=null;
    toast('✅ Pengaturan preorder disimpan');
    this.render();
  },
  updateQuotaInfo(){
    const sel=document.getElementById('poProduct'),info=document.getElementById('poQuotaInfo');
    if(!sel||!info)return;
    if(!sel.value){info.textContent='';return;}
    const q=this.quota(sel.value);const c=this.config(this._product(sel.value));
    info.textContent=(q.kuota==null?'Kuota: tanpa batas':'Kuota: sisa '+q.sisa+' dari '+q.kuota)+' · terbuka '+q.terpakai+(c.estimasi?' · estimasi '+c.estimasi:'');
  },
  submitForm(){
    const sel=document.getElementById('poProduct');
    if(!sel||!sel.value){toast('⚠️ Pilih produk preorder');return;}
    if(!this._formKey)this._formKey=this._uid();
    const r=this.create({productId:sel.value,qty:document.getElementById('poQty').value,
      customer:{name:document.getElementById('poName').value,phone:document.getElementById('poPhone').value},
      note:document.getElementById('poNote').value,idempotencyKey:this._formKey});
    if(!r.ok){toast('⚠️ '+r.message);return;}
    this._formKey=null;
    ['poName','poPhone','poNote'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
    const q=document.getElementById('poQty');if(q)q.value='1';
    toast(r.duplicate?'ℹ️ Preorder sudah tercatat':'✅ Preorder dicatat');
    this.render();
  },
  async cancelUi(id){
    const ok=(typeof askConfirm==='function')?await askConfirm('Batalkan preorder ini? Kuota akan kembali.',{danger:true,okText:'Ya, Batalkan',icon:'⏳'}):true;
    if(!ok)return;
    const r=this.cancel(id,'');
    toast(r.ok?'✅ Preorder dibatalkan':'⚠️ '+r.message);
    this.render();
  },
  renderList(){
    const el=document.getElementById('poList');
    if(!el)return;
    const all=this._list().filter(Boolean);
    if(!all.length){el.innerHTML='<div class="u-fs12 u-t2">Belum ada preorder.</div>';return;}
    const open=all.filter(x=>x.status==='open').sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    const done=all.filter(x=>x.status!=='open').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,20);
    const row=(po)=>{
      const p=this._product(po.productId);
      const name=(p&&p.name)||po.productName||'(produk terhapus)';
      const btns=po.status==='open'?`<button type="button" class="tx-del preorder-act u-bgaccsoft u-cacc" data-action="Preorder.beginFulfil" data-args="${escapeHtml(JSON.stringify([po.id]))}">✅ Penuhi</button> <button type="button" class="tx-del preorder-act" data-action="Preorder.cancelUi" data-args="${escapeHtml(JSON.stringify([po.id]))}" aria-label="Batalkan preorder">✖</button>`:'';
      return `<div class="tx-item"><div class="u-flex1"><div><b>${escapeHtml(name)}</b> × ${escapeHtml(po.qty)} <span class="shop-tag">${this._statusLabel(po.status)}</span></div><div class="u-fs12 u-t2">${escapeHtml((po.customer&&po.customer.name)||'')}${po.customer&&po.customer.phone?' · '+escapeHtml(po.customer.phone):''}${po.note?' · '+escapeHtml(po.note):''}</div></div>${btns}</div>`;
    };
    el.innerHTML=`<div class="u-fs12 u-mb6"><b>Antrean (${open.length} terbuka)</b></div>${open.map(row).join('')||'<div class="u-fs12 u-t2 u-mb6">Tidak ada preorder terbuka.</div>'}${done.length?'<div class="u-fs12 u-t2 u-mb6" style="margin-top:8px">Riwayat terakhir</div>'+done.map(row).join(''):''}`;
  }
};
if(typeof window!=='undefined')window.Preorder=Preorder;
