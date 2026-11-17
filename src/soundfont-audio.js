import { parseMidi } from './midi.js';

/**
 * Engine opcional amostrada baseada em MidiAudioPlayer v2.0.3 (MIT).
 * Carrega somente se o usuário escolheu "SoundFont"; no modo offline inicial
 * ou em TV Boxes de baixa memória a engine de osciladores continua disponível.
 * Presets NÃO estão embutidos no APK e são obtidos do catálogo WebAudioFonts.
 */
export const SOUNDFONT_PRESET_ENDPOINT = 'https://webaudiofonts.com/presets/';
const BANKS = ['FluidR3_GM', 'FluidR3Mono', 'FluidR3'];
const MAX_CHANNEL_PRESETS = 18;
const FIRST_LOAD_TIMEOUT = 20000;
const normalizeVolume = v => Math.max(0,Math.min(1,Number(v)||0));

export function isFluidR3Preset(id) {
  return typeof id === 'string' && /_FluidR3(?:_GM|Mono)?$/i.test(id);
}
export function programsInMidi(parsed,{drums=true}={}) {
  const set = new Set();
  for(const event of parsed.events) {
    if(event.channel===9){if(drums)set.add(-1);}
    else set.add((event.program|0)+1); // General MIDI indexado em 1 neste player.
  }
  return [...set].sort((a,b)=>a-b);
}

export class SampledMidiAudioEngine {
  constructor(){
    this.player=null;
    this.active=false;
    this.paused=false;
    this.lastError='';
    this.duration=0;
  }
  async start(song,{volume=.7,reverb=.12,drums=true}={}){
    this.stop();
    const Player=globalThis.MidiAudioPlayer;
    if(typeof Player!=='function')
      throw Error('O módulo SoundFont não está disponível neste aparelho.');
    let content;
    if(song.audioBlob&&typeof song.audioBlob.arrayBuffer==='function'){
      content=await song.audioBlob.arrayBuffer();
    } else if(song.audioUrl){
      const res=await fetch(song.audioUrl,{cache:'no-store'});
      if(!res.ok)throw Error('MIDI privado indisponível ('+res.status+'). Atualize o catálogo.');
      content=await res.arrayBuffer();
    } else throw Error('Arquivo MIDI não encontrado.');
    const parsed=parseMidi(content);
    const programs=programsInMidi(parsed,{drums});
    if(programs.length>MAX_CHANNEL_PRESETS)throw Error('Esta música exige muitos bancos instrumentais para o SoundFont.');
    const player=new Player({
      volume:normalizeVolume(volume),reverb:Math.max(0,Math.min(.35,reverb)),
      endpoint:SOUNDFONT_PRESET_ENDPOINT,
      preferred:BANKS,
      presetRandom:false,
      localCache:true,
      karaoke:false,
      muteExpression:false
    });
    this.player=player;
    try{
      // Catálogo e amostras pertencem a projetos/licenças próprios.
      // Somente FluidR3 é permitido nesta integração; nunca baixar amostras de
      // outra família como fallback silencioso.
      await withTimeout((async()=>{
        for(const program of programs){
          const options=await player.getProgramInstruments(program);
          if(!options.some(item=>isFluidR3Preset(item.id)))
            throw Error('O banco FluidR3 não oferece todos os instrumentos necessários.');
        }
        await player.load(content);
      })(),FIRST_LOAD_TIMEOUT);
      if(this.player!==player)throw Error('Carregamento cancelado.');
      if(!drums){
        // Canal 10 em mensagens MIDI (base 1 neste player).
        try{player.setChannelVolume(10,0);}catch{}
      }
      const ok=await player.play();
      if(ok===false)throw Error('O navegador bloqueou o áudio amostrado.');
      this.active=true;this.paused=false;this.duration=parsed.duration;
      return parsed;
    }catch(error){
      this.lastError=String(error?.message||error);
      this.stop();
      throw error;
    }
  }
  position(){
    const p=this.player;
    if(!p)return 0;
    try{
      const tick=p.getCurrentTick();
      const seconds=p.ticksToSeconds(0,tick);
      return Number.isFinite(seconds)?Math.max(0,seconds):0;
    }catch{return 0;}
  }
  setVolume(value){if(this.player)this.player.volume=normalizeVolume(value);}
  setGuide(){}
  async pause(){if(this.player&&!this.paused){await this.player.pause();this.paused=true;}}
  async resume(){if(this.player&&this.paused){const ok=await this.player.play();if(ok!==false)this.paused=false;}}
  stop(){
    const player=this.player;
    this.player=null;this.active=false;this.paused=false;
    if(player)Promise.resolve().then(()=>player.stop()).catch(()=>{}).then(()=>player.close()).catch(()=>{});
  }
}
function withTimeout(task,ms){
  let timer;
  return Promise.race([
    task,
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tempo de carregamento SoundFont esgotado.')),ms);})
  ]).finally(()=>clearTimeout(timer));
}
