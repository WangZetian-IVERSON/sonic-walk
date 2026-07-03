// ============================================================
// Offline DSP: procedurally synthesize the default sample set.
// These are PLACEHOLDER "recordings" — the piece encourages you
// to replace them with real phone recordings via the SOUNDS panel.
//
//   node tools/generate_samples.js
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(OUT, { recursive: true });

// deterministic rng
let seed = 987654321;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const rr = (a, b) => a + rnd() * (b - a);

// ---------- wav writer (16-bit PCM mono) ----------
function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('  wrote', name, (n / SR).toFixed(2) + 's');
}

// ---------- tiny dsp toolkit ----------
function seconds(s) { return new Float32Array(Math.round(s * SR)); }

// one-pole lowpass
function lowpass(x, cutoff) {
  const out = new Float32Array(x.length);
  const a = Math.exp(-2 * Math.PI * cutoff / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; out[i] = y; }
  return out;
}
function highpass(x, cutoff) {
  const lp = lowpass(x, cutoff);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] - lp[i];
  return out;
}
// state-variable bandpass with (optionally) time-varying center freq
function bandpass(x, freqFn, q = 2) {
  const out = new Float32Array(x.length);
  let low = 0, band = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(0.24, (typeof freqFn === 'function' ? freqFn(i / SR) : freqFn) / SR));
    const high = x[i] - low - band / q;
    band += f * high;
    low += f * band;
    out[i] = band;
  }
  return out;
}
function whiteNoise(len) {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = rnd() * 2 - 1;
  return out;
}
function brownNoise(len) {
  const out = new Float32Array(len);
  let y = 0;
  for (let i = 0; i < len; i++) { y += (rnd() * 2 - 1) * 0.02; y *= 0.998; out[i] = y * 6; }
  return out;
}
function mix(target, src, at = 0, gain = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < target.length; i++) target[o + i] += src[i] * gain;
}
function scale(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
function envApply(x, fn) { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR); return x; }
// make a loop seamless by crossfading the tail into the head
function loopify(x, fadeSec = 1) {
  const f = Math.round(fadeSec * SR);
  const len = x.length - f;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = x[i];
    if (i < f) {
      const t = i / f;
      out[i] = x[i] * t + x[len + i] * (1 - t);
    }
  }
  return out;
}
function normalize(x, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m > 0) scale(x, peak / m);
  return x;
}
const hann = (t, d) => (t < 0 || t > d) ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * t / d);
const expDecay = (t, tau) => t < 0 ? 0 : Math.exp(-t / tau);

function sine(dur, freqFn, phase = 0) {
  const out = seconds(dur);
  let ph = phase;
  for (let i = 0; i < out.length; i++) {
    const f = typeof freqFn === 'function' ? freqFn(i / SR) : freqFn;
    ph += 2 * Math.PI * f / SR;
    out[i] = Math.sin(ph);
  }
  return out;
}

// ============================================================
console.log('generating samples into', OUT);

// ---------- city ambience (loop ~9s) ----------
{
  const D = 10;
  const bed = lowpass(brownNoise(seconds(D).length), 300);
  envApply(bed, t => 0.55 + 0.2 * Math.sin(2 * Math.PI * t / D)); // slow swell, loop-friendly
  const out = seconds(D);
  mix(out, bed, 0, 0.7);
  // electrical hum
  mix(out, sine(D, 100), 0, 0.025);
  mix(out, sine(D, 200), 0, 0.012);
  // passing traffic swells
  for (let k = 0; k < 4; k++) {
    const at = rr(0.5, D - 3), dur = rr(2, 3), c = rr(250, 700);
    const sw = bandpass(whiteNoise(seconds(dur).length), c, 1.2);
    envApply(sw, t => hann(t, dur));
    mix(out, sw, at, 0.35);
  }
  // one distant horn
  const horn = sine(0.5, 392);
  envApply(horn, t => hann(t, 0.5));
  mix(out, horn, 6.2, 0.04);
  mix(out, envApply(sine(0.4, 494), t => hann(t, 0.4)), 6.7, 0.03);
  writeWav('city.wav', normalize(loopify(out, 1), 0.8));
}

// ---------- wind through leaves (loop ~9s) ----------
{
  const D = 10;
  const n = whiteNoise(seconds(D).length);
  const wind = bandpass(n, t => 350 + 300 * Math.sin(2 * Math.PI * t / D) + 150 * Math.sin(2 * Math.PI * 3 * t / D), 1.1);
  envApply(wind, t => 0.5 + 0.3 * Math.sin(2 * Math.PI * t / D + 1.2));
  // leaf rustle: brighter noise, gusty
  const leaves = bandpass(whiteNoise(seconds(D).length), 2800, 0.8);
  envApply(leaves, t => Math.max(0, 0.35 * Math.sin(2 * Math.PI * t / D + 4)) ** 2);
  const out = seconds(D);
  mix(out, wind, 0, 1);
  mix(out, leaves, 0, 0.5);
  writeWav('wind.wav', normalize(loopify(out, 1), 0.7));
}

// ---------- stream water (loop ~7s) ----------
{
  const D = 8;
  const out = seconds(D);
  const rush = lowpass(highpass(whiteNoise(out.length), 900), 4200);
  mix(out, rush, 0, 0.5);
  // bubbles: little rising sine blips
  for (let k = 0; k < 90; k++) {
    const at = rr(0, D - 0.05), dur = rr(0.015, 0.05);
    const f0 = rr(400, 900);
    const b = sine(dur, t => f0 * (1 + 2.5 * t / dur));
    envApply(b, t => hann(t, dur));
    mix(out, b, at, rr(0.05, 0.16));
  }
  writeWav('water.wav', normalize(loopify(out, 0.8), 0.7));
}

