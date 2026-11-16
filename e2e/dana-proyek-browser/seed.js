// Seed sintetis: gaji 3jt, DP klien 2jt, biaya proyek 1,2jt (dana proyek), makan 0,5jt; laba proyek maks 0,8jt
exports.seedClient=function(){
 const ym=new Date().toISOString().slice(0,7);
 D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:0,balance:0,includeInBalance:true,jenis:'tunai'}];
 D.transactions=[
  {id:1001,date:ym+'-02',type:'income',amount:3000000,category:'Gaji',accountId:'a1',note:'Gaji uji'},
  {id:1002,date:ym+'-03',type:'income',amount:2000000,category:'Pemasukan Lain',accountId:'a1',note:'Renovasi: Rumah Pak Budi - DP',renovDpProjectId:'p1',renovDpLabel:'DP'},
  {id:1003,date:ym+'-05',type:'expense',amount:1200000,category:'Renovasi',accountId:'a1',note:'Keramik proyek',renovProjectLinkId:'p1',renovItemLinkId:'i1'},
  {id:1004,date:ym+'-06',type:'expense',amount:500000,category:'Makan',accountId:'a1',note:'Makan uji'}];
 D.renovProjects=[{id:'p1',name:'Rumah Pak Budi',klien:'Pak Budi',rab:2000000,dana:'klien',status:'aktif',catatan:'',
  items:[{id:'i1',name:'Keramik',category:'Material',harga:1200000,payments:[{id:'pay1',txId:1003,amount:1200000,date:ym+'-05',accountId:'a1',sumberDana:'proyek'}]}]}];
 D.piutang=D.piutang||[];D.budgets=[{id:'b1',category:'Makan',limit:2000000,period:'monthly'}];
};
exports.seedPlain=function(){
 const ym=new Date().toISOString().slice(0,7);
 D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:0,balance:0,includeInBalance:true,jenis:'tunai'}];
 D.transactions=[
  {id:1001,date:ym+'-02',type:'income',amount:3000000,category:'Gaji',accountId:'a1',note:'Gaji uji'},
  {id:1004,date:ym+'-06',type:'expense',amount:500000,category:'Makan',accountId:'a1',note:'Makan uji'}];
 D.renovProjects=[];
};
