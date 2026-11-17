/**
 * Leitor UltraStar TXT (formatos sem versão e v2 básicos).
 * Baseado na especificação aberta: https://github.com/UltraStar-Deluxe/format
 * Notas são semitons relativos ao Dó central (MIDI 60); tempos são
 * GAP/1000 + beat * 60/(BPM*4), NÃO beat * 60/BPM.
 */
const MAX_TEXT = 1024*1024;
const MAX_NOTES = 25000;
const MAX_SECONDS = 30*60;

function numberValue(text){
  return Number(String(text).trim().replace(',','.'));
}
function safeMediaName(name) {
  const value=String(name||'').trim().replace(/\\/g,'/');
  if(!value || value.length>250 || value.startsWith('/') || /^[a-z]+:/i.test(value) || value.includes('?') || value.includes('#'))
    throw Error('O UltraStar usa referência de áudio inválida.');
  const segments=value.split('/');
  if(segments.some(x=>!x || x==='.' || x==='..'))
    throw Error('O UltraStar não pode acessar pastas externas.');
  if(!/\.(mp3|ogg|wav|m4a)$/i.test(value))
    throw Error('O UltraStar requer MP3, OGG, WAV ou M4A.');
  return value;
}
function intoLine(items){
  if(!items.length)return null;
  const start=items[0].start,end=Math.max(...items.map(x=>x.end));
  const display=items.map(x=>x.raw.replace(/~/g,'')).join('').replace(/\s+/g,' ').trim();
  if(!display)return null;
  return {
    start,end,text:display.slice(0,600),
    words:items.map(x=>({
      text:x.raw.trim().replace(/~/g,'') || '♪',
      start:x.start,end:x.end,
      ...(Number.isFinite(x.midi)?{midi:x.midi}:{}),
      ...(x.golden?{golden:true}:{}),
      type:x.type
    }))
  };
}
export function parseUltraStar(text) {
  if(typeof text!=='string'||text.length>MAX_TEXT||!text.trim())
    throw Error('Arquivo UltraStar TXT vazio ou acima de 1 MB.');
  const header={};
  const lines=[],pieces=[];
  let noteCount=0,voice=1,duet=false,ended=false;
  const flush=()=>{
    const line=intoLine(pieces);
    if(line)lines.push(line);
    pieces.length=0;
  };
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n|\r/g)){
    const line=raw.trim();
    if(!line)continue;
    if(line.startsWith('#')){
      const pos=line.indexOf(':');
      if(pos>1)header[line.slice(1,pos).trim().toUpperCase()]=line.slice(pos+1).trim();
      continue;
    }
    if(line==='E'){ended=true;break;}
    if(/^P[1-9]$/.test(line)){
      voice=Number(line[1]);
      if(voice!==1)duet=true;
      continue;
    }
    if(line.startsWith('-')){if(voice===1)flush();continue;}
    const match=raw.match(/^\s*([:*FGR])\s+(-?\d+)\s+(\d+)\s+(-?\d+)\s(.*)$/i);
    if(!match)continue;
    if(voice!==1)continue;
    const [,typeValue,beatValue,lengthValue,pitchValue,rawText]=match;
    const type=typeValue.toUpperCase();
    const beat=Number(beatValue),length=Number(lengthValue),pitch=Number(pitchValue);
    if(!Number.isSafeInteger(beat)||!Number.isSafeInteger(length)||!Number.isSafeInteger(pitch)||length<=0 || Math.abs(beat)>1000000)
      throw Error('Notas UltraStar inválidas.');
    pieces.push({type,beat,length,pitch,raw:rawText,golden:type==='*'});
    if(++noteCount>MAX_NOTES)throw Error('UltraStar possui notas demais.');
  }
  flush();
  if(duet)throw Error('Este pacote possui dueto. O leitor atual aceita apenas faixas solo.');
  if(String(header.RELATIVE||'').toLowerCase()==='yes')
    throw Error('UltraStar RELATIVE ainda não é suportado.');
  const bpm=numberValue(header.BPM),gap=header.GAP===undefined?0:numberValue(header.GAP);
  if(!Number.isFinite(bpm)||bpm<=0||bpm>1800||!Number.isFinite(gap)||Math.abs(gap)>MAX_SECONDS*1000)
    throw Error('BPM ou GAP UltraStar inválido.');
  const audioFile=safeMediaName(header.AUDIO||header.MP3||header.INSTRUMENTAL);
  if(!header.TITLE||!header.ARTIST||!lines.length)
    throw Error('UltraStar requer TITLE, ARTIST e notas com letra.');
  const durationPerBeat=60/(bpm*4);
  // Recalcular com o tempo real, preservando intervalos sem canto.
  for(const line of lines){
    // Extração antes do mapeamento: stored via note metadata on each word.
    // Items são transferidos com suas propriedades beat/length abaixo.
    // Temporarily: reconstruct from ordered source note lines collected separately.
  }
  // See timedLines below: reparse note events in order for strict alignment.
  const timedLines=[];
  let notes=[],currentVoice=1;
  const makeTimed=()=>{
    if(!notes.length)return;
    const items=notes.map(n=>{
      const start=Math.max(0,gap/1000+n.beat*durationPerBeat);
      const end=Math.max(start+.04,gap/1000+(n.beat+n.length)*durationPerBeat);
      const midi=60+n.pitch;
      return {start,end,raw:n.raw,type:n.type,golden:n.golden,
        midi: (n.type===':'||n.type==='*')&&midi>=24&&midi<=108 ? midi : undefined};
    });
    const item=intoLine(items);
    if(item)timedLines.push(item);
    notes=[];
  };
  let count=0;
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n|\r/g)){
    const line=raw.trim();
    if(line==='E')break;
    if(/^P[1-9]$/.test(line)){currentVoice=Number(line[1]);continue;}
    if(line.startsWith('-')){if(currentVoice===1)makeTimed();continue;}
    const match=raw.match(/^\s*([:*FGR])\s+(-?\d+)\s+(\d+)\s+(-?\d+)\s(.*)$/i);
    if(!match||currentVoice!==1)continue;
    const type=match[1].toUpperCase();
    notes.push({type,beat:Number(match[2]),length:Number(match[3]),pitch:Number(match[4]),raw:match[5],golden:type==='*'});
    if(++count>MAX_NOTES)break;
  }
  makeTimed();
  if(!timedLines.length)throw Error('UltraStar não possui versos reproduzíveis.');
  const endTime=Math.max(...timedLines.map(l=>l.end));
  if(endTime>MAX_SECONDS)throw Error('UltraStar acima do limite de 30 minutos.');
  return {
    title:header.TITLE.slice(0,80),artist:header.ARTIST.slice(0,80),
    genre:(header.GENRE||'UltraStar').slice(0,80),language:(header.LANGUAGE||'').slice(0,60),
    audioFile,bpm,gapMs:gap,
    duration:Math.max(1,endTime+2),lines:timedLines,
    noteCount:count,version:header.VERSION||'unversioned',
    source:'UltraStar TXT',hasGold:timedLines.some(x=>x.words.some(w=>w.golden))
  };
}
export function safeUltraStarAudioName(name){return safeMediaName(name);}
