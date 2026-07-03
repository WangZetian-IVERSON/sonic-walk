// ============ Zone 2/3 — torii, forest, stream, shrine ============
import * as THREE from 'three';
import { PAL, toon, glow, rng } from './palette.js';

const R = rng(415926);

// ---------- torii gate ----------
function torii(scale = 1) {
  const g = new THREE.Group();
  const red = toon(PAL.vermillion);
  const dark = toon('#2e2a30');
  // pillars (slightly leaning inward)
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.2, 10), red);
    p.position.set(s * 2.5, 2.6, 0);
    p.rotation.z = -s * 0.045;
    g.add(p);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.35, 10), dark);
    base.position.set(s * 2.62, 0.17, 0);
    g.add(base);
  }
  // kasagi (top beam) + roof cap
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.38, 0.5), red);
  kasagi.position.y = 5.25;
  g.add(kasagi);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.18, 0.62), dark);
  cap.position.y = 5.52;
  g.add(cap);
  // upturned tips
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.56), dark);
    tip.position.set(s * 3.55, 5.62, 0);
    tip.rotation.z = s * 0.22;
    g.add(tip);
  }
  // nuki (second beam)
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.3, 0.34), red);
  nuki.position.y = 4.3;
  g.add(nuki);
  // gakuzuka (center plaque)
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.2), dark);
  plaque.position.y = 4.78;
  g.add(plaque);
  g.scale.setScalar(scale);
  return g;
}

// ---------- stone lantern (tōrō) ----------
function stoneLantern() {
  const g = new THREE.Group();
  const s = toon(PAL.stone), sd = toon(PAL.stoneDark);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.25, 6), sd);
  base.position.y = 0.12;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.85, 6), s);
  post.position.y = 0.66;
  const shelf = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.14, 6), sd);
  shelf.position.y = 1.14;
  const firebox = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 6), s);
  firebox.position.y = 1.4;
  const light = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.2, 6), glow('#ffc97a', 1.9));
  light.position.y = 1.4;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 6), sd);
  roof.position.y = 1.72;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), s);
  knob.position.y = 1.92;
  g.add(base, post, shelf, firebox, light, roof, knob);
  return g;
}

// ---------- taiko (arched) bridge ----------
function bridge() {
  const g = new THREE.Group();
  const red = toon(PAL.vermillion);
  const wood = toon(PAL.woodDark);
  const N = 9, span = 7.5, rise = 0.9;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const z = (t - 0.5) * span;
    const y = Math.sin(t * Math.PI) * rise;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, span / N + 0.16), wood);
    plank.position.set(0, y + 0.1, z);
    plank.rotation.x = -Math.cos(t * Math.PI) * (rise * 2 / span) * 1.2;
    g.add(plank);
    // railing posts
    if (i % 2 === 0) {
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), red);
        post.position.set(sx * 1.42, y + 0.55, z);
        g.add(post);
        if (i === 0 || i === N - 1) {
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), toon('#2e2a30'));
          ball.position.set(sx * 1.42, y + 1.02, z);
          g.add(ball);
        }
      }
    }
  }
  // curved handrails
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push(new THREE.Vector3(sx * 1.42, Math.sin(t * Math.PI) * rise + 0.98, (t - 0.5) * span));
    }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.055, 6), red);
    g.add(rail);
  }
  return g;
}

// ---------- small hillside shrine (the destination) ----------
function shrine() {
  const g = new THREE.Group();
  const wood = toon(PAL.wood), dark = toon('#3a2e28'), red = toon(PAL.vermillion);
  // stone platform
  const plat = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.5, 5), toon(PAL.stoneDark));
  plat.position.y = 0.25;
  g.add(plat);
  const plat2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 4), toon(PAL.stone));
  plat2.position.y = 0.75;
  g.add(plat2);
  // steps
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.5), toon(PAL.stone));
    st.position.set(0, 0.1 + i * 0.18, 2.6 + (2 - i) * 0.45 - 0.4);
    g.add(st);
  }
  // main hall
  const hall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.6), wood);
  hall.position.y = 2.1;
  g.add(hall);
  // glowing doorway
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), glow('#ffcd8a', 2.0));
  door.position.set(0, 1.85, 1.31);
  g.add(door);
  // pillars front
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), red);
    p.position.set(sx * 1.7, 2.1, 1.5);
    g.add(p);
  }
  // sweeping roof: two angled slabs + ridge
  for (const s of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 2.4), dark);
    slab.position.set(0, 3.65 + 0.35, s * 1.05);
    slab.rotation.x = -s * 0.42;
    g.add(slab);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.22, 0.4), dark);
  ridge.position.y = 4.5;
  g.add(ridge);
  // chigi (crossed finials)
  for (const sx of [-1, 1]) {
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), dark);
    c1.position.set(sx * 2.1, 4.85, 0.18);
    c1.rotation.x = 0.4;
    const c2 = c1.clone();
    c2.position.z = -0.18;
    c2.rotation.x = -0.4;
    g.add(c1, c2);
  }
  // offering box
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.6), dark);
  box.position.set(0, 1.3, 2.2);
  g.add(box);
  // shimenawa rope hint (torus arc)
  const rope = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 6, 12, Math.PI), toon('#d8c9a8'));
  rope.position.set(0, 3.1, 1.35);
  rope.rotation.z = Math.PI;
  g.add(rope);
  return g;
}

