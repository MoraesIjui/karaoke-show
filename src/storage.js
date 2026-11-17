const KEY = 'karaoke-show-data-v1';
export const DEFAULT_SETTINGS = {
  volume: 0.78,
  midiQuality: 'equilibrado',
  midiReverb: true,
  midiDrums: true,
  guide: true,
  octaveFlexible: true,
  sensitivity: 0.012,
  latencyMs: 0,
  preferredDeviceId: '',
  reducedMotion: false
};

function normalName(value) { return String(value ?? '').trim().slice(0, 36) || 'Convidado'; }

export function readLocal() {
  const fallback = { settings: { ...DEFAULT_SETTINGS }, results: [], queue: [], singer: 'Convidado' };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return fallback;
    return {
      ...fallback,
      settings: { ...DEFAULT_SETTINGS, ...(saved.settings && typeof saved.settings === 'object' ? saved.settings : {}) },
      results: Array.isArray(saved.results) ? saved.results.slice(0, 200) : [],
      queue: Array.isArray(saved.queue) ? saved.queue.slice(0, 50) : [],
      singer: normalName(saved.singer)
    };
  } catch { return fallback; }
}

export function persistLocal(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      settings: data.settings,
      results: data.results.slice(0, 200),
      queue: data.queue.slice(0, 50),
      singer: normalName(data.singer)
    }));
    return true;
  } catch { return false; }
}

const DB_NAME = 'karaoke-show-songs';
const STORE = 'imports';
function database() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('Este navegador não oferece armazenamento IndexedDB.')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function transact(mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let result;
    let finished=false;
    const finish=(error)=>{
      if(finished)return;
      finished=true;
      db.close();
      if(error)reject(error);else resolve(result);
    };
    let tx;
    try {
      tx=db.transaction(STORE,mode);
      tx.oncomplete=()=>finish(null); // A música só é considerada salva após o commit.
      tx.onabort=()=>finish(tx.error || new Error('Gravação local cancelada.'));
      tx.onerror=()=>finish(tx.error || new Error('Erro no armazenamento local.'));
      const request=action(tx.objectStore(STORE));
      request.onsuccess=()=>{ result=request.result; };
      request.onerror=()=>{ /* onabort gerencia o erro e fecha o banco */ };
    } catch(error) {
      try{tx?.abort();}catch{}
      finish(error);
    }
  });
}
export async function listImports() { return transact('readonly', store => store.getAll()); }
export async function saveImport(song) { return transact('readwrite', store => store.put(song)); }
export async function removeImport(id) { return transact('readwrite', store => store.delete(id)); }
export function cleanSinger(value) { return normalName(value); }
