import { originals, formatDuration, formatPoints, noteName, hzToMidi } from './songs.js';
import { ScoreSession, rankFromScore, expectedWordAt } from './scoring.js';
import { Microphone } from './pitch.js';
import { OriginalAudioEngine, UploadedAudioEngine } from './audio.js';
import { MidiAudioEngine } from './midi-audio.js';
import { SampledMidiAudioEngine } from './soundfont-audio.js';
import { isMidiName, parseMidiFile } from './midi.js';
import { importKaraokeZip } from './zip-batch.js';
import { importUltraStarZip, installOpenTestSong, installRepertoireUltraStar, OPEN_TEST_SONGS } from './ultrastar-import.js';
import { readRepertoirePreferences,saveRepertoirePreferences,fetchRepertoireIndex,filterRepertoire,downloadableRepertoire } from './repertoire.js';
import { renderRepertoirePage } from './repertoire-ui.js';
import { midi4youSuggestions, midi4youGenres, midi4youSongUrl, filterMidi4YouSongs } from './midi4you-catalog.js';
import { parseLrc, parseNoteMap, addNotesToLines, fileAudioDuration } from './importer.js';
import { DEFAULT_SETTINGS, readLocal, persistLocal, listImports, saveImport, removeImport, cleanSinger } from './storage.js';
import { installRemoteNavigation } from './remote.js';
import { fetchCloudSongs, cloudUser, loginFamily, logoutAdmin, verifyAdmin, uploadCloudSong, sendPasswordRecovery, consumePasswordRecoveryRedirect, updatePasswordFromRecovery } from './cloud.js';

