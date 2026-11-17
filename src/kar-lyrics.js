/**
 * Reconstrói versos de MIDI Karaoke, seguindo as convenções KAR: "\" e "/"
 * iniciam linhas; CR/LF também interrompem versos; os eventos MIDI trazem
 * timestamps de sílabas, que são preservados ao construir as palavras.
 * Inspirado nos leitores de eventos de letra estudados em karaoke-player e
 * midi-audio-player; implementação própria, sem código de terceiros.
 */
const MAX_TOKENS = 20000;
const MAX_LINES = 1600;
function makeLine(pieces, nextStart) {
  const characters = [];
  for (const token of pieces) {
    for (const char of token.text) characters.push({char,at:token.at});
  }
  if (!characters.length) return null;
  let raw=characters.map(x=>x.char).join('');
  const startIndex=raw.search(/\S/);
  if(startIndex<0)return null;
  raw=raw.replace(/\s+/g,' ').trim();
  if(!raw)return null;
  const start=characters[startIndex].at;
  const end=Math.max(start+.2,Math.min(start+15,Number.isFinite(nextStart)?nextStart:start+4));
  const words=[];
  const parts=characters.map(x=>x.char).join('');
  const regex=/\S+/g;
  for(const match of parts.matchAll(regex)){
    const idx=match.index;
    const at=characters[idx].at;
    words.push({text:match[0],start:at,end:at+.15});
  }
  for(let i=0;i<words.length;i++) {
    const next=words[i+1]?.start??end;
    words[i].end=Math.max(words[i].start+.08,Math.min(end,next));
  }
  return {start,end,text:raw,words};
}

export function parseKarLyricTokens(tokens, duration=0) {
  if(!Array.isArray(tokens)||tokens.length>MAX_TOKENS)throw Error('Quantidade inválida de eventos KAR.');
  const ordered=tokens.filter(x=>x && Number.isFinite(Number(x.at)) && typeof x.text==='string')
    .map(x=>({at:Math.max(0,Number(x.at)),text:x.text}))
    .sort((a,b)=>a.at-b.at);
  const lines=[],pending=[];
  const flush=at=>{
    const result=makeLine(pending,at);
    if(result && lines.length<MAX_LINES)lines.push(result);
    pending.length=0;
  };
  for(const token of ordered) {
    const text=token.text;
    if(text.startsWith('@'))continue;
    // "/(texto)" ou "\\(texto)" abrem novo verso. Retornos de linha
    // aparecem em arquivos de Karaoke 5 e outros editores MIDI.
    let segment='';
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='\\'||c==='/'||c==='\r'||c==='\n') {
        if(segment) { pending.push({at:token.at,text:segment});segment=''; }
        flush(token.at);
      }else if(c==='\0')continue;
      else segment+=c;
    }
    if(segment)pending.push({at:token.at,text:segment});
  }
  if(pending.length)flush(duration>0?duration:pending.at(-1).at+4);
  return lines;
}
