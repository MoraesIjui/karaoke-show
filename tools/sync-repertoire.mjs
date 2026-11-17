/**
 * Daily, read-only source crawler for Karaoke Show's PUBLIC METADATA index.
 * It downloads NO audio; instruments, lyrics and audio belong to each source.
 * GitHub Actions writes data/repertoire.json with only references and license status.
 */
import {readFile, writeFile, mkdir} from 'node:fs/promises';

const SOURCE_REPO='UltraStar-Deluxe/songs';
const SOURCE_BRANCH='master';
const MAX_SONGS=300;
const MAX_JAMENDO=600;
const UA='KaraokeShow-Repertoire/1.0 (+https://github.com/MoraesIjui/karaoke-show)';
const allowedCC=/^(by|by-sa|by-nc|by-nc-sa)$/i;
const SOURCE_ROOT='https://raw.githubusercontent.com/'+SOURCE_REPO+'/'+SOURCE_BRANCH+'/';
const SITE_ROOT='https://github.com/'+SOURCE_REPO+'/tree/'+SOURCE_BRANCH+'/';
const DISPLAY_GENRES={
  rock:'rock',punk:'rock',metal:'rock',pop:'pop',country:'country',folk:'folk',
  samba:'samba',pagode:'pagode',sertanejo:'sertanejo',vanera:'gaucha',
  gaucha:'gaucha',gaúcha:'gaucha',forro:'forro',forró:'forro',reggae:'reggae',
  electronic:'electronic',eletronic:'electronic',dance:'electronic',
  latino:'latino',hiphop:'hiphop',jazz:'jazz',blues:'blues',mpb:'mpb',
  instrumental:'instrumental'
};
const toPath=p=>p.split('/').map(encodeURIComponent).join('/');
const safeStr=(s,n=120)=>String(s??'').trim().slice(0,n);
const parseHeader=(txt)=>{
 const header={};
 for(const line of txt.split(/\r?\n/)){
   const m=line.match(/^#([A-Za-z0-9_]+):\s*(.*)$/);
   if(m)header[m[1].toUpperCase()]=m[2].trim();
 }
 return header;
};
function genreKey(tag){
 const x=String(tag||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 for(const [key,value] of Object.entries(DISPLAY_GENRES)){
   if(x.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return value;
 }
 return 'other';
}
function languageKey(value){
 const v=String(value||'').toLowerCase();
 if(/portug|brazilian|pt-br|^pt$/.test(v))return 'pt';
 if(/english|^en$/.test(v))return 'en';
 if(/spanish|espa|^es$/.test(v))return 'es';
 if(/german|deutsch|^de$/.test(v))return 'de';
 if(/french|fran[cç]ais|^fr$/.test(v))return 'fr';
 return 'unknown';
}
export function extractLicense(text){
 const urls=[...String(text).matchAll(/(?:https?:\/\/)?creativecommons\.org\/licenses\/([a-z-]+)\/([0-9.]+)\/?/gi)]
   .map(m=>({code:m[1].toLowerCase(),version:m[2],url:'https://creativecommons.org/licenses/'+m[1].toLowerCase()+'/'+m[2].replace(/\.$/,'')+'/'}));
 if(!urls.length)return {allowed:false,label:'Licença não verificada',url:''};
 const audio=urls[0];
 // With multiple separately licensed works, only infer from the first entry
 // if license.txt begins with an audio or song grant. Never guess from cover art.
 const hasAudio=/(MP3 File:|OGG File:|Audio file:|Song by |Song by:|Song by SHEARER|^http:\/\/creativecommons)/im.test(text);
 const codeOk=allowedCC.test(audio.code);
 const hasExplicitSongChart=/UltraStar txt.Song File:|Song File:|Song in UltraStar format:/i.test(text);
 const chartTail=hasExplicitSongChart ? text.slice(text.search(/UltraStar txt.Song File:|Song File:|Song in UltraStar format:/i)) : '';
 const chartLic=[...chartTail.matchAll(/(?:https?:\/\/)?creativecommons\.org\/licenses\/([a-z-]+)\/([0-9.]+)/gi)].map(m=>m[1].toLowerCase());
 const chartOk=!hasExplicitSongChart || (chartLic.length>0 && allowedCC.test(chartLic.at(-1)));
 return {allowed:!!hasAudio&&codeOk&&chartOk,label:'CC '+audio.code.toUpperCase()+' '+audio.version,url:audio.url};
}
export function sourceAudio(name){
 if(typeof name!=='string'||name.length>190 || !/^[-\w .()]+?\.(mp3|ogg|wav|m4a)$/i.test(name))
   return null;
 return name;
}
async function request(url,{token='',fetchFn=fetch,as='text'}={}){
 const headers={'User-Agent':UA,'Accept':as==='json'?'application/vnd.github+json':'text/plain'};
 if(token&&url.startsWith('https://api.github.com/'))headers.Authorization='Bearer '+token;
 const response=await fetchFn(url,{headers,signal:AbortSignal.timeout(16000)});
 if(!response.ok)throw Error('Fonte indisponível ('+response.status+'): '+url.split('?')[0]);
 const declared=Number(response.headers.get('content-length')||0);
 if(declared>5*1024*1024)throw Error('Metadados da fonte acima do limite.');
 const body=await response.text();
 if(body.length>5*1024*1024)throw Error('Metadados grandes demais.');
 return as==='json'?JSON.parse(body):body;
}
export async function crawlUltraStar({fetchFn=fetch,token=''}={}){
 const url='https://api.github.com/repos/'+SOURCE_REPO+'/git/trees/'+SOURCE_BRANCH+'?recursive=1';
 const tree=await request(url,{fetchFn,token,as:'json'});
 if(tree.truncated||!Array.isArray(tree.tree))throw Error('Índice de origem UltraStar incompleto.');
 const paths=new Map(tree.tree.map(x=>[x.path,x]));
 const roots=[...new Set(tree.tree.filter(x=>x.path.endsWith('/song.txt'))
   .map(x=>x.path.slice(0,-'/song.txt'.length)))].slice(0,MAX_SONGS);
 const results=[];
 // Modest concurrency and no binaries downloaded by the indexer.
 for(let at=0;at<roots.length;at+=5){
   const group=roots.slice(at,at+5);
   const fetched=await Promise.all(group.map(async folder=>{
     const licenseEntry=paths.get(folder+'/license.txt');
     const songEntry=paths.get(folder+'/song.txt');
     if(!licenseEntry||!songEntry)return null;
     let song='',license='';
     try{
       [song,license]=await Promise.all([
         request(SOURCE_ROOT+toPath(folder)+'/song.txt',{fetchFn}),
         request(SOURCE_ROOT+toPath(folder)+'/license.txt',{fetchFn})
       ]);
     }catch{return null;}
     const metadata=parseHeader(song),audioFile=sourceAudio(metadata.MP3||metadata.AUDIO);
     const file=audioFile?paths.get(folder+'/'+audioFile):null;
     if(!file||!metadata.TITLE||!metadata.ARTIST)return null;
     const rights=extractLicense(license);
     const disabled=String(metadata.RELATIVE||'').toLowerCase()==='yes'||/\nP[2-9]\r?\n/.test(song);
     const hasNotes=/^[:*]\s+-?\d+\s+\d+\s+-?\d+\s+/m.test(song)&&!disabled;
     return {
       id:'ultrastar:'+encodeURIComponent(folder),
       source:'ultrastar',kind:'karaoke',title:safeStr(metadata.TITLE,80),artist:safeStr(metadata.ARTIST,80),
       genre:safeStr(metadata.GENRE||'Não informado',60),
       rhythm:genreKey(metadata.GENRE||''),language:languageKey(metadata.LANGUAGE),
       // Country is NEVER inferred from lyrics language, nationality of singer or folder name.
       country:'unknown',folder,audioFile,audioBytes:file.size||0,
       license:rights.label,licenseUrl:rights.url,
       ready:!!hasNotes&&rights.allowed&&file.size<=25*1024*1024,
       downloadAllowed:!!hasNotes&&rights.allowed&&file.size<=25*1024*1024,
       originUrl:SITE_ROOT+toPath(folder)
     };
   }));
   results.push(...fetched.filter(Boolean));
 }
 return results.sort((a,b)=>a.artist.localeCompare(b.artist)||a.title.localeCompare(b.title));
}
const jamendoStyles=['rock','pop','latino','country','world','folk','reggae','electronic'];
function jamendoItem(track,{tag,country='unknown',language='unknown'}){
 const id=Number(track.id);
 if(!Number.isSafeInteger(id)||!track.name||!track.artist_name)return null;
 const rights=safeStr(track.license_ccurl||track.license?.ccurl||'',200);
 // Jamendo audio may be downloadable, but it is NOT a karaoke with synchronized
 // lyric + vocal reference. It is always a REFERENCE, never auto-installable.
 return {
   id:'jamendo:'+id,source:'jamendo',kind:'reference',ready:false,downloadAllowed:false,
   sourceDownloadAllowed:track.audiodownload_allowed===true,
   title:safeStr(track.name,80),artist:safeStr(track.artist_name,80),genre:tag,
   rhythm:genreKey(tag),language,country,
   license:rights?'Creative Commons (consultar condições)':'Licença a confirmar',
   licenseUrl:rights.startsWith('https://creativecommons.org/')?rights:'',
   originUrl:track.shareurl?.startsWith('https://www.jamendo.com/')?track.shareurl:
      'https://www.jamendo.com/track/'+id,
   audioBytes:0
 };
}
export async function crawlJamendo({fetchFn=fetch,clientId=''}={}){
 if(!clientId)return {status:'not_configured',items:[]};
 const genres=['rock','pop','latino','country','folk','reggae','electronic'];
 const requests=[
   ...genres.map(tag=>({tag,country:'BR',endpoint:'https://api.jamendo.com/v3.0/charts/track/',params:{country:'BRA',tag}})),
   ...['rock','pop','latino','folk','reggae','electronic'].map(tag=>({tag,country:'unknown',endpoint:'https://api.jamendo.com/v3.0/tracks/',params:{tags:tag,lang:'pt'},language:'pt'}))
 ];
 const collected=new Map();
 let failures=0;
 for(const {tag,country,endpoint,params,language} of requests){
   try{
     const u=new URL(endpoint);
     for(const [k,v] of Object.entries({client_id:clientId,format:'json',limit:'40',...params}))u.searchParams.set(k,v);
     const obj=await request(u.toString(),{fetchFn,as:'json'});
     if(obj.headers?.status!=='success'||!Array.isArray(obj.results))throw Error('Jamendo recusou consulta');
     for(const track of obj.results){
       const item=jamendoItem(track,{tag,country,language:language||'unknown'});
       if(item&&!collected.has(item.id))collected.set(item.id,item);
       if(collected.size>=MAX_JAMENDO)break;
     }
   }catch(error){failures++;if(failures<=2)console.warn('Jamendo:',error.message);}
   if(collected.size>=MAX_JAMENDO)break;
 }
 return {status:failures===requests.length?'error':failures>0?'partial':'ok',items:[...collected.values()]};
}
export function summarizeRepertoire(ultrastar,jamendo,when=new Date()){
 const unique=new Map();
 for(const item of [...ultrastar,...jamendo.items])if(!unique.has(item.id))unique.set(item.id,item);
 const items=[...unique.values()].sort((a,b)=>Number(b.ready)-Number(a.ready)||a.artist.localeCompare(b.artist)||a.title.localeCompare(b.title));
 return {
   version:1,generatedAt:when.toISOString(),
   sourceStatus:{ultrastar:'ok',jamendo:jamendo.status},
   sourceCounts:{ultrastar:ultrastar.length,jamendo:jamendo.items.length},
   items
 };
}
export async function syncRepertoire({fetchFn=fetch,token=process.env.GITHUB_TOKEN||'',clientId=process.env.JAMENDO_CLIENT_ID||''}={}){
 const [ultrastar,jamendo]=await Promise.all([
   crawlUltraStar({fetchFn,token}),crawlJamendo({fetchFn,clientId})
 ]);
 return summarizeRepertoire(ultrastar,jamendo);
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
   const manifest=await syncRepertoire();
   if(!manifest.sourceCounts.ultrastar)throw Error('Origem UltraStar retornou catálogo vazio. Manter índice anterior.');
   await mkdir('data',{recursive:true});
   await writeFile('data/repertoire.json',JSON.stringify(manifest,null,2)+'\n');
   console.log('Repertório:',JSON.stringify({counts:manifest.sourceCounts,ready:manifest.items.filter(x=>x.ready).length,status:manifest.sourceStatus}));
 }catch(error){console.error('Falha na sincronização:',error);process.exitCode=1;}
}
