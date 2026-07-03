// ============ Sky dome, sun, clouds, distant mountains ============
import * as THREE from 'three';
import { PAL, toon, glow, rng } from './palette.js';

export function buildSky(scene) {
  const group = new THREE.Group();

  // --- gradient dome ---
  const uniforms = {
    topColor: { value: PAL.skyTopCity.clone() },
    horColor: { value: PAL.skyHorCity.clone() },
    glowColor: { value: new THREE.Color('#ffc9a0') },
    glowDir: { value: new THREE.Vector3(0, 0.06, -1).normalize() },
    glowAmt: { value: 0.25 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(760, 32, 18),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 topColor, horColor, glowColor, glowDir;
        uniform float glowAmt;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(horColor, topColor, pow(smoothstep(0.0, 0.55, h), 0.75));
          // warm halo around the sun direction (tight, subtle)
          float g = pow(max(dot(normalize(vDir), glowDir), 0.0), 18.0);
          col += glowColor * g * glowAmt;
          // slight darkening below horizon
          col = mix(col, col * 0.55, smoothstep(0.0, -0.4, vDir.y));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  group.add(dome);

  // --- the low sun you walk toward (fog off so it stays saturated) ---
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(46, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffdcae').multiplyScalar(2.4), fog: false })
  );
  sun.position.set(0, 26, -690);
  group.add(sun);
  // radial-gradient halo (no hard edge)
  const haloTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,157,110,0.55)');
    gr.addColorStop(0.5, 'rgba(255,157,110,0.18)');
    gr.addColorStop(1, 'rgba(255,157,110,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sunHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, fog: false })
  );
  sunHalo.position.set(0, 30, -691);
  group.add(sunHalo);

  // --- distant mountain silhouettes (flat atmospheric color, no shading) ---
  const R = rng(77);
  const ridgeMat1 = new THREE.MeshBasicMaterial({ color: '#a97f96', fog: false });
  const ridgeMat2 = new THREE.MeshBasicMaterial({ color: '#bd93a4', fog: false });
  for (let i = 0; i < 16; i++) {
    const far = i % 2 === 0;
    const h = 40 + R() * 75;
    const m = new THREE.Mesh(new THREE.ConeGeometry(70 + R() * 90, h, 4, 1), far ? ridgeMat2 : ridgeMat1);
    // keep the corridor toward the sun clear
    const side = R() < 0.5 ? -1 : 1;
    m.position.set(side * (85 + R() * 380), h * 0.26, -430 - R() * 240);
    m.rotation.y = R() * Math.PI;
    group.add(m);
  }
  // two low, far ridges framing the sun
  for (const [x, z, h, rad] of [[-150, -670, 60, 200], [170, -680, 52, 220]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 4, 1), ridgeMat2);
    m.position.set(x, h * 0.22, z);
    group.add(m);
  }

  // --- soft clouds (flattened blobs) ---
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#efc4b6', transparent: true, opacity: 0.65, fog: false });
  const clouds = [];
  const blob = new THREE.SphereGeometry(1, 10, 7);
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(R() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(blob, cloudMat);
      const sc = 9 + R() * 15;
      s.scale.set(sc, sc * 0.32, sc * 0.7);
      s.position.set((j - n / 2) * sc * 0.85, R() * 3, (R() - 0.5) * 8);
      c.add(s);
    }
    c.position.set((R() - 0.5) * 700, 95 + R() * 90, -280 - R() * 320);
    c.userData.speed = 0.6 + R() * 0.9;
    clouds.push(c);
    group.add(c);
  }

  scene.add(group);

  const _top = new THREE.Color(), _hor = new THREE.Color();
  return {
    group,
    // p: 0 = city, 1 = nature/shrine
    update(dt, t, p, camPos) {
      _top.lerpColors(PAL.skyTopCity, PAL.skyTopNature, p);
      _hor.lerpColors(PAL.skyHorCity, PAL.skyHorNature, p);
      uniforms.topColor.value.copy(_top);
      uniforms.horColor.value.copy(_hor);
      uniforms.glowAmt.value = 0.3 + p * 0.25;
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 420) c.position.x = -420;
      }
      // dome & backdrop follow the walker so you never reach the edge
      group.position.x = camPos.x;
      group.position.z = camPos.z * 0.25;
    },
  };
}
