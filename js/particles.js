// ============ Falling sakura petals + fireflies ============
import * as THREE from 'three';

export function buildParticles(scene) {
  // ---- petals: instanced little quads swirling down ----
  const N_PET = 260;
  // petal-ish shape: a squashed pentagon reads softer than a square
  const petGeo = new THREE.CircleGeometry(0.055, 5);
  petGeo.scale(1, 1.35, 1);
  const petMat = new THREE.MeshBasicMaterial({
    color: '#ff9fbc', side: THREE.DoubleSide, transparent: true, opacity: 0.9, fog: false,
  });
  const petals = new THREE.InstancedMesh(petGeo, petMat, N_PET);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pet = [];
  for (let i = 0; i < N_PET; i++) {
    pet.push({
      x: 0, y: -1, z: 0, // parked below ground until activated
      vy: 0.35 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 4,
      sway: 0.4 + Math.random() * 0.8,
    });
  }
  scene.add(petals);

  // ---- fireflies: additive points ----
  const N_FLY = 90;
  const flyPos = new Float32Array(N_FLY * 3);
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = new THREE.PointsMaterial({
    color: '#ffe9a3', size: 0.14, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const flies = new THREE.Points(flyGeo, flyMat);
  flies.frustumCulled = false;
  scene.add(flies);
  const flyState = [];
  for (let i = 0; i < N_FLY; i++) {
    flyState.push({
      cx: 0, cy: 1 + Math.random() * 2.4, cz: 0,
      r: 0.5 + Math.random() * 2.5,
      sp: 0.3 + Math.random() * 0.7,
      ph: Math.random() * Math.PI * 2,
    });
  }

  const dummy = new THREE.Object3D();

  function respawnPetal(p, cam) {
    p.x = cam.x + (Math.random() - 0.5) * 26;
    p.y = 4 + Math.random() * 6;
    p.z = cam.z - 4 - Math.random() * 26;
  }
  function respawnFly(f, cam) {
    f.cx = cam.x + (Math.random() - 0.5) * 30;
    f.cz = cam.z - 2 - Math.random() * 30;
  }

  let flyInit = false;
  let burstUntil = 0;

  return {
    // climax: petals erupt around the walker
    burst(cam, t) {
      burstUntil = t + 6;
      for (const p of pet) {
        p.x = cam.x + (Math.random() - 0.5) * 10;
        p.y = 0.5 + Math.random() * 7;
        p.z = cam.z - 2 - Math.random() * 14;
        p.vy = 0.15 + Math.random() * 0.3; // drift slowly during the bloom
      }
    },
    // natureAmt: 0 in city, 1 deep in nature — controls density/visibility
    update(dt, t, cam, natureAmt) {
      const bursting = t < burstUntil;
      // petals
      for (let i = 0; i < N_PET; i++) {
        const p = pet[i];
        const active = bursting || i < N_PET * natureAmt;
        if (active && p.y < 0.05) respawnPetal(p, cam);
        if (!active) p.y = -1;
        if (p.y > 0) {
          p.y -= p.vy * dt;
          p.x += Math.sin(t * p.sway + p.phase) * dt * 0.8;
          p.z += Math.cos(t * p.sway * 0.7 + p.phase) * dt * 0.5;
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(t * p.spin + p.phase, p.phase, t * p.spin * 0.6);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;

      // fireflies
      const want = natureAmt > 0.45;
      flyMat.opacity += ((want ? 0.85 : 0) - flyMat.opacity) * dt * 1.5;
      if (want && !flyInit) { flyState.forEach(f => respawnFly(f, cam)); flyInit = true; }
      if (flyMat.opacity > 0.01) {
        for (let i = 0; i < N_FLY; i++) {
          const f = flyState[i];
          if (Math.abs(f.cz - cam.z) > 40) respawnFly(f, cam);
          flyPos[i * 3]     = f.cx + Math.sin(t * f.sp + f.ph) * f.r;
          flyPos[i * 3 + 1] = f.cy + Math.sin(t * f.sp * 1.7 + f.ph * 2) * 0.5;
          flyPos[i * 3 + 2] = f.cz + Math.cos(t * f.sp * 0.8 + f.ph) * f.r;
        }
        flyGeo.attributes.position.needsUpdate = true;
      }
    },
  };
}
