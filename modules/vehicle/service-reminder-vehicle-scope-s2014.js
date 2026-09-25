'use strict';
// S2014 compatibility shim. The cumulative S2015 hardening lives in
// service-reminder-vehicle-scope-s2015.js and is the only production entry.
(function(global){
  const root=global||globalThis;
  if(typeof module!=='undefined'&&module.exports){module.exports=require('./service-reminder-vehicle-scope-s2015.js');return;}
  root.installServiceReminderVehicleScopeS2014=root.installServiceReminderVehicleScopeS2015||root.installServiceReminderVehicleScopeS2014;
})(typeof window!=='undefined'?window:globalThis);
