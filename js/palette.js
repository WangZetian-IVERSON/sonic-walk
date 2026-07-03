// ============ Shared palette + material helpers ============
import * as THREE from 'three';

export const PAL = {
  // sky (lerped city -> nature as you walk)
  skyTopCity:     new THREE.Color('#2c3358'),
  skyHorCity:     new THREE.Color('#b98ba2'),
  skyTopNature:   new THREE.Color('#4a3a6e'),
  skyHorNature:   new THREE.Color('#ffb07a'),
  fogCity:        new THREE.Color('#8e88a6'),
  fogNature:      new THREE.Color('#e8a284'),

  sun:            new THREE.Color('#ffd9a0'),

  asphalt:        new THREE.Color('#4f505c'),
  grass:          new THREE.Color('#4e7d58'),
  path:           new THREE.Color('#a89c8e'),
  curb:           new THREE.Color('#8b8478'),

  buildingTones: ['#e6dccb', '#a9bcae', '#8d99a6', '#c9a08b', '#b7aa9a', '#93a5b1'],
  roof:           new THREE.Color('#4a4a55'),

  wood:           new THREE.Color('#7c5238'),
  woodDark:       new THREE.Color('#5a3a28'),
  vermillion:     new THREE.Color('#d0452b'),
  stone:          new THREE.Color('#9a958c'),
  stoneDark:      new THREE.Color('#7a766e'),

  trunk:          new THREE.Color('#6b4a3f'),
  sakura:  ['#ffb7c9', '#ff9fb8', '#ffc9d6', '#f8a8c0'],
  pine:    ['#2f6e4f', '#3d7f5c', '#4f9070'],
  bush:    ['#4c8058', '#5d9166'],

  water:          new THREE.Color('#63b7c9'),
  waterHi:        new THREE.Color('#cdeef2'),

  neonPink:       new THREE.Color('#ff5f9e'),
  neonCyan:       new THREE.Color('#4deeea'),
  neonYellow:     new THREE.Color('#ffdf6b'),
  lantern:        new THREE.Color('#ffb35c'),
  windowLit:      new THREE.Color('#ffd98e'),
};

// 3-step gradient map shared by all toon materials
let _gradientMap = null;
export function gradientMap() {
  if (!_gradientMap) {
    _gradientMap = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    _gradientMap.needsUpdate = true;
  }
  return _gradientMap;
}

const _matCache = new Map();
export function toon(color, opts = {}) {
  const key = (color.isColor ? '#' + color.getHexString() : color) + JSON.stringify(opts);
  if (_matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: gradientMap(),
    ...opts,
  });
  _matCache.set(key, m);
  return m;
}

export function glow(color, intensity = 1.6) {
  const key = 'glow' + color + intensity;
  if (_matCache.has(key)) return _matCache.get(key);
  const c = new THREE.Color(color);
  const m = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(intensity) });
  _matCache.set(key, m);
  return m;
}

// tiny deterministic rng so the town looks the same every run
export function rng(seed = 1234) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function canvasTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
