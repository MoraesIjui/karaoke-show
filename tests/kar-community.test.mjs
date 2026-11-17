import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKarLyricTokens } from '../src/kar-lyrics.js';
import { gmProfile, sanitizeMidiQuality } from '../src/gm-timbres.js';

test('KAR reconstrói versos e mantém o instante real das palavras',()=>{
  const lines=parseKarLyricTokens([
    {at:0,text:'@TMinha canção'},
    {at:1,text:'\\Bom'},
    {at:1.4,text:' dia'},
    {at:2,text:'/Tudo'},
    {at:2.7,text:' bem'}
  ],4);
  assert.equal(lines.length,2);
  assert.equal(lines[0].text,'Bom dia');
  assert.equal(lines[0].words.length,2);
  assert.equal(lines[0].words[0].start,1);
  assert.equal(lines[0].words[1].start,1.4);
  assert.equal(lines[0].end,2);
  assert.equal(lines[1].text,'Tudo bem');
  assert.equal(lines[1].words[0].start,2);
  assert.equal(lines[1].words[1].start,2.7);
});

test('KAR une sílabas e interpreta retornos de linha',()=>{
  const lines=parseKarLyricTokens([
    {at:0,text:'\\Mi'},
    {at:.2,text:'nha '},
    {at:.4,text:'vida'},
    {at:1.5,text:'\r'},
    {at:1.6,text:'Nova '},
    {at:2,text:'fase'}
  ],3);
  assert.equal(lines.length,2);
  assert.equal(lines[0].text,'Minha vida');
  assert.equal(lines[0].words.length,2);
  assert.equal(lines[0].words[0].start,0);
  assert.equal(lines[0].words[1].start,.4);
  assert.equal(lines[1].text,'Nova fase');
});

test('KAR limita datas ruins e rejeita eventos exagerados',()=>{
  const lines=parseKarLyricTokens([{at:-10,text:'\\Olá'},{at:0.4,text:'/mundo'}],2);
  assert.equal(lines[0].start,0);
  assert.equal(lines[0].text,'Olá');
  assert.throws(()=>parseKarLyricTokens(new Array(20001).fill({at:1,text:'A'})),/Quantidade inválida/);
});

test('Timbres GM e perfis econômicos respeitam instrumentos e limites',()=>{
  for(let i=0;i<128;i++){
    const p=gmProfile(i);
    assert.ok(['triangle','sine','square','sawtooth'].includes(p.wave));
    assert.ok(p.attack>=0 && p.release>0 && p.filter>0);
  }
  assert.equal(gmProfile(-1),gmProfile(0));
  assert.equal(sanitizeMidiQuality('rico'),'rico');
  assert.equal(sanitizeMidiQuality('qualquer'),'equilibrado');
});
