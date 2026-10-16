const DB='ovdp-laboratory', VERSION=1;
const STORES=['bonds','prices','notes','collections','settings'];
let connection;
export async function db(){if(connection)return connection;connection=await new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const d=req.result;for(const s of STORES){if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return connection}
export async function all(store){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function get(store,id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(store).objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function put(store,item){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).put(item);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
export async function remove(store,id){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
export async function replace(store,items){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');const s=t.objectStore(store);s.clear();for(const item of items)s.put(item);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
export async function backup(){const stores={};for(const s of STORES)stores[s]=await all(s);return {format:'ovdp-lab-backup',version:1,createdAt:new Date().toISOString(),stores}}
// Validate the whole backup before opening a write transaction. Never partially restore.
export function validateBackup(payload){
  if(payload?.format!=='ovdp-lab-backup'||payload.version!==1||!payload.stores||typeof payload.stores!=='object')
    throw Error('Невідповідний формат резервної копії');
  for(const store of STORES){
    const items=payload.stores[store];
    if(!Array.isArray(items))throw Error(`У копії відсутній розділ ${store}`);
    const ids=new Set();
    for(const item of items){
      if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!item.id.trim())
        throw Error(`Некоректний запис у розділі ${store}`);
      if(ids.has(item.id))throw Error(`Повторний ключ у розділі ${store}`);
      ids.add(item.id);
    }
  }
  const bonds=payload.stores.bonds;
  if(bonds.some(b=>!/^UA\d{10}$/.test(b.id)||!Array.isArray(b.payments)||!(Number(b.nominal)>0)))
    throw Error('Некоректні паспорти ОВДП у резервній копії');
  return true;
}
export async function restore(payload){
  validateBackup(payload);
  const d=await db();
  // A single transaction across all stores is atomic: either everything is restored, or nothing.
  return new Promise((resolve,reject)=>{
    const t=d.transaction(STORES,'readwrite');
    try{
      for(const name of STORES){
        const store=t.objectStore(name);store.clear();
        for(const item of payload.stores[name])store.put(item);
      }
    }catch(err){t.abort();reject(err);return}
    t.oncomplete=()=>resolve();
    t.onerror=()=>reject(t.error||Error('Помилка запису резервної копії'));
    t.onabort=()=>reject(t.error||Error('Відновлення скасовано: дані залишилися незмінними'));
  });
}