// ---------- birds (loop ~11s, sparse) ----------
{
  const D = 12;
  const out = seconds(D);
  const chirp = (at, f0, f1, dur, vib = 0) => {
    const c = sine(dur, t => f0 + (f1 - f0) * (t / dur) + vib * Math.sin(2 * Math.PI * 28 * t));
    envApply(c, t => hann(t, dur) ** 1.4);
    mix(out, c, at, rr(0.18, 0.3));
  };
  // a few phrases, silence between
  for (let ph = 0; ph < 5; ph++) {
    let t0 = rr(0.4, D - 1.2);
    const base = rr(2200, 4200);
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      chirp(t0, base * rr(0.9, 1.15), base * rr(1.1, 1.5), rr(0.05, 0.14), rnd() < 0.4 ? rr(30, 90) : 0);
      t0 += rr(0.09, 0.22);
    }
  }
  writeWav('birds.wav', normalize(loopify(out, 0.5), 0.6));
}

// ---------- breathing (loop, one full cycle ~5s) ----------
{
  const D = 5.4;
  const n = whiteNoise(seconds(D).length);
  // inhale 0-1.8 (brighter), pause, exhale 2.2-4.6 (darker), pause
  const body = bandpass(n, t => (t < 2 ? 950 : 550), 0.8);
  envApply(body, t => {
    if (t < 1.8) return hann(t, 1.8) * 0.8;          // inhale
    if (t >= 2.2 && t < 4.8) return hann(t - 2.2, 2.6); // exhale
    return 0;
  });
  writeWav('breath.wav', normalize(loopify(body, 0.3), 0.5));
}

// ---------- footsteps: concrete (city) x4 ----------
for (let v = 1; v <= 4; v++) {
  const D = 0.32;
  const out = seconds(D);
  // heel thump
  const f0 = rr(62, 82);
  const thump = sine(0.12, t => f0 * (1 - t * 2));
  envApply(thump, t => expDecay(t, 0.035));
  mix(out, thump, 0.004, 0.9);
  // sole scuff
  const scuff = bandpass(whiteNoise(seconds(0.16).length), rr(700, 1600), 1);
  envApply(scuff, t => expDecay(t, 0.04) * hann(t, 0.16) * 2);
  mix(out, scuff, rr(0.0, 0.02), 0.4);
  // tiny click
  const click = highpass(whiteNoise(seconds(0.006).length), 2500);
  mix(out, click, 0.002, 0.3);
  writeWav(`step_city_${v}.wav`, normalize(out, 0.75));
}

// ---------- footsteps: gravel/dirt (nature) x4 ----------
for (let v = 1; v <= 4; v++) {
  const D = 0.34;
  const out = seconds(D);
  const soft = sine(0.1, t => rr(55, 70) * (1 - t));
  envApply(soft, t => expDecay(t, 0.03));
  mix(out, soft, 0.004, 0.5);
  // crunch: burst of micro-grains
  const grains = 10 + Math.floor(rnd() * 8);
  for (let k = 0; k < grains; k++) {
    const at = rr(0, 0.13), dur = rr(0.004, 0.014);
    const gr = bandpass(whiteNoise(seconds(dur).length), rr(1200, 3800), 1.4);
    envApply(gr, t => hann(t, dur));
    mix(out, gr, at, rr(0.15, 0.5));
  }
  writeWav(`step_nature_${v}.wav`, normalize(out, 0.7));
}

// ---------- zipper (leaving home) ----------
{
  const D = 0.75;
  const out = seconds(D);
  let t = 0.02, interval = 0.034;
  while (t < 0.6) {
    const dur = 0.006;
    const tick = bandpass(whiteNoise(seconds(dur).length), rr(1800, 3200), 1.6);
    envApply(tick, tt => hann(tt, dur));
    mix(out, tick, t, rr(0.3, 0.55));
    interval *= 0.955; // accelerating pull
    t += Math.max(0.008, interval);
  }
  writeWav('zipper.wav', normalize(out, 0.6));
}

// ---------- keys jingle ----------
{
  const D = 0.95;
  const out = seconds(D);
  for (let k = 0; k < 9; k++) {
    const at = rr(0, 0.55);
    const base = rr(2800, 6800);
    for (const h of [1, 1.83, 2.61]) { // inharmonic metal partials
      const p = sine(0.22, base * h);
      envApply(p, t => expDecay(t, rr(0.03, 0.08)));
      mix(out, p, at, 0.12 / h);
    }
  }
  writeWav('keys.wav', normalize(out, 0.55));
}

// ---------- health-app notification (two-tone) ----------
{
  const D = 0.5;
  const out = seconds(D);
  const tone = (at, f, dur) => {
    const t1 = sine(dur, f), t3 = sine(dur, f * 3);
    envApply(t1, t => hann(t, dur) ** 0.7);
    envApply(t3, t => hann(t, dur) ** 0.7);
    mix(out, t1, at, 0.5);
    mix(out, t3, at, 0.06);
  };
  tone(0.02, 1318.5, 0.14); // E6
  tone(0.19, 1568.0, 0.22); // G6
  writeWav('notify.wav', normalize(out, 0.5));
}

console.log('done.');
