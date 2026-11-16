import test from 'node:test';
import assert from 'node:assert/strict';
import { originals, createOriginalSong, midiToHz, hzToMidi, formatDuration } from '../src/songs.js';
import { pitchQuality, ScoreSession, expectedWordAt, rankFromScore } from '../src/scoring.js';
import { detectPitch } from '../src/pitch.js';
import { parseLrc, parseNoteMap, addNotesToLines } from '../src/importer.js';

test('catálogo original completo e sincronizado', () => {
 assert.equal(originals.length, 4);
 for(const song of originals) {
  assert.equal(song.lines.length,12);
  assert.ok(song.duration >= song.lines.at(-1).end);
  assert.ok(song.lines.every(line => line.words.length >= 6));
  for(const line of song.lines) {
   assert.ok(line.start >= 0 && line.end > line.start);
   for(const word of line.words) {
    assert.ok(word.start >= line.start && word.end <= line.end + 0.00001);
    assert.ok(Number.isFinite(word.midi));
   }
  }
 }
});
test('MIDI e frequência convertem com precisão', () => {
 for(const midi of [48,60,65,69,72,84]) assert.ok(Math.abs(hzToMidi(midiToHz(midi)) - midi) < 1e-9);
 assert.equal(formatDuration(67.9),'1:07');
});
test('YIN reconhece notas reais (82 a 700 Hz) com erro inferior a 15 cents', () => {
 const sampleRate = 44100;
 for(const hz of [82.41,110,146.83,220,261.63,329.63,440,523.25,659.25,698.46]) {
  const pcm = Float32Array.from({length:4096},(_,i) => 0.2*Math.sin(2*Math.PI*hz*i/sampleRate));
  const result = detectPitch(pcm,sampleRate);
  assert.ok(result.hz,`sem detecção em ${hz} Hz`);
  const cents = Math.abs(1200*Math.log2(result.hz/hz));
  assert.ok(cents < 15,`${hz}: detectado ${result.hz}, erro ${cents} cents`);
  assert.ok(result.clarity > .7);
 }
});
test('YIN ignora silêncio e sinal muito fraco', () => {
 assert.equal(detectPitch(new Float32Array(4096),44100).hz,null);
 const pcm = Float32Array.from({length:4096},(_,i)=> 0.002*Math.sin(2*Math.PI*440*i/44100));
 assert.equal(detectPitch(pcm,44100).hz,null);
});
test('pontuação mede afinação, não inventa pontuação sem voz', () => {
 assert.equal(pitchQuality(null,69,1),0);
 assert.equal(pitchQuality(0,69,1),0);
 assert.equal(pitchQuality(440,69,.1),0);
 assert.ok(pitchQuality(440,69,1) > .99);
 assert.ok(pitchQuality(493.88,69,1) < .5);
 assert.ok(pitchQuality(220,69,1,true) > .99);
 assert.ok(pitchQuality(220,69,1,false) < .05);
});
test('sessão de pontuação e combos sem dados falsos', () => {
 const song=originals[0];
 const s = new ScoreSession(song);
 assert.equal(s.score,0);
 const word= song.lines[0].words[0];
 const time=(word.start+word.end)/2;
 assert.ok(expectedWordAt(song,time)?.word);
 const expected=midiToHz(word.midi);
 for(let i=0;i<5;i++) s.sample(time+i*0.0001,{hz:expected,clarity:.99});
 s.sample(song.lines[0].end+0.1,{hz:null,clarity:0});
 const result=s.finish();
 assert.ok(result.score>95000);
 assert.equal(result.coverage,100);
 assert.equal(result.combo,1);
 assert.equal(result.hitWords,1);
 assert.equal(result.rated,true);
});
test('sessão com microfone em silêncio retorna zero', () => {
 const s=new ScoreSession(originals[0]);
 const word=originals[0].lines[0].words[0];
 s.sample(word.start+0.02,{hz:null,clarity:0});
 s.sample(word.start+0.12,{hz:null,clarity:0});
 assert.equal(s.finish().score,0);
});
test('analisador LRC suporta tags repetidas, offset e centésimos', () => {
 const lines=parseLrc('[ar:Autor]\n[offset:+200]\n[00:02.50][00:04.50]Olá mundo\n[00:07.000]Próxima linha',12);
 assert.equal(lines.length,3);
 assert.ok(Math.abs(lines[0].start-2.7)<1e-7);
 assert.equal(lines[0].text,'Olá mundo');
 assert.equal(lines[1].words.length,2);
 assert.ok(Math.abs(lines[2].end-12)<1e-7);
});
test('mapa de notas rejeita valores incorretos e sobreposição', () => {
 assert.throws(()=>parseNoteMap([{start:2,end:1,midi:60}]));
 assert.throws(()=>parseNoteMap([{start:0,end:2,midi:60},{start:1,end:3,midi:62}]));
 assert.throws(()=>parseNoteMap([{start:1,end:4,midi:110}]));
 const notes=parseNoteMap([{start:0,end:2,midi:60},{start:2,end:4,midi:62}]);
 const lines=parseLrc('[00:00]Olá mundo\n[00:04]Fim',6);
 const annotated=addNotesToLines(lines,notes);
 assert.equal(annotated[0].words[0].midi,60);
 assert.equal(annotated[0].words[1].midi,62);
});
test('ranking de notas',()=>{
 assert.equal(rankFromScore(92000).level,'S');
 assert.equal(rankFromScore(76000).level,'A');
 assert.equal(rankFromScore(55000).level,'B');
 assert.equal(rankFromScore(30000).level,'C');
 assert.equal(rankFromScore(29000).level,'D');
});
