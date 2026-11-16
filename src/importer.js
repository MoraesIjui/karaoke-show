/** Leitor de LRC, com tags de metadados e offsets, sem executar HTML de terceiros. */
export function parseLrc(text, duration = 0) {
  if (typeof text !== 'string') throw new Error('Arquivo LRC inválido.');
  const offsetMatch = text.match(/^\[offset:([-+]?\d+)\]/im);
  const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
  const events = [];
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const markers = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!markers.length) continue;
    const lyric = line.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    if (!lyric) continue;
    for (const marker of markers) {
      const fraction = marker[3] ? Number(`0.${marker[3]}`) : 0;
      const at = Math.max(0, Number(marker[1]) * 60 + Number(marker[2]) + fraction + offset);
      events.push({ start: at, text: lyric });
    }
  }
  events.sort((a, b) => a.start - b.start);
  return events.map((event, i) => {
    const nextStart = events[i + 1]?.start ?? (duration || event.start + 5);
    const end = Math.max(event.start + 0.15, nextStart);
    const words = event.text.split(/\s+/);
    return {
      start: event.start, end, text: event.text,
      words: words.map((word, j) => ({
        text: word,
        start: event.start + ((end - event.start) * j) / words.length,
        end: event.start + ((end - event.start) * (j + 1)) / words.length
      }))
    };
  });
}

export function parseNoteMap(json, duration = Infinity) {
  if (!Array.isArray(json)) throw new Error('O mapa de notas deve ser um array JSON.');
  if (json.length > 10000) throw new Error('Mapa de notas muito grande.');
  const notes = json.map((raw, i) => {
    const start = Number(raw.start), end = Number(raw.end), midi = Number(raw.midi);
    if (![start, end, midi].every(Number.isFinite) || start < 0 || end <= start || midi < 24 || midi > 108 || end > duration + 1) {
      throw new Error(`Nota ${i + 1} inválida. Formato: {"start":1.0,"end":1.5,"midi":60}`);
    }
    return { start, end, midi };
  }).sort((a, b) => a.start - b.start);
  for (let i = 1; i < notes.length; i += 1) {
    if (notes[i].start < notes[i - 1].end - 0.001) throw new Error('O mapa de notas não pode ter intervalos sobrepostos.');
  }
  return notes;
}

export function addNotesToLines(lines, notes) {
  if (!notes?.length) return lines;
  return lines.map(line => ({
    ...line,
    words: line.words.map(word => {
      const midpoint = (word.start + word.end) / 2;
      const matching = notes.find(note => midpoint >= note.start && midpoint < note.end);
      return { ...word, midi: matching?.midi };
    })
  }));
}

export async function fileAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const clear = () => { audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); };
    const timer = setTimeout(() => { clear(); reject(new Error('Não foi possível ler a duração do áudio.')); }, 10000);
    audio.onloadedmetadata = () => { const duration = audio.duration; clearTimeout(timer); clear(); Number.isFinite(duration) ? resolve(duration) : reject(new Error('O áudio não tem duração válida.')); };
    audio.onerror = () => { clearTimeout(timer); clear(); reject(new Error('O formato de áudio não é suportado neste aparelho.')); };
    audio.src = url;
  });
}
