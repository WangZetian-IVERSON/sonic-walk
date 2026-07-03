// ============ Zone 1 — Japanese city street at dusk ============
import * as THREE from 'three';
import { PAL, toon, glow, rng, canvasTexture } from './palette.js';

const R = rng(20260703);

// ---------- facade texture: map + emissive built in one pass so lit windows match ----------
function facadePair(baseColor, cols, rows, litChance) {
  const lit = [];
  for (let i = 0; i < cols; i++) { lit[i] = []; for (let j = 0; j < rows; j++) lit[i][j] = R() < litChance; }
  const draw = (emissiveOnly) => (ctx, w, h) => {
    ctx.fillStyle = emissiveOnly ? '#000000' : baseColor;
    ctx.fillRect(0, 0, w, h);
    if (!emissiveOnly) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let y = 0; y < h; y += 64) ctx.fillRect(0, y, w, 3);
    }
    const plinth = h * 0.1; // dark base so buildings sit into the ground
    const cw = w / cols, ch = (h - plinth) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (emissiveOnly && !lit[i][j]) continue;
      ctx.fillStyle = lit[i][j] ? '#ffd98e' : '#394152';
      ctx.fillRect(i * cw + cw * 0.28, j * ch + ch * 0.3, cw * 0.44, ch * 0.42);
    }
    if (!emissiveOnly) {
      ctx.fillStyle = 'rgba(30,28,40,0.55)';
      ctx.fillRect(0, h - plinth, w, plinth);
    }
  };
  return {
    map: canvasTexture(256, 512, draw(false)),
    emissive: canvasTexture(256, 512, draw(true)),
  };
}

// ---------- vertical kanji sign ----------
function kanjiSign(text, bg, fg, glowOn) {
  const tex = canvasTexture(64, 64 * text.length, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = fg;
    ctx.font = '44px "Yu Gothic", "MS Gothic", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [...text].forEach((ch, i) => ctx.fillText(ch, w / 2, 64 * i + 32));
  });
  const mat = glowOn
    ? new THREE.MeshBasicMaterial({ map: tex })
    : new THREE.MeshToonMaterial({ map: tex });
  const H = 0.42 * text.length;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, H, 0.1), [
    toon('#2a2a33'), toon('#2a2a33'), toon('#2a2a33'), toon('#2a2a33'), mat, mat,
  ]);
  return mesh;
}

// ---------- one building ----------
function building(w, h, d, tone) {
  const g = new THREE.Group();
  const { map, emissive } = facadePair(tone, Math.max(3, Math.round(w / 1.1)), Math.max(4, Math.round(h / 1.25)), 0.38);
  const faceMat = new THREE.MeshToonMaterial({
    map, emissive: 0xffffff, emissiveMap: emissive, emissiveIntensity: 0.85,
  });
  const sideMat = toon(new THREE.Color(tone).multiplyScalar(0.82));
  const roofMat = toon(PAL.roof);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    [sideMat, sideMat, roofMat, sideMat, faceMat, sideMat]); // +x -x +y -y +z(-front) -z
  body.position.y = h / 2;
  g.add(body);
  // parapet
  const par = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.3, d + 0.15), toon(new THREE.Color(tone).multiplyScalar(0.7)));
  par.position.y = h + 0.1;
  g.add(par);
  // rooftop clutter: water tank / AC
  if (R() < 0.6) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 8), toon('#c8c2b6'));
    tank.position.set((R() - 0.5) * w * 0.5, h + 0.75, (R() - 0.5) * d * 0.5);
    g.add(tank);
  }
  if (R() < 0.7) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), toon('#b9b4a8'));
    ac.position.set((R() - 0.5) * w * 0.6, h + 0.45, (R() - 0.5) * d * 0.4);
    g.add(ac);
  }
  return g;
}

