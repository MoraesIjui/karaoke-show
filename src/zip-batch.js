import { inspectZip, extractZipEntry } from './zip-reader.js';
import { parseMidi } from './midi.js';

/** Converte nome "Artista_-_Música.kar" em metadados legíveis. */
export function guessKaraokeMetadata(filename) {
  const basename=String(filename||'').split(/[\\/]/).pop()||'';
  const withoutExt=basename.replace(/\.(kar|midi|mid)$/i,'');
  const pretty=withoutExt.replace(/_/g,' ').replace(/\s+/g,' ').trim();
  const split=pretty.match(/^(.+?)\s+-\s+(.+)$/);
  const artist=(split?split[1]:'Artista desconhecido').slice(0,80);
  const title=(split?split[2]:pretty).slice(0,80);
  return { artist, title: title||'Música sem título' };
}
function normalize(value) {
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
}
export function songNameKey(song) {
  return normalize(song.artist)+'|'+normalize(song.title);
}
function fingerprint(entry) {
  return 'zip-crc32:'+entry.checksum.toString(16).padStart(8,'0')+':'+entry.size;
}
const summary=(name,status,reason='')=>({name,status,reason});

/**
 * Descompacta e valida os MIDI/KAR de um ZIP, um a um.
 * save(song) deve gravar o arquivo no IndexedDB. Não há uploads de rede.
 * Arquivos MK1 e ALB nunca são convertidos ou gravados como MIDI.
 */
export async function importKaraokeZip(file,{existingSongs=[],save,onProgress=()=>{}}={}) {
  if(!file || typeof file.arrayBuffer!=='function')throw Error('Selecione um arquivo ZIP válido.');
  if(typeof save!=='function')throw Error('O armazenamento local não está configurado.');
  if(file.size>100*1024*1024)throw Error('ZIP maior que 100 MB. Divida o acervo em partes.');
  const buffer=await file.arrayBuffer();
  const archive=new Uint8Array(buffer);
  const entries=inspectZip(archive);
  const report={
    fileName:file.name||'Músicas.zip',
    total:entries.length,compatible:entries.filter(e=>e.kind==='midi').length,
    imported:0,duplicates:0,unsupportedMK1:0,unsupportedALB:0,
    ignored:0,failed:0,items:[]
  };
  const contentKeys=new Set(existingSongs.map(s=>s.importFingerprint).filter(Boolean));
  const nameKeys=new Set(existingSongs.map(songNameKey));
  const relevant=entries.filter(entry=>entry.kind==='midi').length;
  let processed=0;
  onProgress({ ...report, processed, relevant, current:'' });
  for(const entry of entries){
    if(entry.kind==='mk1'){
      report.unsupportedMK1++;
      report.items.push(summary(entry.name,'mk1','Formato Microke não suportado.'));
      continue;
    }
    if(entry.kind==='alb'){
      report.unsupportedALB++;
      report.items.push(summary(entry.name,'alb','Índice Microke, não é uma música.'));
      continue;
    }
    if(entry.kind!=='midi'){
      report.ignored++;
      report.items.push(summary(entry.name,'ignored','Outro tipo de arquivo.'));
      continue;
    }
    processed++;
    const named=guessKaraokeMetadata(entry.name);
    const key=songNameKey(named),hash=fingerprint(entry);
    if(nameKeys.has(key)||contentKeys.has(hash)){
      report.duplicates++;
      report.items.push(summary(entry.name,'duplicate','Música já importada neste aparelho.'));
    } else {
      try {
        const bytes=await extractZipEntry(archive,entry);
        const midi=parseMidi(bytes);
        // Mantém o conteúdo local e o nome original para futuras verificações.
        const filename=entry.name.split(/[\\/]/).pop()||'musica.kar';
        const audio=new File([bytes],filename,{type:'audio/midi'});
        const song={
          id:'import-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+processed),
          source:'import',title:named.title,artist:named.artist,
          genre:'Karaokê KAR',mood:'ZIP local',bpm:midi.bpm,root:48,
          accent:'#26bfcb',glow:'#7962ff',icon:'♫',duration:midi.duration,
          lines:midi.lines,audioBlob:audio,midi:true,
          importFingerprint:hash,importFilename:entry.name
        };
        await save(song);
        report.imported++;
        nameKeys.add(key);contentKeys.add(hash);
        report.items.push(summary(entry.name,'imported','OK · '+midi.noteCount+' notas · '+midi.lines.length+' linhas de letra.'));
      } catch(error){
        report.failed++;
        report.items.push(summary(entry.name,'failed',error?.message||'Falha ao importar.'));
      }
    }
    onProgress({ ...report, processed, relevant, current:entry.name });
    if(processed%4===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  onProgress({ ...report, processed, relevant, current:'Concluído' });
  return report;
}
