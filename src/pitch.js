/** YIN simplificado, executado localmente em PCM, sem transmissão nem gravação. */
export function detectPitch(samples, sampleRate, minHz = 80, maxHz = 880, sensitivity = 0.012) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return { hz: null, clarity: 0, rms: 0 };
  let rms = 0;
  for (let i = 0; i < samples.length; i += 1) rms += samples[i] * samples[i];
  rms = Math.sqrt(rms / samples.length);
  if (rms < sensitivity) return { hz: null, clarity: 0, rms };
  // Subamostra para reduzir CPU em TV Boxes de baixo desempenho.
  const step = sampleRate >= 32000 ? 2 : 1;
  const rate = sampleRate / step;
  const size = Math.floor(samples.length / step);
  const minTau = Math.max(2, Math.floor(rate / maxHz));
  const maxTau = Math.min(Math.floor(rate / minHz), Math.floor(size / 2) - 1);
  if (maxTau <= minTau) return { hz: null, clarity: 0, rms };
  const diff = new Float32Array(maxTau + 1);
  const window = Math.min(size - maxTau - 1, 900);
  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let j = 0; j < window; j += 1) {
      const d = samples[j * step] - samples[(j + tau) * step];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  // Calcular todas as diferenças normalizadas ANTES de procurar um mínimo local.
  // A etapa seguinte precisa comparar valores na mesma escala; caso contrário,
  // o detector escolhe prematuramente frequências fora de tom.
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += diff[tau];
    diff[tau] = runningSum > 0 ? (diff[tau] * tau) / runningSum : 1;
  }
  let bestTau = -1;
  let bestValue = 1;
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (diff[tau] < 0.17) {
      while (tau + 1 <= maxTau && diff[tau + 1] < diff[tau]) tau += 1;
      bestTau = tau;
      bestValue = diff[tau];
      break;
    }
    if (diff[tau] < bestValue) { bestValue = diff[tau]; bestTau = tau; }
  }
  if (bestTau < minTau || bestValue > 0.26) return { hz: null, clarity: 0, rms };
  const previous = diff[Math.max(1, bestTau - 1)];
  const next = diff[Math.min(maxTau, bestTau + 1)];
  const denominator = 2 * (2 * diff[bestTau] - previous - next);
  const correction = Math.abs(denominator) > 1e-8 ? (next - previous) / denominator : 0;
  const tau = bestTau + Math.max(-0.5, Math.min(0.5, correction));
  const hz = rate / tau;
  if (hz < minHz || hz > maxHz) return { hz: null, clarity: 0, rms };
  return { hz, clarity: Math.max(0, 1 - bestValue), rms };
}

export class Microphone {
  constructor() {
    this.stream = null; this.ctx = null; this.analyser = null; this.buffer = null;
    this.current = { hz: null, clarity: 0, rms: 0 };
    this.timer = null; this.activeDeviceId = '';
  }
  async connect(deviceId = '', sensitivity = 0.012) {
    this.stop();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('O navegador não disponibiliza captura de microfone. Use HTTPS ou localhost.');
    const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 };
    if (deviceId) audio.deviceId = { ideal: deviceId };
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio, video: false }); }
    catch (err) {
      if (!['OverconstrainedError', 'NotSupportedError', 'TypeError'].includes(err.name)) throw err;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('Web Audio não é suportado neste aparelho.');
      this.ctx = new AC();
      await this.ctx.resume();
      this.stream = stream;
      const source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0;
      source.connect(this.analyser); // sem conexão aos alto-falantes: evita realimentação
      this.buffer = new Float32Array(this.analyser.fftSize);
      this.activeDeviceId = stream.getAudioTracks()[0]?.getSettings?.().deviceId || deviceId;
      this.timer = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getFloatTimeDomainData(this.buffer);
        this.current = detectPitch(this.buffer, this.ctx.sampleRate, 80, 880, sensitivity);
      }, 65);
      return this.current;
    } catch (error) {
      stream.getTracks().forEach(track => track.stop());
      this.stop();
      throw error;
    }
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.analyser = null;
    this.buffer = null;
    this.current = { hz: null, clarity: 0, rms: 0 };
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }
  get connected() { return !!this.stream?.getAudioTracks().some(track => track.readyState === 'live'); }
  async devices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'audioinput');
  }
}
