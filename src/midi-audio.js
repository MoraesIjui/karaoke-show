import { midiToHz } from './songs.js';
import { parseMidi } from './midi.js';

/**
 * Instrumental MIDI leve para navegadores e Android WebView.
 * Síntese básica (sem SoundFont): timbres aproximados por osciladores e bateria simples.
 */
export class MidiAudioEngine {
  constructor() {
    this.ctx=null;this.master=null;this.compressor=null;this.events=[];
    this.eventIndex=0;this.startAt=0;this.paused=false;this.timer=null;
    this.voices=new Set();this.noiseBuffer=null;this.active=false;
  }
  async start(song, {volume=.7}={}) {
    this.stop();
    const AC=window.AudioContext||window.webkitAudioContext;
    if (!AC) throw Error('Este aparelho não suporta síntese MIDI com Web Audio.');
    this.ctx=new AC();
    this.master=this.ctx.createGain();
    this.master.gain.value=Math.max(0,Math.min(1,volume))*.48;
    this.compressor=this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value=-14;
    this.compressor.ratio.value=5;
    this.master.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    try {
      await this.ctx.resume();
      let bytes;
      if(song.audioBlob && typeof song.audioBlob.arrayBuffer==='function')bytes=await song.audioBlob.arrayBuffer();
      else if(song.audioUrl){
        const result=await fetch(song.audioUrl,{cache:'no-store'});
        if(!result.ok)throw Error('MIDI indisponível ('+result.status+'). Atualize o catálogo e tente novamente.');
        bytes=await result.arrayBuffer();
      } else throw Error('Arquivo MIDI não encontrado.');
      const parsed=parseMidi(bytes);
      this.events=parsed.events;
      this.eventIndex=0;
      this.startAt=this.ctx.currentTime+.06;
      this.active=true;this.paused=false;
      this.noiseBuffer=this.makeNoise();
      this.schedule();
      this.timer=setInterval(()=>this.schedule(),75);
      return parsed;
    } catch(err) {this.stop();throw err;}
  }
  makeNoise() {
    const buffer=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*.16),this.ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    return buffer;
  }
  schedule() {
    if(!this.ctx || !this.active || this.paused)return;
    const now=this.ctx.currentTime;
    while(this.eventIndex<this.events.length) {
      const e=this.events[this.eventIndex];
      const when=this.startAt+e.at;
      if(when>now+.36)break;
      this.eventIndex++;
      if(when<now-.12)continue;
      if(this.voices.size>=42)continue; // Proteção para TV Boxes com CPUs modestas.
      this.play(e,Math.max(now+.002,when));
    }
  }
  play(event,when) {
    const ctx=this.ctx;
    if(!ctx)return;
    const channel=event.channel;
    const midi=event.midi;
    const duration=Math.min(6,Math.max(.035,event.dur));
    const strength=Math.max(.015,Math.min(.22,event.velocity*.13));
    if(channel===9){
      // Canal 10 de General MIDI é percussão.
      if(midi===35||midi===36) {
        this.osc(when,.14,110,'sine',strength*2.2,.003,.12,42);
      } else if(midi===38||midi===40) {
        this.osc(when,.11,185,'triangle',strength,.002,.09);
        this.noise(when,.14,strength*.9,1400);
      } else if(midi>=42&&midi<=59) {
        this.noise(when,.045,strength*.55,5000);
      } else this.osc(when,.1,220+(midi%12)*30,'triangle',strength*.5,.003,.07);
      return;
    }
    let wave='triangle', filter=3000,attack=.018,release=.1;
    const p=event.program;
    if(p<8){wave='triangle';attack=.007;release=.18;}
    else if(p<16){wave='triangle';attack=.015;release=.2;}
    else if(p<24){wave='sine';attack=.035;release=.26;}
    else if(p<32){wave='triangle';attack=.006;release=.12;filter=1800;}
    else if(p<40){wave='sine';attack=.008;release=.1;}
    else if(p<56){wave='sawtooth';attack=.03;release=.17;filter=1400;}
    else if(p<80){wave='triangle';attack=.025;release=.17;}
    else if(p<88){wave='square';attack=.012;release=.09;filter=1400;}
    else if(p<104){wave='sine';attack=.075;release=.28;}
    else {wave='triangle';attack=.02;release=.15;}
    this.osc(when,duration,midiToHz(midi),wave,strength,attack,release,null,filter);
  }
  osc(at,duration,hz,wave,gain,attack,release,sweep,filter) {
    if(!this.ctx)return;
    const ctx=this.ctx, node=ctx.createOscillator(),env=ctx.createGain();
    node.type=wave;
    node.frequency.setValueAtTime(Math.max(26,hz),at);
    if(sweep)node.frequency.exponentialRampToValueAtTime(sweep,at+.1);
    const end=at+duration;
    const peak=at+Math.min(duration/2,attack);
    env.gain.setValueAtTime(.0001,at);
    env.gain.linearRampToValueAtTime(Math.max(.0002,gain),peak);
    env.gain.setValueAtTime(Math.max(.0002,gain),Math.max(peak,end-Math.min(release,duration/2)));
    env.gain.exponentialRampToValueAtTime(.0001,end);
    let lowpass=null;
    if(filter){
      lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=filter;
      node.connect(lowpass);lowpass.connect(env);
    }else node.connect(env);
    env.connect(this.master);
    this.voices.add(node);
    node.onended=()=>{this.voices.delete(node);try{node.disconnect();env.disconnect();lowpass?.disconnect();}catch{}};
    node.start(at);node.stop(end+.002);
  }
  noise(at,duration,gain,freq){
    const ctx=this.ctx;
    if(!ctx)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();
    src.buffer=this.noiseBuffer;filter.type='highpass';filter.frequency.value=freq;
    env.gain.setValueAtTime(Math.max(.0002,gain),at);
    env.gain.exponentialRampToValueAtTime(.0001,at+duration);
    src.connect(filter);filter.connect(env);env.connect(this.master);
    this.voices.add(src);
    src.onended=()=>{this.voices.delete(src);try{src.disconnect();filter.disconnect();env.disconnect();}catch{}};
    src.start(at);src.stop(at+duration);
  }
  position(){return this.ctx?this.ctx.currentTime-this.startAt:0;}
  setVolume(v){if(this.master)this.master.gain.value=Math.max(0,Math.min(1,v))*.48;}
  setGuide(){}
  async pause(){if(this.ctx&&!this.paused){this.paused=true;await this.ctx.suspend();}}
  async resume(){if(this.ctx&&this.paused){await this.ctx.resume();this.paused=false;}}
  stop(){
    if(this.timer)clearInterval(this.timer);
    this.timer=null;this.active=false;
    for(const node of this.voices){try{node.stop();}catch{}}
    this.voices.clear();
    if(this.ctx)this.ctx.close().catch(()=>{});
    this.ctx=null;this.master=null;this.events=[];this.eventIndex=0;this.paused=false;
  }
}
