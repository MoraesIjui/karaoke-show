import { CLOUD } from './cloud-config.js';
import { parseLrc, parseNoteMap, addNotesToLines, fileAudioDuration } from './importer.js';
const KEY='karaoke-show-session-v1';
const REST=CLOUD.url+'/rest/v1', STORAGE=CLOUD.url+'/storage/v1/object';
function session(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
function save(s){if(s)localStorage.setItem(KEY,JSON.stringify(s));else localStorage.removeItem(KEY);}
function errorMessage(x,f){return x?.msg||x?.error_description||x?.message||x?.error||f;}
async function query(url,opts={}){
 const headers={apikey:CLOUD.key,...opts.headers};
 if(opts.token)headers.Authorization='Bearer '+opts.token;
 const r=await fetch(url,{method:opts.method||'GET',headers,body:opts.body});
 const txt=await r.text();let val;try{val=txt?JSON.parse(txt):null;}catch{val=txt;}
 if(!r.ok)throw Error(errorMessage(val,'HTTP '+r.status));
 return val;
}
async function authToken(){
 let s=session();if(!s)throw Error('Faça login para publicar.');
 if(Date.now()<(s.expires_at||0)-60000)return s.access_token;
 if(!s.refresh_token){save(null);throw Error('Sessão expirada.');}
 try {
 const next=await query(CLOUD.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
 s={...next,expires_at:Date.now()+next.expires_in*1000};save(s);return s.access_token;
 }catch{save(null);throw Error('Sessão expirada. Entre novamente.');}
}
/** Recuperação feita sempre pelo site; o APK compartilha a senha da conta Auth. */
const RECOVERY_REDIRECT = 'https://moraesijui.github.io/karaoke-show/redefinir-senha.html';
let recoveryAccessToken = null;

export async function sendPasswordRecovery(email) {
  const clean = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw Error('Informe um e-mail válido.');
  const url = CLOUD.url + '/auth/v1/recover?redirect_to=' + encodeURIComponent(RECOVERY_REDIRECT);
  await query(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:clean}) });
  // A resposta do Supabase não confirma se o e-mail existe.
  return true;
}
export async function consumePasswordRecoveryRedirect() {
  if (!globalThis.location) return null;
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(location.search);
  const type = hash.get('type') || search.get('type');
  const error = hash.get('error_description') || search.get('error_description') || hash.get('error') || search.get('error');
  const hasCallback = type === 'recovery' || !!error || hash.has('access_token') || search.has('token_hash') || search.has('code');
  if (!hasCallback) return null;
  // Retira credenciais da barra de endereço antes de fazer qualquer pedido.
  history.replaceState(null, '', location.pathname);
  if (error) return { status:'error', message:'Link expirado, inválido ou não autorizado. Solicite outro.' };
  if (type !== 'recovery') return { status:'error', message:'O retorno não foi identificado como recuperação de senha. Solicite outro link.' };
  let token = hash.get('access_token');
  if (!token && search.has('token_hash')) {
    try {
      const result = await query(CLOUD.url + '/auth/v1/verify', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'recovery', token_hash:search.get('token_hash')})
      });
      token = result?.access_token;
    } catch {
      return { status:'error', message:'Código de recuperação inválido ou expirado. Solicite outro link.' };
    }
  }
  if (!token) return { status:'error', message:'O link não contém um token de recuperação compatível. Solicite um novo link.' };
  recoveryAccessToken = token;
  return { status:'ready' };
}
export async function updatePasswordFromRecovery(password) {
  if (!recoveryAccessToken) throw Error('A recuperação expirou. Solicite outro link.');
  const value = String(password || '');
  if (value.length < 10 || value.length > 72) throw Error('Use uma senha de 10 a 72 caracteres.');
  await query(CLOUD.url+'/auth/v1/user', {
    method:'PUT', token:recoveryAccessToken,
    headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:value})
  });
  recoveryAccessToken = null;
}

export function cloudUser(){return session()?.user||null;}
export function logoutAdmin(){save(null);}
export async function verifyAdmin(){
 if(!session())return false;
 const rows=await query(REST+'/ks_admins?select=user_id&limit=1',{token:await authToken()});
 return Array.isArray(rows)&&rows.length>0;
}
export async function loginAdmin(email,password){
 const s=await query(CLOUD.url+'/auth/v1/token?grant_type=password',{method:'POST',
 headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 save({...s,expires_at:Date.now()+s.expires_in*1000});
 if(!(await verifyAdmin())){save(null);throw Error('Esta conta não possui acesso de administrador.');}
 return s.user;
}
export async function fetchCloudSongs(){
 const rows=await query(REST+'/ks_tracks?select=id,title,artist,genre,duration,storage_path,lyrics_lrc,notes_map&status=eq.published&order=created_at.desc&limit=500');
 return rows.map(r=>{
 const d=Number(r.duration),lines=r.lyrics_lrc?parseLrc(r.lyrics_lrc,d):[];
 const notes=Array.isArray(r.notes_map)?parseNoteMap(r.notes_map,d):[];
 return {id:'cloud-'+r.id,source:'cloud',title:r.title,artist:r.artist,genre:r.genre||'Catálogo online',
 mood:'Online',bpm:null,root:48,icon:'☁',accent:'#22c9b3',glow:'#5390f5',
 duration:d,lines:addNotesToLines(lines,notes),
 audioUrl:STORAGE+'/public/'+CLOUD.bucket+'/'+encodeURIComponent(r.storage_path)};
 });
}
export async function uploadCloudSong({title,artist,genre,audio,lrc,notes,rights}){
 if(!rights)throw Error('Confirme que possui direitos para distribuição.');
 if(!(audio instanceof File)||!audio.size||audio.size>25*1024*1024)throw Error('Selecione áudio com até 25 MB.');
 const ext=audio.name.split('.').pop().toLowerCase();
 if(!['mp3','ogg','wav','m4a','mp4'].includes(ext))throw Error('São aceitos MP3, WAV, M4A, MP4 e OGG. MIDI/KAR ainda não.');
 title=String(title||'').trim().slice(0,100);artist=String(artist||'').trim().slice(0,100);
 if(!title||!artist)throw Error('Informe título e artista.');
 if((lrc?.size||0)>256000||(notes?.size||0)>256000)throw Error('LRC/JSON acima de 256 KB.');
 const duration=await fileAudioDuration(audio);
 if(duration<=0||duration>1800)throw Error('Duração inválida ou superior a 30 min.');
 const lyrics_lrc=lrc?.size?await lrc.text():'';
 if(lyrics_lrc&&!parseLrc(lyrics_lrc,duration).length)throw Error('LRC inválido.');
 const notes_map=notes?.size?parseNoteMap(JSON.parse(await notes.text()),duration):[];
 const storage_path=crypto.randomUUID()+'.'+ext;
 const token=await authToken();
 await query(STORAGE+'/'+CLOUD.bucket+'/'+storage_path,{method:'POST',token,body:audio,
 headers:{'Content-Type':audio.type||({mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',mp4:'audio/mp4',ogg:'audio/ogg'}[ext]),'x-upsert':'false'}});
 try {await query(REST+'/ks_tracks',{method:'POST',token,
 headers:{'Content-Type':'application/json',Prefer:'return=minimal'},
 body:JSON.stringify({title,artist,genre:String(genre||'Outros').slice(0,60),duration,storage_path,lyrics_lrc,notes_map,status:'published'})});}
 catch(e){try{await query(STORAGE+'/'+CLOUD.bucket,{method:'DELETE',token,
 headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[storage_path]})});}catch{}throw e;}
}