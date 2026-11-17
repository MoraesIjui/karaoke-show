/**
 * Catálogo público de metadados, filtragem e preferências pessoais.
 * A sincronização diária roda no GitHub Actions; o navegador apenas lê JSON.
 * Nenhuma música é baixada neste módulo.
 */
export const REPERTOIRE_KEY='karaoke-show-repertoire-preferences-v1';
const CACHE_KEY='karaoke-show-repertoire-index-v1';
const RAW_INDEX='https://raw.githubusercontent.com/MoraesIjui/karaoke-show/main/data/repertoire.json';
const validLimits=[20,50,100,500];
export const RHYTHMS=Object.freeze([
 ['sertanejo','Sertanejo'],['gaucha','Gaúcha / Vanera'],
 ['pagode','Pagode'],['samba','Samba'],['mpb','MPB'],['forro','Forró'],
 ['rock','Rock'],['pop','Pop'],['country','Country'],['folk','Folk'],
 ['reggae','Reggae'],['latino','Latino'],['electronic','Eletrônica'],
 ['jazz','Jazz'],['hiphop','Hip-hop'],['blues','Blues'],['other','Outros']
]);
export const DEFAULT_REPERTOIRE_PREFS=Object.freeze({
  country:'all',language:'all',genres:[],type:'all',quantity:50,
  autoInstall:false
});
const clip=(text,max=100)=>String(text??'').slice(0,max);
export function safeRepertoirePreferences(prefs){
  const input=prefs&&typeof prefs==='object'?prefs:{};
  return {
    country:['all','BR','unknown'].includes(input.country)?input.country:'all',
    language:['all','pt','en','es','de','fr','unknown'].includes(input.language)?input.language:'all',
    genres:Array.isArray(input.genres)?[...new Set(input.genres.filter(g=>RHYTHMS.some(x=>x[0]===g)))].slice(0,18):[],
    type:['all','karaoke','reference'].includes(input.type)?input.type:'all',
    quantity:validLimits.includes(Number(input.quantity))?Number(input.quantity):50,
    autoInstall:input.autoInstall===true
  };
}
export function readRepertoirePreferences(){
  try{return safeRepertoirePreferences(JSON.parse(localStorage.getItem(REPERTOIRE_KEY)));}
  catch{return safeRepertoirePreferences(DEFAULT_REPERTOIRE_PREFS);}
}
export function saveRepertoirePreferences(prefs){
  const safe=safeRepertoirePreferences(prefs);
  try{localStorage.setItem(REPERTOIRE_KEY,JSON.stringify(safe));}catch{}
  return safe;
}
function validManifest(obj){
  if(!obj||obj.version!==1||!Array.isArray(obj.items)||obj.items.length>4000)
    throw Error('Índice de repertório inválido.');
  if(typeof obj.generatedAt!=='string'||obj.generatedAt.length>40)
    throw Error('Data de índice inválida.');
  return {
    version:1,generatedAt:obj.generatedAt,
    sourceStatus:obj.sourceStatus||{},
    sourceCounts:obj.sourceCounts||{},
    items:obj.items.filter(item=>item&&typeof item.id==='string'&&item.id.length<400&&
      typeof item.title==='string'&&item.title.length<200&&typeof item.artist==='string'&&item.artist.length<200&&
      ['ultrastar','jamendo'].includes(item.source)&&['karaoke','reference'].includes(item.kind))
  };
}
async function fetchJSON(url,fetchFn){
  const response=await fetchFn(url,{cache:'no-store'});
  if(!response.ok)throw Error('Catálogo indisponível ('+response.status+').');
  const declared=Number(response.headers?.get?.('content-length')||0);
  if(declared>2*1024*1024)throw Error('Catálogo maior que o limite de 2 MB.');
  const text=await response.text();
  if(text.length>2*1024*1024)throw Error('Catálogo maior que o limite de 2 MB.');
  return validManifest(JSON.parse(text));
}
export async function fetchRepertoireIndex({fetchFn=fetch}={}){
  const sources=[RAW_INDEX,'./data/repertoire.json'];
  for(const url of sources){
    try{
      const manifest=await fetchJSON(url,fetchFn);
      try{localStorage.setItem(CACHE_KEY,JSON.stringify(manifest));}catch{}
      return {...manifest,fromCache:false};
    }catch{}
  }
  try{return {...validManifest(JSON.parse(localStorage.getItem(CACHE_KEY)||'null')),fromCache:true};}catch{}
  return {version:1,generatedAt:'',sourceStatus:{ultrastar:'unavailable',jamendo:'unavailable'},items:[],fromCache:true};
}
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function repertoireIdentity(song){
  return clean(song?.artist).replace(/[^\p{L}\p{N}]/gu,'')+'|'+clean(song?.title).replace(/[^\p{L}\p{N}]/gu,'');
}
export function repertoireIsInstalled(item,imported=[]){
  return imported.some(song=>song.importFingerprint==='repertoire:'+item.id||
    repertoireIdentity(song)===repertoireIdentity(item));
}
export function filterRepertoire(index,prefs,{search='',installed=[]}={}){
  const safe=safeRepertoirePreferences(prefs),query=clean(search).trim();
  const all=Array.isArray(index?.items)?index.items:[];
  const results=all.filter(item=>{
    if(safe.type!=='all'&&item.kind!==safe.type)return false;
    if(safe.country==='BR'&&item.country!=='BR')return false;
    if(safe.country==='unknown'&&item.country!=='unknown')return false;
    if(safe.language!=='all'&&item.language!==safe.language)return false;
    if(safe.genres.length&& !safe.genres.includes(item.rhythm||'other'))return false;
    if(query && !clean([item.title,item.artist,item.genre,item.rhythm].join(' ')).includes(query))return false;
    return true;
  });
  const ordered=results.sort((a,b)=>{
    const ia=repertoireIsInstalled(a,installed),ib=repertoireIsInstalled(b,installed);
    if(ia!==ib)return ia?1:-1;
    if(a.ready!==b.ready)return a.ready?-1:1;
    return (a.artist||'').localeCompare(b.artist||'');
  });
  return {total:ordered.length,items:ordered.slice(0,safe.quantity),
    ready:ordered.filter(item=>item.ready===true).length,
    references:ordered.filter(item=>item.kind==='reference').length};
}
export function downloadableRepertoire(index,prefs,{installed=[],max=5}={}){
  return filterRepertoire(index,{...safeRepertoirePreferences(prefs),quantity:500},{installed}).items
    .filter(item=>item.source==='ultrastar'&&item.kind==='karaoke'&&item.ready===true&&
      item.downloadAllowed===true&&!repertoireIsInstalled(item,installed))
    .slice(0,Math.min(5,Math.max(0,Number(max)||0)));
}
export function safeRepertoireUrl(item){
  const url=String(item?.originUrl||'');
  if(/^https:\/\/github\.com\/UltraStar-Deluxe\/songs\/tree\/master\//.test(url))return url;
  if(/^https:\/\/www\.jamendo\.com\/track\/\d+/.test(url))return url;
  return '';
}
export function repertoireStatus(index){
  const source=index?.sourceStatus||{};
  const status=source.jamendo;
  return {
    sources:source,
    jamendoConfigured:!['not_configured','unavailable',undefined].includes(status),
    age:index?.generatedAt?new Date(index.generatedAt):null,
    cached:!!index?.fromCache
  };
}