const app = document.getElementById('app');
const data = readLocal();
const mic = new Microphone();
const state = {
  page: 'home', selectedId: originals[0].id, imported: [], search: '', filter: 'Todas',
  showHelp: false, data, engine: null, session: null, playingSong: null,
  activeQueueId: null, singerOnStage: '', isPaused: false, result: null,
  raf: null, lastSampleTime: -Infinity, lastVisualTime: -Infinity,
  lastLyricKey: '', overlay: '', toastTimer: null, installing: null,
  importBusy: false, cloudSongs: [], cloudError: '', cloudBusy: false, cloudAdmin: false, cloudRecoveryMode: '', midi4youSearch: '', midi4youGenre: 'Todas', zipBusy: false, zipReport: null, zipProgress: '', ultraBusy: false, ultraReport: null, ultraProgress: '', demoBusy: false,
  repertoireIndex: null, repertoirePrefs: readRepertoirePreferences(), repertoireSearch: '',
  repertoireBusy: false, repertoireInstalling: false, repertoireProgress: ''
};

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  queue: '<path d="M4 6h16M4 12h16M4 18h10"/><path d="m17 16 4 2-4 2z"/>',
  trophy: '<path d="M8 21h8m-4-4v4M7 4h10v7a5 5 0 0 1-10 0zM7 6H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.9 1.9-.06-.06A1.65 1.65 0 0 0 16 18.4a1.65 1.65 0 0 0-.99 1.5V20H9v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.82.32l-.06.07-1.9-1.9.06-.07A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.5-.99H3V10h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.32-1.82l-.07-.06 1.9-1.9.07.06A1.65 1.65 0 0 0 8 5.6 1.65 1.65 0 0 0 9 4.1V4h6v.1a1.65 1.65 0 0 0 1 1.5 1.65 1.65 0 0 0 1.82-.32l.06-.07 1.9 1.9-.06.07A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.5 1h.1v4h-.1a1.65 1.65 0 0 0-1.5 1z"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-5 0h10"/>',
  play: '<path d="m8 5 12 7-12 7z"/>',
  pause: '<path d="M7 5v14M17 5v14"/>',
  arrow: '<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4zM15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v1"/>',
  offline: '<path d="m3 3 18 18M2 9a15 15 0 0 1 4-3m4-2a16 16 0 0 1 12 5M5 12a10 10 0 0 1 9-2m4 2 1 1M8 16a6 6 0 0 1 8 0m-4 4h.01"/>',
  monitor: '<rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
  moon: '<path d="M20 14a8 8 0 1 1-10-10 8 8 0 0 0 10 10z"/>'
};
function svg(name, size = 20) { return `<svg aria-hidden="true" class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.music}</svg>`; }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function songs() { return [...originals, ...state.cloudSongs, ...state.imported]; }
function songFor(id) { return songs().find(song => song.id === id); }
function selected() { return songFor(state.selectedId) || originals[0]; }
function singersCount() { return new Set(data.results.map(r => r.singer)).size; }
function bestResult() { return data.results.reduce((best, item) => Math.max(best, item.score || 0), 0); }
function scoreable(song) {
  if (!song?.lines?.length) return false;
  const words = song.lines.flatMap(line => line.words);
  return words.length > 0 && words.filter(word => Number.isFinite(word.midi)).length / words.length >= 0.8;
}
function save() { persistLocal(data); }
function notify(message, variant = '') {
  document.getElementById('toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'toast'; toast.className = `toast ${variant}`; toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.remove(), 4000);
}
function timeLabel(s) { return formatDuration(s); }
function header(title, subtitle = '') { return `<div class="section-header"><div><div class="eyebrow">${svg('spark', 15)} KARAOKE SHOW</div><h1>${title}</h1>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div></div>`; }
function navItem(id, label, icon) { return `<button type="button" class="nav-link ${state.page === id ? 'active' : ''}" data-action="navigate" data-page="${id}">${svg(icon)}<span>${label}</span></button>`; }
function sidebar() {
  return `<aside class="sidebar"><div class="brand"><span class="brand-icon">${svg('mic', 26)}</span><span class="brand-name">KARAOKE<br/><strong>SHOW</strong></span></div>
    <div class="sidebar-label">MENU PRINCIPAL</div><nav aria-label="Menu principal" class="nav-list">
    ${navItem('home', 'Início', 'home')}${navItem('songs', 'Explorar músicas', 'music')}${navItem('queue', 'Fila de apresentações', 'queue')}${navItem('ranking', 'Ranking', 'trophy')}${navItem('cloud', 'Biblioteca da família', 'upload')}${navItem('repertoire', 'Repertório automático', 'music')}${navItem('midi4you', 'Descobrir MIDI', 'music')}${navItem('family-remote', 'Controle pelo celular', 'monitor')}${navItem('settings', 'Configurações', 'settings')}</nav>
    <div class="sidebar-spacer"></div><div class="sidebar-promo"><span class="promo-spark">✦</span><strong>Sua sala, seu palco.</strong><p>Cante, pontue e desafie seus amigos. Sem assinatura.</p><button data-action="navigate" data-page="import" class="subtle-link">${svg('plus',16)} Importar música</button></div>
    <div class="side-footer">v0.1 • First Stage<br/>Funciona offline após instalar</div></aside>`;
}
function topbar() {
  return `<header class="topbar"><div class="topbar-location">${svg('monitor', 17)} <span>SEU PALCO DIGITAL</span></div><div class="topbar-end"><span class="connection ${navigator.onLine ? '' : 'offline'}">● ${navigator.onLine ? 'PRONTO PARA O SHOW' : 'MODO OFFLINE'}</span><button class="avatar" data-action="navigate" data-page="ranking" aria-label="Abrir ranking">${svg('user', 20)}</button></div></header>`;
}
function card(song, compact = false) {
  const imported = song.source === 'import';
  const cloud = song.source === 'cloud';
  return `<article class="song-card ${compact ? 'compact' : ''}" style="--song-accent:${song.accent || '#ab77f6'};--song-glow:${song.glow || '#3d8fff'}">
    <div class="cover"><span class="cover-badge">${imported ? 'ARQUIVO LOCAL' : cloud ? 'CATÁLOGO ONLINE' : 'ORIGINAL'}</span><span class="cover-symbol">${esc(song.icon || '♪')}</span><span class="cover-waves"><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
    <div class="song-card-body"><div class="genre">${esc(song.genre || 'Minha música')} · ${timeLabel(song.duration)}</div><h3>${esc(song.title)}</h3><p>${esc(song.artist)}</p><div class="card-bottom"><span class="song-feature">${scoreable(song) ? '★ COM PONTUAÇÃO' : '♫ MODO APRESENTAÇÃO'}</span><button class="round-play" aria-label="Cantar ${esc(song.title)}" data-action="select-song" data-id="${esc(song.id)}">${svg('play', 21)}</button></div></div>
  </article>`;
}
function renderHome() {
  const hasHistory = data.results.length > 0;
  return `<section class="home"><div class="welcome"><div><span class="eyebrow">✧ BEM-VINDO AO SEU PALCO</span><h1>O show começa<br/>com a <span class="gradient-text">sua voz.</span></h1><p>Transforme qualquer tela em um grande palco. Escolha uma música, solte a voz e alcance a maior pontuação.</p><div class="hero-actions"><button class="btn btn-primary" data-action="navigate" data-page="songs">${svg('play', 19)} Começar a cantar ${svg('arrow', 19)}</button><button class="btn btn-outline" data-action="navigate" data-page="queue">${svg('queue', 19)} Montar uma fila</button></div><div class="hero-tag">${svg('check', 16)} Músicas originais • Offline • Sem cadastro</div></div>
    <div class="hero-art" aria-hidden="true"><span class="halo halo-one"></span><span class="halo halo-two"></span><span class="hero-mic">${svg('mic', 124)}</span><div class="floating-note note-a">♪</div><div class="floating-note note-b">♫</div><div class="floating-note note-c">✧</div><div class="hero-eq">${[18,29,40,22,50,66,29,46,18,57,34,24,43,53,20].map(h=>`<i style="height:${h}%"></i>`).join('')}</div></div></div>
    <div class="metrics"><div class="metric">${svg('music', 24)}<div><b>${songs().length}</b><span>Músicas disponíveis</span></div></div><div class="metric">${svg('trophy', 24)}<div><b>${formatPoints(bestResult())}</b><span>Maior pontuação</span></div></div><div class="metric">${svg('user', 24)}<div><b>${singersCount()}</b><span>Vozes no ranking</span></div></div><div class="metric">${svg('queue', 24)}<div><b>${data.queue.length}</b><span>Na fila do show</span></div></div></div>
    <div class="row-heading"><div><span class="eyebrow">FEITO PARA CANTAR</span><h2>Escolha seu próximo hit</h2></div><button class="text-button" data-action="navigate" data-page="songs">Ver todas ${svg('arrow', 18)}</button></div>
    <div class="song-grid">${songs().slice(0, 4).map(s => card(s)).join('')}</div>
    <div class="feature-strip"><div class="feature-mark">${svg('mic', 24)}</div><div><strong>${hasHistory ? 'Que tal bater seu recorde?' : 'Pontuação real, não aleatória.'}</strong><p>O sistema compara sua afinação ao mapa de notas. Para pontuar, conecte um microfone e escolha uma faixa com notas.</p></div><button class="btn btn-ghost" data-action="navigate" data-page="settings">Configurar áudio ${svg('arrow', 17)}</button></div>
  </section>`;
}
function renderSongs() {
  const genres = ['Todas', ...new Set(songs().map(song => song.genre || 'Minhas músicas'))];
  const filtered = songs().filter(song => (state.filter === 'Todas' || song.genre === state.filter) && `${song.title} ${song.artist} ${song.genre}`.toLocaleLowerCase('pt-BR').includes(state.search.toLocaleLowerCase('pt-BR')));
  return `${header('Biblioteca de músicas', 'Encontre seu ritmo e prepare sua melhor apresentação.')}
  <div class="library-tools"><label class="search-box">${svg('music')}<input id="song-search" autocomplete="off" type="search" placeholder="Buscar música, artista ou estilo…" value="${esc(state.search)}" aria-label="Buscar músicas"/></label><button class="btn btn-outline" data-action="navigate" data-page="import">${svg('upload',18)} Importar música</button><button class="btn btn-outline" data-action="navigate" data-page="cloud">Catálogo online</button></div>
  <div class="filters">${genres.map(g => `<button data-action="filter" data-filter="${esc(g)}" class="filter ${state.filter===g?'active':''}">${esc(g)}</button>`).join('')}</div>
  <div class="results-label">${filtered.length} ${filtered.length === 1 ? 'música encontrada' : 'músicas encontradas'}</div>
  ${filtered.length ? `<div class="song-grid">${filtered.map(song => card(song)).join('')}</div>` : `<div class="empty">${svg('music', 48)}<h3>Nenhuma música encontrada</h3><p>Tente outro termo ou importe seu próprio áudio com letra sincronizada.</p></div>`}`;
}
function renderSetup() {
  const song = selected();
  const canScore = scoreable(song);
  return `<div class="setup-layout"><button class="back-link" data-action="navigate" data-page="songs">${svg('back',17)} Voltar à biblioteca</button>
    <div class="setup-main"><div class="setup-cover" style="--song-accent:${song.accent};--song-glow:${song.glow}"><div class="giant-note">${esc(song.icon || '♫')}</div><span>${esc(song.genre)}</span></div>
    <div class="setup-info"><div class="eyebrow">PREPARE SUA APRESENTAÇÃO</div><h1>${esc(song.title)}</h1><p class="artist-large">${esc(song.artist)}</p><div class="setup-meta"><span>◷ ${timeLabel(song.duration)}</span><span>♫ ${song.bpm || '—'} BPM</span><span>✦ ${esc(song.genre)}</span></div>
    ${song.licenseText ? `<details class="license-credits"><summary>Créditos e licença desta faixa</summary><pre>${esc(song.licenseText)}</pre>${song.originUrl ? `<a target="_blank" rel="noopener noreferrer" href="${esc(song.originUrl)}">Consultar pacote na origem ↗</a>` : ''}</details>` : ''}
    <div class="form-card"><label class="field-label" for="singer">QUEM VAI CANTAR?</label><input id="singer" class="text-input" value="${esc(data.singer)}" maxlength="36" placeholder="Seu nome ou apelido"/>
    <div class="mic-panel"><div class="mic-panel-icon">${svg('mic', 28)}</div><div class="mic-panel-text"><b>${mic.connected ? 'Microfone conectado!' : 'Microfone não conectado'}</b><span>${canScore ? (mic.connected ? 'Pronto para avaliar sua voz em tempo real.' : 'Ative para ganhar pontos por afinação.') : 'Essa música não tem mapa de notas completo; apresentação livre.'}</span></div><button class="btn ${mic.connected ? 'btn-soft' : 'btn-outline'}" data-action="toggle-mic">${mic.connected ? 'Desconectar' : 'Ativar microfone'}</button></div>
    <div class="microphone-meter" ${mic.connected ? '' : 'hidden'}><span>${svg('volume',17)} Nível de entrada</span><div class="meter-track"><div class="meter-fill" id="mic-meter"></div></div><span id="mic-note">Aguardando voz…</span></div>
    <div class="setup-callout">${svg('info', 18)} ${canScore ? 'Sem microfone, você pode cantar em modo livre, mas não recebe pontos. Para resultados melhores, prefira microfone USB e reduza o retorno dos alto-falantes.' : (song.ultraStar ? 'Esta faixa UltraStar contém notas vocais parciais ou não pontuáveis. É possível cantar em modo livre.' : 'Faixas MP3/LRC comuns precisam de notas vocais .json para disputar o ranking; UltraStar já pode trazer essas notas incorporadas.')}</div>
    <div class="setup-buttons"><button class="btn btn-outline" data-action="queue-add" data-id="${esc(song.id)}">${svg('plus',19)} Adicionar à fila</button><button class="btn btn-primary start-show" data-action="start" aria-label="Começar apresentação">${svg('play', 22)} ${canScore && mic.connected ? 'COMEÇAR COM PONTUAÇÃO' : 'COMEÇAR APRESENTAÇÃO'} ${svg('arrow', 21)}</button></div></div></div></div></div>`;
}
function renderQueue() {
  const items = data.queue.map((item, index) => ({ ...item, song: songFor(item.songId), index }));
  return `${header('Fila do show', 'Organize as apresentações e passe o microfone na ordem certa.')}
  <div class="queue-actions"><button class="btn btn-primary" data-action="navigate" data-page="songs">${svg('plus',18)} Escolher música</button>${items.length ? `<button class="btn btn-outline" data-action="play-queue">${svg('play',18)} Preparar o próximo</button>` : ''}</div>
  <div class="queue-list">${items.length ? items.map((item,i) => `<div class="queue-row"><span class="queue-number">${String(i+1).padStart(2,'0')}</span><div class="queue-music-icon">${svg('music',24)}</div><div class="queue-row-content"><h3>${esc(item.song?.title || 'Música removida')}</h3><p>${svg('user',14)} ${esc(item.singer)} · ${esc(item.song?.artist || 'Indisponível')}</p></div><span class="queue-duration">${timeLabel(item.song?.duration)}</span><button data-action="queue-up" data-queue="${esc(item.id)}" ${i===0?'disabled':''} class="icon-button" aria-label="Subir na fila">↑</button><button data-action="queue-down" data-queue="${esc(item.id)}" ${i===items.length-1?'disabled':''} class="icon-button" aria-label="Descer na fila">↓</button><button data-action="queue-remove" data-queue="${esc(item.id)}" class="icon-button danger" aria-label="Remover da fila">${svg('trash',18)}</button></div>`).join('') : `<div class="empty">${svg('queue',52)}<h3>Sua fila está vazia</h3><p>Escolha uma música, informe quem vai cantar e adicione à fila.</p><button class="btn btn-primary" data-action="navigate" data-page="songs">Ver músicas</button></div>`}</div>
  <div class="tip-box">${svg('info',18)} A fila e o ranking ficam salvos neste aparelho, mesmo sem internet. Cada apresentação começa com um toque de quem estiver conduzindo o show.</div>`;
}
function renderRanking() {
  const results = [...data.results].filter(r => r.rated).sort((a,b) => b.score - a.score).slice(0,30);
  return `${header('Hall da fama', 'As melhores vozes que passaram por este palco.')}
  <div class="ranking-top"><div class="stat-tile"><span>RECORDES REGISTRADOS</span><b>${data.results.length}</b></div><div class="stat-tile"><span>MAIOR PONTUAÇÃO</span><b>${formatPoints(bestResult())}</b></div><div class="stat-tile"><span>PARTICIPANTES</span><b>${singersCount()}</b></div></div>
  ${results.length ? `<div class="ranking-list">${results.map((r,i) => `<div class="ranking-row"><div class="rank-index ${i<3?'podium':''}">${i===0?'🏆':i===1?'🥈':i===2?'🥉':String(i+1).padStart(2,'0')}</div><div class="ranking-name"><strong>${esc(r.singer)}</strong><span>${esc(r.songTitle)} · ${new Date(r.date).toLocaleDateString('pt-BR')}</span></div><span class="ranking-grade">${esc(rankFromScore(r.score).level)}</span><b class="ranking-score">${formatPoints(r.score)}</b></div>`).join('')}</div><button class="text-button clear-ranking" data-action="clear-ranking">${svg('trash',16)} Limpar ranking local</button>` : `<div class="empty">${svg('trophy',54)}<h3>O palco espera sua primeira estrela!</h3><p>Conecte um microfone e cante uma das músicas originais para registrar sua pontuação.</p><button class="btn btn-primary" data-action="navigate" data-page="songs">Cantar agora</button></div>`}`;
}

function remotePairingUrl() {
  try{return globalThis.KaraokeBridge?.getRemoteUrl?.() || '';}catch{return '';}
}
function updateRemoteCatalog() {
  try {
    if(typeof globalThis.KaraokeBridge?.updateCatalog==='function') {
      // Enviar somente nomes e IDs à página do celular, jamais arquivos, letras, tokens ou senhas.
      const catalog=songs().slice(0,350).map(({id,title,artist})=>({id,title,artist}));
      globalThis.KaraokeBridge.updateCatalog(JSON.stringify(catalog));
    }
  }catch{}
}
function renderFamilyRemote() {
  const url=remotePairingUrl();
  const isAndroid=typeof globalThis.KaraokeBridge?.getRemoteUrl==='function';
  return `${header('Controle pelo celular','Adicione músicas à fila pelo Wi-Fi de casa, sem internet e sem login de convidados.')}
  <section class="panel family-remote-panel">
    <h2>Conectar celulares à TV Box</h2>
    ${url ? `<p class="muted">Conecte o celular e a TV Box à mesma rede Wi-Fi. Escaneie o QR code ou digite o endereço abaixo no navegador do celular.</p>
      <div class="family-remote-pair"><div id="family-remote-qr" class="family-remote-qr" role="img" aria-label="QR code de pareamento"></div>
      <div class="family-remote-link"><strong>Endereço de pareamento</strong><div class="family-remote-url">${esc(url)}</div>
      <p class="small-muted">O link contém uma chave temporária desta sessão. Somente compartilhe com convidados da sua casa. Reinicie o aplicativo para gerar um novo link.</p>
      </div></div>`
    : isAndroid ? '<p class="muted">Não foi possível iniciar o controle Wi-Fi. Verifique se a TV Box está conectada a uma rede local (Wi-Fi ou cabo) e reinicie o aplicativo.</p>'
    : '<p class="muted">O controle via celular funciona no APK instalado na TV Box Android. O site no GitHub Pages não possui servidor de rede local.</p>'}
    <h3>O que os celulares podem fazer?</h3>
    <p class="muted">Pesquisar músicas já importadas na TV, informar o nome do cantor e entrar na fila. A TV continua responsável pela reprodução, pelo microfone e pelas pontuações.</p>
    <p class="small-muted">Este recurso não transfere músicas, não abre o Supabase aos convidados e não publica a sua coleção na internet.</p>
  </section>`;
}
function showFamilyRemoteQr() {
  const url=remotePairingUrl(),container=document.getElementById('family-remote-qr');
  if(!url||!container)return;
  if(typeof globalThis.QRCode==='function'){
    try{new globalThis.QRCode(container,{text:url,width:180,height:180,correctLevel:globalThis.QRCode.CorrectLevel.M});}catch{}
  }
}

function renderSettings() {
  const s = data.settings;
  return `${header('Configurações', 'Ajuste o palco para o seu microfone, caixa de som e TV.')}
    <div class="settings-grid"><section class="panel"><div class="panel-heading">${svg('volume',23)} <div><h2>Som e acompanhamento</h2><p>Controle o áudio que sai nas caixas de som.</p></div></div>
    <div class="setting-row"><div><strong>Volume da música</strong><p>Afeta somente o acompanhamento, não o microfone.</p></div><label class="range-field"><input type="range" min="0" max="100" step="1" data-setting="volume" value="${Math.round(s.volume*100)}"/><output id="volume-label">${Math.round(s.volume*100)}%</output></label></div>
    <div class="setting-row"><div><strong>Motor de instrumentos MIDI</strong><p>SoundFont (FluidR3) usa instrumentos gravados, baixados na primeira utilização. Em TV Box com pouca memória, use o sintetizador leve.</p></div><label class="range-field"><select data-setting="midiEngine" aria-label="Motor de áudio MIDI">
    <option value="light" ${s.midiEngine!=='soundfont'?'selected':''}>Sintetizador leve (offline)</option>
    <option value="soundfont" ${s.midiEngine==='soundfont'?'selected':''}>SoundFont real (experimental)</option>
    </select></label></div>
    <p class="small-muted">O banco FluidR3 tem licença própria (MIT). O SoundFont exige acesso à internet para obter os presets e usa cache local; se falhar, o karaokê volta ao sintetizador leve automaticamente. A pontuação e suas músicas não são enviadas ao serviço de instrumentos.</p>
    <div class="setting-row"><div><strong>Qualidade dos instrumentos MIDI</strong><p>Econômico para TV Boxes antigas; equilibrado ou rico para som com mais harmônicos.</p></div><label class="range-field"><select data-setting="midiQuality" aria-label="Qualidade do som MIDI">
    <option value="economico" ${s.midiQuality==='economico'?'selected':''}>Econômico</option>
    <option value="equilibrado" ${s.midiQuality!=='economico' && s.midiQuality!=='rico'?'selected':''}>Equilibrado</option>
    <option value="rico" ${s.midiQuality==='rico'?'selected':''}>Rico</option>
    </select></label></div>
    <div class="setting-row"><div><strong>Ambiente musical</strong><p>Pequeno efeito de sala para instrumentos MIDI.</p></div><label class="switch"><input type="checkbox" data-setting="midiReverb" ${s.midiReverb?'checked':''}/><span></span></label></div>
    <div class="setting-row"><div><strong>Bateria MIDI</strong><p>Pode ser desativada para um acompanhamento mais simples.</p></div><label class="switch"><input type="checkbox" data-setting="midiDrums" ${s.midiDrums?'checked':''}/><span></span></label></div>
    <div class="setting-row"><div><strong>Melodia de referência</strong><p>Toque leve das notas esperadas para orientar a voz.</p></div><label class="switch"><input type="checkbox" data-setting="guide" ${s.guide?'checked':''}/><span></span></label></div>
    <div class="setting-row"><div><strong>Oitava flexível</strong><p>Aceita a mesma nota em uma oitava mais grave/aguda.</p></div><label class="switch"><input type="checkbox" data-setting="octaveFlexible" ${s.octaveFlexible?'checked':''}/><span></span></label></div></section>
    <section class="panel"><div class="panel-heading">${svg('mic',23)}<div><h2>Captura de voz</h2><p>O som do microfone é analisado apenas neste dispositivo.</p></div></div>
    <div class="setting-row"><div><strong>Microfone</strong><p id="mic-status">${mic.connected?'Conectado e analisando':'Nenhuma entrada ativa'}</p></div><button data-action="toggle-mic" class="btn btn-outline">${mic.connected?'Desconectar':'Testar microfone'}</button></div>
    <div class="setting-row"><div><strong>Sensibilidade</strong><p>Se estiver pegando o som da TV, aumente o limite.</p></div><label class="range-field"><input data-setting="sensitivity" type="range" min="3" max="50" step="1" value="${Math.round(s.sensitivity*1000)}"/><output id="sensitivity-label">${Math.round(s.sensitivity*1000)}</output></label></div>
    <div class="setting-row"><div><strong>Compensação de atraso</strong><p>Corrige a diferença entre microfone e reprodução.</p></div><label class="range-field"><input data-setting="latencyMs" type="range" min="-300" max="300" step="10" value="${s.latencyMs}"/><output id="latency-label">${s.latencyMs} ms</output></label></div>
    <div class="setting-row"><div><strong>Reduzir animações</strong><p>Indicado para TV Boxes com processadores antigos.</p></div><label class="switch"><input type="checkbox" data-setting="reducedMotion" ${s.reducedMotion?'checked':''}/><span></span></label></div>
    <div class="microphone-meter" ${mic.connected?'':'hidden'}><span>${svg('mic',17)} Sinal do microfone</span><div class="meter-track"><div class="meter-fill" id="mic-meter"></div></div><span id="mic-note">Aguardando voz…</span></div></section></div>
    <section class="panel compatibility"><div class="panel-heading">${svg('monitor',23)}<div><h2>Compatibilidade e privacidade</h2><p>Preparado para navegador, PWA e evolução Android TV.</p></div></div><div class="compat-items"><span>${svg('check',18)} Sem cadastro obrigatório</span><span>${svg('check',18)} Sem enviar áudio a servidores</span><span>${svg('check',18)} Funciona sem internet após instalar</span><span>${svg('check',18)} Navegação por controle remoto</span></div><p class="small-muted">O microfone depende de permissão, HTTPS/localhost e suporte do dispositivo. Pontuação também depende de nota-alvo válida. Bluetooth e áudio via HDMI podem adicionar atraso.</p></section>`;
}

/** Descoberta editorial; não inclui nem reproduz arquivos de terceiros. */
function renderMidi4You() {
  const list = filterMidi4YouSongs({search:state.midi4youSearch,genre:state.midi4youGenre});
  const filters = midi4youGenres.map(genre=>`<button type="button" class="midi4you-chip ${state.midi4youGenre===genre?'active':''}" data-action="midi4you-filter" data-genre="${esc(genre)}" aria-pressed="${state.midi4youGenre===genre}">${esc(genre)}</button>`).join('');
  const cards = list.map(song=>`
    <article class="midi4you-item">
      <div class="midi4you-symbol" aria-hidden="true">♫</div>
      <div class="midi4you-description"><span class="midi4you-genre">${esc(song.genre)} · ${song.versions} ${song.versions===1?'versão':'versões'} MIDI</span>
        <h3>${esc(song.title)}</h3><p>${esc(song.artist)}</p>
        <span class="midi4you-lyrics">${song.lyrics===true?'✓ Letra incorporada informada':song.lyrics===false?'Letra não incorporada':'Letra: confira no MIDI4You'}</span>
      </div>
      <a class="btn btn-outline midi4you-link" href="${midi4youSongUrl(song)}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${esc(song.title)} no MIDI4You">Ver no MIDI4You ↗</a>
    </article>`).join('');
  return `${header('Descobrir MIDI','Sugestões de músicas brasileiras disponíveis para procurar no MIDI4You.')}
    <section class="midi4you-intro panel">
      <div class="eyebrow">REPERTÓRIO PARA A FAMÍLIA</div>
      <p>Pesquise na seleção de ${midi4youSuggestions.length} títulos encontrados no MIDI4You. Abra a página original, escolha a versão e baixe pelo próprio site com sua conta gratuita. Depois use <strong>Importar música</strong> para adicionar o arquivo MIDI/KAR a este aparelho.</p>
      <p class="small-muted">Estes cartões são apenas referências de catálogo; os arquivos não estão no Karaoke Show. Não existe download automático, reprodução sem o arquivo nem distribuição pelo GitHub.</p>
      <div class="midi4you-actions"><button type="button" class="btn btn-primary" data-action="navigate" data-page="import">${svg('upload',18)} Importar MIDI/KAR</button>
      <a href="https://midi4you.com/country/97-brasil" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Catálogo Brasil ↗</a></div>
    </section>
    <section aria-label="Buscar músicas no MIDI4You">
      <label class="midi4you-search-label" for="midi4you-search">Buscar entre as sugestões</label>
      <input id="midi4you-search" type="search" class="text-input midi4you-search" autocomplete="off" placeholder="Música, cantor ou estilo…" value="${esc(state.midi4youSearch)}"/>
      <div class="midi4you-filters" role="group" aria-label="Filtrar por gênero">${filters}</div>
      <p class="small-muted" role="status">${list.length} de ${midi4youSuggestions.length} sugestões</p>
      <div class="midi4you-grid">${cards || '<p class="muted">Nenhuma música nesta seleção. Tente outro artista ou gênero.</p>'}</div>
    </section>`;
}


function renderZipReport() {
  const r=state.zipReport;
  if(!r)return '';
  const rows=[['Importados',r.imported],['Duplicados',r.duplicates],['MK1 não compatíveis',r.unsupportedMK1],
    ['Índices ALB',r.unsupportedALB],['Outros arquivos ignorados',r.ignored],['Falhas',r.failed]];
  const categories=[
    {key:'imported',title:'Importados'},{key:'duplicate',title:'Duplicados'},
    {key:'mk1',title:'MK1 — não suportados'},{key:'alb',title:'ALB — índices de álbum'},
    {key:'failed',title:'Falhas de leitura'},{key:'ignored',title:'Outros arquivos'}
  ];
  let html='<section class="zip-report panel" aria-label="Resultado da importação"><h2>Relatório da importação em lote</h2>';
  html+='<p class="muted">Arquivo: '+esc(r.fileName)+' · '+r.total+' entradas, '+r.compatible+' MIDI/KAR identificados.</p>';
  html+='<div class="zip-report-metrics">';
  for(const [label,value] of rows)html+='<div class="zip-report-metric"><b>'+value+'</b><span>'+label+'</span></div>';
  html+='</div><p class="small-muted">Somente os KAR/MIDI aprovados são gravados neste aparelho. Nada foi enviado à internet. Se faltar armazenamento, o relatório mostrará quais músicas não foram salvas.</p>';
  for(const c of categories){
    const items=r.items.filter(x=>x.status===c.key);
    if(!items.length)continue;
    html+='<details class="zip-report-details"><summary>'+c.title+' ('+items.length+')</summary><ul>';
    for(const item of items)html+='<li><strong>'+esc(item.name)+'</strong>'+(item.reason?' — '+esc(item.reason):'')+'</li>';
    html+='</ul></details>';
  }
  return html+'</section>';
}


function renderUltraStarImportSection() {
  const r=state.ultraReport;
  let report='';
  if(r){
    report='<section class="panel usdx-report"><h3>Resultado do pacote UltraStar</h3>'+
      '<p><b>'+r.imported+'</b> adicionadas · <b>'+r.duplicates+'</b> duplicadas · <b>'+r.failed+'</b> falhas.</p>';
    const types=['imported','duplicate','failed'];
    for(const status of types){
      const items=r.items.filter(x=>x.status===status);
      if(items.length) report+='<details><summary>'+({imported:'Importadas',duplicate:'Duplicadas',failed:'Falhas'}[status])+' ('+items.length+')</summary><ul>'+
        items.map(x=>'<li>'+esc(x.name)+' — '+esc(x.reason)+'</li>').join('')+'</ul></details>';
    }
    report+='</section>';
  }
  const demos=OPEN_TEST_SONGS.map(item=>'<div class="usdx-demo">'+
    '<div><strong>'+esc(item.title)+'</strong><p>'+esc(item.artist)+' · '+esc(item.license)+' · aproximadamente '+item.sizeMb+' MB</p>'+
    '<small>Créditos: '+esc(item.credit)+'</small></div>'+
    '<a target="_blank" rel="noopener noreferrer" href="'+item.licenseUrl+'">Licença</a>'+
    '<button type="button" class="btn btn-outline" data-action="install-ultrastar-demo" data-demo="'+esc(item.id)+'" '+(state.demoBusy?'disabled':'')+'>Instalar teste</button></div>').join('');
  return '<section class="panel usdx-import-panel">'+
    '<h2>UltraStar — músicas com áudio e notas para pontuar</h2>'+
    '<p class="muted">Importe pacotes ZIP UltraStar contendo <code>song.txt</code> e o respectivo áudio MP3/OGG na mesma pasta. O programa lê sílabas, tempos, notas vocais e, quando existir, o arquivo <code>license.txt</code>. Limite: 100 MB por ZIP, 25 MB por faixa.</p>'+
    '<form id="ultrastar-zip-form" class="import-form"><label>Pacote UltraStar (.zip)'+
    '<input type="file" name="archive" accept=".zip,application/zip,application/x-zip-compressed" required/></label>'+
    '<button type="submit" class="btn btn-primary" '+(state.ultraBusy?'disabled':'')+'>Importar pacote UltraStar</button></form>'+
    '<p class="small-muted" role="status" id="ultra-status">'+esc(state.ultraProgress || 'A importação é local e não envia músicas ao Supabase.')+'</p>'+
    '<div class="usdx-demos"><h3>Instalar repertório de teste — Creative Commons</h3>'+
    '<p class="small-muted">As gravações vêm do repositório oficial UltraStar-Deluxe/songs, mediante seu clique. Uso pessoal e não comercial, com créditos preservados. Algumas faixas incluem a voz original — não são necessariamente instrumentais.</p>'+
    demos+
    '<button type="button" class="btn btn-primary" data-action="install-ultrastar-demos" '+(state.demoBusy?'disabled':'')+'>Instalar as 2 músicas de teste</button>'+
    '<p class="small-muted">Conexão com a internet necessária somente para baixar as faixas; depois ficam salvas neste aparelho, sujeito ao espaço local disponível.</p></div></section>'+
    report;
}

function renderImport() {
  return `<button class="back-link" data-action="navigate" data-page="songs">${svg('back',17)} Voltar à biblioteca</button>
  ${header('Importar música', 'Traga seus próprios arquivos autorizados para o Karaoke Show.')}
  <div class="import-columns"><section class="panel"><h2>Nova música local</h2><p class="muted">Importe MP3, WAV, OGG, M4A ou arquivos MIDI/KAR. MIDI/KAR sintetizam os instrumentos e podem incluir letras; para os áudios convencionais, envie uma letra LRC.</p>
  <form id="import-form" class="import-form"><label>Título da música<input name="title" class="text-input" maxlength="80" required placeholder="Ex.: Minha canção"/></label><label>Artista<input name="artist" class="text-input" maxlength="80" required placeholder="Ex.: Meu grupo"/></label>
  <label>Música <small>obrigatório</small><input type="file" name="audio" accept="audio/*,.mp3,.ogg,.wav,.m4a,.mid,.midi,.kar" required/></label>
  <label>Letra sincronizada <small>.lrc opcional para MIDI/KAR</small><input type="file" name="lrc" accept=".lrc,text/plain"/></label>
  <label>Mapa de notas <small>.json opcional</small><input type="file" name="notes" accept=".json,application/json"/></label>
  <button type="submit" class="btn btn-primary" ${state.importBusy?'disabled':''}>${svg('upload',19)} ${state.importBusy?'Importando…':'Adicionar à biblioteca'}</button></form></section>
  <aside class="import-notes"><div class="mini-panel"><div class="import-symbol">${svg('music',30)}</div><h3>Como funciona a letra?</h3><p>O arquivo LRC associa cada frase a um instante da música. Exemplo:</p><pre>[00:04.00]A primeira linha da música
[00:08.00]E aqui começa a segunda</pre></div>
  <div class="mini-panel"><h3>E a pontuação?</h3><p>O arquivo JSON opcional fornece o tom esperado em MIDI para cada trecho. Sem ele, a apresentação não entra no ranking.</p><pre>[\n  {"start":4,"end":5,"midi":60},\n  {"start":5,"end":6,"midi":62}\n]</pre><p class="small-muted">Use somente músicas e letras que você tenha direito de reproduzir. Importações ficam armazenadas localmente no navegador.</p></div></aside></div>

  ${renderUltraStarImportSection()}
  <section class="panel zip-import-panel">
    <h2>Importar um ZIP de músicas em lote</h2>
    <p class="muted">Selecione um pacote .zip com arquivos .kar, .mid ou .midi (até 100 MB). O aplicativo reconhece artistas e títulos pelos nomes dos arquivos, verifica integridade, não repete músicas já importadas e mostra quais .mk1 e .alb não consegue abrir.</p>
    <form id="zip-import-form" class="import-form">
      <label>Pacote de músicas (.zip)<input name="archive" type="file" accept=".zip,application/zip,application/x-zip-compressed" required/></label>
      <button type="submit" class="btn btn-primary" ${state.zipBusy?'disabled':''}>${svg('upload',19)} ${state.zipBusy?'Importando pacote…':'Importar músicas do ZIP'}</button>
    </form>
    <p id="zip-status" role="status" class="small-muted">${esc(state.zipProgress || 'Os arquivos ficam somente neste navegador ou TV Box. Eles não são enviados ao Supabase.')}</p>
    <p class="small-muted">Atenção: limpar os dados do aplicativo pode apagar as músicas locais. Em TV Boxes antigas, prefira pacotes menores para não esgotar o armazenamento.</p>
  </section>
  ${renderZipReport()}
  ${state.imported.length ? `<div class="row-heading"><h2>Músicas importadas (${state.imported.length})</h2></div><div class="imported-list">${state.imported.map(s=>`<div class="queue-row"><span class="queue-music-icon">${svg('music',23)}</span><div class="queue-row-content"><h3>${esc(s.title)}</h3><p>${esc(s.artist)} · ${timeLabel(s.duration)}</p></div><button class="btn btn-soft" data-action="select-song" data-id="${esc(s.id)}">Cantar</button><button class="icon-button danger" data-action="delete-import" data-id="${esc(s.id)}" aria-label="Excluir ${esc(s.title)}">${svg('trash',18)}</button></div>`).join('')}</div>` : ''}`;
}
function renderCloud() {
  const user = cloudUser();
  const status = state.cloudError ? `<p class="small-muted" role="status">${esc(state.cloudError)}</p>` :
    !user ? '<p class="small-muted">Entre com uma conta autorizada para acessar as músicas privadas.</p>' :
    `<p class="small-muted">${state.cloudSongs.length} músicas disponíveis para a família, no site e no APK.</p>`;
  const signin = `<form id="cloud-login-form" class="import-form"><label>E-mail autorizado<input type="email" name="email" class="text-input" autocomplete="username" required/></label><label>Senha<input type="password" name="password" class="text-input" autocomplete="current-password" required/></label><button type="submit" class="btn btn-primary" ${state.cloudBusy?'disabled':''}>Entrar</button></form><button type="button" class="btn btn-outline" data-action="cloud-recovery-toggle">Esqueci minha senha</button><p class="small-muted">A senha é da conta de usuário Supabase Auth, não a do painel Supabase.</p>`;
  const recoverRequest = `<p class="muted">Enviaremos um link de recuperação por e-mail. Se sua conta for usada por outro aplicativo neste projeto Supabase, a troca de senha também afetará esse login.</p><form id="cloud-recovery-email-form" class="import-form"><label>E-mail cadastrado<input type="email" name="email" class="text-input" autocomplete="email" required/></label><button type="submit" class="btn btn-primary" ${state.cloudBusy?'disabled':''}>Enviar link de recuperação</button></form><button type="button" class="btn btn-outline" data-action="cloud-recovery-toggle">Voltar ao login</button>`;
  const recoverSent = `<p class="muted" role="status">Se este e-mail estiver cadastrado, você receberá um link para definir uma nova senha. Confira também a pasta Spam. O link deve abrir este site.</p><button class="btn btn-outline" data-action="cloud-recovery-toggle">Voltar ao login</button>`;
  const recoverUpdate = `<p class="muted">Link confirmado. Escolha uma nova senha de 10 a 72 caracteres.</p><form id="cloud-recovery-password-form" class="import-form"><label>Nova senha<input type="password" name="password" class="text-input" autocomplete="new-password" minlength="10" maxlength="72" required/></label><label>Confirme a senha<input type="password" name="confirm" class="text-input" autocomplete="new-password" minlength="10" maxlength="72" required/></label><button type="submit" class="btn btn-primary" ${state.cloudBusy?'disabled':''}>Salvar nova senha</button></form>`;
  const admin = `<p class="muted">Administrador da família: ${esc(user?.email)}</p><form id="cloud-upload-form" class="import-form">
  <label>Título<input class="text-input" name="title" maxlength="100" required/></label>
  <label>Artista<input class="text-input" name="artist" maxlength="100" required/></label>
  <label>Gênero<input class="text-input" name="genre" maxlength="60" value="Sertanejo" required/></label>
  <label>Arquivo (até 25 MB: MP3, WAV, OGG, M4A, MP4, MID ou KAR)<input name="audio" type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.mp4,.mid,.midi,.kar" required/></label>
  <label>Letras LRC (opcional)<input name="lrc" type="file" accept=".lrc,text/plain"/></label>
  <label>Mapa de notas JSON (opcional)<input name="notes" type="file" accept=".json,application/json"/></label>
  <label><input type="checkbox" name="rights" required/> Tenho autorização para usar e compartilhar este arquivo com a família.</label>
  <button class="btn btn-primary" type="submit" ${state.cloudBusy?'disabled':''}>${state.cloudBusy?'Enviando…':'Salvar na biblioteca privada'}</button>
  </form><button class="btn btn-outline" data-action="cloud-logout">Sair</button>`;
  return `${header('Biblioteca da família','Músicas privadas sincronizadas entre site e Android TV.') }
  <div class="import-columns"><section class="panel"><h2>${state.cloudAdmin?'Publicar música':'Músicas da família'}</h2>
  <p class="muted">O catálogo é privado: somente contas da família autorizadas podem visualizar e ouvir. O administrador pode enviar arquivos.</p>
  ${status}<button class="btn btn-outline" data-action="cloud-refresh">Atualizar catálogo</button>
  ${state.cloudRecoveryMode==='ready'?recoverUpdate:state.cloudRecoveryMode==='request'?recoverRequest:state.cloudRecoveryMode==='sent'?recoverSent:state.cloudAdmin?admin:user?`<p class="muted">Acesso familiar somente para ouvir. Peça ao administrador para enviar novas músicas.</p><button class="btn btn-outline" data-action="cloud-logout">Sair</button>`:signin}
  </section><aside class="import-notes"><div class="mini-panel"><h3>Biblioteca particular</h3><p>O site e o APK consultam o mesmo armazenamento privado. Entre com sua conta em cada aparelho; os arquivos online exigem internet.</p></div>
  <div class="mini-panel"><h3>Pontuação</h3><p>MIDI/KAR reproduzem instrumentos e podem incluir letra. A pontuação exige mapa de notas compatível e microfone; sem ele, o modo é livre.</p></div>
  <div class="mini-panel"><h3>Direitos autorais</h3><p>Use apenas arquivos que você tenha autorização para compartilhar em família. Mesmo em ambiente privado, os direitos musicais continuam válidos.</p></div></aside></div>`;
}
function renderPlayer() {
  const song = state.playingSong;
  const ranked = !!state.session;
  return `<div class="player-screen"><div class="player-aurora aurora-one"></div><div class="player-aurora aurora-two"></div>
  <header class="player-header"><button class="player-exit" data-action="exit-player">${svg('back',20)} Sair</button><div class="player-song"><span class="player-song-icon" style="--song-accent:${song.accent}">${svg('music',22)}</span><div><strong>${esc(song.title)}</strong><span>${esc(song.artist)}</span></div></div><div class="player-right"><span class="stage-mode">${ranked ? `${svg('mic',16)} PONTUAÇÃO ATIVA` : 'MODO APRESENTAÇÃO'}</span><button class="player-icon-button" data-action="fullscreen" aria-label="Tela cheia">${svg('fullscreen',20)}</button></div></header>
  <section class="player-stage"><div class="singer-label">${svg('spark',18)} NO PALCO: <b>${esc(state.singerOnStage)}</b></div>
  <div id="countdown" class="countdown" hidden>3</div>
  <div class="lyric-deck"><p id="lyric-previous" class="lyric-previous"></p><div id="lyric-current" class="lyric-current" aria-live="off"><span>O show vai começar…</span></div><p id="lyric-next" class="lyric-next"></p></div>
  <div class="pitch-board"><div class="pitch-board-heading"><span>${svg('music',17)} GUIA DE MELODIA</span><span id="pitch-status">${ranked?'Encontre as notas no ritmo':'Acompanhe a letra e divirta-se'}</span></div><div id="pitch-lane" class="pitch-lane"></div></div>
  <div class="stage-feedback" id="stage-feedback">${ranked?'Encontre o tom':'SOLTE A VOZ!'}</div></section>
  <footer class="player-footer"><div class="score-panel"><span class="score-caption">SUA PONTUAÇÃO</span><b id="live-score">${ranked?'0':'—'}</b><span id="live-combo" class="combo">${ranked?'0 COMBO':'SEM PONTUAÇÃO'}</span></div>
    <div class="player-transport"><div class="progress-line"><span id="player-current-time">0:00</span><div class="progress-track"><div id="progress-fill"></div></div><span>${timeLabel(song.duration)}</span></div><div class="transport-controls"><button data-action="restart" class="player-icon-button" title="Recomeçar" aria-label="Recomeçar música">${svg('repeat',22)}</button><button data-action="toggle-pause" id="pause-button" class="pause-main" aria-label="Pausar">${svg('pause',25)}</button><button data-action="exit-player" class="player-icon-button" title="Sair" aria-label="Encerrar apresentação">${svg('close',23)}</button></div></div>
    <div class="mic-signal"><div id="signal-dot" class="signal-dot ${ranked?'active':''}"></div><div><b id="signal-label">${ranked?'MIC ATIVO':'MODO LIVRE'}</b><span id="live-pitch">${ranked?'Aguardando voz…':'Boa apresentação!'}</span></div></div></footer>
  </div>`;
}
function renderResult() {
  const result = state.result;
  const rank = result.rated ? rankFromScore(result.score) : { emoji: '🎙️', label: 'O show é seu', level: '—' };
  return `<div class="result-screen"><div class="result-glow"></div><button class="back-link result-back" data-action="navigate" data-page="home">${svg('back',18)} Voltar ao início</button><div class="result-content"><div class="eyebrow">${svg('spark',18)} FIM DA APRESENTAÇÃO</div><div class="result-medal">${rank.emoji}</div><h1>${result.rated?'SHOW DE BOLA!':'QUE SHOW!'}</h1><p class="result-subtitle">${esc(state.singerOnStage)}, ${result.rated?'seu desempenho entrou para a história!':'você comandou esse palco!'}</p>
  <div class="result-score-box"><span>${result.rated?'PONTUAÇÃO FINAL':'APRESENTAÇÃO CONCLUÍDA'}</span><b>${result.rated?formatPoints(result.score):'♫'}</b><strong>${rank.label}</strong></div>
  ${result.rated ? `<div class="result-metrics"><div><b>${result.accuracy}%</b><span>AFINAÇÃO MÉDIA</span></div><div><b>${result.coverage}%</b><span>TEMPO COM VOZ</span></div><div><b>${result.combo}×</b><span>MAIOR COMBO</span></div><div><b>${result.perfect}%</b><span>NOTAS PERFEITAS</span></div></div>` : `<p class="result-unrated">Sem pontuação competitiva: conecte um microfone e utilize uma música com mapa de notas para entrar no ranking.</p>`}
  <p class="result-song">♫ ${esc(state.playingSong.title)} · ${esc(state.playingSong.artist)}</p><div class="result-actions"><button class="btn btn-outline" data-action="navigate" data-page="songs">${svg('music',18)} Outra música</button><button class="btn btn-primary" data-action="again">${svg('repeat',18)} Cantar novamente</button>${data.queue.length?`<button class="btn btn-outline" data-action="play-queue">${svg('queue',18)} Próximo da fila</button>`:''}</div></div></div>`;
}
function render() {
  document.body.classList.toggle('reduced-motion', !!data.settings.reducedMotion);
  if (state.page === 'player') app.innerHTML = renderPlayer();
  else if (state.page === 'result') app.innerHTML = renderResult();
  else {
    const body = {
      home: renderHome, songs: renderSongs, queue: renderQueue, ranking: renderRanking,
      settings: renderSettings, setup: renderSetup, import: renderImport, cloud: renderCloud, midi4you: renderMidi4You,
      repertoire: () => renderRepertoirePage({ index:state.repertoireIndex,prefs:state.repertoirePrefs,
        search:state.repertoireSearch,installed:state.imported,
        busy:state.repertoireBusy||state.repertoireInstalling,progress:state.repertoireProgress,header,esc }), 'family-remote': renderFamilyRemote
    }[state.page] || renderHome;
    app.innerHTML = `<div class="app-layout">${sidebar()}<div class="main-wrapper">${topbar()}<main class="page-content" id="main">${body()}</main></div></div>`;
  }
  if (state.page === 'setup' || state.page === 'settings') updateMeter();
  if (state.page === 'family-remote') showFamilyRemoteQr();
  updateRemoteCatalog();
}
function setPage(page) {
  if (state.page === 'player' && page !== 'player') stopShow();
  if (state.page === 'setup' && page !== 'setup' && page !== 'player') mic.stop();
  if (state.page === 'settings' && page !== 'settings') mic.stop();
  state.page = page;
  window.scrollTo(0,0);
  render();
}
function goSong(id, queueId = null, singer = null) {
  if (!songFor(id)) { notify('Essa música não está mais disponível.', 'error'); return; }
  state.selectedId = id;
  state.activeQueueId = queueId;
  if (singer) data.singer = cleanSinger(singer);
  setPage('setup');
}
function enqueue(songId, singer = data.singer) {
  if(!songFor(songId))return;
  data.queue.push({ id: makeId(), songId, singer: cleanSinger(singer) });
  save(); notify('Música adicionada à fila do show.'); render();
}
function makeId() { return globalThis.crypto?.randomUUID?.() || `ks-${Date.now()}-${Math.floor(Math.random()*1e6)}`; }
function queueNext() {
  const next = data.queue.find(item => songFor(item.songId));
  if (!next) { notify('Não há músicas disponíveis na fila.'); setPage('queue'); return; }
  goSong(next.songId, next.id, next.singer);
}
async function connectMic() {
  if (mic.connected) { mic.stop(); notify('Microfone desconectado.'); render(); return; }
  try {
    await mic.connect(data.settings.preferredDeviceId, data.settings.sensitivity);
    notify('Microfone conectado. Sua voz será analisada somente neste aparelho.');
    render();
  } catch (err) {
    const reasons = {
      NotAllowedError: 'Permissão negada. Autorize o microfone nas configurações do navegador.',
      NotFoundError: 'Nenhum microfone encontrado. Conecte um microfone USB ou compatível.',
      NotReadableError: 'O microfone está ocupado por outro aplicativo.'
    };
    notify(reasons[err.name] || err.message || 'Falha ao iniciar o microfone.', 'error');
  }
}
function updateMeter() {
  const meter = document.getElementById('mic-meter');
  const note = document.getElementById('mic-note');
  if (!meter || !mic.connected) return;
  meter.style.width = `${Math.min(100,Math.round(mic.current.rms*650))}%`;
  if (note) note.textContent = mic.current.hz ? noteName(hzToMidi(mic.current.hz)) : 'Aguardando voz…';
}
async function startShow() {
  const song = selected();
  data.singer = cleanSinger(document.getElementById('singer')?.value || data.singer);
  save();
  state.singerOnStage = data.singer;
  const canScore = mic.connected && scoreable(song);
  state.session = canScore ? new ScoreSession(song, data.settings) : null;
  state.engine = song.source === 'original' ? new OriginalAudioEngine() : song.midi ? (data.settings.midiEngine === 'soundfont' ? new SampledMidiAudioEngine() : new MidiAudioEngine()) : new UploadedAudioEngine();
  state.playingSong = song;
  state.isPaused = false; state.result = null; state.lastSampleTime = -Infinity;
  state.lastVisualTime = -Infinity; state.lastLyricKey = '';
  try {
    // Reprodução somente após clique explícito. Importações iniciam sem contagem para respeitar autoplay.
    const audioOptions={ volume: data.settings.volume, guide: data.settings.guide, countdown: song.source === 'original' ? 3 : 0,
      quality: data.settings.midiQuality, reverb: data.settings.midiReverb ? .12 : 0, drums: data.settings.midiDrums };
    try {
      await state.engine.start(song, audioOptions);
    } catch (soundfontError) {
      if (!(state.engine instanceof SampledMidiAudioEngine)) throw soundfontError;
      state.engine.stop();
      state.engine=new MidiAudioEngine();
      await state.engine.start(song,audioOptions);
      notify('SoundFont indisponível: '+soundfontError.message+'. Sintetizador leve ativado.','error');
    }
  } catch (err) {
    state.engine?.stop(); state.engine = null; state.session = null;
    notify(`Não foi possível iniciar o áudio: ${err.message}`, 'error'); return;
  }
  state.page = 'player'; render();
  state.raf = requestAnimationFrame(tick);
}
function stopShow() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;
  state.engine?.stop(); state.engine = null; mic.stop();
  state.isPaused = false;
}
function finishShow() {
  if (state.page !== 'player') return;
  state.result = state.session ? state.session.finish() : { rated: false };
  if (state.result.rated) {
    data.results.unshift({ ...state.result, singer: state.singerOnStage, songId: state.playingSong.id, songTitle: state.playingSong.title, date: new Date().toISOString() });
    data.results = data.results.slice(0, 200);
  }
  if (state.activeQueueId) data.queue = data.queue.filter(item => item.id !== state.activeQueueId);
  state.activeQueueId = null;
  save();
  stopShow(); state.page = 'result'; render();
}
function updateLyrics(pos) {
  const song = state.playingSong;
  const lines = song.lines;
  if (!lines?.length) {
    if (state.lastLyricKey !== 'no-lyrics') {
      document.getElementById('lyric-previous').textContent = '';
      document.getElementById('lyric-current').textContent = '♪ Instrumental livre — solte sua voz ♪';
      document.getElementById('lyric-next').textContent = 'Adicione uma letra LRC para acompanhar os versos.';
      updatePitchLane(null, pos);
      state.lastLyricKey = 'no-lyrics';
    }
    return;
  }
  let index = lines.findIndex(line => pos >= line.start && pos < line.end);
  if (index < 0) {
    index = lines.findIndex(line => pos < line.start);
    if (index < 0) index = lines.length;
  }
  const active = lines[index];
  const previous = lines[index-1];
  const next = lines[index+1];
  const currentKey = `${index}:${Math.floor(pos*12)}`;
  // Atualiza o destaque palavra-a-palavra sem remontar o restante do aplicativo.
  if (state.lastLyricKey !== currentKey) {
    document.getElementById('lyric-previous').textContent = previous?.text || '';
    document.getElementById('lyric-next').textContent = next?.text || '';
    const current = document.getElementById('lyric-current');
    if (active && pos >= active.start) {
      current.innerHTML = active.words.map(word => `<span class="word ${pos>=word.end?'sung':pos>=word.start?'singing':''}">${esc(word.text)}</span>`).join(' ');
    } else if (active) {
      current.textContent = '♪  Prepare sua voz  ♪';
    } else current.textContent = 'Muito obrigado pelo show!';
    updatePitchLane(active, pos);
    state.lastLyricKey = currentKey;
  }
}
function updatePitchLane(line, pos) {
  const lane = document.getElementById('pitch-lane');
  if (!lane) return;
  if (!line) { lane.innerHTML = '<span class="pitch-placeholder">♫</span>'; return; }
  const words = line.words.filter(word => Number.isFinite(word.midi));
  if (!words.length) { lane.innerHTML = '<span class="pitch-placeholder">♪ ♪ ♪</span>'; return; }
  const min = Math.min(...words.map(w=>w.midi)) - 2;
  const max = Math.max(...words.map(w=>w.midi)) + 2;
  const span = Math.max(1, max-min);
  lane.innerHTML = words.map(word => {
    const left = 100*(word.start-line.start)/(line.end-line.start);
    const width = 100*(word.end-word.start)/(line.end-line.start);
    const bottom = 10 + 72*(word.midi-min)/span;
    const active = pos >= word.start && pos < word.end ? 'note-now' : pos >= word.end ? 'note-past' : '';
    return `<div class="pitch-note ${active}" style="left:${left.toFixed(2)}%;width:${Math.max(1,width-0.5).toFixed(2)}%;bottom:${bottom.toFixed(1)}%" title="${esc(noteName(word.midi))}"></div>`;
  }).join('') + `<div class="pitch-cursor" style="left:${Math.min(100,Math.max(0,100*(pos-line.start)/(line.end-line.start))).toFixed(1)}%"></div>`;
}
function tick(now) {
  if (state.page !== 'player' || !state.engine) return;
  const pos = state.engine.position();
  if (!state.isPaused && pos >= state.playingSong.duration) { finishShow(); return; }
  const countdown = document.getElementById('countdown');
  const deck = document.querySelector('.lyric-deck');
  if (pos < 0 && !state.isPaused) {
    countdown.hidden = false; countdown.textContent = Math.max(1, Math.ceil(-pos));
    deck?.classList.add('dimmed');
  } else { countdown.hidden = true; deck?.classList.remove('dimmed'); }
  if (!state.isPaused && pos >= 0 && state.session && now - state.lastSampleTime >= 85) {
    const shifted = Math.max(0, pos + data.settings.latencyMs / 1000);
    state.session.sample(shifted, mic.current);
    state.lastSampleTime = now;
  }
  if (now - state.lastVisualTime >= 65 || state.isPaused) {
    const t = Math.min(Math.max(0, pos), state.playingSong.duration);
    document.getElementById('progress-fill').style.width = `${100*t/state.playingSong.duration}%`;
    document.getElementById('player-current-time').textContent = timeLabel(t);
    updateLyrics(t);
    const live = document.getElementById('live-score');
    if (state.session) {
      live.textContent = formatPoints(state.session.score);
      document.getElementById('live-combo').textContent = `${state.session.combo}× COMBO`;
      document.getElementById('stage-feedback').textContent = state.isPaused?'PAUSADO':state.session.lastFeedback;
      document.getElementById('live-pitch').textContent = mic.current.hz ? noteName(hzToMidi(mic.current.hz)) : 'Aguardando voz…';
      document.getElementById('signal-dot').style.opacity = mic.current.rms > data.settings.sensitivity ? '1' : '.3';
    } else document.getElementById('stage-feedback').textContent = state.isPaused?'PAUSADO':'SOLTE A VOZ!';
    state.lastVisualTime = now;
  }
  state.raf = requestAnimationFrame(tick);
}
async function togglePause() {
  if (!state.engine) return;
  try {
    if (state.isPaused) await state.engine.resume(); else await state.engine.pause();
    state.isPaused = !state.isPaused;
    const button = document.getElementById('pause-button');
    if (button) { button.innerHTML = svg(state.isPaused ? 'play' : 'pause',25); button.setAttribute('aria-label',state.isPaused?'Retomar':'Pausar'); }
  } catch (err) { notify(`Não foi possível ${state.isPaused?'retomar':'pausar'}: ${err.message}`, 'error'); }
}