// ---------- storefront (ground level, facing street) ----------
const SIGNS = [
  ['ラーメン', '#a41f2f', '#ffe9c9', true],
  ['喫茶',     '#204a3c', '#ffd98e', true],
  ['酒場',     '#1e2a4a', '#7fd8f0', true],
  ['本屋',     '#5a4632', '#f5e9d0', false],
  ['薬局',     '#e8e2d4', '#2e6e50', true],
  ['タバコ',   '#33334a', '#ff9db5', true],
];
function storefront(side) {
  const g = new THREE.Group();
  const w = 3 + R() * 1.4;
  // awning
  const awnTex = canvasTexture(128, 64, (ctx, cw, ch) => {
    const cols = ['#c2513e', '#efe4cf'];
    for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 2]; ctx.fillRect(i * cw / 8, 0, cw / 8, ch); }
  });
  const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.08, 1.1), new THREE.MeshToonMaterial({ map: awnTex }));
  awn.position.set(0, 2.6, side * -0.9);
  awn.rotation.x = side * 0.18;
  g.add(awn);
  // warm shop window
  const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.62, 1.5), glow('#ffcf8e', 1.15));
  win.position.set(-w * 0.12, 1.35, side * -0.28);
  win.rotation.y = side > 0 ? 0 : Math.PI;
  g.add(win);
  // door
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.9), toon('#4a3a30'));
  door.position.set(w * 0.34, 0.95, side * -0.28);
  door.rotation.y = side > 0 ? 0 : Math.PI;
  g.add(door);
  // vertical sign
  const s = SIGNS[Math.floor(R() * SIGNS.length)];
  const sign = kanjiSign(s[0], s[1], s[2], s[3]);
  sign.position.set(-w * 0.46, 3.2, side * -1.0);
  g.add(sign);
  // hanging lantern
  if (R() < 0.55) {
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), glow('#ff9d5c', 1.7));
    lan.scale.y = 1.35;
    lan.position.set(w * 0.4, 2.35, side * -1.0);
    g.add(lan);
  }
  g.userData.width = w;
  return g;
}

// ---------- vending machine ----------
function vendingMachine(hue) {
  const g = new THREE.Group();
  const bodyCol = hue === 'red' ? '#c9303a' : '#e8e6e0';
  const front = canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = bodyCol; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3fbff'; ctx.fillRect(10, 14, w - 20, 96); // glowing display
    // drink rows
    const drinks = ['#ff7c4d', '#4dc9ff', '#ffd94d', '#7dff8e', '#ff9db5', '#c9a2ff'];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      ctx.fillStyle = drinks[(r * 4 + c) % drinks.length];
      ctx.fillRect(18 + c * 24, 24 + r * 44, 16, 32);
    }
    ctx.fillStyle = '#22222c'; ctx.fillRect(10, 128, w - 20, 40); // buttons band
    ctx.fillStyle = '#ff4d6b'; ctx.fillRect(16, 140, 14, 14);
    ctx.fillStyle = '#4deeea'; ctx.fillRect(36, 140, 14, 14);
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(24, 190, w - 48, 44); // pickup slot
  });
  const frontMat = new THREE.MeshBasicMaterial({ map: front });
  const side = toon(new THREE.Color(bodyCol).multiplyScalar(0.75));
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.95, 0.75),
    [side, side, side, side, frontMat, side]);
  box.position.y = 0.975;
  g.add(box);
  // soft glow plane in front (helps bloom)
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.65), glow('#e8f6ff', 1.6));
  gl.position.set(0, 1.55, 0.379);
  g.add(gl);
  return g;
}

// ---------- power pole with crossarm ----------
function powerPole() {
  const g = new THREE.Group();
  const mat = toon('#3c3a38');
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9, 7), mat);
  pole.position.y = 4.5;
  g.add(pole);
  for (const [y, len] of [[8.2, 2.2], [7.4, 1.6]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.1), mat);
    arm.position.y = y;
    g.add(arm);
    for (const s of [-1, 1]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6), toon('#cfd6cf'));
      ins.position.set(s * len * 0.42, y + 0.11, 0);
      g.add(ins);
    }
  }
  // transformer drum
  if (R() < 0.5) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 8), toon('#55524e'));
    tr.position.set(0.28, 6.6, 0);
    g.add(tr);
  }
  return g;
}

// sagging wire between two points
function wire(a, b, sag = 0.55) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.022, 4), toon('#26242a'));
}

