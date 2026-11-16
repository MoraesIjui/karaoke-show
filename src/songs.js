/** Músicas e melodias 100% originais, sem necessidade de streaming ou licenças externas. */
const rawSongs = [
  {
    id: 'luzes-da-cidade', title: 'Luzes da Cidade', artist: 'Karaoke Show Originals',
    genre: 'Pop', mood: 'Energia lá em cima', bpm: 118, key: 'C', root: 48,
    accent: '#a367ff', glow: '#ff5ea5', icon: '✦',
    patterns: [[60,62,64,67,67,64,62,60],[64,64,67,69,67,64,62,60],[67,69,72,69,67,64,62,64]],
    lyrics: [
      'A noite chegou e a cidade vai brilhar',
      'Cada passo é um convite pra sonhar mais',
      'No céu desenhamos o nosso lugar de luz',
      'As ruas acendem caminhos dentro de nós dois',
      'Vem cantar comigo até o dia amanhecer aqui',
      'Deixa a melodia fazer teu coração voar alto',
      'Bate forte esse som dentro do meu peito',
      'Todo mundo junto vai fazer o mundo dançar',
      'Hoje ninguém precisa esconder a própria voz não',
      'O palco é seu pode deixar acontecer agora',
      'As estrelas vão guardar essa nossa canção pra sempre',
      'E a cidade inteira vai cantar até clarear'
    ]
  },
  {
    id: 'ritmo-do-coracao', title: 'Ritmo do Coração', artist: 'Karaoke Show Originals',
    genre: 'Dance', mood: 'Para agitar a festa', bpm: 132, key: 'Am', root: 45,
    accent: '#ff5b9d', glow: '#ffbe60', icon: '♫',
    patterns: [[69,69,72,72,76,74,72,69],[69,72,74,76,74,72,69,67],[72,74,76,79,76,74,72,69]],
    lyrics: [
      'Sente a batida chegar bem perto de você',
      'Hoje a pista inteira é nossa pode acreditar',
      'Não tem hora pra essa alegria se acabar',
      'Meu coração acelera quando começa a tocar alto',
      'Pula mais alto deixa a energia te levar',
      'A vida acontece no ritmo dessa canção aqui',
      'As palmas marcam o tempo dessa emoção nova',
      'E cada sorriso faz a noite melhorar muito',
      'Não importa se errar a nota alguma vez',
      'A graça é soltar a voz sem medo',
      'Juntos criamos uma festa que nunca se esquece',
      'O ritmo do coração vai nos acompanhar sempre'
    ]
  },
  {
    id: 'chuva-de-estrelas', title: 'Chuva de Estrelas', artist: 'Karaoke Show Originals',
    genre: 'Balada', mood: 'Momento de emoção', bpm: 88, key: 'G', root: 43,
    accent: '#5ab8ff', glow: '#986eff', icon: '☾',
    patterns: [[59,62,62,64,67,64,62,59],[59,62,64,67,69,67,64,62],[67,69,71,69,67,64,62,59]],
    lyrics: [
      'Quando o silêncio abraça devagar o meu olhar',
      'Lembro das promessas feitas sob aquele céu azul',
      'Se a distância vem nos convidar a sonhar',
      'Eu encontro o teu sorriso em qualquer lugar',
      'Cada estrela conta histórias que ninguém mais contou',
      'Um desejo solto no vento em direção ao mar',
      'A noite passa lenta com seu jeito tão gentil',
      'Mas a esperança sempre encontra um caminho novo',
      'Deixe que a chuva de estrelas venha brilhar',
      'E ilumine tudo que ainda vamos viver juntos',
      'Mesmo tão longe posso ouvir tua voz cantar',
      'Tudo que é bonito fica dentro de nós'
    ]
  },
  {
    id: 'domingo-de-sol', title: 'Domingo de Sol', artist: 'Karaoke Show Originals',
    genre: 'Brasil', mood: 'Leve, solar e feliz', bpm: 106, key: 'D', root: 50,
    accent: '#24cfac', glow: '#ffce73', icon: '☼',
    patterns: [[62,64,66,69,66,64,62,64],[66,69,71,69,66,64,62,62],[69,71,74,71,69,66,64,62]],
    lyrics: [
      'O domingo acordou com cheiro de café fresquinho',
      'Uma brisa trouxe boas notícias pelo quintal hoje',
      'Pé descalço e sorriso solto pela nossa rua',
      'O violão já chama todo mundo pra cantar',
      'Tem abraço tem conversa tem história pra contar',
      'A felicidade mora perto de quem sabe olhar',
      'Gira a roda passa o tempo devagar assim',
      'Cada instante vira um retrato bom pra guardar',
      'Vem chegando canta junto deixa o dia acontecer',
      'Se chover a gente canta mesmo assim feliz',
      'O que vale é dividir esse momento bom',
      'Domingo de sol cabe inteiro no coração nosso'
    ]
  }
];

export const BEATS_PER_LINE = 8;
export const GAP_BEATS = 2;
export const INTRO_BEATS = 4;

export function createOriginalSong(raw) {
  const beatSec = 60 / raw.bpm;
  const lines = raw.lyrics.map((line, i) => {
    const words = line.trim().split(/\s+/);
    const start = (INTRO_BEATS + i * (BEATS_PER_LINE + GAP_BEATS)) * beatSec;
    const duration = BEATS_PER_LINE * beatSec;
    const pattern = raw.patterns[i % raw.patterns.length];
    return {
      start, end: start + duration, text: line,
      words: words.map((word, j) => ({
        text: word,
        start: start + (j * duration) / words.length,
        end: start + ((j + 1) * duration) / words.length,
        midi: pattern[Math.floor(j * pattern.length / words.length)]
      }))
    };
  });
  const duration = (INTRO_BEATS + raw.lyrics.length * (BEATS_PER_LINE + GAP_BEATS) + 2) * beatSec;
  return { ...raw, source: 'original', lines, duration };
}

export const originals = rawSongs.map(createOriginalSong);

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatPoints(points) {
  return Math.round(points).toLocaleString('pt-BR');
}

export function noteName(midi) {
  if (!Number.isFinite(midi)) return '—';
  const names = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
  return `${names[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function midiToHz(midi) { return 440 * 2 ** ((midi - 69) / 12); }
export function hzToMidi(hz) { return hz > 0 ? 69 + 12 * Math.log2(hz / 440) : null; }