async function handleUltraStarZip(form){
  if(state.ultraBusy||state.demoBusy)return;
  const file=new FormData(form).get('archive');
  if(!(file instanceof File)||!file.size||!/\.zip$/i.test(file.name)){
    notify('Selecione um ZIP UltraStar válido.','error');return;
  }
  state.ultraBusy=true;state.ultraReport=null;state.ultraProgress='Lendo as faixas UltraStar…';render();
  try{
    state.ultraReport=await importUltraStarZip(file,{
      existingSongs:state.imported,save:saveImport,
      onProgress:p=>{
        state.ultraProgress='Pacotes: '+p.processed+' de '+p.candidates+' · '+p.imported+' adicionadas · '+p.failed+' falhas';
        const el=document.getElementById('ultra-status');if(el)el.textContent=state.ultraProgress;
      }
    });
    state.imported=await listImports();
    const r=state.ultraReport;
    state.ultraProgress='Concluído: '+r.imported+' músicas UltraStar adicionadas, '+r.duplicates+' repetidas e '+r.failed+' falhas.';
    notify(state.ultraProgress,r.failed?'error':'');
  }catch(error){
    state.ultraProgress='Falha no ZIP UltraStar: '+(error?.message||error);
    notify(state.ultraProgress,'error');
    try{state.imported=await listImports();}catch{}
  }finally{state.ultraBusy=false;render();}
}
async function handleDemoInstall(ids){
  if(state.demoBusy||state.ultraBusy)return;
  state.demoBusy=true;state.ultraProgress='Preparando músicas com licença Creative Commons…';render();
  let added=0,duplicates=0,failed=0;
  try{
    for(const id of ids){
      try{
        const result=await installOpenTestSong(id,{
          existingSongs:state.imported,save:saveImport,
          onProgress:message=>{
            state.ultraProgress=message;
            const el=document.getElementById('ultra-status');if(el)el.textContent=message;
          }
        });
        if(result.status==='imported'){
          added++;
          state.imported=await listImports();
        }else duplicates++;
      }catch(error){
        failed++;notify('Não foi possível baixar a demonstração: '+(error?.message||error),'error');
      }
    }
    state.ultraProgress='Demonstrações: '+added+' instaladas · '+duplicates+' já presentes · '+failed+' falhas.';
    if(!failed)notify(state.ultraProgress);
  }finally{
    state.demoBusy=false;render();
  }
}

