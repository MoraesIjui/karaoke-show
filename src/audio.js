import { midiToHz } from './songs.js';

/** Gerador Web Audio de acompanhamento instrumental original. Nenhum arquivo externo é carregado. */
export class OriginalAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.events = [];
    this.eventIndex = 0;
    this.timer = null;
    this.nodes = new Set();
    this.startAt = 0;
    this.paused = false;
    this.guide = true;
    this.song = null;
    this.noiseBuffer = null;
  }

  buildEvents(song) {
    const beat = 60 / song.bpm;
    const events = [];
    const durationBeats = Math.floor(song.duration / beat);
    const roots = [song.root, song.root + 5, song.root + 7, song.root + 3];
    for (let bar = 0; bar * 4 < durationBeats; bar += 1) {
      const at = bar * 4 * beat;
      const root = roots[Math.floor(bar / 2) % roots.length];
      // Harmonias suaves com sétima opcional; baixo e bateria original sintetizados.
      events.push({ type: 'chord', at, dur: 4 * beat, root, velocity: 0.16 });
      for (let b = 0; b < 4; b += 1) {
        const t = at + b * beat;
        events.push({ type: 'bass', at: t, dur: beat * 0.65, midi: root - 12 + (b === 3 ? 7 : 0), velocity: b === 0 ? 0.22 : 0.16 });
        events.push({ type: b % 2 === 0 ? 'kick' : 'snare', at: t, dur: 0.15 });
        events.push({ type: 'hat', at: t, dur: 0.07 });
        events.push({ type: 'hat', at: t + beat * 0.5, dur: 0.05 });
      }
    }
    for (const line of song.lines) {
      for (const word of line.words) {
        if (Number.isFinite(word.midi)) {
          events.push({ type: 'guide', at: word.start, dur: Math.max(0.08, word.end - word.start) * 0.83, midi: word.midi, velocity: 0.11 });
        }
      }
    }
    return events.sort((a, b) => a.at - b.at);
  }

  async start(song, { volume = 0.7, guide = true, countdown = 3 } = {}) {
    this.stop();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Este navegador não suporta reprodução Web Audio.');
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = Math.max(0, Math.min(1, volume)) * 0.55;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 9;
    limiter.ratio.value = 5;
    this.master.connect(limiter);
    limiter.connect(this.ctx.destination);
    this.guide = guide;
    this.song = song;
    this.events = this.buildEvents(song);
    this.eventIndex = 0;
    this.paused = false;
    this.startAt = this.ctx.currentTime + countdown;
    this.noiseBuffer = this.makeNoiseBuffer();
    await this.ctx.resume();
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 100);
  }

  makeNoiseBuffer() {
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 0.24), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  schedule() {
    if (!this.ctx || this.paused) return;
    const now = this.ctx.currentTime;
    while (this.eventIndex < this.events.length) {
      const evt = this.events[this.eventIndex];
      const at = this.startAt + evt.at;
      if (at > now + 0.45) break;
      this.eventIndex += 1;
      if (at < now - 0.15 || (evt.type === 'guide' && !this.guide)) continue;
      this.playEvent(evt, Math.max(now + 0.005, at));
    }
  }

  osc({ at, dur, hz, gain = 0.1, wave = 'sine', attack = 0.01, release = 0.12, filter = null, sweep = null }) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(30, hz), at);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(30, sweep), at + Math.min(dur, 0.18));
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(Math.max(0.0002, gain), at + Math.min(attack, dur / 2));
    envelope.gain.setValueAtTime(Math.max(0.0002, gain), at + Math.max(attack, dur - release));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    if (filter) {
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filter;
      osc.connect(lp); lp.connect(envelope);
    } else osc.connect(envelope);
    envelope.connect(this.master);
    this.nodes.add(osc);
    osc.onended = () => { this.nodes.delete(osc); try { osc.disconnect(); envelope.disconnect(); } catch {} };
    osc.start(at);
    osc.stop(at + dur + 0.01);
  }

  noise(at, dur, gain, highpass) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = highpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(hp); hp.connect(g); g.connect(this.master);
    this.nodes.add(src);
    src.onended = () => { this.nodes.delete(src); try { src.disconnect(); hp.disconnect(); g.disconnect(); } catch {} };
    src.start(at); src.stop(at + dur + 0.001);
  }

  playEvent(evt, at) {
    switch (evt.type) {
      case 'chord': {
        const minor = this.song.key.endsWith('m');
        for (const interval of [0, minor ? 3 : 4, 7]) {
          this.osc({ at, dur: Math.min(2.7, evt.dur * 0.84), hz: midiToHz(evt.root + 12 + interval), gain: evt.velocity / 3, wave: 'triangle', attack: 0.2, release: 0.8, filter: 1300 });
        }
        break;
      }
      case 'bass':
        this.osc({ at, dur: Math.min(0.36, evt.dur), hz: midiToHz(evt.midi), gain: evt.velocity, wave: 'sine', attack: 0.006, release: 0.17 });
        break;
      case 'guide':
        this.osc({ at, dur: evt.dur, hz: midiToHz(evt.midi), gain: evt.velocity, wave: 'triangle', attack: 0.015, release: 0.08 });
        break;
      case 'kick':
        this.osc({ at, dur: 0.19, hz: 140, gain: 0.48, wave: 'sine', attack: 0.003, release: 0.15, sweep: 47 });
        break;
      case 'snare':
        this.noise(at, 0.14, 0.12, 950);
        this.osc({ at, dur: 0.095, hz: 188, gain: 0.045, wave: 'triangle' });
        break;
      case 'hat':
        this.noise(at, evt.dur, 0.052, 6500);
        break;
    }
  }
  position() { return this.ctx ? this.ctx.currentTime - this.startAt : 0; }
  setVolume(value) { if (this.master) this.master.gain.value = Math.max(0, Math.min(1, value)) * 0.55; }
  setGuide(value) { this.guide = !!value; }
  async pause() { if (this.ctx && !this.paused) { this.paused = true; await this.ctx.suspend(); } }
  async resume() { if (this.ctx && this.paused) { await this.ctx.resume(); this.paused = false; } }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    this.nodes.clear();
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null; this.master = null; this.song = null;
    this.events = []; this.eventIndex = 0; this.paused = false;
  }
}

export class UploadedAudioEngine {
  constructor() { this.audio = null; this.url = null; this.paused = false; }
  async start(song, { volume = 0.7 } = {}) {
    this.stop();
    if (!song.audioBlob && !song.audioUrl) throw new Error('Arquivo de áudio não encontrado.');
    this.url = song.audioUrl ? null : URL.createObjectURL(song.audioBlob);
    this.audio = new Audio(song.audioUrl || this.url);
    this.audio.preload = 'auto';
    this.audio.volume = Math.max(0, Math.min(1, volume));
    await this.audio.play(); // ato direto de usuário necessário para liberar reprodução
    this.paused = false;
  }
  position() { return this.audio?.currentTime ?? 0; }
  setVolume(value) { if (this.audio) this.audio.volume = Math.max(0, Math.min(1, value)); }
  setGuide() {}
  async pause() { this.audio?.pause(); this.paused = true; }
  async resume() { if (this.audio) await this.audio.play(); this.paused = false; }
  stop() {
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); }
    this.audio = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null; this.paused = false;
  }
}
