/**
 * Leitor de Standard MIDI File 0/1 e letras KAR (meta 0x05 / 0x01).
 * Sem bibliotecas externas, downloads automáticos ou acesso a catálogos terceiros.
 */
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_NOTES = 100000;
const MAX_TRACKS = 64;
const readText = (bytes) => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('windows-1252').decode(bytes); }
};
const fourCC = (bytes, pos) => String.fromCharCode(...bytes.slice(pos, pos + 4));
const lyricLine = (bits, nextStart) => {
  const full = bits.map(x => x.text).join('').replace(/\s+/g, ' ').trim();
  if (!full) return null;
  const start = bits[0].at;
  const end = Math.max(start + .2, nextStart);
  const words = full.split(/\s+/);
  return { start, end, text: full, words: words.map((word, i) => ({
    text: word, start: start + (end - start) * i / words.length,
    end: start + (end - start) * (i + 1) / words.length
  })) };
};

export function isMidiName(name = '') { return /\.(mid|midi|kar)$/i.test(String(name)); }

export function parseMidi(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length > MAX_BYTES || bytes.length < 14) throw Error('Arquivo MIDI vazio ou acima de 25 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0;
  const need = n => { if (pos + n > bytes.length) throw Error('Arquivo MIDI truncado.'); };
  const u8 = () => { need(1); return bytes[pos++]; };
  const u16 = () => { need(2); const n=view.getUint16(pos);pos+=2;return n; };
  const u32 = () => { need(4); const n=view.getUint32(pos);pos+=4;return n; };
  const vlq = end => {
    let n = 0;
    for (let i=0; i<4; i++) { if (pos >= end) throw Error('Tempo MIDI incompleto.'); const b=u8(); n=(n<<7)|(b&127); if (!(b&128)) return n; }
    throw Error('Tempo MIDI inválido.');
  };
  if (fourCC(bytes,0)!=='MThd') throw Error('Formato inválido: arquivo não é MIDI padrão (MThd).');
  pos=4; const headerLen=u32();
  if (headerLen<6 || headerLen>256) throw Error('Cabeçalho MIDI inválido.');
  const format=u16(), count=u16(), division=u16();
  if (format>1 || !count || count>MAX_TRACKS || !division || (division&0x8000)) {
    throw Error('Compatível apenas com MIDI formato 0 ou 1 e tempo PPQ.');
  }
  pos=8+headerLen;
  need(0);
  const tempos=[{tick:0, micros:500000}];
  const midiNotes=[], lyricCandidates=[], trackNames=[];
  let maxTick=0, lyricTrack=-1;
  for (let t=0;t<count;t++) {
    need(8);
    if (fourCC(bytes,pos)!=='MTrk') throw Error('Trilha MIDI ausente ou corrompida.');
    pos+=4; const len=u32();
    need(len); const end=pos+len;
    let tick=0,running=0,trackName='',lineCount=0;
    const active=new Map(), channels=Array(16).fill(0);
    const lyrics=[];
    while (pos<end) {
      tick+=vlq(end);
      if (tick>0x1fffffff) throw Error('Arquivo MIDI muito longo.');
      maxTick=Math.max(maxTick,tick);
      const raw=u8();
      let status=raw,first=null;
      if (raw<0x80) {
        if (!running) throw Error('Running status MIDI inválido.');
        status=running; first=raw;
      } else if (raw>=0x80 && raw<=0xEF) running=raw;
      else running=0;
      const data=()=>first!==null?( (v)=>{first=null;return v;})(first):u8();
      if (status===0xff) {
        const kind=u8(), size=vlq(end);
        if (pos+size>end) throw Error('Evento MIDI incompleto.');
        const chunk=bytes.subarray(pos,pos+size);pos+=size;
        if (kind===0x51 && size===3) {
          const micros=(chunk[0]<<16)|(chunk[1]<<8)|chunk[2];
          if (micros>0 && micros<10000000) tempos.push({tick,micros});
        }
        if (kind===0x03) trackName=readText(chunk).slice(0,120);
        if ((kind===0x05 || kind===0x01) && size && size<2048) {
          const text=readText(chunk).replace(/\0/g,'');
          if (!text.startsWith('@') && text.trim()) lyrics.push({tick,text,kind});
        }
        if (kind===0x2f) { pos=end; break; }
      } else if (status===0xf0 || status===0xf7) {
        const size=vlq(end);
        if (pos+size>end) throw Error('Mensagem SysEx truncada.');
        pos+=size;
      } else if (status>=0x80 && status<0xf0) {
        const channel=status&15, cmd=status&0xf0;
        if (cmd===0xC0) { channels[channel]=data(); }
        else if (cmd===0xD0) data();
        else if (cmd===0x80 || cmd===0x90) {
          const note=data(),velocity=data();
          const key=channel*128+note;
          if (cmd===0x90 && velocity>0) {
            if (!active.has(key)) active.set(key,[]);
            active.get(key).push({tick, midi:note, velocity:velocity/127, channel, program:channels[channel], track:t});
          } else {
            const stack=active.get(key);
            const on=stack?.shift();
            if (on && tick>on.tick && midiNotes.length<MAX_NOTES) {
              midiNotes.push({...on,endTick:tick});
            }
          }
        } else if (cmd===0xA0 || cmd===0xB0 || cmd===0xE0) { data();data(); }
        else throw Error('Evento MIDI desconhecido.');
      } else throw Error('Mensagem MIDI não suportada.');
    }
    pos=end;
    trackNames.push(trackName || 'Trilha '+(t+1));
    const usable=lyrics.filter(x => x.kind===0x05 || x.text.startsWith('\\') || x.text.startsWith('/') || lyrics.length>=6);
    if (usable.length>lineCount && usable.length>lyricCandidates.length) {
      lyricTrack=t;
      lyricCandidates.length=0;
      lyricCandidates.push(...usable);
    }
  }
  // Aplica todas as mudanças de andamento do arquivo, incluindo alterações no meio da faixa.
  tempos.sort((a,b)=>a.tick-b.tick);
  const timing=[];
  let prevTick=0, at=0, micros=500000;
  for (const e of tempos) {
    if (e.tick>prevTick) { at+=(e.tick-prevTick)*micros/division/1e6; prevTick=e.tick; }
    micros=e.micros;
    if (timing.length && timing.at(-1).tick===e.tick) timing[timing.length-1]={tick:e.tick,at,micros};
    else timing.push({tick:e.tick,at,micros});
  }
  function seconds(tick) {
    let lo=0,hi=timing.length-1;
    while (lo<hi) {const mid=(lo+hi+1)>>1;if(timing[mid].tick<=tick)lo=mid;else hi=mid-1;}
    const row=timing[lo];
    return row.at + (tick-row.tick)*row.micros/division/1e6;
  }
  const events=midiNotes.map(n=>({
    at:seconds(n.tick),dur:Math.min(25,Math.max(.02,seconds(n.endTick)-seconds(n.tick))),
    midi:n.midi,velocity:n.velocity,channel:n.channel,program:n.program,track:n.track
  })).filter(n=>n.at<1800).sort((a,b)=>a.at-b.at);
  const rawLyrics=lyricCandidates.sort((a,b)=>a.tick-b.tick).map(x=>({at:seconds(x.tick),text:x.text}));
  const lines=[];let bits=[];
  for (const token of rawLyrics) {
    const text=token.text;
    if (text.startsWith('\\') || text.startsWith('/')) {
      if (bits.length) {const line=lyricLine(bits,token.at);if(line)lines.push(line);}
      bits=[];
      const rest=text.slice(1);
      if (rest.trim()) bits.push({at:token.at,text:rest});
    } else bits.push({at:token.at,text});
  }
  if (bits.length) {const line=lyricLine(bits,Math.max(seconds(maxTick),bits.at(-1).at+3));if(line)lines.push(line);}
  const duration=Math.max(1,Math.min(1800,seconds(maxTick)+1));
  if (duration>1799.99) throw Error('MIDI acima do limite de 30 minutos.');
  if (!events.length) throw Error('O MIDI não contém notas para reproduzir.');
  const firstTempo=timing[0]?.micros||500000;
  return {format,tracks:trackNames,events,lines:lines.slice(0,1200),lyricsTrack:lyricTrack,
    duration,bpm:Math.round(60000000/firstTempo),noteCount:events.length};
}

export async function parseMidiFile(file) {
  if (!file || typeof file.arrayBuffer!=='function') throw Error('Selecione um arquivo MIDI ou KAR.');
  return parseMidi(await file.arrayBuffer());
}

export function midiLyricsToLrc(lines) {
  return (lines||[]).map(line=>{
    const n=Math.max(0,Math.round(line.start*100));
    return '['+String(Math.floor(n/6000)).padStart(2,'0')+':'+String(Math.floor(n/100)%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0')+']'+line.text;
  }).join('\n');
}