async function handleZipImport(form) {
  if(state.zipBusy)return;
  const archive=new FormData(form).get('archive');
  if(!(archive instanceof File)||!archive.size||!/\.zip$/i.test(archive.name)){
    notify('Selecione um arquivo .zip válido.','error');return;
  }
  state.zipBusy=true;state.zipReport=null;state.zipProgress='Verificando o pacote…';render();
  try{
    const result=await importKaraokeZip(archive,{
      existingSongs:state.imported,
      save:saveImport,
      onProgress(progress){
        state.zipProgress='Verificados '+progress.processed+' de '+progress.relevant+' arquivos MIDI/KAR · '+progress.imported+' importados · '+progress.duplicates+' duplicados · '+progress.failed+' falhas.';
        const status=document.getElementById('zip-status');
        if(status)status.textContent=state.zipProgress;
      }
    });
    state.zipReport=result;
    state.imported=await listImports();
    state.zipProgress='Importação concluída: '+result.imported+' músicas adicionadas, '+result.duplicates+' duplicadas, '+result.unsupportedMK1+' MK1 não suportados e '+result.failed+' falhas.';
    notify('Pacote analisado: '+result.imported+' músicas KAR/MIDI adicionadas.');
  }catch(error){
    state.zipProgress='Falha na leitura do ZIP: '+(error?.message||'erro desconhecido');
    notify(state.zipProgress,'error');
    try{state.imported=await listImports();}catch{}
  }finally{state.zipBusy=false;render();}
}

