import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUltraStar,safeUltraStarAudioName} from '../src/ultrastar.js';
import {importUltraStarZip,installOpenTestSong,OPEN_TEST_SONGS,openTestSongUrls} from '../src/ultrastar-import.js';
import {crc32} from '../src/zip-reader.js';

const sample=[
 '#TITLE:Minha música','#ARTIST:Artista Teste','#GENRE:Pop','#MP3:audio.ogg','#BPM:320','#GAP:675',
 ': 0 6 -4 Olá',': 8 3 -4  mundo','* 12 5 -2 !','- 20','F 24 4 0 Só','R 28 5 0  falar','E'
].join('\n');
const fakeAudio=Buffer.from('OggS-ARQUIVO-AUDIO-DE-TESTE');

function mkzip(files){
  const locals=[],central=[];let offset=0;
  for(const [path,value] of files){
    const name=Buffer.from(path,'utf8'),content=Buffer.from(value);
    const local=Buffer.alloc(30),dir=Buffer.alloc(46);
    const sum=crc32(content);
    local.writeUInt32LE(0x04034b50,0);
    local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);
    local.writeUInt32LE(sum,14);local.writeUInt32LE(content.length,18);
    local.writeUInt32LE(content.length,22);local.writeUInt16LE(name.length,26);
    dir.writeUInt32LE(0x02014b50,0);
    dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);
    dir.writeUInt16LE(0x800,8);dir.writeUInt32LE(sum,16);
    dir.writeUInt32LE(content.length,20);dir.writeUInt32LE(content.length,24);
    dir.writeUInt16LE(name.length,28);dir.writeUInt32LE(offset,42);
    locals.push(local,name,content);central.push(dir,name);
    offset+=local.length+name.length+content.length;
  }
  const catalog=Buffer.concat(central),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);
  end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(catalog.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,catalog,end]);
}

test('UltraStar converte BPM/GAP e preserva notas para pontuação',()=>{
  const song=parseUltraStar(sample);
  assert.equal(song.title,'Minha música');
  assert.equal(song.lines.length,2);
  assert.equal(song.noteCount,5);
  assert.equal(song.lines[0].words[0].midi,56);
  assert.equal(song.lines[0].words[2].midi,58);
  assert.equal(song.lines[0].words[2].golden,true);
  assert.ok(Math.abs(song.lines[0].start-.675)<.00001);
  assert.ok(Math.abs(song.lines[0].words[1].start-(.675+8*60/(320*4)))<.00001);
  assert.equal(song.lines[0].text,'Olá mundo !');
  assert.equal(song.lines[1].words[0].midi,undefined);
});
test('UltraStar suporta vírgula em BPM e #AUDIO',()=>{
  const song=parseUltraStar(sample.replace('#BPM:320','#BPM:320,5').replace('#MP3:audio.ogg','#AUDIO:audio.ogg'));
  assert.equal(song.bpm,320.5);assert.equal(song.audioFile,'audio.ogg');
});
test('UltraStar recusa caminho externo, dueto e RELATIVE',()=>{
  assert.throws(()=>safeUltraStarAudioName('../../segredo.mp3'),/pastas externas/);
  assert.throws(()=>parseUltraStar(sample.replace('audio.ogg','../secret.ogg')),/pastas externas/);
  assert.throws(()=>parseUltraStar(sample.replace('E','P2\n: 80 2 1  outra\nE')),/dueto/);
  assert.throws(()=>parseUltraStar(sample.replace('#GAP:675','#GAP:675\n#RELATIVE:yes')),/RELATIVE/);
});
test('UltraStar importa ZIP com áudio+licença e impede repetidos',async()=>{
  const zip=mkzip([
    ['pack/Minha Musica/song.txt',sample],
    ['pack/Minha Musica/audio.ogg',fakeAudio],
    ['pack/Minha Musica/license.txt','CC BY-NC 3.0 — exemplo de teste']
  ]);
  const f=new File([zip],'test-ultrastar.zip',{type:'application/zip'});
  const stored=[];let progress;
  const first=await importUltraStarZip(f,{save:async x=>stored.push(x),onProgress:p=>progress=p});
  assert.equal(first.imported,1);assert.equal(first.failed,0);assert.equal(first.candidates,1);
  assert.equal(stored.length,1);assert.equal(stored[0].midi,false);
  assert.equal(stored[0].ultraStar,true);
  assert.ok(stored[0].audioBlob instanceof File);
  assert.match(stored[0].attribution,/BY-NC/);
  assert.equal(stored[0].lines[0].words[0].midi,56);
  assert.equal(progress.imported,1);
  const twice=await importUltraStarZip(f,{existingSongs:stored,save:async()=>{throw Error('não deve gravar duplicada');}});
  assert.equal(twice.imported,0);assert.equal(twice.duplicates,1);
});
test('UltraStar informa falta de áudio e arquivo inseguro',async()=>{
  const input=mkzip([['p/a/song.txt',sample],['p/b/song.txt',sample.replace('audio.ogg','../../fora.ogg')]]);
  const report=await importUltraStarZip(new File([input],'error.zip'),{save:async()=>{throw Error('não gravar');}});
  assert.equal(report.imported,0);assert.equal(report.failed,2);
  assert.ok(report.items.some(x=>x.reason.includes('mesma pasta')));
});
test('Demos têm URLs fixas no repositório oficial',()=>{
  assert.equal(OPEN_TEST_SONGS.length,2);
  for(const item of OPEN_TEST_SONGS){
    assert.match(item.license,/CC BY-NC/);
    const urls=openTestSongUrls(item);
    assert.ok(urls.song.startsWith('https://raw.githubusercontent.com/UltraStar-Deluxe/songs/'));
    assert.ok(urls.license.endsWith('license.txt'));
  }
  assert.throws(()=>openTestSongUrls({id:'fake',folder:'outro'}),/não autorizada/);
});
test('Instalação de música CC é explícita e preserva atribuição',async()=>{
  const previous=globalThis.fetch;let calls=[];
  globalThis.fetch=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('/song.txt'))
      return new Response(sample.replace('Minha música','Monkey Shines').replace('Artista Teste','Jonathan Coulton').replace('audio.ogg','audio.mp3'));
    if(String(url).endsWith('/license.txt'))
      return new Response('Creative Commons — http://creativecommons.org/licenses/by-nc/3.0/ — Jonathan Coulton');
    return new Response(Buffer.from('ID3-EXEMPLO'),{status:200});
  };
  try{
    let saved;
    const done=await installOpenTestSong('monkey-shines',{save:async s=>saved=s});
    assert.equal(done.status,'imported');
    assert.ok(saved.audioBlob instanceof File);
    assert.match(saved.attribution,/Jonathan Coulton/);
    assert.equal(calls.length,3);
    const again=await installOpenTestSong('monkey-shines',{existingSongs:[saved],save:async()=>{throw Error('duplicada');}});
    assert.equal(again.status,'duplicate');assert.equal(calls.length,3);
  }finally{globalThis.fetch=previous;}
});
