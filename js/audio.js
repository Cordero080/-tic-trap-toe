/* ── audio.js — Web Audio API synthesis, no external deps ──
 *
 *  All sounds are synthesized on the fly — no audio files needed.
 *  getAudio() lazily creates (and resumes) the shared AudioContext.
 *
 *  Exports: playClick, playThud, playRobotVoice, playMatchWin
 * ── */

let _audioCtx = null;

function getAudio() {
  if (!_audioCtx) _audioCtx = new AudioContext();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

/* Short bandpass noise burst — plays on every mark placement */
export function playClick() {
  const ctx = getAudio();
  const len = ctx.sampleRate * 0.07;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 10);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bpf = ctx.createBiquadFilter();
  bpf.type = "bandpass";
  bpf.frequency.value = 5200;
  bpf.Q.value = 1.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.35, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
  src.connect(bpf);
  bpf.connect(g);
  g.connect(ctx.destination);
  src.start();
}

/* Low frequency pitch-drop + synthesized reverb — plays on face win */
export function playThud() {
  const ctx = getAudio();
  const now = ctx.currentTime;

  // Synthesized reverb impulse response — 3 s decaying noise
  const irLen = ctx.sampleRate * 3.0;
  const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = irBuf.getChannelData(ch);
    for (let i = 0; i < irLen; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.4);
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = irBuf;
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.55;
  convolver.connect(wetGain);
  wetGain.connect(ctx.destination);

  // Low-frequency pitch drop — routed dry + wet
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(36, now + 0.4);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(1.0, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination); // dry
  oscGain.connect(convolver); // wet
  osc.start();
  osc.stop(now + 0.55);

  // Noise punch — low-passed, also into reverb
  const nLen = ctx.sampleRate * 0.15;
  const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < nLen; i++)
    nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 3);
  const nSrc = ctx.createBufferSource();
  nSrc.buffer = nBuf;
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 280;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.55, now);
  nSrc.connect(lpf);
  lpf.connect(nGain);
  nGain.connect(ctx.destination); // dry
  nGain.connect(convolver); // wet
  nSrc.start();
}

/* FM sawtooth + waveshaper distortion + metallic reverb.
 * isMatchWin=false → quick droid chirp (face win)
 * isMatchWin=true  → ascending transformer triumph (match win) */
export function playRobotVoice(isMatchWin = false) {
  const ctx = getAudio();
  const now = ctx.currentTime;
  const dur = isMatchWin ? 2.4 : 1.1;

  // Hard waveshaper distortion — transformer crunch
  const distortion = ctx.createWaveShaper();
  const n = 512,
    k = 140;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  distortion.curve = curve;
  distortion.oversample = "4x";

  // Short metallic reverb
  const irLen = ctx.sampleRate * 1.6;
  const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = irBuf.getChannelData(ch);
    for (let i = 0; i < irLen; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.8);
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = irBuf;
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.38;
  reverb.connect(reverbGain);
  reverbGain.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.55, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + dur);
  master.connect(ctx.destination);
  master.connect(reverb);

  // FM carrier — sawtooth for rich robotic harmonics
  const carrier = ctx.createOscillator();
  carrier.type = "sawtooth";
  if (isMatchWin) {
    // Ascending transformer triumph — staircase sweeps
    carrier.frequency.setValueAtTime(80, now);
    carrier.frequency.linearRampToValueAtTime(200, now + 0.28);
    carrier.frequency.setValueAtTime(155, now + 0.3);
    carrier.frequency.linearRampToValueAtTime(310, now + 0.75);
    carrier.frequency.setValueAtTime(230, now + 0.78);
    carrier.frequency.linearRampToValueAtTime(520, now + 1.6);
    carrier.frequency.linearRampToValueAtTime(880, now + 2.2);
  } else {
    // Quick droid chirp — two punchy rises
    carrier.frequency.setValueAtTime(220, now);
    carrier.frequency.linearRampToValueAtTime(440, now + 0.18);
    carrier.frequency.setValueAtTime(200, now + 0.2);
    carrier.frequency.linearRampToValueAtTime(480, now + 0.6);
    carrier.frequency.setValueAtTime(320, now + 0.62);
    carrier.frequency.linearRampToValueAtTime(660, now + 0.95);
  }

  // FM modulator — metallic formant texture
  const modulator = ctx.createOscillator();
  modulator.type = "sine";
  modulator.frequency.value = isMatchWin ? 55 : 75;
  const modGain = ctx.createGain();
  modGain.gain.value = isMatchWin ? 200 : 260;
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  const carrierGain = ctx.createGain();
  carrierGain.gain.value = 0.85;
  carrier.connect(carrierGain);
  carrierGain.connect(distortion);
  distortion.connect(master);

  carrier.start(now);
  modulator.start(now);
  carrier.stop(now + dur);
  modulator.stop(now + dur);

  // Ring modulation shimmer on match win only
  if (isMatchWin) {
    const ringBase = ctx.createOscillator();
    ringBase.type = "sine";
    ringBase.frequency.setValueAtTime(1100, now + 0.25);
    ringBase.frequency.exponentialRampToValueAtTime(220, now + 2.0);
    const ringMod = ctx.createOscillator();
    ringMod.frequency.value = 480;
    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;
    ringMod.connect(ringGain.gain);
    const ringOut = ctx.createGain();
    ringOut.gain.setValueAtTime(0.22, now + 0.25);
    ringOut.gain.exponentialRampToValueAtTime(0.001, now + dur);
    ringBase.connect(ringGain);
    ringGain.connect(ringOut);
    ringOut.connect(master);
    ringBase.start(now + 0.25);
    ringMod.start(now + 0.25);
    ringBase.stop(now + dur);
    ringMod.stop(now + dur);
  }
}

/* Deep resonant chord (A1, E2, A2, C#3) + metallic triangle shimmer */
export function playMatchWin() {
  const ctx = getAudio();
  const now = ctx.currentTime;
  [55, 82.4, 110, 138.6].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.4 + i * 0.12);
    g.gain.setValueAtTime(0.18, now + 1.8);
    g.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + 3.5);
  });
  // Metallic shimmer on top
  const shimmer = ctx.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(880, now);
  shimmer.frequency.exponentialRampToValueAtTime(440, now + 1.2);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.12, now);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  shimmer.connect(sg);
  sg.connect(ctx.destination);
  shimmer.start(now);
  shimmer.stop(now + 1.2);
}
