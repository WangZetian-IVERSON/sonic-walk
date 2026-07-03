// ============ Ground (asphalt -> grass blend) + walking path ============
import * as THREE from 'three';
import { PAL, toon } from './palette.js';

export function buildGround(scene) {
  // big blended ground plane, colored in-shader by world z
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      asphalt: { value: PAL.asphalt.clone() },
      grass: { value: PAL.grass.clone() },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 10 },
      fogFar: { value: 120 },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      varying float vFogDepth;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mv = viewMatrix * wp;
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 asphalt, grass, fogColor;
      uniform float fogNear, fogFar;
      varying vec3 vWorld;
      varying float vFogDepth;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // city (z > -72) -> grass (z < -86), ragged soft edge
        float zJitter = (hash(floor(vWorld.xz * 0.8)) - 0.5) * 7.0;
        float tz = 1.0 - smoothstep(-86.0, -72.0, vWorld.z + zJitter);
        vec3 col = mix(asphalt, grass, tz);
        // gentle patch variation, stronger on grass
        float v = hash(floor(vWorld.xz * 0.45));
        col *= 0.94 + v * 0.12 * (0.4 + tz * 0.6);
        float f = smoothstep(fogNear, fogFar, vFogDepth);
        col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -100);
  scene.add(ground);

  // the walking path — one continuous strip, stone colored
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 230), toon(PAL.path));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.015, -85);
  scene.add(path);

  // curbs in the city section
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 92), toon(PAL.curb));
    curb.position.set(side * 1.9, 0.07, -24);
    scene.add(curb);
    // sidewalk strip
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 92), toon('#6a6a74'));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(side * 3.9, 0.02, -24);
    scene.add(walk);
  }

  // stepping-stone accents in the nature part
  const stoneMat = toon('#b3aa9c');
  for (let z = -104; z > -178; z -= 3.1) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.07, 7), stoneMat);
    s.position.set(Math.sin(z * 0.7) * 0.5, 0.03, z);
    s.rotation.y = z;
    scene.add(s);
  }

  return {
    update(fogColor, fogNear, fogFar) {
      mat.uniforms.fogColor.value.copy(fogColor);
      mat.uniforms.fogNear.value = fogNear;
      mat.uniforms.fogFar.value = fogFar;
    },
  };
}
