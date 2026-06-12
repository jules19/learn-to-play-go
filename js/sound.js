/* ============================================================
 * sound.js — Tiny WebAudio sound design. No audio files:
 * every sound is synthesized (stone clack, capture pop,
 * success chime, error thud, rank-up fanfare).
 * ============================================================ */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(node, t0, attack, decay, peak) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  /** The satisfying "clack" of a slate stone on a kaya board. */
  function stone() {
    const c = ac(); if (!c || !enabled) return;
    const t = c.currentTime;
    // sharp noise transient
    const len = c.sampleRate * 0.06;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const noise = c.createBufferSource(); noise.buffer = buf;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass';
    nf.frequency.value = 2200 + Math.random() * 600; nf.Q.value = 1.2;
    const ng = c.createGain(); env(ng, t, 0.002, 0.07, 0.5);
    noise.connect(nf).connect(ng).connect(c.destination);
    noise.start(t);
    // low wooden body resonance
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(190 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);
    const og = c.createGain(); env(og, t, 0.002, 0.1, 0.25);
    osc.connect(og).connect(c.destination);
    osc.start(t); osc.stop(t + 0.15);
  }

  /** Stones being whisked off the board. */
  function capture(n) {
    const c = ac(); if (!c || !enabled) return;
    const count = Math.min(n || 1, 5);
    for (let k = 0; k < count; k++) {
      const t = c.currentTime + k * 0.055;
      const osc = c.createOscillator(); osc.type = 'triangle';
      osc.frequency.setValueAtTime(520 + k * 60, t);
      osc.frequency.exponentialRampToValueAtTime(900 + k * 80, t + 0.07);
      const g = c.createGain(); env(g, t, 0.004, 0.09, 0.18);
      osc.connect(g).connect(c.destination);
      osc.start(t); osc.stop(t + 0.15);
    }
  }

  function chord(freqs, dur, type, vol) {
    const c = ac(); if (!c || !enabled) return;
    const t = c.currentTime;
    freqs.forEach((f, k) => {
      const osc = c.createOscillator(); osc.type = type || 'sine';
      osc.frequency.value = f;
      const g = c.createGain();
      env(g, t + k * 0.06, 0.01, dur || 0.4, (vol || 0.12));
      osc.connect(g).connect(c.destination);
      osc.start(t + k * 0.06); osc.stop(t + k * 0.06 + (dur || 0.4) + 0.1);
    });
  }

  function success() { chord([523.25, 659.25, 783.99], 0.5); }            // C E G
  function fanfare() { chord([523.25, 659.25, 783.99, 1046.5], 0.8, 'triangle', 0.14); }
  function error() {
    const c = ac(); if (!c || !enabled) return;
    const t = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = c.createGain(); env(g, t, 0.01, 0.2, 0.12);
    osc.connect(f).connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + 0.3);
  }
  function pop() { chord([392], 0.12, 'sine', 0.1); }

  const GoSound = {
    stone, capture, success, error, fanfare, pop,
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
  };
  global.GoSound = GoSound;
  if (typeof module !== 'undefined' && module.exports) module.exports = GoSound;
})(typeof window !== 'undefined' ? window : globalThis);