// ---------- forest via instancing ----------
function plantForest(g) {
  const dummy = new THREE.Object3D();
  const cols = new THREE.Color();

  // gather tree positions: flanks of the path from z=-70 to -190, denser as you go
  const sakuraSpots = [], pineSpots = [];
  for (let z = -68; z > -196; z -= 2.2) {
    const density = THREE.MathUtils.smoothstep(-z, 68, 110); // 0 in city edge → 1 deep
    for (const side of [-1, 1]) {
      if (R() < 0.25 + density * 0.55) {
        const x = side * (4.5 + R() * R() * 26);
        // keep shrine clearing open
        if (z < -168 && Math.abs(x) < 9) continue;
        // keep stream banks open
        if (z > -140 && z < -128 && Math.abs(x) < 6) continue;
        (R() < 0.5 ? sakuraSpots : pineSpots).push([x, z, 0.7 + R() * 0.7]);
      }
    }
  }

  // trunks (shared by both kinds)
  const allSpots = sakuraSpots.concat(pineSpots);
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.16, 1, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, toon(PAL.trunk), allSpots.length);
  allSpots.forEach(([x, z, s], i) => {
    const h = 1.6 * s + R() * 0.8;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(s, h, s);
    dummy.rotation.set(0, R() * Math.PI, (R() - 0.5) * 0.14);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  g.add(trunks);

  // sakura canopies: 3 blobs per tree
  const blobGeo = new THREE.IcosahedronGeometry(1, 0);
  const sakMat = new THREE.MeshToonMaterial({ gradientMap: toon('#fff').gradientMap });
  const sak = new THREE.InstancedMesh(blobGeo, sakMat, sakuraSpots.length * 3);
  let k = 0;
  sakuraSpots.forEach(([x, z, s]) => {
    const baseY = 1.6 * s + 0.6;
    for (let j = 0; j < 3; j++) {
      const r = (0.9 + R() * 0.8) * s;
      dummy.position.set(x + (R() - 0.5) * 1.6 * s, baseY + R() * 1.2 * s, z + (R() - 0.5) * 1.6 * s);
      dummy.scale.set(r, r * 0.85, r);
      dummy.rotation.set(R() * 3, R() * 3, R() * 3);
      dummy.updateMatrix();
      sak.setMatrixAt(k, dummy.matrix);
      sak.setColorAt(k, cols.set(PAL.sakura[Math.floor(R() * PAL.sakura.length)]));
      k++;
    }
  });
  g.add(sak);

  // pine cones: 3 stacked per tree
  const coneGeo = new THREE.ConeGeometry(1, 1.6, 7);
  const pine = new THREE.InstancedMesh(coneGeo, sakMat.clone(), pineSpots.length * 3);
  k = 0;
  pineSpots.forEach(([x, z, s]) => {
    const baseY = 1.4 * s;
    for (let j = 0; j < 3; j++) {
      const r = (1.5 - j * 0.38) * s;
      dummy.position.set(x, baseY + j * 1.05 * s + 0.6, z);
      dummy.scale.set(r, s * 1.25, r);
      dummy.rotation.set(0, R() * 3, 0);
      dummy.updateMatrix();
      pine.setMatrixAt(k, dummy.matrix);
      pine.setColorAt(k, cols.set(PAL.pine[Math.floor(R() * PAL.pine.length)]));
      k++;
    }
  });
  g.add(pine);

  // grass tufts + bushes along the path
  const tuftGeo = new THREE.ConeGeometry(0.16, 0.5, 5);
  const nTuft = 700;
  const tufts = new THREE.InstancedMesh(tuftGeo, sakMat.clone(), nTuft);
  for (let i = 0; i < nTuft; i++) {
    const z = -62 - R() * 130;
    const x = (R() < 0.5 ? -1 : 1) * (1.9 + R() * 14);
    dummy.position.set(x, 0.2, z);
    const s = 0.6 + R() * 1.1;
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, R() * 3, (R() - 0.5) * 0.3);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, cols.set(PAL.bush[i % 2]).offsetHSL(0, 0, (R() - 0.5) * 0.08));
  }
  g.add(tufts);

  // tiny wildflowers dotting the meadow
  const flowerGeo = new THREE.CircleGeometry(0.06, 5);
  const flowerMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const FLOWER_COLS = ['#fff3d6', '#ffd1dd', '#ffe08a', '#f8f8f0'];
  const nFlow = 500;
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, nFlow);
  for (let i = 0; i < nFlow; i++) {
    const z = -72 - R() * 118;
    const x = (R() < 0.5 ? -1 : 1) * (2.2 + R() * 22);
    dummy.position.set(x, 0.1 + R() * 0.1, z);
    dummy.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.7, 0, R() * 3);
    const s = 0.7 + R() * 0.9;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, cols.set(FLOWER_COLS[Math.floor(R() * FLOWER_COLS.length)]));
  }
  g.add(flowers);
}

