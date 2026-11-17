import test from 'node:test';
import assert from 'node:assert/strict';
import { SampledMidiAudioEngine, programsInMidi, isFluidR3Preset } from '../src/soundfont-audio.js';

function midiFixture(){
  const data=new Uint8Array([
    ...Array.from('MThd').map(c=>c.charCodeAt(0)),
    0,0,0,6, 0,0, 0,1, 1,224,
    ...Array.from('MTrk').map(c=>c.charCodeAt(0)),
    0,0,0,16,
    0,0xc0,0, 0,0x90,60,100, 0x83,0x60,0x80,60,0, 0,0xff,0x2f,0
  ]);
  return data.buffer;
}

test('Preset permitido é FluidR3, não banco de origem desconhecida',()=>{
  assert.ok(isFluidR3Preset('0000_FluidR3_GM'));
  assert.ok(isFluidR3Preset('0000_FluidR3'));
  assert.ok(isFluidR3Preset('0000_FluidR3Mono'));
  assert.equal(isFluidR3Preset('0000_UnknownBank'),false);
  assert.equal(isFluidR3Preset('FluidR3_extra'),false);
});

test('Mapeamento General MIDI usa programas 1..128 e bateria -1',()=>{
  const parsed={events:[
    {channel:0,program:0},{channel:2,program:41},
    {channel:2,program:41},{channel:9,program:0}
  ]};
  assert.deepEqual(programsInMidi(parsed),[-1,1,42]);
  assert.deepEqual(programsInMidi(parsed,{drums:false}),[1,42]);
});

test('Motor amostrado carrega arquivo MIDI local e controla reprodução',async()=>{
  const prior=globalThis.MidiAudioPlayer;
  const calls=[];
  class MockPlayer{
    constructor(options){calls.push(['construct',options.endpoint,options.preferred]);this.volume=options.volume;}
    async getProgramInstruments(p){calls.push(['program',p]);return [{id:'0000_FluidR3_GM'}];}
    async load(bytes){assert.ok(bytes instanceof ArrayBuffer);calls.push(['load',bytes.byteLength]);}
    async play(){calls.push(['play']);return true;}
    async pause(){calls.push(['pause']);}
    getCurrentTick(){return 480;}
    ticksToSeconds(from,to){return (to-from)/960;}
    async stop(){calls.push(['stop']);}
    async close(){calls.push(['close']);}
  }
  globalThis.MidiAudioPlayer=MockPlayer;
  try{
    const sound=new SampledMidiAudioEngine();
    const midi=midiFixture();
    const parsed=await sound.start({audioBlob:{arrayBuffer:async()=>midi}},{volume:.4});
    assert.equal(parsed.noteCount,1);
    assert.equal(sound.active,true);
    assert.ok(Math.abs(sound.position()-.5)<.001);
    sound.setVolume(.9);
    assert.equal(sound.player.volume,.9);
    await sound.pause();await sound.resume();sound.stop();
    assert.equal(sound.player,null);
    assert.ok(calls.some(x=>x[0]==='load'));
  }finally{globalThis.MidiAudioPlayer=prior;}
});

test('Sem FluidR3 falha de forma explícita e não baixa presets desconhecidos',async()=>{
  const old=globalThis.MidiAudioPlayer;
  let loaded=false;
  globalThis.MidiAudioPlayer=class {
    async getProgramInstruments(){return [{id:'0000_Unknown'}];}
    async load(){loaded=true;}
    async stop(){}
    async close(){}
  };
  try{
    const sound=new SampledMidiAudioEngine();
    await assert.rejects(sound.start({audioBlob:{arrayBuffer:async()=>midiFixture()}}),/FluidR3/);
    assert.equal(loaded,false);
  }finally{globalThis.MidiAudioPlayer=old;}
});
