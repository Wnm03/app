// Cross-feature read-only reconciler for Bill/Debt/Piutang state.
// S2188: verifies reciprocal references and orphan/duplicate invariants after
// canonical-writer consolidation. It NEVER mutates D.
var BillDebtPiutangReconciler = (function(){
  'use strict';
  function same(a,b){
    if(typeof sameId==='function') return sameId(a,b);
    return String(a)===String(b);
  }
  function list(key,state){
    const source=state && typeof state==='object' ? state : (typeof D!=='undefined' ? D : {});
    return Array.isArray(source[key]) ? source[key] : [];
  }
  function find(key,id,state){ return list(key,state).find(x=>x && same(x.id,id)) || null; }
  function duplicateIds(key,state){
    const seen=new Map(), out=[];
    list(key,state).forEach((row,i)=>{
      if(!row || row.id==null) return;
      const k=String(row.id);
      if(seen.has(k)) out.push({key,index:i,id:row.id,firstIndex:seen.get(k)});
      else seen.set(k,i);
    });
    return out;
  }
  function reconcile(state){
    const source=state && typeof state==='object' ? state : (typeof D!=='undefined' ? D : {});
    const issues=[];
    const bills=list('bills',source), archive=list('billsArchive',source), debts=list('debts',source), piutang=list('piutang',source), tx=list('transactions',source);
    const billById=new Map();
    bills.forEach(b=>{if(b&&b.id!=null)billById.set(String(b.id),b);});
    archive.forEach(b=>{
      if(!b||b.id==null)return;
      const k=String(b.id);
      if(billById.has(k))issues.push({code:'BILL_DUPLICATE_ACTIVE_ARCHIVE',id:b.id});
      billById.set(k,b);
    });
    ['bills','billsArchive','debts','piutang'].forEach(key=>{
      duplicateIds(key,source).forEach(x=>issues.push({code:'DUPLICATE_ID',key,id:x.id,firstIndex:x.firstIndex,index:x.index}));
    });
    const txExists=id=>tx.some(t=>t&&same(t.id,id));
    debts.forEach(d=>{
      if(!d)return;
      if(d.billId!=null){
        const b=find('bills',d.billId,source)||find('billsArchive',d.billId,source);
        if(!b) issues.push({code:'DEBT_BILL_ORPHAN',debtId:d.id,billId:d.billId});
        else if(b.kind==='utang'&&b.debtId!=null&&!same(b.debtId,d.id)) issues.push({code:'DEBT_BILL_REVERSE_MISMATCH',debtId:d.id,billId:b.id,billDebtId:b.debtId});
      }
      if(d.autoTxId!=null&&!txExists(d.autoTxId))issues.push({code:'DEBT_AUTO_TX_ORPHAN',debtId:d.id,txId:d.autoTxId});
      if(d.linkedAssetId!=null && !find('assets',d.linkedAssetId,source))issues.push({code:'DEBT_ASSET_ORPHAN',debtId:d.id,assetId:d.linkedAssetId});
      if(d.linkedInvestmentId!=null && !find('investments',d.linkedInvestmentId,source))issues.push({code:'DEBT_INVESTMENT_ORPHAN',debtId:d.id,investmentId:d.linkedInvestmentId});
    });
    piutang.forEach(p=>{
      if(!p)return;
      if(p.autoBillId!=null && !billById.has(String(p.autoBillId)))issues.push({code:'PIUTANG_AUTO_BILL_ORPHAN',piutangId:p.id,billId:p.autoBillId});
      if(p.autoTxId!=null&&!txExists(p.autoTxId))issues.push({code:'PIUTANG_AUTO_TX_ORPHAN',piutangId:p.id,txId:p.autoTxId});
      if(p.linkedTxId!=null&&!txExists(p.linkedTxId))issues.push({code:'PIUTANG_LINKED_TX_ORPHAN',piutangId:p.id,txId:p.linkedTxId});
    });
    bills.forEach(b=>{
      if(!b)return;
      if(b.debtId!=null){
        const d=find('debts',b.debtId,source);
        if(!d)issues.push({code:'BILL_DEBT_ORPHAN',billId:b.id,debtId:b.debtId});
        else if(b.kind==='utang'&&d.billId!=null&&!same(d.billId,b.id))issues.push({code:'BILL_DEBT_REVERSE_MISMATCH',billId:b.id,debtId:d.id,debtBillId:d.billId});
      }
    });
    return {ok:issues.length===0,issues};
  }
  return {reconcile,duplicateIds};
})();
if(typeof window!=='undefined')window.BillDebtPiutangReconciler=BillDebtPiutangReconciler;
if(typeof module!=='undefined'&&module.exports)module.exports=BillDebtPiutangReconciler;
