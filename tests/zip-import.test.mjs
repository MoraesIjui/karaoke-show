import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { inspectZip,extractZipEntry,crc32 } from '../src/zip-reader.js';
import { importKaraokeZip,guessKaraokeMetadata } from '../src/zip-batch.js';

// Pacote criado nos testes sem utilizar músicas protegidas de terceiros.
function fixtureMidi(){
  const events=Buffer.from([
    0,0x90,60,96,
    0x83,0x60,0x80,60,0,
    0,0xff,0x2f,0
  ]);
  return Buffer.concat([
    Buffer.from('MThd'),Buffer.from([0,0,0,6,0,0,0,1,1,224]),
    Buffer.from('MTrk'),Buffer.from([0,0,0,events.length]),events
  ]);
}
function makeZip(files) {
  const locals=[],centrals=[];
  let at=0;
  for(const file of files) {
    const name=Buffer.from(file.name,'utf8');
    const raw=Buffer.from(file.data);
    const method=file.method??8;
    const packed=method===8?deflateRawSync(raw):raw;
    const check=crc32(raw);
    const l=Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50,0);
    l.writeUInt16LE(20,4);
    l.writeUInt16LE(0x800,6);
    l.writeUInt16LE(method,8);
    l.writeUInt32LE(check,14);
    l.writeUInt32LE(packed.length,18);
    l.writeUInt32LE(raw.length,22);
    l.writeUInt16LE(name.length,26);
    locals.push(l,name,packed);
    const c=Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50,0);
    c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
    c.writeUInt16LE(0x800,8);c.writeUInt16LE(method,10);
    c.writeUInt32LE(check,16);c.writeUInt32LE(packed.length,20);
    c.writeUInt32LE(raw.length,24);c.writeUInt16LE(name.length,28);
    c.writeUInt32LE(at,42);
    centrals.push(c,name);
    at+=l.length+name.length+packed.length;
  }
  const central=Buffer.concat(centrals),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);
  end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(central.length,12);end.writeUInt32LE(at,16);
  return Buffer.concat([...locals,central,end]);
}
const midi=fixtureMidi();

test('ZIP: reconhece pastas, KAR/MID, MK1 e ALB',()=>{
  const archive=makeZip([
    {name:'244 Musicas/Engenheiros_do_Hawaii_-_Infinita_Highway.kar',data:midi},
    {name:'244 Musicas/arquivo.mk1',data:Buffer.from('microke')},
    {name:'244 Musicas/microke.alb',data:Buffer.from('indice')}
  ]);
  const entries=inspectZip(archive);
  assert.equal(entries.length,3);
  assert.deepEqual(entries.map(x=>x.kind),['midi','mk1','alb']);
  assert.equal(entries[0].size,midi.length);
});

test('ZIP: descompacta deflate e sem compactação com integridade',async()=>{
  for(const method of [0,8]){
    const zip=makeZip([{name:'Artista_-_Canção.kar',data:midi,method}]);
    const [entry]=inspectZip(zip);
    const output=await extractZipEntry(zip,entry);
    assert.deepEqual(Buffer.from(output),midi);
  }
});

test('ZIP: lista arquivo alterado como falha CRC32',async()=>{
  const zip=makeZip([{name:'teste.kar',data:midi,method:0}]);
  const entry=inspectZip(zip)[0];
  const bad=Buffer.from(zip);
  bad[entry.offset+30+Buffer.from(entry.name).length+7]^=0xff;
  await assert.rejects(extractZipEntry(bad,entry),/CRC32/);
});

test('ZIP: importa uma vez, preserva áudio local, ignora Microke e impede duplicados',async()=>{
  const zip=makeZip([
    {name:'pacote/Engenheiros_do_Hawaii_-_Infinita_Highway.kar',data:midi},
    {name:'pacote/Outra_pasta/Cópia_da_mesma_música.kar',data:midi},
    {name:'pacote/Arquivo_Proprietário.mk1',data:Buffer.from('Microke')},
    {name:'pacote/microke.alb',data:Buffer.from('index')},
    {name:'pacote/Corrompido.kar',data:Buffer.from('not a midi')}
  ]);
  const file=new File([zip],'pacote.zip',{type:'application/zip'});
  const saved=[];let progress=null;
  const first=await importKaraokeZip(file,{save:async s=>{saved.push(s);},onProgress:s=>progress=s});
  assert.equal(first.total,5);
  assert.equal(first.compatible,3);
  assert.equal(first.imported,1);
  assert.equal(first.duplicates,1);
  assert.equal(first.unsupportedMK1,1);
  assert.equal(first.unsupportedALB,1);
  assert.equal(first.failed,1);
  assert.equal(saved.length,1);
  assert.equal(saved[0].title,'Infinita Highway');
  assert.equal(saved[0].artist,'Engenheiros do Hawaii');
  assert.equal(saved[0].midi,true);
  assert.ok(saved[0].audioBlob instanceof File);
  assert.equal(progress.processed,3);
  const again=await importKaraokeZip(file,{existingSongs:saved,save:async()=>{throw Error('Não deveria gravar duplicados');}});
  assert.equal(again.imported,0);
  assert.equal(again.duplicates,2);
});

test('ZIP: nomes são convertidos em título e artista',()=>{
  assert.deepEqual(guessKaraokeMetadata('pasta/The_Cranberries_-_Zombie.kar'),
    {artist:'The Cranberries',title:'Zombie'});
  assert.equal(guessKaraokeMetadata('SEM_ARTISTA.KAR').title,'SEM ARTISTA');
});

test('ZIP: rejeita arquivo sem índice e protege contra entradas falsas gigantes',()=>{
  assert.throws(()=>inspectZip(Buffer.from('teste')),/incompleto/);
  const zip=makeZip([{name:'Teste.kar',data:midi}]);
  const centralOffset=zip.readUInt32LE(zip.length-6);
  zip.writeUInt32LE(26*1024*1024,centralOffset+24);
  const entries=inspectZip(zip);
  assert.equal(entries[0].reason,'Arquivo MIDI acima de 25 MB.');
  assert.rejects(extractZipEntry(zip,entries[0]),/25 MB/);
});
