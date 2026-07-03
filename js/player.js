// ============ First-person walker: WASD-lite + mouse look + head bob ============
import * as THREE from 'three';

export const WALK = {
  START_Z: 10,
  END_Z: -178,
};

export function createPlayer(camera, dom, callbacks = {}) {
  const state = {
    z: WALK.START_Z,
    x: 0,
    speed: 0,             // current forward speed (m/s)
    walking: false,
    auto: false,
    yaw: 0, pitch: 0,
    mouseNX: 0, mouseNY: 0, // normalized -1..1
    mouseSpeed: 0,
    bobPhase: 0,
    progress: 0,          // 0 = city start, 1 = shrine
    started: false,
  };

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyP') state.auto = !state.auto;
    callbacks.onKey?.(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  let lastMX = 0, lastMY = 0;
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    state.mouseSpeed = Math.min(1, Math.abs(nx - lastMX) * 14 + Math.abs(ny - lastMY) * 14);
    lastMX = nx; lastMY = ny;
    state.mouseNX = nx;
    state.mouseNY = ny;
  });

  const MAX_SPEED = 3.1;

  function update(dt, t) {
    if (!state.started) return;

    // ---- forward / back input ----
    const fwd = keys.has('KeyW') || keys.has('ArrowUp') || state.auto;
    const back = keys.has('KeyS') || keys.has('ArrowDown');
    const target = fwd ? MAX_SPEED : (back ? -MAX_SPEED * 0.6 : 0);
    state.speed += (target - state.speed) * Math.min(1, dt * 4);
    if (Math.abs(state.speed) < 0.02) state.speed = 0;
    state.walking = Math.abs(state.speed) > 0.4;

    state.z -= state.speed * dt;
    state.z = THREE.MathUtils.clamp(state.z, WALK.END_Z, WALK.START_Z);
    if (state.z <= WALK.END_Z + 0.1) state.auto = false;

    // gentle lateral drift toward mouse (feels like leaning, stays on path)
    // in auto-walk the camera recentres so the presentation stays composed
    const damp = state.auto ? 0.35 : 1;
    const targetX = state.mouseNX * 0.9 * damp;
    state.x += (targetX - state.x) * Math.min(1, dt * 1.6);

    // ---- look ----
    const wantYaw = -state.mouseNX * 0.55 * damp;
    const wantPitch = -state.mouseNY * 0.32 * damp;
    state.yaw += (wantYaw - state.yaw) * Math.min(1, dt * 3);
    state.pitch += (wantPitch - state.pitch) * Math.min(1, dt * 3);

    // ---- head bob + footsteps ----
    let bobY = 0, bobX = 0;
    if (state.walking) {
      const prev = state.bobPhase;
      state.bobPhase += dt * (4.6 + Math.abs(state.speed) * 0.8);
      bobY = Math.abs(Math.sin(state.bobPhase)) * 0.055;
      bobX = Math.sin(state.bobPhase * 0.5) * 0.03;
      // a footstep lands each half cycle
      if (Math.floor(prev / Math.PI) !== Math.floor(state.bobPhase / Math.PI)) {
        callbacks.onFootstep?.(state.progress);
      }
    }

    camera.position.set(state.x + bobX, 1.62 + bobY + Math.sin(t * 0.8) * 0.012, state.z);
    camera.rotation.set(state.pitch, state.yaw, Math.sin(state.bobPhase * 0.5) * 0.006, 'YXZ');

    // ---- journey progress ----
    state.progress = THREE.MathUtils.clamp(
      (WALK.START_Z - state.z) / (WALK.START_Z - WALK.END_Z), 0, 1
    );

    // mouse speed decays
    state.mouseSpeed *= Math.pow(0.02, dt);
  }

  return { state, update };
}