// ============================================================
export function buildCity(scene) {
  const g = new THREE.Group();
  const flickers = []; // neon meshes that flicker

  // ---- buildings, both sides, z from +14 down to -64 ----
  for (const side of [-1, 1]) {
    let z = 14;
    while (z > -62) {
      const w = 4.5 + R() * 3.5;
      const h = 5.5 + R() * 9;
      const d = 5 + R() * 3;
      const tone = PAL.buildingTones[Math.floor(R() * PAL.buildingTones.length)];
      const b = building(w, h, d, tone);
      const x = side * (7.6 + R() * 1.2 + d / 2 - 2.5);
      b.position.set(side * (7.2 + d / 2), 0, z - w / 2);
      b.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(b);

      // storefront strapped to the street face
      if (R() < 0.75) {
        const sf = storefront(1);
        sf.position.set(side * 6.9, 0, z - w / 2);
        sf.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(sf);
      }
      // occasional rooftop neon billboard
      if (R() < 0.3) {
        const colors = [PAL.neonPink, PAL.neonCyan, PAL.neonYellow];
        const nm = glow(colors[Math.floor(R() * 3)], 2.0);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.12), nm.clone());
        neon.position.set(side * 8.2, h + 1.1, z - w / 2);
        neon.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        neon.userData.base = neon.material.color.clone();
        flickers.push(neon);
        g.add(neon);
      }
      z -= w + 0.6 + R() * 1.5;
    }
  }

  // ---- back skyline silhouettes (behind the walker & flanks) ----
  const silMat = new THREE.MeshBasicMaterial({ color: '#4a4166', fog: false });
  for (let i = 0; i < 26; i++) {
    const w = 8 + R() * 16, h = 18 + R() * 42;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), silMat);
    const behind = R() < 0.45;
    m.position.set(
      (R() - 0.5) * 340,
      h / 2 - 2,
      behind ? 60 + R() * 90 : -20 - R() * 60
    );
    if (!behind && Math.abs(m.position.x) < 60) m.position.x += Math.sign(m.position.x || 1) * 70;
    g.add(m);
  }

  // ---- power poles + wires down the street ----
  const anchors = [];
  for (let z = 12; z > -66; z -= 13) {
    const side = (Math.round(z / 13) % 2 === 0) ? -1 : 1; // alternate sides
    const p = powerPole();
    p.position.set(side * 6.2, 0, z);
    g.add(p);
    anchors.push(new THREE.Vector3(side * 6.2, 8.2, z));
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    g.add(wire(a, b));
    g.add(wire(a.clone().setY(7.4), b.clone().setY(7.4), 0.7));
    g.add(wire(a.clone().add(new THREE.Vector3(0.3, -0.05, 0)), b.clone().add(new THREE.Vector3(-0.3, -0.05, 0)), 0.9));
  }

  // ---- vending machines ----
  for (const [x, z, hue] of [[-6.3, 4, 'red'], [6.3, -18, 'white'], [-6.3, -40, 'red']]) {
    const v = vendingMachine(hue);
    v.position.set(x, 0, z);
    v.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(v);
  }

  // ---- crosswalk stripes near the start ----
  const stripeMat = toon('#d8d4c8');
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 4.6), stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.rotation.z = Math.PI / 2;
    s.position.set(-2.4 + i * 0.8, 0.02, 8);
    g.add(s);
  }

  // ---- street lamps (warm) ----
  for (let z = 6; z > -64; z -= 16) {
    for (const side of [-1, 1]) {
      if ((z / 16 + side) % 2 === 0) continue;
      const lampG = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.4, 6), toon('#4a4a52'));
      pole.position.y = 2.2;
      lampG.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), toon('#4a4a52'));
      arm.position.set(side * -0.45, 4.35, 0);
      lampG.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), glow('#ffd9a0', 2.2));
      bulb.position.set(side * -0.85, 4.28, 0);
      lampG.add(bulb);
      lampG.position.set(side * 5.6, 0, z);
      g.add(lampG);
    }
  }

  scene.add(g);

  return {
    group: g,
    update(dt, t) {
      // neon flicker
      for (let i = 0; i < flickers.length; i++) {
        const n = flickers[i];
        const f = Math.sin(t * 9 + i * 17.3) > -0.85 ? 1 : 0.25;
        n.material.color.copy(n.userData.base).multiplyScalar(f);
      }
    },
  };
}