async function handleImport(form) {
  if (state.importBusy) return;
  const fields = new FormData(form);
  const audio = fields.get('audio'), lrc = fields.get('lrc'), notesFile = fields.get('notes');
  const isMidi = audio instanceof File && isMidiName(audio.name);
  if (!(audio instanceof File) || !audio.size || (!isMidi && (!(lrc instanceof File) || !lrc.size))) {
    notify('Selecione a música e, para arquivos de áudio, a letra .lrc.', 'error'); return;
  }
  if (audio.size > 150 * 1024 * 1024) { notify('Áudio acima do limite de 150 MB.', 'error'); return; }
  if (lrc.size > 1024 * 1024 || (notesFile?.size || 0) > 1024 * 1024) { notify('LRC ou JSON acima do limite de 1 MB.', 'error'); return; }
  state.importBusy = true; render();
  try {
    const midiData = isMidi ? await parseMidiFile(audio) : null;
    const duration = midiData?.duration || await fileAudioDuration(audio);
    if (duration > 1800) throw new Error('Música acima do limite de 30 minutos.');
    const lines = lrc instanceof File && lrc.size
      ? parseLrc(await lrc.text(),duration)
      : (midiData?.lines || []);
    if (!lines.length && !isMidi) throw new Error('O arquivo LRC não contém linhas com tempo.');
    let fullLines = lines;
    if (notesFile instanceof File && notesFile.size) {
      const map = parseNoteMap(JSON.parse(await notesFile.text()), duration);
      fullLines = addNotesToLines(lines, map);
    }
    const song = {
      id: `import-${makeId()}`, source: 'import',
      title: String(fields.get('title')).trim().slice(0,80),
      artist: String(fields.get('artist')).trim().slice(0,80),
      genre: 'Minhas músicas', mood: 'Faixa local', bpm: midiData?.bpm || null, root: 48,
      accent: '#26bfcb', glow: '#7962ff', icon: '♪', duration,
      lines: fullLines, audioBlob: audio, midi: isMidi
    };
    if (!song.title || !song.artist) throw new Error('Informe o título e o artista.');
    await saveImport(song);
    state.imported.push(song);
    notify(`${song.title} foi adicionada. ${scoreable(song)?'Pontuação habilitada.':'Modo livre disponível.'}`);
    state.page = 'songs'; state.search = ''; state.filter = 'Todas';
  } catch (err) { notify(`Não foi possível importar: ${err.message}`, 'error'); }
  finally { state.importBusy = false; render(); }
}