// ---------- animated stream ----------
function stream() {
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      colA: { value: PAL.water.clone() },
      colB: { value: PAL.waterHi.clone() },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 10 },
      fogFar: { value: 120 },
    },
    fog: false,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying float vFogDepth;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 colA, colB, fogColor;
      uniform float fogNear, fogFar;
      varying vec2 vUv;
      varying float vFogDepth;
      void main() {
        float flow = vUv.x * 40.0 - uTime * 1.6;
        float band = sin(flow + sin(vUv.y * 22.0 + uTime) * 1.4)
                   * sin(vUv.y * 14.0 - uTime * 0.7);
        float hi = smoothstep(0.55, 0.95, band);
        vec3 col = mix(colA, colB, hi * 0.85 + 0.08 * sin(flow * 0.3));
        float f = smoothstep(fogNear, fogFar, vFogDepth);
        col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 7, 1, 1), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = 0.12;
  m.position.set(0, 0.04, -134);
  return { mesh: m, uniforms, mat };
}

// ============================================================
export function buildNature(scene) {
  const g = new THREE.Group();

  // ---- transition: low stone walls funneling into the gate ----
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 22), toon(PAL.stoneDark));
    wall.position.set(side * 4.6, 0.55, -76);
    wall.rotation.y = side * -0.12;
    g.add(wall);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 22), toon(PAL.bush[0]));
    hedge.position.set(side * 5.4, 0.9, -76);
    hedge.rotation.y = side * -0.12;
    g.add(hedge);
  }

  // ---- torii gates: main one + two smaller deeper in ----
  const t1 = torii(1.15); t1.position.set(0, 0, -88);   g.add(t1);
  const t2 = torii(0.9);  t2.position.set(0, 0, -108);  g.add(t2);
  const t3 = torii(0.8);  t3.position.set(0.4, 0, -122); g.add(t3);

  // ---- stone lanterns pacing the path ----
  for (let z = -80; z > -172; z -= 14) {
    for (const side of [-1, 1]) {
      if ((Math.round(z / 14) + (side + 1) / 2) % 2 === 0) continue;
      const l = stoneLantern();
      l.position.set(side * (2.6 + R() * 0.5), 0, z + R() * 3);
      l.rotation.y = R() * Math.PI;
      g.add(l);
    }
  }

  // ---- stream + bridge ----
  const water = stream();
  g.add(water.mesh);
  const br = bridge();
  br.position.set(0, 0.05, -134);
  g.add(br);

  // ---- the shrine at the end of the walk ----
  const sh = shrine();
  sh.position.set(0, 0, -182);
  g.add(sh);
  // guardian lanterns + flags at the shrine
  for (const sx of [-1, 1]) {
    const l = stoneLantern();
    l.scale.setScalar(1.3);
    l.position.set(sx * 3.4, 0, -176);
    g.add(l);
  }

  // ---- big rocks scattered ----
  for (let i = 0; i < 24; i++) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + R() * 0.9, 0), toon(PAL.stoneDark));
    rock.position.set((R() < 0.5 ? -1 : 1) * (3 + R() * 18), 0.25, -70 - R() * 120);
    rock.scale.y = 0.55 + R() * 0.4;
    rock.rotation.set(R(), R(), R());
    g.add(rock);
  }

  // ---- forest ----
  plantForest(g);

  scene.add(g);

  return {
    group: g,
    waterMat: water.mat,
    update(dt, t, fogColor, fogNear, fogFar) {
      water.uniforms.uTime.value = t;
      water.mat.uniforms.fogColor.value.copy(fogColor);
      water.mat.uniforms.fogNear.value = fogNear;
      water.mat.uniforms.fogFar.value = fogFar;
    },
  };
}
