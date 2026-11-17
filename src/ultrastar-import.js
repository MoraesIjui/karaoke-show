import { inspectZip, extractZipAsset } from './zip-reader.js';
import { parseUltraStar, safeUltraStarAudioName } from './ultrastar.js';
import { fileAudioDuration } from './importer.js';

const ZIP_LIMIT=100*1024*1024;
const AUDIO_LIMIT=25*1024*1024;
const TEXT_LIMIT=1024*1024;
const STORE_LIMIT=90*1024*1024;
const normalize=name=>String(name).replace(/\\/g,'/').replace(/^\.\//,'').toLocaleLowerCase('en');
const leaf=name=>String(name).replace(/\\/g,'/').split('/').at(-1);
const isAudio=name=>/\.(mp3|ogg|wav|m4a)$/i.test(name);
const isSongTxt=name=>/\.txt$/i.test(name)&&!/^(?:license|readme|credits|copyright)\.txt$/i.test(leaf(name));
const textDecoder=bytes=>{
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch{return new TextDecoder('windows-1252').decode(bytes);}
};
const mime=file=>/\.ogg$/i.test(file)?'audio/ogg':/\.wav$/i.test(file)?'audio/wav':/\.m4a$/i.test(file)?'audio/mp4':'audio/mpeg';
function keyOf(song){
  return (String(song.title)+'|'+String(song.artist)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
}
const fingerprint=(raw,txt)=>'usdx:'+raw.checksum.toString(16).padStart(8,'0')+':'+raw.size+':'+txt.checksum.toString(16).padStart(8,'0');

export async function buildUltraStarSong({parsed,audio,filename,licenseText='',origin='',fingerprintId='',audioDuration=null}){
  const duration=Number.isFinite(audioDuration)?Math.max(parsed.duration,audioDuration):parsed.duration;
  if(duration>1800)throw Error('Áudio acima de 30 minutos.');
  return {
    id:'import-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(16).slice(2)),
    source:'import',title:parsed.title,artist:parsed.artist,
    genre:parsed.genre,mood:'UltraStar',bpm:parsed.bpm,root:48,
    accent:'#fa7e9f',glow:'#6751c8',icon:'♫',duration,
    lines:parsed.lines,audioBlob:audio,midi:false,ultraStar:true,
    importFingerprint:fingerprintId,importFilename:filename,
    attribution:licenseText.slice(0,9000),licenseText:licenseText.slice(0,9000),
    originUrl:origin
  };
}
async function detectAudioDuration(audio, fallback){
  try {
    if(typeof Audio==='undefined')return fallback;
    const n=await fileAudioDuration(audio);
    return Number.isFinite(n)&&n>0?n:fallback;
  }catch{return fallback;}
}

/** Importa um ZIP que contém pastas UltraStar com song.txt + áudio local. */
export async function importUltraStarZip(file,{existingSongs=[],save,onProgress=()=>{}}={}){
  if(typeof save!=='function')throw Error('Armazenamento local não configurado.');
  if(!file||typeof file.arrayBuffer!=='function'||file.size>ZIP_LIMIT)
    throw Error('Selecione um ZIP UltraStar de até 100 MB.');
  const archive=new Uint8Array(await file.arrayBuffer());
  const entries=inspectZip(archive);
  const byPath=new Map();
  for(const entry of entries){
    const k=normalize(entry.name);
    if(byPath.has(k))throw Error('ZIP contém caminhos duplicados.');
    byPath.set(k,entry);
  }
  const candidates=entries.filter(x=>isSongTxt(x.name));
  const result={
    fileName:file.name||'ultrastar.zip',total:entries.length,candidates:candidates.length,
    imported:0,duplicates:0,failed:0,ignored:entries.length-candidates.length,items:[]
  };
  const existingNames=new Set(existingSongs.map(keyOf));
  const existingPrints=new Set(existingSongs.map(x=>x.importFingerprint).filter(Boolean));
  let storedBytes=0;
  for(let i=0;i<candidates.length;i++){
    const entry=candidates[i];
    try{
      if(entry.size>TEXT_LIMIT)throw Error('TXT maior que 1 MB.');
      const parsed=parseUltraStar(textDecoder(await extractZipAsset(archive,entry)));
      const prefix=normalize(entry.name).slice(0,normalize(entry.name).lastIndexOf('/')+1);
      const audioName=safeUltraStarAudioName(parsed.audioFile);
      const audioEntry=byPath.get(prefix+normalize(audioName));
      if(!audioEntry||!isAudio(audioEntry.name))throw Error('Arquivo de áudio referenciado não encontrado na mesma pasta.');
      if(audioEntry.size>AUDIO_LIMIT || storedBytes+audioEntry.size>STORE_LIMIT)
        throw Error('Áudio ou volume total acima do limite de importação.');
      const print=fingerprint(audioEntry,entry);
      if(existingNames.has(keyOf(parsed))||existingPrints.has(print)){
        result.duplicates++;
        result.items.push({name:entry.name,status:'duplicate',reason:'Música já importada'});
        continue;
      }
      let licenseText='';
      const license=byPath.get(prefix+'license.txt');
      if(license && license.size<=TEXT_LIMIT)licenseText=textDecoder(await extractZipAsset(archive,license));
      const raw=await extractZipAsset(archive,audioEntry);
      const fileName=leaf(audioEntry.name);
      const audio=new File([raw],fileName,{type:mime(fileName)});
      const measured=await detectAudioDuration(audio,parsed.duration);
      const song=await buildUltraStarSong({
        parsed,audio,filename:entry.name,licenseText,
        fingerprintId:print,audioDuration:measured
      });
      await save(song);storedBytes+=raw.length;
      result.imported++;existingNames.add(keyOf(parsed));existingPrints.add(print);
      result.items.push({name:entry.name,status:'imported',reason:parsed.noteCount+' notas vocais'});
    }catch(error){
      result.failed++;
      result.items.push({name:entry.name,status:'failed',reason:String(error?.message||error)});
    }finally{
      onProgress({...result,processed:i+1});
      if(i%3===2)await new Promise(done=>setTimeout(done,0));
    }
  }
  return result;
}

/**
 * Demonstração com obras disponibilizadas com licenças CC para uso não
 * comercial pelo repositório oficial UltraStar-Deluxe/songs. Os arquivos são
 * obtidos da origem SOMENTE após clique explícito, nunca distribuídos no APK.
 */
export const OPEN_TEST_SONGS=Object.freeze([
  {
    id:'monkey-shines',title:'Monkey Shines',artist:'Jonathan Coulton',
    folder:'Creative Commons/Jonathan Coulton - Monkey Shines',
    license:'CC BY-NC 3.0 (áudio e UltraStar TXT)',credit:'Jonathan Coulton; adaptação UltraStar por Julian W. (SKillMaster)',
    licenseUrl:'https://creativecommons.org/licenses/by-nc/3.0/',
    sizeMb:1.3
  },
  {
    id:'in-my-hand',title:'In My Hand',artist:'Shearer',
    folder:'Creative Commons/Shearer - In My Hand',
    license:'CC BY-NC-SA 3.0 (conforme license.txt)',credit:'Shearer — Independent Rock 2.0',
    licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/3.0/',
    sizeMb:5.8
  }
]);

export function openTestSongUrls(item) {
  if(!OPEN_TEST_SONGS.includes(item))throw Error('Demo não autorizada.');
  const root='https://raw.githubusercontent.com/UltraStar-Deluxe/songs/master/';
  const folder=item.folder.split('/').map(encodeURIComponent).join('/');
  return {song:root+folder+'/song.txt',license:root+folder+'/license.txt',root:root+folder+'/'};
}
async function fetchBounded(url,maxBytes){
  const response=await fetch(url,{cache:'no-store',mode:'cors'});
  if(!response.ok)throw Error('Arquivo de demonstração indisponível ('+response.status+').');
  const declared=Number(response.headers.get('content-length'));
  if(Number.isFinite(declared)&&declared>maxBytes)throw Error('Demonstração excede limite de tamanho.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length>maxBytes)throw Error('Demonstração excede limite de tamanho.');
  return bytes;
}

export async function installOpenTestSong(id,{existingSongs=[],save,onProgress=()=>{}}={}){
  if(typeof save!=='function')throw Error('Armazenamento local não configurado.');
  const item=OPEN_TEST_SONGS.find(item=>item.id===id);
  if(!item)throw Error('Demonstração desconhecida.');
  if(existingSongs.some(song=>keyOf(song)===keyOf(item)))
    return {status:'duplicate',title:item.title,artist:item.artist};
  const urls=openTestSongUrls(item);
  onProgress('Carregando notas e licença…');
  const [txtBytes,licenseBytes]=await Promise.all([
    fetchBounded(urls.song,TEXT_LIMIT),fetchBounded(urls.license,TEXT_LIMIT)
  ]);
  const parsed=parseUltraStar(textDecoder(txtBytes));
  if(keyOf(parsed)!==keyOf(item))throw Error('A música da origem não corresponde à seleção.');
  const licenseText=textDecoder(licenseBytes);
  if(!/creativecommons\.org\/licenses\/by-nc(?:-sa)?\/3\.0/i.test(licenseText))
    throw Error('Licença Creative Commons da origem não foi reconhecida.');
  if(item.id==='in-my-hand' && !/by-nc-sa\/3\.0/i.test(licenseText))
    throw Error('Licença da música não corresponde ao catálogo.');
  const audioFile=safeUltraStarAudioName(parsed.audioFile);
  if(audioFile.includes('/'))throw Error('Caminho de áudio inesperado no pacote.');
  onProgress('Baixando áudio com licença aberta…');
  const bytes=await fetchBounded(urls.root+encodeURIComponent(audioFile),AUDIO_LIMIT);
  const audio=new File([bytes],audioFile,{type:mime(audioFile)});
  const duration=await detectAudioDuration(audio,parsed.duration);
  const song=await buildUltraStarSong({
    parsed,audio,filename:item.folder+'/song.txt',licenseText,
    origin:'https://github.com/UltraStar-Deluxe/songs/tree/master/'+item.folder.split('/').map(encodeURIComponent).join('/'),
    fingerprintId:'ultrastar-demo:'+item.id,audioDuration:duration
  });
  await save(song);
  onProgress('Música salva no aparelho.');
  return {status:'imported',title:parsed.title,artist:parsed.artist};
}


/** Instala uma entrada verificada pelo indexador oficial, nunca áudio arbitrário. */
export async function installRepertoireUltraStar(item,{existingSongs=[],save,onProgress=()=>{}}={}){
  if(typeof save!=='function')throw Error('Armazenamento local não configurado.');
  if(!item || item.source!=='ultrastar'||item.kind!=='karaoke'||item.ready!==true||item.downloadAllowed!==true)
    throw Error('Esta entrada não possui autorização e dados completos para instalação automática.');
  const folder=String(item.folder||'');
  if(!folder.startsWith('Creative Commons/') || folder.includes('..') ||
     !/^Creative Commons\/[^/]+$/.test(folder) ||
     item.id!=='ultrastar:'+encodeURIComponent(folder))
    throw Error('Identificador de fonte UltraStar inválido.');
  const audioName=safeUltraStarAudioName(item.audioFile);
  if(audioName.includes('/')||item.audioBytes>25*1024*1024)
    throw Error('Áudio não suportado ou maior que 25 MB.');
  const root='https://raw.githubusercontent.com/UltraStar-Deluxe/songs/master/'+folder.split('/').map(encodeURIComponent).join('/')+'/';
  if(existingSongs.some(song=>keyOf(song)===keyOf(item)))
    return {status:'duplicate',title:item.title,artist:item.artist};
  onProgress('Validando letra e licença da fonte…');
  const [txtBytes,licBytes]=await Promise.all([
    fetchBounded(root+'song.txt',TEXT_LIMIT),
    fetchBounded(root+'license.txt',TEXT_LIMIT)
  ]);
  const parsed=parseUltraStar(textDecoder(txtBytes));
  if(keyOf(parsed)!==keyOf(item)||safeUltraStarAudioName(parsed.audioFile)!==audioName)
    throw Error('A origem alterou os arquivos: atualize o catálogo antes de instalar.');
  const licenseText=textDecoder(licBytes);
  const licenses=[...licenseText.matchAll(/(?:https?:\/\/)?creativecommons\.org\/licenses\/([a-z-]+)\/([0-9.]+)/gi)];
  const first=licenses[0];
  if(!first || !/^(by|by-sa|by-nc|by-nc-sa)$/i.test(first[1]))
    throw Error('A licença de áudio mudou ou não autoriza esta importação.');
  const declared='CC '+first[1].toUpperCase()+' '+first[2];
  if(item.license!==declared)
    throw Error('A licença foi alterada: sincronize novamente antes de baixar.');
  onProgress('Baixando gravação autorizada de '+parsed.title+'…');
  const bytes=await fetchBounded(root+encodeURIComponent(audioName),AUDIO_LIMIT);
  const file=new File([bytes],audioName,{type:mime(audioName)});
  const duration=await detectAudioDuration(file,parsed.duration);
  const song=await buildUltraStarSong({
    parsed,audio:file,filename:folder+'/song.txt',licenseText,
    origin:'https://github.com/UltraStar-Deluxe/songs/tree/master/'+folder.split('/').map(encodeURIComponent).join('/'),
    fingerprintId:'repertoire:'+item.id,audioDuration:duration
  });
  await save(song);
  onProgress('Gravada no aparelho: '+song.title);
  return {status:'imported',title:song.title,artist:song.artist,bytes:bytes.length};
}