const REPERTOIRE_AUTO_DAY_KEY='karaoke-show-repertoire-last-auto-day';

function repertoireProgress(message) {
  state.repertoireProgress=message;
  const el=document.getElementById('repertoire-status');
  if(el)el.textContent=message;
}
async function loadRepertoireIndex(announce=false) {
  if(state.repertoireBusy)return;
  state.repertoireBusy=true;
  repertoireProgress('Buscando índice de músicas e licenças…');
  if(state.page==='repertoire')render();
  try{
    state.repertoireIndex=await fetchRepertoireIndex();
    const count=state.repertoireIndex.items.length;
    repertoireProgress(count+' referências encontradas. '+state.repertoireIndex.items.filter(x=>x.ready).length+' karaokês elegíveis para instalar.');
    if(announce)notify('Catálogo atualizado: '+count+' referências.');
  }catch(error){
    repertoireProgress('Não foi possível carregar o catálogo: '+error.message);
    if(announce)notify(state.repertoireProgress,'error');
  }finally{
    state.repertoireBusy=false;
    if(state.page==='repertoire')render();
  }
  if(state.repertoirePrefs.autoInstall){
    await maybeAutoInstall();
  }
}
async function handleRepertoireInstall(ids=null,{automatic=false,limit=5}={}) {
  if(state.repertoireInstalling||state.repertoireBusy)return;
  const list=ids
    ? ids.map(id=>state.repertoireIndex?.items?.find(x=>x.id===id)).filter(Boolean)
    : downloadableRepertoire(state.repertoireIndex,state.repertoirePrefs,{
        installed:state.imported,max:limit
      });
  if(!list.length){
    if(!automatic)notify('Não há karaokês autorizados para instalar com estes filtros.');
    return;
  }
  state.repertoireInstalling=true;
  let saved=0,skipped=0,failed=0,used=0;
  if(state.page==='repertoire')render();
  try{
    for(const item of list){
      if(automatic && used+(item.audioBytes||0)>30*1024*1024){
        skipped++;continue;
      }
      try{
        const result=await installRepertoireUltraStar(item,{
          existingSongs:state.imported,save:saveImport,
          onProgress:message=>repertoireProgress(message)
        });
        if(result.status==='imported'){
          saved++;used+=result.bytes||item.audioBytes||0;
          state.imported=await listImports();
          updateRemoteCatalog();
        }else skipped++;
      }catch(error){
        failed++;
        repertoireProgress('Não foi possível instalar '+item.title+': '+(error?.message||error));
      }
    }
    const result='Repertório: '+saved+' instaladas, '+skipped+' ignoradas e '+failed+' falhas.';
    repertoireProgress(result);
    if(!automatic||saved||failed)notify(result,failed?'error':'');
  }finally{
    state.repertoireInstalling=false;
    if(state.page==='repertoire')render();
  }
}
async function maybeAutoInstall() {
  if(!state.repertoirePrefs.autoInstall||!state.repertoireIndex?.items?.length||
     state.repertoireInstalling || !navigator.onLine || navigator.connection?.saveData)return;
  const today=new Date().toISOString().slice(0,10);
  try{if(localStorage.getItem(REPERTOIRE_AUTO_DAY_KEY)===today)return;}catch{}
  const list=downloadableRepertoire(state.repertoireIndex,state.repertoirePrefs,{
    installed:state.imported,max:3
  });
  try{localStorage.setItem(REPERTOIRE_AUTO_DAY_KEY,today);}catch{}
  if(list.length)await handleRepertoireInstall(list.map(x=>x.id),{automatic:true,limit:3});
}

