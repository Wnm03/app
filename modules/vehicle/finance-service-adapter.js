/* Pure service-finance operation planner. Mutation remains owned by Finance. */
(function(g){'use strict';
 function validate(input){const x=input||{};const amount=Number(x.amount);return {ok:!!x.serviceId&&!!x.vehicleId&&Number.isFinite(amount)&&amount>0,code:!x.serviceId?'MISSING_SERVICE_ID':!x.vehicleId?'MISSING_VEHICLE_ID':!(Number.isFinite(amount)&&amount>0)?'INVALID_AMOUNT':null};}
 function create(input){const v=validate(input);if(!v.ok)return v;return {ok:true,operation:'create',serviceId:String(input.serviceId),vehicleId:String(input.vehicleId),amount:Number(input.amount),accountId:input.accountId||null,date:input.date||null,note:input.note||''};}
 function update(before,after){const a=validate(after);if(!a.ok)return a;return {ok:true,operation:'update',beforeId:before&&before.id||null,after:create(after)};}
 const api={validate,create,update};if(typeof window!=='undefined')window.FinanceServiceAdapter=api;if(typeof globalThis!=='undefined')globalThis.FinanceServiceAdapter=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
