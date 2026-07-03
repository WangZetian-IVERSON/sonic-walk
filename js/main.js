// ============ SONIC WALK — main assembly ============
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PAL } from './palette.js';
import { buildSky } from './sky.js';
import { buildCity } from './city.js';
import { buildNature } from './nature.js';
import { buildGround } from './ground.js';
import { buildParticles } from './particles.js';
import { createPlayer, WALK } from './player.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';

// ---------- renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fogCity.clone(), 14, 120);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1600);
camera.position.set(0, 1.62, WALK.START_Z);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#cbb8d8', '#4a3f56', 0.9);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#ffcf9e', 1.5);
sunLight.position.set(-18, 30, -60);
scene.add(sunLight);
const fill = new THREE.DirectionalLight('#8ea6d8', 0.35);
fill.position.set(20, 18, 40);
scene.add(fill);

// ---------- world ----------
const sky = buildSky(scene);
const city = buildCity(scene);
const nature = buildNature(scene);
const ground = buildGround(scene);
const particles = buildParticles(scene);

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.65, 0.62
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- audio + player + ui ----------
const audio = createAudio();
let climaxAt = -Infinity; // clock time of the final bloom
const player = createPlayer(camera, canvas, {
  onFootstep: (p) => audio.onFootstep(p),
  onKey: (code) => {
    // final bloom: only lands once you've nearly reached the shrine
    if (code === 'Space') {
      if (player.state.progress > 0.82) {
        audio.climax(player.state.progress);
        climaxAt = clock.elapsedTime;
        particles.burst(camera.position, clock.elapsedTime);
      }
      return;
    }
    const info = audio.triggerKey(code);
    if (info) ui.flash(`${info.label}${info.state ? ' — ' + info.state : ''}`);
  },
});
const ui = createUI({
  audio,
  onStart: () => {
    audio.start();
    player.state.started = true;
    player.state.auto = false;
  },
});

// ---------- resize (poll each frame: covers panels that start at 0x0) ----------
let lastW = 0, lastH = 0;
function fitViewport() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w === lastW && h === lastH) return;
  if (w === 0 || h === 0) return;
  lastW = w; lastH = h;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
fitViewport();

// ---------- main loop ----------
// debug/test hook (used by automated visual checks)
window.__sonic = { player, camera, scene, renderer, audio };

const clock = new THREE.Clock();
const _fog = new THREE.Color();
const _hemiSky = new THREE.Color(), _hemiGround = new THREE.Color();
const HEMI_CITY = { sky: new THREE.Color('#cbb8d8'), ground: new THREE.Color('#4a3f56') };
const HEMI_NAT  = { sky: new THREE.Color('#ffd9b0'), ground: new THREE.Color('#5a4a4e') };

function animate() {
  requestAnimationFrame(animate);
  fitViewport();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  player.update(dt, t);
  const p = player.state.progress;

  // fog + light shift as the walk progresses
  _fog.lerpColors(PAL.fogCity, PAL.fogNature, p);
  scene.fog.color.copy(_fog);
  scene.fog.near = 14 + p * 6;
  scene.fog.far = 120 + p * 45;
  _hemiSky.lerpColors(HEMI_CITY.sky, HEMI_NAT.sky, p);
  _hemiGround.lerpColors(HEMI_CITY.ground, HEMI_NAT.ground, p);
  hemi.color.copy(_hemiSky);
  hemi.groundColor.copy(_hemiGround);
  sunLight.intensity = 1.5 + p * 0.7;
  // climax: a slow warm pulse of light that settles back down
  const cx = Math.max(0, 1 - (t - climaxAt) / 6);
  const pulse = cx > 0 ? Math.sin(Math.min(1, (t - climaxAt) / 0.8) * Math.PI * 0.5) * cx : 0;
  bloom.strength = 0.42 + p * 0.18 + pulse * 0.55;
  renderer.toneMappingExposure = 1.12 + pulse * 0.35;

  sky.update(dt, t, p, camera.position);
  city.update(dt, t);
  nature.update(dt, t, scene.fog.color, scene.fog.near, scene.fog.far);
  ground.update(scene.fog.color, scene.fog.near, scene.fog.far);
  const natureAmt = THREE.MathUtils.smoothstep(p, 0.45, 0.75);
  particles.update(dt, t, camera.position, natureAmt);

  audio.update(dt, t, player.state);
  ui.update(p, audio.micLevel);

  composer.render();
}
animate();