async function handleAction(action, el) {
  switch (action) {
    case 'navigate': setPage(el.dataset.page); break;
    case 'cloud-refresh': await refreshCloud(true); break;
    case 'install-ultrastar-demo': await handleDemoInstall([el.dataset.demo]); break;
    case 'install-ultrastar-demos': await handleDemoInstall(OPEN_TEST_SONGS.map(x=>x.id)); break;
    case 'repertoire-refresh': await loadRepertoireIndex(true); break;
    case 'repertoire-install': await handleRepertoireInstall([el.dataset.song]); break;
    case 'repertoire-install-batch': await handleRepertoireInstall(null); break;
    case 'midi4you-filter': state.midi4youGenre=el.dataset.genre || 'Todas'; render(); break;
    case 'cloud-recovery-toggle': state.cloudRecoveryMode = state.cloudRecoveryMode ? '' : 'request'; state.cloudError=''; render(); break;
    case 'cloud-logout': logoutAdmin(); state.cloudAdmin = false; state.cloudSongs=[]; state.cloudError=''; render(); break;
    case 'select-song': goSong(el.dataset.id); break;
    case 'filter': state.filter = el.dataset.filter; render(); break;
    case 'toggle-mic': await connectMic(); break;
    case 'start': await startShow(); break;
    case 'exit-player': stopShow(); setPage('songs'); break;
    case 'toggle-pause': await togglePause(); break;
    case 'restart': { const oldId = state.playingSong.id; stopShow(); state.selectedId = oldId; state.page = 'setup'; render(); notify('Preparado para recomeçar.'); break; }
    case 'fullscreen': {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
      catch { notify('Tela cheia não está disponível neste navegador.', 'error'); }
      break;
    }
    case 'queue-add': enqueue(el.dataset.id); setPage('queue'); break;
    case 'play-queue': queueNext(); break;
    case 'queue-remove': data.queue = data.queue.filter(item => item.id !== el.dataset.queue); save(); render(); break;
    case 'queue-up': case 'queue-down': {
      const index = data.queue.findIndex(item => item.id === el.dataset.queue);
      const neighbor = index + (action === 'queue-up' ? -1 : 1);
      if (index >= 0 && neighbor >= 0 && neighbor < data.queue.length) {
        [data.queue[index],data.queue[neighbor]] = [data.queue[neighbor],data.queue[index]];
        save(); render();
      } break;
    }
    case 'again': goSong(state.playingSong.id); break;
    case 'delete-import': {
      const song = songFor(el.dataset.id);
      if (!song || !confirm(`Remover "${song.title}" e seu áudio do armazenamento local?`)) break;
      await removeImport(song.id);
      state.imported = state.imported.filter(item => item.id !== song.id);
      data.queue = data.queue.filter(item => item.songId !== song.id); save(); render(); notify('Música removida.'); break;
    }
    case 'clear-ranking': if (confirm('Apagar todas as pontuações deste aparelho?')) { data.results = []; save(); render(); } break;
  }
}
app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  handleAction(button.dataset.action, button).catch(err => notify(`Falha: ${err.message}`, 'error'));
});
app.addEventListener('change',event=>{
  const el=event.target;
  const prefs=state.repertoirePrefs;
  const genre=el.dataset?.repertoireGenre;
  const key=el.dataset?.repertoirePref;
  if(!genre&&!key)return;
  if(genre){
    prefs.genres=el.checked
      ? [...new Set([...prefs.genres,genre])]
      : prefs.genres.filter(x=>x!==genre);
  } else if(key==='autoInstall') prefs.autoInstall=!!el.checked;
  else if(['country','language','type'].includes(key))prefs[key]=el.value;
  else if(key==='quantity')prefs.quantity=Number(el.value);
  state.repertoirePrefs=saveRepertoirePreferences(prefs);
  render();
  if(key==='autoInstall'&&state.repertoirePrefs.autoInstall)
    maybeAutoInstall().catch(error=>notify('Instalação automática: '+error.message,'error'));
});
app.addEventListener('submit', event => {
  if (event.target.id === 'import-form') { event.preventDefault(); handleImport(event.target); }
  if (event.target.id === 'zip-import-form') { event.preventDefault(); handleZipImport(event.target); }
  if (event.target.id === 'ultrastar-zip-form') { event.preventDefault(); handleUltraStarZip(event.target); }
  if (event.target.id === 'cloud-login-form') { event.preventDefault(); handleCloudLogin(event.target); }
  if (event.target.id === 'cloud-recovery-email-form') { event.preventDefault(); handleRecoveryEmail(event.target); }
  if (event.target.id === 'cloud-recovery-password-form') { event.preventDefault(); handleRecoveryPassword(event.target); }
  if (event.target.id === 'cloud-upload-form') { event.preventDefault(); handleCloudUpload(event.target); }
});
app.addEventListener('input', event => {
  const target = event.target;
  if (target.id === 'repertoire-search') {
    state.repertoireSearch=target.value;
    const pos=target.selectionStart;render();
    const input=document.getElementById('repertoire-search');
    input?.focus();input?.setSelectionRange(pos,pos);return;
  }
  if (target.id === 'midi4you-search') { state.midi4youSearch=target.value; const pos=target.selectionStart; render(); const input=document.getElementById('midi4you-search'); input?.focus(); input?.setSelectionRange(pos,pos); return; }
  if (target.id === 'song-search') { state.search = target.value; const p = target.selectionStart; render(); const input = document.getElementById('song-search'); input?.focus(); input?.setSelectionRange(p,p); return; }
  if (target.id === 'singer') { data.singer = cleanSinger(target.value); save(); return; }
  if (!target.dataset.setting) return;
  const key = target.dataset.setting;
  if (['guide','octaveFlexible','reducedMotion','midiReverb','midiDrums'].includes(key)) data.settings[key] = target.checked;
  else if (key === 'midiQuality') data.settings[key] = ['economico','equilibrado','rico'].includes(target.value) ? target.value : 'equilibrado';
  else if (key === 'midiEngine') data.settings[key] = target.value === 'soundfont' ? 'soundfont' : 'light';
  else if (key === 'volume') data.settings[key] = Number(target.value)/100;
  else if (key === 'sensitivity') data.settings[key] = Number(target.value)/1000;
  else if (key === 'latencyMs') data.settings[key] = Number(target.value);
  if (key === 'volume') document.getElementById('volume-label').textContent = `${target.value}%`;
  if (key === 'sensitivity') document.getElementById('sensitivity-label').textContent = target.value;
  if (key === 'latencyMs') document.getElementById('latency-label').textContent = `${target.value} ms`;
  if (key === 'reducedMotion') document.body.classList.toggle('reduced-motion', target.checked);
  save();
});
window.addEventListener('karaoke-remote-command', event => {
  const request=event.detail;
  if(!request || request.type!=='enqueue' || typeof request.songId!=='string' || !songFor(request.songId))return;
  enqueue(request.songId,typeof request.singer==='string'?request.singer:'Convidado');
  if(state.page!=='player')render();
});
window.addEventListener('online', () => { if (state.page !== 'player') render(); });
window.addEventListener('offline', () => { if (state.page !== 'player') render(); });
installRemoteNavigation({ back: () => {
  if (state.page === 'player') { stopShow(); setPage('songs'); }
  else if (state.page === 'result') setPage('home');
  else if (state.page === 'setup' || state.page === 'import') setPage('songs');
  else if (state.page !== 'home') setPage('home');
}});
setInterval(() => {
  if (state.page === 'setup' || state.page === 'settings') updateMeter();
}, 120);
async function refreshCloud(feedback = false) {
  try { state.cloudSongs = await fetchCloudSongs(); state.cloudError = ''; if (feedback) notify('Catálogo atualizado.'); }
  catch (err) { state.cloudError = 'Catálogo indisponível: ' + err.message; if (feedback) notify(state.cloudError,'error'); }
  render();
}
async function handleCloudLogin(form) {
  if (state.cloudBusy) return;
  const values = new FormData(form); state.cloudBusy = true;
  try { const member=await loginFamily(String(values.get('email')),String(values.get('password'))); state.cloudAdmin = member.admin; await refreshCloud(); notify(member.admin ? 'Administrador autenticado.' : 'Acesso familiar autorizado.'); }
  catch (err) { state.cloudAdmin = false; notify(err.message,'error'); }
  finally { state.cloudBusy = false; render(); }
}
async function handleRecoveryEmail(form) {
  if (state.cloudBusy) return;
  state.cloudBusy = true;
  try {
    await sendPasswordRecovery(String(new FormData(form).get('email') || ''));
    state.cloudRecoveryMode = 'sent'; state.cloudError = '';
    notify('Solicitação enviada. Confira seu e-mail.');
  } catch (err) {
    state.cloudError = 'Não foi possível enviar o link: '+err.message;
    notify(state.cloudError,'error');
  } finally { state.cloudBusy=false; render(); }
}
async function handleRecoveryPassword(form) {
  if (state.cloudBusy) return;
  const values = new FormData(form);
  const pass = String(values.get('password') || '');
  if (pass !== String(values.get('confirm') || '')) { notify('As senhas não coincidem.','error'); return; }
  state.cloudBusy = true;
  try {
    await updatePasswordFromRecovery(pass);
    logoutAdmin();
    state.cloudAdmin = false; state.cloudRecoveryMode = ''; state.cloudError = '';
    notify('Senha alterada. Entre usando a nova senha.');
  } catch (err) {
    state.cloudError = 'Não foi possível alterar a senha: '+err.message;
    notify(state.cloudError,'error');
  } finally { state.cloudBusy=false; render(); }
}
async function handleCloudUpload(form) {
  if (state.cloudBusy) return;
  const f = new FormData(form); state.cloudBusy = true;
  try {
    await uploadCloudSong({title:f.get('title'),artist:f.get('artist'),genre:f.get('genre'),
      audio:f.get('audio'),lrc:f.get('lrc'),notes:f.get('notes'),rights:f.get('rights') === 'on'});
    await refreshCloud(); notify('Música salva no catálogo familiar.');
  } catch (err) { notify('Falha ao publicar: '+err.message,'error'); }
  finally { state.cloudBusy = false; render(); }
}
async function boot() {
  const recovery = await consumePasswordRecoveryRedirect();
  if (recovery) {
    state.page = 'cloud';
    state.cloudRecoveryMode = recovery.status === 'ready' ? 'ready' : 'request';
    if (recovery.status === 'error') state.cloudError = recovery.message;
  }
  try { state.imported = await listImports(); }
  catch (err) { notify(`Armazenamento de músicas indisponível: ${err.message}`, 'error'); }
  render();
  if (cloudUser()) { try { state.cloudAdmin = await verifyAdmin(); } catch {} }
  await refreshCloud();
  if(location.protocol!=='file:')await loadRepertoireIndex(false);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
boot();
