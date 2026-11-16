import { hzToMidi } from './songs.js';

/** Avalia correspondência da altura cantada e a nota-alvo; silêncio vale zero. */
export function pitchQuality(hz, targetMidi, clarity = 1, octaveFlexible = true) {
  if (!Number.isFinite(hz) || hz <= 0 || !Number.isFinite(targetMidi) || clarity < 0.65) return 0;
  const playedMidi = hzToMidi(hz);
  let diff = Math.abs(playedMidi - targetMidi);
  if (octaveFlexible) diff = Math.min(diff % 12, 12 - (diff % 12));
  const cents = diff * 100;
  let quality;
  if (cents <= 30) quality = 1;
  else if (cents <= 75) quality = 1 - ((cents - 30) / 45) * 0.2;
  else if (cents <= 150) quality = 0.8 - ((cents - 75) / 75) * 0.45;
  else if (cents <= 300) quality = 0.35 - ((cents - 150) / 150) * 0.35;
  else quality = 0;
  return Math.max(0, Math.min(1, quality * (0.85 + 0.15 * Math.min(1, clarity))));
}

export function expectedWordAt(song, time) {
  if (!song?.lines?.length || time < 0) return null;
  for (let lineIndex = 0; lineIndex < song.lines.length; lineIndex += 1) {
    const line = song.lines[lineIndex];
    if (time >= line.start && time < line.end) {
      for (let wordIndex = 0; wordIndex < line.words.length; wordIndex += 1) {
        const word = line.words[wordIndex];
        if (time >= word.start && time < word.end) return { lineIndex, wordIndex, word };
      }
    }
  }
  return null;
}

export class ScoreSession {
  constructor(song, settings = {}) {
    this.song = song;
    this.octaveFlexible = settings.octaveFlexible !== false;
    this.reset();
  }
  reset() {
    this.sum = 0;
    this.samples = 0;
    this.voicedSamples = 0;
    this.excellentSamples = 0;
    this.currentKey = null;
    this.currentWordSum = 0;
    this.currentWordSamples = 0;
    this.currentWordVoiced = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hitWords = 0;
    this.totalWords = 0;
    this.lastQuality = 0;
    this.lastFeedback = 'Encontre o tom';
    this.wordScores = [];
  }
  finalizeWord() {
    if (this.currentKey === null) return;
    const mean = this.currentWordSamples ? this.currentWordSum / this.currentWordSamples : 0;
    const coverage = this.currentWordSamples ? this.currentWordVoiced / this.currentWordSamples : 0;
    const success = mean >= 0.62 && coverage >= 0.5;
    this.combo = success ? this.combo + 1 : 0;
    if (success) this.hitWords += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.totalWords += 1;
    this.wordScores.push({ key: this.currentKey, mean, coverage, success });
    this.currentWordSum = 0;
    this.currentWordSamples = 0;
    this.currentWordVoiced = 0;
  }
  sample(time, pitch) {
    const expected = expectedWordAt(this.song, time);
    if (!expected || !Number.isFinite(expected.word.midi)) {
      if (this.currentKey !== null) { this.finalizeWord(); this.currentKey = null; }
      this.lastQuality = 0;
      return null;
    }
    const key = `${expected.lineIndex}:${expected.wordIndex}`;
    if (key !== this.currentKey) {
      this.finalizeWord();
      this.currentKey = key;
    }
    const q = pitchQuality(pitch?.hz, expected.word.midi, pitch?.clarity ?? 0, this.octaveFlexible);
    this.samples += 1;
    this.sum += q;
    this.currentWordSamples += 1;
    this.currentWordSum += q;
    this.lastQuality = q;
    if (pitch?.hz && pitch?.clarity >= 0.65) {
      this.voicedSamples += 1;
      this.currentWordVoiced += 1;
    }
    if (q >= 0.9) this.excellentSamples += 1;
    this.lastFeedback = !pitch?.hz ? 'Cante agora!' : q >= 0.9 ? 'PERFEITO!' : q >= 0.7 ? 'MUITO BOM!' : q >= 0.4 ? 'BOA!' : 'Ajuste o tom';
    return q;
  }
  get score() { return this.samples ? Math.round((this.sum / this.samples) * 100000) : 0; }
  get accuracy() { return this.samples ? Math.round((this.sum / this.samples) * 100) : 0; }
  get coverage() { return this.samples ? Math.round((this.voicedSamples / this.samples) * 100) : 0; }
  get perfect() { return this.samples ? Math.round((this.excellentSamples / this.samples) * 100) : 0; }
  finish() {
    this.finalizeWord();
    this.currentKey = null;
    return {
      score: this.score, accuracy: this.accuracy, coverage: this.coverage,
      perfect: this.perfect, combo: this.maxCombo, hitWords: this.hitWords,
      totalWords: this.totalWords, rated: this.samples > 0
    };
  }
}

export function rankFromScore(score) {
  if (score >= 90000) return { label: 'Lenda do Palco', emoji: '🏆', level: 'S' };
  if (score >= 75000) return { label: 'Estrela do Show', emoji: '⭐', level: 'A' };
  if (score >= 55000) return { label: 'Voz em Ascensão', emoji: '🎤', level: 'B' };
  if (score >= 30000) return { label: 'Talento em Treino', emoji: '🎶', level: 'C' };
  return { label: 'A prática faz o show', emoji: '💜', level: 'D' };
}
