import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi, isMidiName, midiLyricsToLrc } from '../src/midi.js';
function tag(text){return [...text].map(x=>x.charCodeAt(0));}
function event(delta, bytes) {
 const q=[];let n=delta;
 do {q.unshift(n & 127);n>>=7;}while(n);
 for(let i=0;i<q.length-1;i++)q[i]|=128;
 return [...q,...bytes];
}
function meta(delta,type,text) {
 const bytes=tag(text);
 return event(delta,[255,type,bytes.length,...bytes]);
}
function songMidi() {
 const track=[
  ...event(0,[255,81,3,7,161,32]),
  ...meta(0,3,'Vocal'),
  ...meta(0,5,'\\Oi '),
  ...event(0,[192,0]),
  ...event(0,[144,60,100]),
  ...event(480,[128,60,0]),
  ...meta(0,5,'/Mundo'),
  ...event(0,[255,47,0])
 ];
 const data=new Uint8Array(14+8+track.length);
 data.set(tag('MThd'),0);
 data.set([0,0,0,6,0,0,0,1,1,224],4);
 data.set(tag('MTrk'),14);
 const size=track.length;
 data.set([(size>>>24)&255,(size>>>16)&255,(size>>>8)&255,size&255],18);
 data.set(track,22);
 return data;
}
test('identifica MIDI e KAR sem confundir MP3',()=>{
 assert.ok(isMidiName('musica.MID'));assert.ok(isMidiName('meu.kar'));
 assert.ok(isMidiName('faixa.midi'));assert.equal(isMidiName('faixa.mp3'),false);
});
test('lê notas e letras de MIDI/KAR sem rede',()=>{
 const song=parseMidi(songMidi());
 assert.equal(song.format,0);
 assert.equal(song.noteCount,1);
 assert.equal(song.events[0].midi,60);
 assert.ok(Math.abs(song.events[0].dur-.5)<.001);
 assert.equal(song.bpm,120);
 assert.equal(song.lines.length,2);
 assert.equal(song.lines[0].text,'Oi');
 assert.equal(song.lines[1].text,'Mundo');
 assert.match(midiLyricsToLrc(song.lines),/\[00:00.50\]Mundo/);
});
test('recusa arquivo inválido ou corrompido',()=>{
 assert.throws(()=>parseMidi(new Uint8Array(20)),/Formato inválido/);
 const truncated=songMidi().slice(0,24);
 assert.throws(()=>parseMidi(truncated),/truncado|corrompida|incompleto/);
});
