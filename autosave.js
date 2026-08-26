(() => {
  const KEY='multiplication-trainer-v2';
  const SETTINGS_KEY='math-mastery-autosave-v1';
  const DB='math-mastery-backup-db';
  const STORE='backup';
  const HANDLE='external-file';
  let writeTimer=null;

  function openDb(){
    return new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB,1);
      r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
  }
  async function idbPut(k,v){try{const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}catch(_){}}
  async function idbGet(k){try{const db=await openDb();const v=await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});db.close();return v}catch(_){return null}}
  function settings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch(_){return {}}}
  function setSettings(v){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(v))}catch(_){}}
  function payload(raw){let data=null;try{data=JSON.parse(raw)}catch(_){}return JSON.stringify({format:'math-mastery-backup',version:2,exportedAt:new Date().toISOString(),data},null,2)}
  async function mirror(raw){await idbPut('latest',{savedAt:new Date().toISOString(),raw})}
  async function writeExternal(raw){
    const cfg=settings();if(!cfg.enabled)return false;
    const handle=await idbGet(HANDLE);if(!handle||typeof handle.createWritable!=='function')return false;
    try{
      if(handle.queryPermission){let p=await handle.queryPermission({mode:'readwrite'});if(p!=='granted')return false}
      const w=await handle.createWritable();await w.write(payload(raw));await w.close();setSettings({...cfg,lastSaved:new Date().toISOString(),needsPermission:false});return true;
    }catch(_){setSettings({...cfg,needsPermission:true});return false}
  }
  async function backupRaw(raw){if(!raw)return;await mirror(raw);await writeExternal(raw)}
  function schedule(raw){clearTimeout(writeTimer);writeTimer=setTimeout(()=>backupRaw(raw),250)}

  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(this===localStorage&&k===KEY)schedule(v)};

  async function configure(){
    if(!('showSaveFilePicker' in window))return {ok:false,reason:'unsupported'};
    try{
      const handle=await window.showSaveFilePicker({suggestedName:'math-mastery-auto-backup.json',types:[{description:'JSON backup',accept:{'application/json':['.json']}}]});
      await idbPut(HANDLE,handle);setSettings({...settings(),enabled:true,needsPermission:false});const raw=localStorage.getItem(KEY);if(raw)await backupRaw(raw);return {ok:true};
    }catch(e){return {ok:false,reason:e&&e.name==='AbortError'?'cancelled':'error'}}
  }
  async function enable(on){const cfg=settings();setSettings({...cfg,enabled:!!on});if(on){const raw=localStorage.getItem(KEY);if(raw)await backupRaw(raw)}}
  async function saveNow(){const raw=localStorage.getItem(KEY);if(raw)await backupRaw(raw)}
  async function restoreEmergency(){const v=await idbGet('latest');if(!v||!v.raw)return null;try{return JSON.parse(v.raw)}catch(_){return null}}
  async function status(){const cfg=settings(),h=await idbGet(HANDLE);return {enabled:!!cfg.enabled,configured:!!h,supported:'showSaveFilePicker' in window,lastSaved:cfg.lastSaved||null,needsPermission:!!cfg.needsPermission}}
  window.MathAutoSave={configure,enable,saveNow,restoreEmergency,status};
  const raw=localStorage.getItem(KEY);if(raw)schedule(raw);
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
})();