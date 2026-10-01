// A-S2185: canonical mutation boundary for D.vehicles.
// Storage schema remains unchanged; this module only centralizes array mutation.
var VehicleCanonicalWriter=(()=>{
  function state(){
    if(typeof D==='undefined'||!D||!Array.isArray(D.vehicles))throw new Error('D.vehicles unavailable');
    return D.vehicles;
  }
  function same(a,b){return typeof sameId==='function'?sameId(a,b):String(a)===String(b);}
  function create(vehicle){
    if(!vehicle||vehicle.id==null)throw new Error('vehicle.id required');
    const rows=state();
    if(rows.some(v=>v&&same(v.id,vehicle.id)))throw new Error('duplicate vehicle id: '+vehicle.id);
    rows.push(vehicle);
    return vehicle;
  }
  function updateByIndex(index,mutator){
    const rows=state();
    if(!Number.isInteger(index)||index<0||index>=rows.length||!rows[index])throw new Error('vehicle index not found: '+index);
    const current=rows[index];
    if(typeof mutator!=='function')throw new Error('vehicle mutator required');
    const result=mutator(current);
    if(result&&result!==current)rows[index]=result;
    return rows[index];
  }
  function removeAt(index){
    const rows=state();
    if(!Number.isInteger(index)||index<0||index>=rows.length)throw new Error('vehicle index not found: '+index);
    return rows.splice(index,1)[0]||null;
  }
  function snapshot(){return state().map(v=>v);}
  return Object.freeze({create,updateByIndex,removeAt,snapshot});
})();
