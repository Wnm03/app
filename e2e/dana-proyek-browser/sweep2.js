const h=require('./harness');const seed=require('./seed');
(async()=>{const H=await h.start({width:390,height:844},true);const p=H.p,errs=H.errs;
 await p.evaluate(`(${seed.seedClient.toString()})()`);
 await p.evaluate(async()=>{const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);await IDBStore.set('kw_v4_mirror',s);});await p.reload();await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.askConfirm=async()=>true;});
 const risky='delete|hapus|reset|clear|import|export|backup|restore|logout|keluar|wipe|archive|arsip|share|scan|google|pin|ganti|upload|download|print|pdf|xlsx|csv|install|reload|cache';
 for(const pg of ['shop','carnotes']){
  await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(700);
  const acts=await p.evaluate(([x,rs])=>{const re=new RegExp(rs,'i');return [...document.querySelectorAll('#page-'+x+' [data-action]')].filter(b=>b.getBoundingClientRect().width>0&&!re.test(b.getAttribute('data-action')+(b.getAttribute('data-args')||'')+b.innerText)).map(b=>b.getAttribute('data-action')+' '+(b.getAttribute('data-args')||''));},[pg,risky]);
  let bad=[];
  for(const a of acts){const before=errs.length;
   await p.evaluate(([x,key,rs])=>{window._t=[];const re=new RegExp(rs,'i');const b=[...document.querySelectorAll('#page-'+x+' [data-action]')].filter(b=>b.getBoundingClientRect().width>0&&!re.test(b.getAttribute('data-action')+(b.getAttribute('data-args')||'')+b.innerText)).find(b=>(b.getAttribute('data-action')+' '+(b.getAttribute('data-args')||''))===key);if(b)b.click();},[pg,a,risky]);
   await p.waitForTimeout(100);
   if(errs.length>before)bad.push({a:a.slice(0,60),e:errs.slice(before)});
   await p.evaluate(x=>{document.querySelectorAll('.overlay.open').forEach(o=>{try{closeModal(o.id);}catch(e){void e;}});if(!document.getElementById('page-'+x).classList.contains('active'))showPage(x);},pg);}
  console.log((bad.length?'✗ ':'✓ ')+'sapuan '+pg+': '+acts.length+' kontrol',JSON.stringify(bad.slice(0,3)));
 }
 console.log('errors total:',errs);await H.close();})();
