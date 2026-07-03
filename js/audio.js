// ============================================================
// SONIC WALK — audio engine (p5.sound classic API)
//
// The whole piece is driven by a handful of live parameters:
//   progress (walk position) -> city <-> nature crossfade, reverb size
//   mouseY                   -> lowpass cutoff on the urban layer
//   mouseSpeed               -> digital glitch stutters
//   mic level                -> heartbeat tempo/strength + breath layer
//   footsteps (from player)  -> step samples through delay
//   keys 1-5                 -> layer toggles   6/7/8 -> one-shots
//   Space at the shrine      -> final bloom (bell arpeggio + swell)
//
// Sample slots are replaceable at runtime (SOUNDS panel): the default
// set is procedurally generated (tools/generate_samples.js) and meant
// to be swapped for real recordings.
// ============================================================

const SLOTS = [
  { id: 'city',        label: 'City ambience · 城市环境', file: 'city.wav',   kind: 'loop' },
  { id: 'wind',        label: 'Wind & leaves · 风与树叶', file: 'wind.wav',   kind: 'loop' },
  { id: 'birds',       label: 'Birds · 鸟鸣',            file: 'birds.wav',  kind: 'loop' },
  { id: 'water',       label: 'Stream · 溪水',           file: 'water.wav',  kind: 'loop' },
  { id: 'breath',      label: 'Breathing · 呼吸',        file: 'breath.wav', kind: 'loop' },
  { id: 'step_city',   label: 'Footsteps (street) · 街道脚步', file: 'step_city_1.wav',   kind: 'set', count: 4 },
  { id: 'step_nature', label: 'Footsteps (trail) · 林间脚步',  file: 'step_nature_1.wav', kind: 'set', count: 4 },
  { id: 'zipper',      label: 'Zipper · 拉链 (key 6)',    file: 'zipper.wav', kind: 'shot' },
  { id: 'keys',        label: 'Keys · 钥匙 (key 7)',      file: 'keys.wav',   kind: 'shot' },
  { id: 'notify',      label: 'Notification · 提示音 (key 8)', file: 'notify.wav', kind: 'shot' },
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function createAudio() {
  let sk = null;               // hidden p5 instance (audio only)
  let started = false, ready = false;
  let micLevel = 0, mic = null, micOn = false;

  const loops = {};            // id -> { sf, vol, custom }
  const sets = {};             // id -> { sfs:[...], custom }
  const shots = {};            // id -> { sf, custom }
  const pendingUploads = new Map(); // id -> File, queued on the start screen before boot

  // fx + synths
  let cityFilter, reverb, delay;
  let heartOsc, heartEnv, heartEnv2;
  let droneA, droneB, droneSub, droneFifth;
  let bells = [];              // { osc, env, busy }
  let climaxPad = [];          // { osc, env } — warm chord swell for the final bloom
  let climaxGong, climaxGongEnv; // deep gong that opens the bloom
  let amp;                     // p5.Amplitude for HUD/visual feedback

  // musical state
  const layerOn = { city: true, body: true, wind: true, birds: true, water: true };
  const LAYER_KEYS = { Digit1: 'city', Digit2: 'body', Digit3: 'wind', Digit4: 'birds', Digit5: 'water' };
  const LAYER_LABELS = { city: 'CITY AMBIENCE', body: 'BODY / HEARTBEAT', wind: 'WIND & LEAVES', birds: 'BIRDS', water: 'STREAM' };
  let heartPhase = 0, nextBellIn = 5, nextPingIn = 8, glitchCool = 0;
  let climaxDone = false, climaxBoost = 0;
  let ampTimer = 0;

  // ---------- helpers ----------
  function loadSF(path) {
    return new Promise((res, rej) => sk.loadSound(path, res, rej));
  }

  async function loadAll() {
    const jobs = [];
    for (const s of SLOTS) {
      if (s.kind === 'set') {
        const base = s.file.replace(/_1\.wav$/, '');
        const arr = [];
        sets[s.id] = { sfs: arr, custom: false };
        for (let i = 1; i <= s.count; i++) {
          jobs.push(loadSF(`assets/sounds/${base}_${i}.wav`).then(sf => arr.push(sf)));
        }
      } else if (s.kind === 'loop') {
        jobs.push(loadSF(`assets/sounds/${s.file}`).then(sf => { loops[s.id] = { sf, vol: 0, custom: false }; }));
      } else {
        jobs.push(loadSF(`assets/sounds/${s.file}`).then(sf => { shots[s.id] = { sf, custom: false }; }));
      }
    }
    await Promise.all(jobs);
  }

  function buildGraph() {
    // ---- processing: filter automation / reverb / delay ----
    cityFilter = new p5.LowPass();
    cityFilter.freq(800);
    cityFilter.res(1.2);
    const city = loops.city.sf;
    city.disconnect();
    city.connect(cityFilter);

    reverb = new p5.Reverb();
    // nature bed breathes in a big soft space
    for (const id of ['wind', 'birds', 'water']) {
      reverb.process(loops[id].sf, 4, 2.2);
    }
    reverb.drywet(0.25);

    delay = new p5.Delay();
    delay.setType('pingPong');

    // ---- synthesis: heartbeat (low sine, lub-dub envelopes) ----
    heartOsc = new p5.Oscillator('sine');
    heartOsc.freq(54);
    heartOsc.amp(0);
    heartOsc.start();
    heartEnv = new p5.Envelope();
    heartEnv.setADSR(0.012, 0.14, 0, 0.06);
    heartEnv2 = new p5.Envelope();
    heartEnv2.setADSR(0.010, 0.10, 0, 0.05);

    // ---- synthesis: exploration drone (detuned triangles + sub) ----
    droneA = new p5.Oscillator('triangle'); droneA.freq(110);    droneA.amp(0); droneA.start(); droneA.pan(-0.3);
    droneB = new p5.Oscillator('triangle'); droneB.freq(110.65); droneB.amp(0); droneB.start(); droneB.pan(0.3);
    droneSub = new p5.Oscillator('sine');   droneSub.freq(55);   droneSub.amp(0); droneSub.start();
    droneFifth = new p5.Oscillator('sine'); droneFifth.freq(164.8); droneFifth.amp(0); droneFifth.start();

    // ---- synthesis: furin bell bank (wind-chime, pentatonic) ----
    for (let i = 0; i < 8; i++) {
      const osc = new p5.Oscillator('sine');
      osc.freq(1760); osc.amp(0); osc.start();
      const env = new p5.Envelope();
      env.setADSR(0.002, 1.6, 0, 0.4);
      env.setRange(0.1, 0);
      bells.push({ osc, env });
    }

    // ---- synthesis: final-bloom pad (warm rising chord) + deep gong ----
    // an A-major-ish stack so it sits under the pentatonic bells
    [110, 164.81, 220, 277.18].forEach((f, i) => {
      const osc = new p5.Oscillator(i < 2 ? 'triangle' : 'sine');
      osc.freq(f); osc.amp(0); osc.start();
      osc.pan((i % 2 ? 1 : -1) * 0.35);
      reverb.process(osc, 5, 3);            // bathe the swell in the big space
      const env = new p5.Envelope();
      env.setADSR(2.4, 3.5, 0.35, 4.5);     // slow swell in, long tail
      climaxPad.push({ osc, env });
    });
    climaxGong = new p5.Oscillator('sine');
    climaxGong.freq(55); climaxGong.amp(0); climaxGong.start();
    reverb.process(climaxGong, 5, 3);
    climaxGongEnv = new p5.Envelope();
    climaxGongEnv.setADSR(0.015, 4.5, 0, 3.5);

    amp = new p5.Amplitude();
    amp.smooth(0.9);

    // loops start silent; update() drives every volume from the walk
    for (const id of Object.keys(loops)) {
      const L = loops[id];
      L.sf.setLoop(true);
      L.sf.setVolume(0);
      L.sf.loop();
    }
  }

  function bell(freq, level = 0.1, delaySec = 0) {
    const b = bells.find(b => !b.busy) || bells[0];
    b.busy = true;
    setTimeout(() => {
      b.osc.freq(freq);
      b.env.setRange(level, 0);
      b.env.play(b.osc);
      setTimeout(() => { b.busy = false; }, 2200);
    }, delaySec * 1000);
  }

  const PENTA = [1760, 1975.5, 2217.5, 2637, 2960]; // A6 pentatonic-ish

  // ============================================================
  // ---------- SOUNDS panel: swap any slot for a user's recording ----------
  function applySample(id, file, done) {
    sk.loadSound(file, sf => {
      const slot = SLOTS.find(s => s.id === id);
      if (!slot) { done?.(false); return; }
      if (slot.kind === 'loop') {
        const L = loops[id];
        const wasCity = id === 'city';
        L.sf.stop();
        L.sf = sf; L.custom = true;
        sf.setLoop(true); sf.setVolume(0); sf.loop();
        if (wasCity) { sf.disconnect(); sf.connect(cityFilter); }
        else if (['wind', 'birds', 'water'].includes(id)) reverb.process(sf, 4, 2.2);
      } else if (slot.kind === 'set') {
        sets[id].sfs = [sf]; sets[id].custom = true;
      } else {
        shots[id].sf = sf; shots[id].custom = true;
      }
      done?.(true);
      console.log('[audio] slot replaced with user recording:', id);
    }, err => { console.warn('[audio] could not load user file', err); done?.(false); });
  }

  return {
    get started() { return started; },
    get ready() { return ready; },
    get micLevel() { return micLevel; },
    get micOn() { return micOn; },
    get level() { return amp ? amp.getLevel() : 0; },

    // ---------- boot (from the start-button gesture) ----------
    async start() {
      if (started) return;
      started = true;
      await new Promise(res => { sk = new p5(p => { p.setup = () => { p.noCanvas(); res(); }; }); });
      try { await sk.userStartAudio(); } catch (e) { console.warn('[audio] context resume:', e); }
      sk.outputVolume(0.9);

      try {
        await loadAll();
        buildGraph();
        ready = true;
        console.log('[audio] ready —', Object.keys(loops).length, 'loops,',
          Object.keys(sets).length, 'step sets,', Object.keys(shots).length, 'one-shots');
        // apply any recordings queued on the start screen
        for (const [id, file] of pendingUploads) applySample(id, file);
        pendingUploads.clear();
      } catch (e) {
        console.error('[audio] sample load failed', e);
      }

      // mic is optional — the piece degrades gracefully without it
      try {
        mic = new p5.AudioIn();
        mic.start(() => { micOn = true; }, () => { micOn = false; });
      } catch (e) { micOn = false; }
    },

    // ---------- per-frame automation ----------
    update(dt, t, state) {
      if (!ready) return;
      const p = state.progress;

      // mic level (smoothed)
      if (micOn && mic) {
        const raw = mic.getLevel();
        micLevel += (raw - micLevel) * Math.min(1, dt * 6);
      }

      climaxBoost = Math.max(0, climaxBoost - dt / 6);
      const boost = 1 + climaxBoost * 0.8;

      // ---- processing: filter automation (mouse height = brightness) ----
      const bright = clamp((1 - state.mouseNY) / 2, 0, 1);      // top of screen = 1
      const cutoff = 300 + Math.pow(bright, 1.4) * 5200 + p * 1200;
      cityFilter.freq(cutoff);

      // ---- processing: space grows as the walk opens up ----
      reverb.drywet(clamp(0.15 + p * 0.55 + climaxBoost * 0.2, 0, 0.9));

      // ---- crossfade the beds (throttled: scheduled ramps are not free) ----
      ampTimer -= dt;
      if (ampTimer <= 0) {
        ampTimer = 0.09;
        const cityV  = layerOn.city  ? Math.pow(1 - p, 1.3) * 0.5 : 0;
        const windV  = layerOn.wind  ? (0.04 + smoothstep(p, 0.3, 0.7) * 0.32) * boost : 0;
        const birdsV = layerOn.birds ? smoothstep(p, 0.5, 0.85) * 0.4 * boost : 0;
        // stream is placed in the world: loudest at the bridge (z ~ -134)
        const dz = (state.z + 134) / 20;
        const waterV = layerOn.water ? Math.exp(-dz * dz) * 0.5 * boost : 0;
        const breathV = layerOn.body ? clamp(0.05 + micLevel * 2.5, 0, 0.5) * smoothstep(p, 0.15, 0.4) : 0;
        loops.city.sf.setVolume(cityV, 0.15);
        loops.wind.sf.setVolume(windV, 0.15);
        loops.birds.sf.setVolume(birdsV, 0.15);
        loops.water.sf.setVolume(waterV, 0.15);
        loops.breath.sf.setVolume(breathV, 0.15);
        // ambient bed leans with the gaze
        loops.city.sf.pan(clamp(-state.mouseNX * 0.4, -1, 1), 0.1);
        loops.wind.sf.pan(clamp(state.mouseNX * 0.4, -1, 1), 0.1);

        // synthesis: exploration drone rises in the forest
        const droneV = smoothstep(p, 0.45, 0.85) * 0.055 * boost;
        droneA.amp(droneV, 0.2);
        droneB.amp(droneV, 0.2);
        droneSub.amp(droneV * 0.8 + smoothstep(p, 0.2, 0.5) * 0.02, 0.2);
        droneFifth.amp(smoothstep(p, 0.8, 1) * 0.04 * boost, 0.2);
      }

      // ---- synthesis: heartbeat scheduling (mic + walking drive the body) ----
      if (layerOn.body) {
        const bodyZone = Math.exp(-Math.pow((p - 0.42) / 0.28, 2)); // strongest mid-journey
        const bpm = 52 + (state.walking ? 22 : 0) + micLevel * 160 + bodyZone * 10;
        heartPhase += dt * (bpm / 60);
        if (heartPhase >= 1) {
          heartPhase %= 1;
          const level = clamp(0.05 + bodyZone * 0.16 + micLevel * 1.2, 0, 0.5);
          if (level > 0.055) {
            heartEnv.setRange(level, 0);
            heartEnv2.setRange(level * 0.6, 0);
            heartEnv.play(heartOsc, 0);
            heartEnv2.play(heartOsc, 0.16); // the "dub"
          }
        }
      }

      // ---- synthesis: furin bells drift in near the shrine ----
      nextBellIn -= dt;
      if (nextBellIn <= 0) {
        nextBellIn = 5 + Math.random() * 9;
        if (p > 0.55) bell(PENTA[Math.floor(Math.random() * PENTA.length)], 0.05 + p * 0.06);
      }

      // ---- health-app pings pace the body zone ----
      nextPingIn -= dt;
      if (nextPingIn <= 0) {
        nextPingIn = 6 + Math.random() * 6;
        if (p > 0.18 && p < 0.5 && shots.notify) shots.notify.sf.play(0, 1, 0.14);
      }

      // ---- fast mouse = digital glitch stutter ----
      glitchCool -= dt;
      if (state.mouseSpeed > 0.55 && glitchCool <= 0 && shots.notify) {
        glitchCool = 1.6;
        for (let i = 0; i < 3; i++) {
          shots.notify.sf.play(i * 0.07, 0.4 + Math.random() * 0.5 + i * 0.3, 0.07);
        }
      }
    },

    // ---------- footsteps (called by the player rig) ----------
    stepSide: 1,
    onFootstep(progress) {
      if (!ready) return;
      const useNature = progress > 0.45 + Math.random() * 0.2; // blend zone
      const set = sets[useNature ? 'step_nature' : 'step_city'];
      if (!set || !set.sfs.length) return;
      const sf = set.sfs[Math.floor(Math.random() * set.sfs.length)];
      this.stepSide *= -1;
      sf.pan(this.stepSide * 0.22);
      sf.play(0, 0.92 + Math.random() * 0.16, useNature ? 0.4 : 0.5);
      // processing: steps echo once the space opens up
      if (useNature && Math.random() < 0.3) {
        delay.process(sf, 0.31, 0.3, 2200);
        delay.drywet(0.35);
      }
    },

    // ---------- key triggers ----------
    triggerKey(code) {
      if (!ready) return null;
      if (LAYER_KEYS[code]) {
        const id = LAYER_KEYS[code];
        layerOn[id] = !layerOn[id];
        if (id === 'body' && !layerOn.body) heartOsc.amp(0, 0.1);
        return { label: LAYER_LABELS[id], state: layerOn[id] ? 'ON' : 'OFF' };
      }
      if (code === 'Digit6' && shots.zipper) { shots.zipper.sf.play(0, 1, 0.5); return { label: 'ZIPPER', state: '' }; }
      if (code === 'Digit7' && shots.keys)   { shots.keys.sf.play(0, 1, 0.5);   return { label: 'KEYS', state: '' }; }
      if (code === 'Digit8' && shots.notify) { shots.notify.sf.play(0, 1, 0.4); return { label: 'NOTIFICATION', state: '' }; }
      return null;
    },

    // ---------- final bloom ----------
    climax(progress) {
      if (!ready || climaxDone || progress < 0.82) return false;
      climaxDone = true;
      climaxBoost = 1;
      // 1) a deep gong opens the bloom
      climaxGongEnv.setRange(0.3, 0);
      climaxGongEnv.play(climaxGong, 0, 4);
      // 2) a warm chord swells up underneath
      climaxPad.forEach(({ osc, env }, i) => {
        env.setRange(0.06, 0);
        env.play(osc, 0.12 + i * 0.14, 3.4);
      });
      // 3) ascending pentatonic arpeggio, doubled an octave up for shimmer
      const arp = [0, 1, 2, 3, 4, 2, 4, 3, 4];
      arp.forEach((n, i) => {
        bell(PENTA[n], 0.16, i * 0.26);
        if (i % 2 === 0) bell(PENTA[n] * 2, 0.05, i * 0.26 + 0.05); // high shimmer
      });
      // 4) two low bells to let it settle
      const tail = arp.length * 0.26;
      bell(PENTA[0] / 2, 0.13, tail + 0.25);
      bell(PENTA[2] / 2, 0.10, tail + 0.6);
      // the question, whispered by the machine
      try {
        const u = new SpeechSynthesisUtterance('Have you walked today?');
        u.volume = 0.55; u.rate = 0.82; u.pitch = 0.7;
        setTimeout(() => speechSynthesis.speak(u), 3200);
      } catch (e) { /* no speech synthesis — fine */ }
      return true;
    },

    // ---------- SOUNDS panel: swap any slot for the user's own recording ----------
    getSlots() {
      return SLOTS.map(s => ({
        ...s,
        custom: pendingUploads.has(s.id) ||
          (loops[s.id] || sets[s.id] || shots[s.id] || {}).custom || false,
      }));
    },
    replaceSample(id, file, done) {
      if (!SLOTS.some(s => s.id === id)) { done?.(false); return; }
      if (!ready) {
        // queued from the start screen — applied when the engine boots
        pendingUploads.set(id, file);
        done?.(true);
        return;
      }
      applySample(id, file, done);
    },
  };
}
