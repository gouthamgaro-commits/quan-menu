// The living landscape: wind in the grass and the trees, a moonlit river, smoke from chimneys,
// embers from torches, low mist over the water and the graveyard, and laundry swaying over the street.
import * as THREE from 'three';
import { terrainHeight, riverZ, WATER, MOON, CAMP, GRAVE, SHRINE, LAIR } from './world.js';

function mulberry(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// One draw call for many soft round particles, each with its own size, colour and opacity.
class Puffs {
  constructor(scene, max, map, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max); this.col = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: map }, scale: { value: 400 } }]),
      vertexShader: `
        attribute float size; attribute float alpha; attribute vec3 pcolor;
        uniform float scale; varying float vA; varying vec3 vC;
        #include <fog_pars_vertex>
        void main(){
          vA = alpha; vC = pcolor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(size * scale / -mvPosition.z, 256.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D map; varying float vA; varying vec3 vC;
        #include <fog_pars_fragment>
        void main(){
          float a = texture2D(map, gl_PointCoord).a * vA;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vC, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      transparent: true, depthWrite: false, fog: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  begin() { this.n = 0; }
  add(x, y, z, size, alpha, r, g, b) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.size[i] = size; this.alpha[i] = alpha;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
  }
  end() {
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    for (const k of ['position', 'size', 'alpha', 'pcolor']) g.attributes[k].needsUpdate = true;
  }
}

function noiseTex(seed) {
  const r = mulberry(seed), c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, y = r() * 256, rad = 18 + r() * 46, a = 0.05 + r() * 0.12;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function addNature(scene, W) {
  const rnd = mulberry(777);
  const time = { value: 0 }, push = { value: new THREE.Vector3(0, -99, 0) };

  // ---------------------------------------------------------------- grass
  const blade = (() => {
    const pos = [], col = [], nor = [];
    for (let b = 0; b < 12; b++) {
      const a = rnd() * Math.PI, h = 0.12 + rnd() * 0.2, w = 0.025 + rnd() * 0.02, ox = (rnd() - 0.5) * 0.5, oz = (rnd() - 0.5) * 0.5, lean = (rnd() - 0.5) * 0.22;
      const cx = Math.cos(a) * w, cz = Math.sin(a) * w;
      pos.push(ox - cx, 0, oz - cz, ox + cx, 0, oz + cz, ox + lean, h, oz + lean * 0.5);
      col.push(0.13, 0.2, 0.08, 0.13, 0.2, 0.08, 0.27, 0.38, 0.15);
      for (let k = 0; k < 3; k++) nor.push(0, 1, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })();
  const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time; sh.uniforms.uPush = push;
    sh.vertexShader = 'uniform float uTime; uniform vec3 uPush;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 wpos = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wpos = instanceMatrix * wpos;
        vec2 ip = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
      #else
        vec2 ip = vec2(0.0);
      #endif
      wpos = modelMatrix * wpos;
      float hgt = transformed.y;
      float sway = sin(uTime * 1.6 + ip.x * 0.3 + ip.y * 0.23) + 0.6 * sin(uTime * 2.7 + ip.x * 0.9 + ip.y * 0.4);
      wpos.x += sway * 0.07 * hgt;
      wpos.z += cos(uTime * 1.2 + ip.y * 0.35) * 0.05 * hgt;
      vec2 aw = ip - uPush.xz; float dd = length(aw);
      wpos.xz += aw / max(dd, 0.001) * (1.0 - smoothstep(0.3, 1.5, dd)) * 0.55 * hgt * step(abs(uPush.y - wpos.y), 2.0);
      vec4 mvPosition = viewMatrix * wpos;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  const SECTORS = 16, PER = 900;
  const grass = [];
  const sectorM = [];
  for (let k = 0; k < SECTORS; k++) {
    const m = new THREE.InstancedMesh(blade, grassMat, PER);
    m.count = 0; m.userData.max = 0;
    sectorM.push(m); grass.push(m); scene.add(m);
  }
  {
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    let guard = 0;
    while (guard++ < 60000) {
      const a = rnd() * Math.PI * 2, r = 58 + Math.pow(rnd(), 1.6) * 110;
      const x = Math.cos(a) * r, z = Math.sin(a) * r + 18;
      if (Math.max(Math.abs(x), Math.abs(z)) < 60) continue;
      if (Math.abs(x) < 3.8 && z > 56 && z < 142) continue;
      if (Math.abs(z - riverZ(x)) < 8) continue;
      if (Math.hypot(x - CAMP.x, z - CAMP.z) < 6.5 || Math.hypot(x - SHRINE.x, z - SHRINE.z) < 4 || Math.hypot(x - LAIR.x, z - LAIR.z) < 4.5) continue;
      const h = terrainHeight(x, z);
      if (h < -0.3) continue;
      const slope = Math.abs(terrainHeight(x + 1, z) - h) + Math.abs(terrainHeight(x, z + 1) - h);
      if (slope > 1.4) continue;
      if (Math.hypot(x - GRAVE.x, z - GRAVE.z) < 14 && rnd() < 0.6) continue;
      const sec = Math.floor(((Math.atan2(z - 18, x) + Math.PI) / (Math.PI * 2)) * SECTORS) % SECTORS, m = sectorM[sec];
      if (m.userData.max >= PER) continue;
      const s = 0.8 + rnd() * 0.9;
      q.setFromAxisAngle(up, rnd() * 6.28);
      mtx.compose(new THREE.Vector3(x, h - 0.02, z), q, new THREE.Vector3(s * 1.2, s * (0.7 + rnd() * 0.6), s * 1.2));
      m.setMatrixAt(m.userData.max, mtx);
      c.setHSL(0.24 + rnd() * 0.07, 0.3 + rnd() * 0.2, 0.55 + rnd() * 0.3);
      m.setColorAt(m.userData.max, c);
      m.userData.max++;
      if (sectorM.every((s2) => s2.userData.max >= PER)) break;
    }
    for (const m of sectorM) { m.count = m.userData.max; m.computeBoundingSphere(); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
  W.setGrass = (f) => { for (const m of grass) m.count = Math.floor(m.userData.max * f); };

  // ---------------------------------------------------------------- wind in the trees and bushes
  const windIn = (mat, base, amp) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float hgt = max(transformed.y - ${base.toFixed(2)}, 0.0);
        #ifdef USE_INSTANCING
          vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 ip = vec4(0.0);
        #endif
        transformed.x += sin(uTime * 0.9 + ip.x * 0.05 + ip.z * 0.04) * ${amp.toFixed(3)} * hgt;
        transformed.z += cos(uTime * 0.7 + ip.z * 0.05 + ip.x * 0.03) * ${(amp * 0.7).toFixed(3)} * hgt;`);
    };
    mat.needsUpdate = true;
  };
  if (W.foliage) windIn(W.foliage.material, 2.5, 0.035);
  if (W.bushes) windIn(W.bushes.material, -1, 0.04);

  // ---------------------------------------------------------------- the river
  if (W.water) {
    W.water.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uMoon: { value: MOON.clone() }, uCam: { value: new THREE.Vector3() },
        uDeep: { value: new THREE.Color(0.006, 0.02, 0.035) }, uSky: { value: new THREE.Color(0.035, 0.055, 0.11) }, uRage: { value: 0 },
      }]),
      vertexShader: `
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime, uRage; uniform vec3 uMoon, uCam, uDeep, uSky; varying vec3 vW;
        #include <fog_pars_fragment>
        float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
        float wave(vec2 p){
          return n2(p * 0.35 + vec2(uTime * 0.12, uTime * 0.05)) * 0.6 + n2(p * 0.9 - vec2(uTime * 0.2, -uTime * 0.07)) * 0.3 + n2(p * 2.3 + vec2(uTime * 0.4, 0.0)) * 0.1;
        }
        void main(){
          vec2 p = vW.xz; float e = 0.2;
          float h0 = wave(p), hx = wave(p + vec2(e, 0.0)), hz = wave(p + vec2(0.0, e));
          vec3 n = normalize(vec3((h0 - hx) / e * 0.6, 1.0, (h0 - hz) / e * 0.6));
          vec3 v = normalize(uCam - vW);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          vec3 r = reflect(-v, n);
          float glint = pow(max(dot(r, normalize(uMoon)), 0.0), 380.0) * 2.2 + pow(max(dot(r, normalize(uMoon)), 0.0), 30.0) * 0.05;
          vec3 sky = mix(uSky, vec3(0.3, 0.06, 0.03), uRage);
          vec3 col = mix(uDeep, sky, 0.08 + 0.5 * fres) + vec3(1.0, 0.95, 0.85) * glint;
          gl_FragColor = vec4(col, 0.94);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      transparent: true, fog: true,
    });
  }

  // ---------------------------------------------------------------- smoke, embers, mist
  const smoke = new Puffs(scene, 260, W.tex.puff, false);
  const embers = new Puffs(scene, 120, W.tex.flame, true);
  const chim = W.chimneys.map((c) => ({ ...c, seed: rnd() * 10 }));
  const mistTex = noiseTex(5), mistTex2 = noiseTex(9);
  const mist = [];
  function mistPlane(geo, x, y, z, color, opacity, tex, rep) {
    const t = tex.clone(); t.repeat.set(rep[0], rep[1]); t.needsUpdate = true;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, fog: true }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2;
    scene.add(m); mist.push({ m, t, sp: 0.004 + rnd() * 0.006 });
  }
  mistPlane(new THREE.PlaneGeometry(520, 30), 0, WATER + 0.7, 84, 0x3a4a66, 0.5, mistTex, [26, 1.5]);
  mistPlane(new THREE.PlaneGeometry(520, 34), 0, WATER + 1.5, 84, 0x3a4a66, 0.28, mistTex2, [18, 1.2]);
  mistPlane(new THREE.CircleGeometry(17, 40), GRAVE.x, GRAVE.y + 0.4, GRAVE.z, 0x2f7a46, 0.55, mistTex, [3, 3]);
  mistPlane(new THREE.CircleGeometry(19, 40), GRAVE.x, GRAVE.y + 1.0, GRAVE.z, 0x2f7a46, 0.3, mistTex2, [2.4, 2.4]);

  // ---------------------------------------------------------------- laundry over the main street
  const laundry = [];
  {
    const lineM = new THREE.MeshBasicMaterial({ color: 0x2a2420 });
    const cloths = [0xe8e2d0, 0x8a3a3a, 0x3a5a8a, 0xd8cfa8, 0x6a7a4a].map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 1 }));
    for (const z of [32.6, 44.2]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 14, 4), lineM);
      line.rotation.z = Math.PI / 2; line.position.set(0, 4.35, z); scene.add(line);
      for (let i = 0; i < 6; i++) {
        const w = 0.5 + rnd() * 0.5, h = 0.5 + rnd() * 0.5;
        const g = new THREE.PlaneGeometry(w, h); g.translate(0, -h / 2, 0);
        const c = new THREE.Mesh(g, cloths[(rnd() * cloths.length) | 0]);
        c.position.set(-5.4 + i * 2.1 + rnd() * 0.4, 4.34, z); c.castShadow = true;
        scene.add(c); laundry.push({ c, ph: rnd() * 6 });
      }
    }
  }

  const cam = new THREE.Vector3();
  return {
    update(t, dt, camera, renderer, player, rage) {
      time.value = t;
      push.value.copy(player);
      camera.getWorldPosition(cam);
      if (W.water && W.water.material.uniforms) {
        const u = W.water.material.uniforms;
        u.uTime.value = t; u.uCam.value.copy(cam); u.uRage.value = rage;
      }
      const sc = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      smoke.mat.uniforms.scale.value = sc; embers.mat.uniforms.scale.value = sc;

      smoke.begin();
      for (const c of chim) {
        if (Math.abs(c.x - cam.x) + Math.abs(c.z - cam.z) > 150) continue;
        for (let k = 0; k < 5; k++) {
          const age = (t * 0.16 + k / 5 + c.seed) % 1;
          const drift = age * age * 3.2;
          smoke.add(c.x + drift + Math.sin(t * 0.7 + c.seed + k) * 0.2, c.y + age * 6.5, c.z + drift * 0.45,
            0.7 + age * 3.4, 0.26 * Math.sin(Math.min(1, age * 1.4) * Math.PI) * (1 - rage * 0.4), 0.33 + rage * 0.2, 0.34, 0.38);
        }
      }
      smoke.end();

      embers.begin();
      let budget = 0;
      for (const tc of W.torches) {
        const d = Math.abs(tc.x - cam.x) + Math.abs(tc.z - cam.z);
        if (d > 40 || budget++ > 30) continue;
        const [r, g, b] = tc.ghost ? [0.4, 1.6, 0.6] : tc.moon ? [0.6, 0.9, 1.8] : [1.8, 0.7, 0.18];
        for (let k = 0; k < 3; k++) {
          const sd = tc.x * 3.1 + tc.z * 1.7 + k * 2.3, age = (t * (0.45 + (k % 2) * 0.2) + sd) % 1;
          embers.add(tc.x + Math.sin(sd + age * 6) * 0.25 * age, tc.y + 0.15 + age * (1.4 + tc.s * 0.5), tc.z + Math.cos(sd * 1.3 + age * 5) * 0.25 * age,
            0.05 + (1 - age) * 0.05, (1 - age) * 0.9, r, g, b);
        }
      }
      embers.end();

      for (const m of mist) { m.t.offset.x += dt * m.sp; m.t.offset.y += dt * m.sp * 0.3; m.m.material.opacity = m.m.material.opacity; }
      for (const l of laundry) { l.c.rotation.x = Math.sin(t * 1.9 + l.ph) * 0.25 + 0.12; l.c.rotation.y = Math.sin(t * 1.1 + l.ph) * 0.15; }
    },
  };
}
