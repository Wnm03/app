'use strict';
/**
 * S2040 — LEGACY / EXISTING-MOTOR SERVICE PROFILE.
 *
 * Scope: motorcycles already in use. This layer deliberately does NOT model
 * KPB/new-bike milestones. Motorku X remains the external source for new-bike
 * / KPB handling. Car Notes uses actual service history + current odometer as
 * the baseline for an existing motor.
 *
 * Important: no historical service row is rewritten. The profile is additive.
 */
(function(root){
  const VERSION='SERVICE-LEGACY-MAINTENANCE-S2040';
  const str=v=>String(v==null?'':v).trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const validAction=a=>['periksa','bersih','ganti','catat'].includes(str(a));

  function vehicle(vehicleId){
    const d=typeof D!=='undefined'?D:root.D;
    return d&&Array.isArray(d.vehicles)?d.vehicles.find(v=>v&&str(v.id)===str(vehicleId))||null:null;
  }
  function activate(vehicleId,meta){
    const v=vehicle(vehicleId); if(!v)return {ok:false,code:'vehicle-not-found'};
    v.serviceMaintenanceProfile={mode:'legacy',kpbManagedExternally:true,version:VERSION,activatedAt:(meta&&meta.activatedAt)||new Date().toISOString(),source:(meta&&meta.source)||'car-notes'};
    return {ok:true,vehicleId:v.id,profile:v.serviceMaintenanceProfile};
  }
  function isLegacy(vehicleId){
    const v=vehicle(vehicleId);
    return !!(v&&v.serviceMaintenanceProfile&&v.serviceMaintenanceProfile.mode==='legacy');
  }
  function history(vehicleId,componentId){
    const d=typeof D!=='undefined'?D:root.D;
    const rows=(d&&Array.isArray(d.servisLogs)?d.servisLogs:[]).filter(r=>r&&str(r.vehicleId)===str(vehicleId)&&str(r.serviceComponentId||r.checklistItemId||'')===str(componentId));
    rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||((num(b.km)??-1)-(num(a.km)??-1))||String(b.id||'').localeCompare(String(a.id||'')));
    return rows;
  }
  function latestByAction(vehicleId,componentId,action){
    return history(vehicleId,componentId).find(r=>str(r.actionType||'ganti')===str(action))||null;
  }
  function currentKm(vehicleId,vehicleOverride){
    const v=vehicleOverride||vehicle(vehicleId);
    const direct=num(v&&v.currentOdometer);
    if(direct!=null)return direct;
    const d=typeof D!=='undefined'?D:root.D;
    const logs=(d&&Array.isArray(d.kmLogs)?d.kmLogs:[]).filter(x=>x&&str(x.vehicleId)===str(vehicleId)&&num(x.km)!=null).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(num(b.km)-num(a.km)));
    return logs.length?num(logs[0].km):null;
  }
  function addMonthsClamped(value,months){
    const d=new Date(value); if(Number.isNaN(d.getTime())||!Number.isFinite(Number(months)))return null;
    const n=Math.trunc(Number(months)); const day=d.getDate(); const out=new Date(d.getFullYear(),d.getMonth()+n,1); const last=new Date(out.getFullYear(),out.getMonth()+1,0).getDate(); out.setDate(Math.min(day,last)); return out;
  }
  function actionPlan(componentId,category){
    if(typeof getMaintenanceActionPlan==='function'&&typeof SERVICE_MAINTENANCE_RULES!=='undefined'){
      const p=getMaintenanceActionPlan(SERVICE_MAINTENANCE_RULES[componentId]);
      if(p&&p.length)return p;
    }
    const c=category||{}; const out=[];
    if(num(c.intervalKm)>0||num(c.intervalTimeMonths)>0)out.push({axis:'replace',action:(c.actionMode==='periksa'?'periksa':'ganti'),intervalKm:num(c.intervalKm),intervalMonths:num(c.intervalTimeMonths)});
    return out;
  }
  function evaluateAction(vehicleId,componentId,plan,now,vehicleOverride){
    const action=validAction(plan&&plan.action)?plan.action:'periksa';
    const last=latestByAction(vehicleId,componentId,action);
    if(!last)return {action,axis:plan.axis||'maintenance',status:'BASELINE_REQUIRED',reason:'belum ada riwayat tindakan ini',nextDueKm:null,nextDueDate:null,remainingKm:null,remainingMonths:null};
    const kmNow=currentKm(vehicleId,vehicleOverride); const lastKm=num(last.km);
    const intervalKm=num(plan.intervalKm); const intervalMonths=num(plan.intervalMonths);
    const dueKm=intervalKm!=null&&lastKm!=null?lastKm+intervalKm:null;
    const dueDate=intervalMonths!=null&&last.date?addMonthsClamped(last.date,intervalMonths):null;
    const today=new Date(now||new Date());
    const kmTriggered=dueKm!=null&&kmNow!=null&&kmNow>=dueKm;
    const timeTriggered=!!(dueDate&&today>=dueDate);
    const applicable=intervalKm!=null||intervalMonths!=null;
    if(!applicable)return {action,axis:plan.axis||'maintenance',status:'CONDITION_ONLY',reason:'tidak ada interval tetap; gunakan kondisi/gejala',nextDueKm:null,nextDueDate:null,remainingKm:null,remainingMonths:null,lastServiceId:last.id||null};
    const triggered=kmTriggered||timeTriggered;
    const remainingKm=dueKm!=null&&kmNow!=null?dueKm-kmNow:null;
    return {action,axis:plan.axis||'maintenance',status:triggered?'DUE':'NOT_DUE',trigger:kmTriggered?'km':(timeTriggered?'time':null),nextDueKm:dueKm,nextDueDate:dueDate?dueDate.toISOString().slice(0,10):null,remainingKm,remainingMonths:dueDate?Math.max(0,Math.ceil((dueDate-today)/(1000*60*60*24*30.4375))):null,lastServiceId:last.id||null,lastServiceKm:lastKm,lastServiceDate:last.date||null};
  }
  function evaluateComponent(vehicleId,componentId,category,options){
    if(!isLegacy(vehicleId))return {ok:false,code:'legacy-profile-not-active',vehicleId,componentId};
    const plans=actionPlan(componentId,category); const now=options&&options.now||new Date();
    const states=plans.map(p=>evaluateAction(vehicleId,componentId,p,now,options&&options.vehicle));
    if(!states.length)return {ok:true,vehicleId,componentId,status:'CONDITION_ONLY',states:[],profile:'legacy'};
    const due=states.filter(s=>s.status==='DUE'); const baseline=states.filter(s=>s.status==='BASELINE_REQUIRED');
    return {ok:true,profile:'legacy',vehicleId,componentId,status:due.length?'DUE':(baseline.length?'BASELINE_REQUIRED':'NOT_DUE'),states};
  }
  function audit(vehicleId){
    const v=vehicle(vehicleId); const d=typeof D!=='undefined'?D:root.D;
    const logs=(d&&Array.isArray(d.servisLogs)?d.servisLogs:[]).filter(x=>x&&str(x.vehicleId)===str(vehicleId));
    const issues=[];
    if(!v)issues.push('vehicle-not-found');
    if(v&&!isLegacy(vehicleId))issues.push('legacy-profile-not-active');
    const missingComponent=logs.filter(x=>!str(x.serviceComponentId||x.checklistItemId||x.item));
    if(missingComponent.length)issues.push('history-component-identity-missing');
    return {ok:issues.length===0,version:VERSION,vehicleId,profile:isLegacy(vehicleId)?'legacy':null,historyCount:logs.length,currentKm:currentKm(vehicleId),issues};
  }
  const api={version:VERSION,activate,isLegacy,history,latestByAction,currentKm,actionPlan,evaluateAction,evaluateComponent,audit};
  root.ServiceLegacyMaintenance=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
