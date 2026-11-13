// The town of Ravenmoor and the land around it. Everything is generated here:
// textures are painted on canvases, geometry is merged per material.
import * as THREE from 'three';

export const WATER = -0.9;
export const MOON = new THREE.Vector3(-0.3, 0.42, -0.85).normalize();

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function mulberry(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash2(x, z) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
function fbm(x, z) {
  return vnoise(x, z) * 0.5 + vnoise(x * 2.1, z * 2.1) * 0.27 + vnoise(x * 4.3, z * 4.3) * 0.15 + vnoise(x * 8.7, z * 8.7) * 0.08;
}

export const riverZ = (x) => 84 + 7 * Math.sin(x * 0.025);
export const CAMP = { x: 8, z: 128, y: 3.2 };

// Height of the land. The town sits on a flat shelf; hills rise around it,
// a river cuts across the south, and the road climbs to the camp.
export function terrainHeight(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  const t = sstep(66, 125, d);
  let h = t * (fbm(x * 0.011 + 3.1, z * 0.011 - 1.7) * 26 - 7);
  h += sstep(170, 330, Math.hypot(x, z)) * 30;
  const mx = x - 96, mz = z - 24;
  h += 8 * Math.exp(-(mx * mx + mz * mz) / 380) * sstep(60, 76, d);
  const rd = Math.abs(z - riverZ(x));
  h = lerp(h, Math.min(h, 0.3), 1 - sstep(8, 26, rd));
  h = lerp(h, -2.8, 1 - sstep(2.5, 8, rd));
  if (z > 58 && z < 150) {
    const k = (1 - sstep(2.8, 9, Math.abs(x))) * (1 - sstep(132, 146, z)) * sstep(7, 10, rd);
    h = lerp(h, sstep(98, 128, z) * CAMP.y, k);
  }
  h = lerp(h, CAMP.y, 1 - sstep(8, 15, Math.hypot(x - CAMP.x, z - CAMP.z)));
  return h;
}

// ---------- painted textures ----------
function tex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function grain(g, s, n, lo, hi, a) {
  for (let i = 0; i < n; i++) {
    const v = lo + Math.random() * (hi - lo) | 0;
    g.fillStyle = `rgba(${v},${v},${v},${a})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

function makeTextures() {
  const T = {};
  T.stone = tex(256, (g, s) => {
    g.fillStyle = '#34322f'; g.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++) for (let x = -32; x < s; x += 32) {
      const v = 100 + Math.random() * 50 | 0;
      g.fillStyle = `rgb(${v},${v - 3},${v - 10})`;
      g.fillRect(x + (r % 2) * 16 + 1.5, r * 32 + 1.5, 29, 29);
    }
    grain(g, s, 2600, 30, 200, 0.12);
  });
  T.timber = tex(256, (g, s) => {
    g.fillStyle = '#b3a586'; g.fillRect(0, 0, s, s);
    grain(g, s, 2200, 90, 230, 0.1);
    g.fillStyle = '#33241a';
    g.fillRect(0, 0, s, 13); g.fillRect(0, 122, s, 12);
    g.fillRect(0, 0, 13, s); g.fillRect(122, 0, 12, s);
    g.strokeStyle = '#33241a'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(13, 250); g.lineTo(122, 140); g.moveTo(250, 250); g.lineTo(134, 140); g.stroke();
    grain(g, s, 600, 20, 70, 0.15);
  });
  T.roof = tex(256, (g, s) => {
    g.fillStyle = '#262120'; g.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++) for (let x = -32; x < s; x += 32) {
      const v = 125 + Math.random() * 70 | 0, o = (r % 2) * 16;
      g.fillStyle = `rgb(${v},${v * 0.94 | 0},${v * 0.9 | 0})`;
      g.fillRect(x + o + 1, r * 32 + 1, 30, 30);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + o + 1, r * 32 + 23, 30, 8);
    }
    grain(g, s, 1500, 30, 200, 0.1);
  });
  T.wood = tex(256, (g, s) => {
    for (let x = 0; x < s; x += 32) {
      const v = 70 + Math.random() * 35 | 0;
      g.fillStyle = `rgb(${v + 22},${v},${v * 0.62 | 0})`;
      g.fillRect(x, 0, 32, s);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, 0, 1.5, s);
    }
    g.strokeStyle = 'rgba(20,10,0,0.18)'; g.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y + 20 + Math.random() * 60); g.stroke();
    }
  });
  T.crate = tex(128, (g, s) => {
    for (let y = 0; y < s; y += 21.4) {
      const v = 95 + Math.random() * 30 | 0;
      g.fillStyle = `rgb(${v + 25},${v},${v * 0.6 | 0})`; g.fillRect(0, y, s, 20.4);
    }
    g.strokeStyle = '#3d2a17'; g.lineWidth = 12; g.strokeRect(6, 6, s - 12, s - 12);
    g.beginPath(); g.moveTo(8, 8); g.lineTo(s - 8, s - 8); g.stroke();
    grain(g, s, 500, 30, 120, 0.12);
  });
  T.cobble = tex(256, (g, s) => {
    g.fillStyle = '#211f1c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const v = 82 + Math.random() * 50 | 0;
      g.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
      g.beginPath();
      g.ellipse(i * 28.5 + 14 + (j % 2) * 12 + (Math.random() - 0.5) * 5, j * 28.5 + 14 + (Math.random() - 0.5) * 5,
        10.5 + Math.random() * 3, 10 + Math.random() * 3, Math.random() * 3, 0, 7);
      g.fill();
    }
    grain(g, s, 2000, 20, 170, 0.1);
  });
  T.detail = tex(256, (g, s) => { g.fillStyle = '#c9c9c9'; g.fillRect(0, 0, s, s); grain(g, s, 9000, 110, 255, 0.4); });
  T.thatch = tex(128, (g, s) => {
    g.fillStyle = '#7d6b3c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 700; i++) {
      const v = 95 + Math.random() * 90 | 0;
      g.fillStyle = `rgba(${v},${v * 0.85 | 0},${v * 0.45 | 0},0.6)`;
      g.fillRect(Math.random() * s, Math.random() * s, 1.5, 8 + Math.random() * 22);
    }
  });
  T.cloth = tex(64, (g, s) => {
    for (let x = 0; x < s; x += 16) { g.fillStyle = (x / 16) % 2 ? '#d8cfb8' : '#ffffff'; g.fillRect(x, 0, 16, s); }
    grain(g, s, 300, 100, 200, 0.12);
  });
  T.flame = tex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.25, 'rgba(255,190,90,0.85)');
    gr.addColorStop(0.6, 'rgba(255,90,20,0.25)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  T.puff = tex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  return T;
}

// ---------- geometry batching ----------
class Batch {
  constructor() { this.m = new Map(); }
  add(mat, geo) {
    if (geo.index) geo = geo.toNonIndexed();
    let a = this.m.get(mat);
    if (!a) this.m.set(mat, a = []);
    a.push(geo);
  }
  build(scene) {
    for (const [mat, geos] of this.m) {
      const mesh = new THREE.Mesh(mergeGeos(geos), mat);
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }
}
export function mergeGeos(geos) {
  geos = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}
function scaleBoxUV(geo, w, h, d, s) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s);
  }
}

// Pitched roof: returns [slopes, gables] for a ridge running along x.
function roofGeos(w, d, rh) {
  const hl = w / 2, hd = d / 2, sl = Math.hypot(hd, rh);
  const A = [-hl, 0, -hd], B = [hl, 0, -hd], Cc = [hl, 0, hd], D = [-hl, 0, hd], R1 = [-hl, rh, 0], R2 = [hl, rh, 0];
  const mk = (verts, uvs) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts.flat()), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs.flat()), 2));
    g.computeVertexNormals();
    return g;
  };
  const U = w / 2, V = sl / 2;
  const slopes = mk([D, Cc, R2, D, R2, R1, B, A, R1, B, R1, R2],
    [[0, 0], [U, 0], [U, V], [0, 0], [U, V], [0, V], [0, 0], [U, 0], [U, V], [0, 0], [U, V], [0, V]]);
  const gu = d / 3, gv = rh / 3;
  const gables = mk([Cc, B, R2, A, D, R1], [[0, 0], [gu, 0], [gu / 2, gv], [0, 0], [gu, 0], [gu / 2, gv]]);
  return [slopes, gables];
}

export function buildWorld(scene) {
  const rnd = mulberry(20261);
  const T = makeTextures();
  const batch = new Batch();
  const W = {
    colliders: [], torches: [], hide: [], chests: [], banners: [], spawns: [], tex: T,
    camp: CAMP, crown: { x: -4, y: 1.3, z: -50 },
  };

  const std = (map, color = 0xffffff, o = {}) => new THREE.MeshStandardMaterial({ map, color, roughness: 0.93, metalness: 0, ...o });
  const M = {
    stone: std(T.stone), stoneDark: std(T.stone, 0x8d8f99), timber: std(T.timber), timber2: std(T.timber, 0xd9c8a6),
    roofRed: std(T.roof, 0xb05a3c), roofSlate: std(T.roof, 0x5f6b7c), roofBrown: std(T.roof, 0x86603f),
    wood: std(T.wood), darkwood: std(T.wood, 0x6e5a48), crate: std(T.crate), thatch: std(T.thatch),
    hay: std(T.thatch, 0xe6cf7a), cobble: std(T.cobble),
    clothRed: std(T.cloth, 0xb23a2e), clothBlue: std(T.cloth, 0x3c5f9a), clothTan: std(T.cloth, 0xb9a57e),
    iron: std(null, 0x2a2c30, { roughness: 0.6, metalness: 0.7 }),
    gold: std(null, 0xffc94a, { roughness: 0.3, metalness: 1, emissive: 0x6a4500 }),
    winLit: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.45, 0.55) }),
    winBlue: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 1.2, 2.4) }),
    winDark: std(null, 0x0a0e16, { roughness: 0.25, metalness: 0.4 }),
  };
  for (const k of ['winLit', 'winBlue', 'winDark']) M[k].userData.noShadow = true;
  W.mat = M;

  // --- builders ---
  const col = (x0, x1, z0, z1, y0, y1, o) => { const c = { x0, x1, z0, z1, y0, y1, ...o }; W.colliders.push(c); return c; };
  function box(x, y, z, w, h, d, mat, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(g, w, h, d, o.uv || 3);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    batch.add(mat, g);
    if (o.col === false) return null;
    const e = o.ry ? Math.max(w, d) / 2 : 0;
    return col(x - (e || w / 2), x + (e || w / 2), z - (e || d / 2), z + (e || d / 2), y, y + h, o.c);
  }
  const boxR = (x0, x1, z0, z1, y0, y1, mat, o) => box((x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, mat, o);
  function cyl(x, y, z, rt, rb, h, seg, mat, colSize) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.translate(x, y + h / 2, z);
    batch.add(mat, g);
    if (colSize) col(x - colSize, x + colSize, z - colSize, z + colSize, y, y + h);
  }
  function cone(x, y, z, r, h, seg, mat, ry = 0) {
    const g = new THREE.ConeGeometry(r, h, seg);
    g.rotateY(ry); g.translate(x, y + h / 2, z);
    batch.add(mat, g);
  }
  function roof(cx, y, cz, w, d, rh, axis, roofMat, gableMat) {
    const ov = 0.45;
    const [s, g] = axis === 'x' ? roofGeos(w + ov * 2, d + ov * 2, rh) : roofGeos(d + ov * 2, w + ov * 2, rh);
    for (const geo of [s, g]) { if (axis === 'z') geo.rotateY(Math.PI / 2); geo.translate(cx, y, cz); }
    batch.add(roofMat, s); batch.add(gableMat, g);
    col(cx - w / 2 - ov, cx + w / 2 + ov, cz - d / 2 - ov, cz + d / 2 + ov, y, y + rh,
      { roof: { axis, rh, c: axis === 'x' ? cz : cx, half: (axis === 'x' ? d : w) / 2 + ov } });
  }
  const crate = (x, y, z, s = 1.1) => box(x, y, z, s, s, s, M.crate, { uv: s });
  const barrel = (x, y, z) => cyl(x, y, z, 0.4, 0.36, 1.05, 10, M.wood, 0.38);
  const torch = (x, y, z, o = {}) => W.torches.push({ x, y, z, s: 1, ...o });
  const chest = (x, y, z, loot, ry = 0) => {
    W.chests.push({ x, y, z, ry, loot });
    const a = ry ? 0.3 : 0.45, b = ry ? 0.45 : 0.3;
    col(x - a, x + a, z - b, z + b, y, y + 0.6);
  };
  function merlonsX(x0, x1, z, y) { for (let x = x0 + 0.8; x < x1 - 0.3; x += 2) box(x, y, z, 1.1, 0.9, 0.5, M.stone, { col: false }); }
  function merlonsZ(z0, z1, x, y) { for (let z = z0 + 0.8; z < z1 - 0.3; z += 2) box(x, y, z, 0.5, 0.9, 1.1, M.stone, { col: false }); }
  function lampPost(x, z, y = 3) {
    box(x, 0, z, 0.16, y, 0.16, M.darkwood, { col: false });
    box(x, y - 0.1, z, 0.5, 0.08, 0.5, M.iron, { col: false });
    torch(x, y + 0.25, z);
  }

  // ================= sky, light, land =================
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { moonDir: { value: MOON }, time: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      varying vec3 vDir; uniform vec3 moonDir; uniform float time;
      float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      void main(){
        vec3 d=normalize(vDir); float h=d.y;
        vec3 col=mix(vec3(0.05,0.075,0.15), vec3(0.008,0.014,0.045), pow(max(h,0.),.42));
        float w=max(dot(normalize(vec3(d.x,0.,d.z)),vec3(-1.,0.,0.)),0.);
        col+=vec3(.75,.27,.07)*pow(w,4.)*exp(-max(h,0.)*9.)*.8;
        col+=vec3(.30,.09,.22)*pow(w,2.)*exp(-max(h,0.)*3.5)*.3;
        vec3 q=d*190.; float s=hash(floor(q));
        float star=step(.9955,s)*smoothstep(.45,.0,length(fract(q)-.5))*smoothstep(.03,.3,h);
        col+=vec3(.8,.87,1.)*star*(.55+.45*sin(time*1.7+s*90.))*1.6;
        float m=dot(d,moonDir);
        col+=vec3(1.,.97,.88)*smoothstep(.99915,.99945,m)*2.4;
        col+=vec3(.42,.52,.8)*pow(max(m,0.),420.)*.6+vec3(.10,.14,.26)*pow(max(m,0.),26.)*.55;
        float band=fbm2(d.xz/(d.y+.25)*1.4+time*.004);
        col=mix(col, col*.55+vec3(.05,.065,.11), smoothstep(.5,.85,band)*smoothstep(.0,.25,h)*.6);
        col=mix(col,vec3(0.03,0.045,0.09),smoothstep(0.02,-.12,h));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`.replace('void main(){', `
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        float a=hash(vec3(i,1.)), b=hash(vec3(i+vec2(1.,0.),1.)), c=hash(vec3(i+vec2(0.,1.),1.)), e=hash(vec3(i+vec2(1.,1.),1.));
        return mix(mix(a,b,f.x),mix(c,e,f.x),f.y); }
      float fbm2(vec2 p){ return n2(p)*.5+n2(p*2.1)*.3+n2(p*4.3)*.2; }
      void main(){`),
  }));
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  const fogCol = new THREE.Color().setRGB(0.03, 0.045, 0.09);
  scene.fog = new THREE.FogExp2(fogCol, 0.0062);
  scene.background = fogCol;

  scene.add(new THREE.HemisphereLight(0x6f86c9, 0x1c1712, 0.75));
  const moon = new THREE.DirectionalLight(0x9fb7ff, 1.5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera;
  sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 320;
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.06;
  scene.add(moon, moon.target);

  // far mountains, two jagged silhouettes
  for (const [rad, base, amp, color] of [[900, 60, 190, 0x070b16], [760, 30, 110, 0x04070f]]) {
    const N = 160, pos = [];
    const hAt = (i) => base + amp * fbm((i % N) * 0.11 + rad, rad * 0.01) + amp * 0.35 * vnoise((i % N) * 0.5, 9.3);
    for (let i = 0; i < N; i++) {
      const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
      const x0 = Math.cos(a0) * rad, z0 = Math.sin(a0) * rad, x1 = Math.cos(a1) * rad, z1 = Math.sin(a1) * rad;
      pos.push(x0, -40, z0, x1, -40, z1, x1, hAt(i + 1), z1, x0, -40, z0, x1, hAt(i + 1), z1, x0, hAt(i), z0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = -9;
    scene.add(m);
  }

  // terrain
  {
    const g = new THREE.PlaneGeometry(900, 900, 300, 300);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
    const grassA = new THREE.Color(0x26401f), grassB = new THREE.Color(0x4b6a2e), dirt = new THREE.Color(0x6a583f),
      mud = new THREE.Color(0x4f4a38), rock = new THREE.Color(0x5d5b57);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = terrainHeight(x, z);
      const d = Math.max(Math.abs(x), Math.abs(z));
      p.setY(i, d < 57.4 ? -0.4 : h);
      c.copy(grassA).lerp(grassB, fbm(x * 0.05, z * 0.05));
      const slope = Math.abs(terrainHeight(x + 1.5, z) - h) + Math.abs(terrainHeight(x, z + 1.5) - h);
      c.lerp(rock, sstep(1.1, 2.2, slope));
      c.lerp(mud, sstep(0.2, -0.9, h));
      if (z > 56 && z < 146) c.lerp(dirt, (1 - sstep(2.2, 4.6, Math.abs(x))) * (1 - sstep(134, 146, z)));
      c.lerp(dirt, 1 - sstep(5, 9, Math.hypot(x - CAMP.x, z - CAMP.z)));
      if (d < 66) c.lerp(dirt, 0.55);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const dt = T.detail.clone(); dt.repeat.set(220, 220); dt.needsUpdate = true;
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: dt, roughness: 1 }));
    m.receiveShadow = true;
    scene.add(m);
  }
  // cobbled town floor
  {
    const g = new THREE.PlaneGeometry(116.4, 116.4);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 44, uv.getY(i) * 44);
    const m = new THREE.Mesh(g, M.cobble);
    m.position.y = 0.01; m.receiveShadow = true;
    scene.add(m);
  }
  // river
  const waterTex = T.detail.clone(); waterTex.repeat.set(60, 12); waterTex.needsUpdate = true;
  {
    const g = new THREE.PlaneGeometry(900, 70);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color: 0x16364a, roughness: 0.12, metalness: 0.75, transparent: true, opacity: 0.86, bumpMap: waterTex, bumpScale: 0.6,
    }));
    m.position.set(0, WATER, 84);
    scene.add(m);
  }

  // ================= outer walls =================
  const WH = 7;
  boxR(-58.4, 58.4, -58.4, -56, 0, WH, M.stone); merlonsX(-58.4, 58.4, -58.15, WH);
  boxR(-58.4, -3.5, 56, 58.4, 0, WH, M.stone); merlonsX(-58.4, -8.5, 58.15, WH);
  boxR(3.5, 58.4, 56, 58.4, 0, WH, M.stone); merlonsX(8.5, 58.4, 58.15, WH);
  boxR(-58.4, -56, -56, 56, 0, WH, M.stone); merlonsZ(-56, 56, -58.15, WH);
  boxR(56, 58.4, -56, 56, 0, WH, M.stone); merlonsZ(-56, 56, 58.15, WH);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(sx * 57.2, 0, sz * 57.2, 9, 11, 9, M.stoneDark);
    cone(sx * 57.2, 11, sz * 57.2, 7, 6, 4, M.roofSlate, Math.PI / 4);
    box(sx * 57.2 - sx * 4.55, 8, sz * 57.2, 0.1, 1.2, 0.7, M.winLit, { col: false });
  }
  box(0, 0, -57.6, 10, 13, 5.6, M.stoneDark);
  merlonsX(-5, 5, -55.1, 13);
  // gatehouse
  for (const sx of [-1, 1]) {
    box(sx * 6, 0, 57.2, 5, 10.5, 6.4, M.stoneDark);
    merlonsX(sx * 6 - 2.5, sx * 6 + 2.5, 60.15, 10.5);
    box(sx * 6, 6.5, 60.42, 0.6, 1.3, 0.08, M.winLit, { col: false });
  }
  boxR(-3.5, 3.5, 55.2, 59.2, 4.6, 9, M.stone);
  merlonsX(-3.5, 3.5, 58.95, 9);
  for (let x = -3; x <= 3; x += 0.75) box(x, 3.7, 57.2, 0.09, 0.9, 0.09, M.iron, { col: false });
  box(0, 3.85, 57.2, 7, 0.09, 0.09, M.iron, { col: false });
  // stairs up to the south wall (east) and the north wall (west)
  for (let i = 0; i < 17; i++) {
    boxR(20 + i * 0.82, 20.82 + i * 0.82, 54.2, 56, 0, (i + 1) * 0.412, M.stone);
    boxR(-50 + i * 0.82, -49.18 + i * 0.82, -56, -54.2, 0, (i + 1) * 0.412, M.stone);
  }

  // ================= the keep =================
  const KH = 6;
  boxR(-27.6, -26, -56, -20.4, 0, KH, M.stone); merlonsZ(-56, -20.4, -27.35, KH);
  boxR(26, 27.6, -56, -20.4, 0, KH, M.stone); merlonsZ(-56, -20.4, 27.35, KH);
  boxR(-26, -3, -22, -20.4, 0, KH, M.stone); boxR(3, 26, -22, -20.4, 0, KH, M.stone);
  boxR(-3, 3, -22, -20.4, 4.2, KH, M.stone);
  merlonsX(-27.6, 27.6, -20.65, KH);
  // donjon
  box(21.5, 0, -50.5, 9, 22, 9, M.stoneDark);
  merlonsX(17, 26, -46.25, 22); merlonsX(17, 26, -54.75, 22); merlonsZ(-55, -46, 17.25, 22); merlonsZ(-55, -46, 25.75, 22);
  cone(21.5, 22, -50.5, 4.6, 7, 8, M.roofSlate);
  box(21.5, 29, -50.5, 0.12, 4, 0.12, M.darkwood, { col: false });
  for (const y of [8, 13, 18]) {
    box(21.5, y, -45.95, 0.7, 1.4, 0.1, M.winLit, { col: false });
    box(16.95, y, -50.5, 0.1, 1.4, 0.7, y === 13 ? M.winDark : M.winLit, { col: false });
  }
  // great hall
  boxR(-14, 14, -54, -53, 0, 7, M.stone);
  boxR(-14, -1.6, -33, -32, 0, 7, M.stone); boxR(1.6, 14, -33, -32, 0, 7, M.stone);
  boxR(-1.6, 1.6, -33, -32, 3.2, 7, M.stone);
  boxR(-14, -13, -53, -33, 0, 7, M.stone); boxR(13, 14, -53, -33, 0, 7, M.stone);
  boxR(-13, 3, -47, -46.4, 0, 7, M.stone); boxR(6.2, 13, -47, -46.4, 0, 7, M.stone);
  boxR(3, 6.2, -47, -46.4, 3.2, 7, M.stone);
  boxR(-14, 14, -54, -32, 7, 7.25, M.darkwood, { col: false });
  boxR(-13, 13, -53, -33, 0, 0.04, M.wood, { col: false });
  roof(0, 7.25, -43, 28, 22, 5.5, 'x', M.roofSlate, M.stone);
  for (const x of [-9, -5, 5, 9]) box(x, 3, -31.95, 0.8, 2.6, 0.1, M.winLit, { col: false });
  W.indoor = { x0: -13, x1: 13, z0: -53, z1: -33 };
  // hall furniture
  for (const sx of [-1, 1]) {
    box(sx * 6, 0, -40, 1.3, 0.85, 7, M.wood);
    box(sx * 7.3, 0, -40, 0.4, 0.45, 6.6, M.darkwood, { col: false });
    box(sx * 4.7, 0, -40, 0.4, 0.45, 6.6, M.darkwood, { col: false });
    for (const z of [-36.5, -43.6]) box(sx * 10, 0, z, 0.6, 7, 0.6, M.stoneDark);
    for (let i = 0; i < 4; i++) box(sx * 6 + (rnd() - 0.5) * 0.5, 0.85, -42.5 + i * 1.7, 0.16, 0.22, 0.16, M.gold, { col: false });
  }
  box(0, 0, -45.3, 5, 0.25, 2.2, M.stoneDark);
  box(0, 0.25, -45.6, 1.2, 0.55, 1, M.darkwood); box(0, 0.8, -46.05, 1.3, 2.1, 0.2, M.darkwood, { col: false });
  box(0, 2.9, -46.05, 0.5, 0.3, 0.24, M.gold, { col: false });
  box(-12.6, 0, -40, 0.8, 2.4, 3.2, M.stoneDark);
  torch(-12.0, 0.6, -40, { s: 1.8, fire: true });
  torch(12.75, 3.2, -37, {}); torch(12.75, 3.2, -43.5, {}); torch(-12.75, 3.2, -35.2, {});
  torch(-4, 3.3, -52.75, {});
  // treasury
  box(W.crown.x, 0, W.crown.z, 1, 1.05, 1, M.stoneDark);
  for (let i = 0; i < 26; i++) {
    const s = 0.12 + rnd() * 0.2;
    box(-11.5 + rnd() * 23, 0, -52.6 + rnd() * 1.6, s, s * 0.6, s, M.gold, { col: false, ry: rnd() * 3 });
  }
  chest(-9, 0, -52.2, { gold: 300 }); chest(2, 0, -52.3, { gold: 260, bolts: 4 }); chest(10, 0, -50.5, { gold: 340, potions: 1 }, 1);
  chest(11.6, 0, -34.2, { gold: 90, potions: 1 }, 1);
  // courtyard
  box(-21, 0, -45, 8, 3, 9, M.wood);
  roof(-21, 3, -45, 8, 9, 1.9, 'z', M.thatch, M.wood);
  box(-24.8, 0, -30, 2.2, 1.1, 3.2, M.hay, { c: { soft: true } });
  box(-16.6, 0, -43, 0.5, 0.9, 2.6, M.hay, { col: false });
  for (const z of [-27, -30.5]) { box(21, 0, z, 0.22, 1.7, 0.22, M.darkwood); box(21, 1.1, z, 1.3, 0.2, 0.2, M.darkwood, { col: false }); box(21, 1.7, z, 0.42, 0.42, 0.42, M.hay, { col: false }); }
  crate(15.2, 0, -24); crate(16.4, 0, -24); crate(15.8, 1.1, -24, 1); barrel(24.6, 0, -24); barrel(24.7, 0, -25.1);
  barrel(-15, 0, -31); crate(-25, 0, -37.5);
  chest(-21, 0, -52.2, { gold: 110, arrows: 5 }); chest(15.5, 0, -52, { gold: 100, smoke: 1 }, 1);
  torch(-4.2, 3.4, -20.25); torch(4.2, 3.4, -20.25);
  torch(-5, 3.4, -31.85); torch(5, 3.4, -31.85);
  lampPost(-18, -24.5); lampPost(18.5, -34);

  // ================= town houses =================
  const roofMats = [M.roofRed, M.roofRed, M.roofBrown, M.roofSlate];
  function house(cx, cz, w, d, h, rh, ci) {
    const wall = rnd() < 0.5 ? M.timber : M.timber2, jetty = h > 4.8;
    box(cx, 0, cz, w + 0.16, 0.55, d + 0.16, M.stone, { col: false });
    if (jetty) {
      box(cx, 0, cz, w, 2.7, d, wall, { col: false });
      box(cx, 2.6, cz, w + 0.6, 0.16, d + 0.6, M.darkwood, { col: false });
      box(cx, 2.7, cz, w + 0.5, h - 2.7, d + 0.5, wall, { col: false });
    } else box(cx, 0, cz, w, h, d, wall, { col: false });
    col(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 0, h);
    const e = jetty ? 0.5 : 0, axis = w >= d ? 'x' : 'z';
    roof(cx, h, cz, w + e, d + e, rh, axis, roofMats[rnd() * roofMats.length | 0], wall);
    box(cx + (axis === 'x' ? w * 0.28 : 0), h + rh * 0.25, cz + (axis === 'z' ? d * 0.28 : 0), 0.7, rh + 0.5, 0.7, M.stone, { col: false });
    const doorSide = -Math.sign(cx);
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const L = nx ? d : w, n = Math.max(1, Math.floor(L / 2.7));
      for (let i = 0; i < n; i++) {
        const o = (i + 0.5) / n * L - L / 2;
        for (const wy of jetty ? [1.25, 3.45] : [1.25]) {
          const out = (wy > 2.7 ? e / 2 : 0) + 0.03;
          const px = nx ? cx + nx * (w / 2 + out) : cx + o, pz = nz ? cz + nz * (d / 2 + out) : cz + o;
          if (nx === doorSide && wy < 2 && i === (n >> 1)) { box(px, 0, pz, 0.1, 2.05, 1.1, M.darkwood, { col: false }); continue; }
          const m = rnd() < 0.3 ? M.winLit : M.winDark;
          box(px, wy, pz, nx ? 0.08 : 0.85, 1.05, nx ? 0.85 : 0.08, m, { col: false });
        }
      }
    }
    // something to climb on
    if (rnd() < 0.7 || h < 4) {
      const side = ci === 0 ? -Math.sign(cx) : ci === 2 ? -Math.sign(cx) : Math.sign(cx);
      const zo = ci === 1 ? -d / 2 + 0.7 : ci === 2 ? d / 2 - 0.7 : (rnd() < 0.5 ? -1 : 1) * (d / 2 - 0.8);
      const px = cx + side * (w / 2 + 0.6);
      if (rnd() < 0.75) crate(px, 0, cz + zo); else { barrel(px - side * 0.12, 0, cz + zo); }
    }
  }
  const cols = [11.5, 23, 35.5, 47], rows = [-12, -0.5, 11, 22.5, 34, 45.5];
  for (const sx of [-1, 1]) cols.forEach((cxa, ci) => rows.forEach((cz) => {
    const cx = sx * cxa;
    const w = 7 + rnd() * 2, d = 7 + rnd() * 2.4, h = rnd() < 0.42 ? 3.2 + rnd() * 0.75 : 4.9 + rnd() * 1.3, rh = 2.2 + rnd() * 1.3;
    if (Math.abs(cx) - w / 2 < 17 && cz + d / 2 > 5 && cz - d / 2 < 25) return;            // market square
    if (cx - w / 2 < -31 && cx + w / 2 > -51 && cz - d / 2 < 14 && cz + d / 2 > -20) return; // church close
    house(cx, cz, w, d, h, rh, ci);
  }));

  // church
  box(-41, 0, -6, 12, 8, 20, M.stone);
  roof(-41, 8, -6, 12, 20, 5, 'z', M.roofSlate, M.stone);
  box(-41, 0, 7, 6, 18, 6, M.stoneDark);
  cone(-41, 18, 7, 4.7, 9, 4, M.roofSlate, Math.PI / 4);
  for (const z of [-12, -7, -2]) { box(-34.95, 2.4, z, 0.08, 3.4, 1.1, M.winBlue, { col: false }); box(-47.05, 2.4, z, 0.08, 3.4, 1.1, M.winBlue, { col: false }); }
  box(-41, 0, 10.05, 1.6, 2.6, 0.1, M.darkwood, { col: false });
  box(-41, 12.5, 10.05, 0.9, 1.6, 0.1, M.winLit, { col: false });
  torch(-39.4, 3, 10.3); torch(-42.6, 3, 10.3);
  chest(-49.4, 0, -10, { gold: 90, potions: 1 }, 1);

  // market square
  for (const [x, z, m] of [[-10.5, 10.5, M.clothRed], [-10.5, 19.5, M.clothBlue], [10.5, 10.5, M.clothBlue], [10.5, 19.5, M.clothRed]]) {
    box(x, 0, z, 3, 0.9, 1.2, M.wood);
    for (const [ox, oz] of [[-1.6, -1], [1.6, -1], [-1.6, 1], [1.6, 1]]) box(x + ox, 0, z + oz, 0.1, 2.3, 0.1, M.darkwood, { col: false });
    box(x, 2.3, z, 3.5, 0.12, 2.3, m, { uv: 0.8 });
    for (let i = 0; i < 5; i++) box(x - 1.1 + i * 0.55, 0.9, z + (rnd() - 0.5) * 0.5, 0.3, 0.2 + rnd() * 0.15, 0.3, [M.hay, M.clothRed, M.crate][i % 3], { col: false });
  }
  cyl(6, 0, 15, 1.15, 1.15, 0.9, 12, M.stone, 1.05);
  box(4.95, 0, 15, 0.14, 2.6, 0.14, M.darkwood, { col: false }); box(7.05, 0, 15, 0.14, 2.6, 0.14, M.darkwood, { col: false });
  box(6, 2.6, 15, 2.8, 0.14, 1.6, M.roofBrown, { col: false });
  box(-6, 0.45, 15, 2.8, 0.5, 1.5, M.wood); box(-6, 0.95, 15, 2.6, 0.9, 1.4, M.hay, { c: { soft: true } });
  for (const [ox, oz] of [[-1, -0.85], [1, -0.85], [-1, 0.85], [1, 0.85]]) {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 12); g.rotateX(Math.PI / 2); g.translate(-6 + ox, 0.5, 15 + oz); batch.add(M.darkwood, g);
  }
  chest(10.5, 0, 21.4, { gold: 60 });
  lampPost(-15.5, 6); lampPost(15.5, 6); lampPost(15.5, 24.4); lampPost(-15.5, 24.4);
  lampPost(4.6, 40); lampPost(-4.6, 30); lampPost(4.6, -3); lampPost(-4.6, -14);
  lampPost(-29.2, 52.6); lampPost(31, 52.2); lampPost(-53.6, 14); lampPost(53.6, -12); lampPost(-31, -18.6); lampPost(31, -18.6);
  torch(-4.6, 3.4, 60.4); torch(4.6, 3.4, 60.4); torch(-4.6, 3.4, 53.8); torch(4.6, 3.4, 53.8);
  // mason's yard (north-west) and garden (north-east)
  crate(-44, 0, -36); crate(-42.8, 0, -36); crate(-43.4, 1.1, -36, 1); barrel(-38, 0, -44); barrel(-37, 0, -44.3);
  box(-34, 0, -40, 3, 0.7, 1.4, M.stone, { ry: 0.4 }); box(-46, 0, -48, 2.2, 1.2, 1.2, M.stone, { ry: -0.3 });
  chest(-46, 0, -30, { gold: 50, smoke: 2 });
  chest(44, 0, -40, { gold: 80, knives: 3 });
  for (const [x, z] of [[36, -30], [48, -34], [40, -48], [-34, 30], [33, 2]]) {
    cyl(x, 0, z, 0.22, 0.32, 3.2, 7, M.darkwood, 0.3);
    const g = new THREE.IcosahedronGeometry(2.4, 1); g.scale(1, 0.85, 1); g.translate(x, 4.6, z);
    batch.add(W.leaf || (W.leaf = std(null, 0x26452a, { flatShading: true })), g);
  }
  for (let i = 0; i < 9; i++) box(34 + (i % 3) * 3.2, 0, -38 - (i / 3 | 0) * 3.4, 0.5, 0.9, 0.14, M.stoneDark, { col: false });
  // hay to land in under the east wall, wall chest above the stairs
  box(55.3, 0, 19.5, 1.3, 1.1, 3.4, M.hay, { c: { soft: true } });
  chest(42, 7, 57.2, { gold: 70, arrows: 6 });

  // scaffolding on the outside of the east wall: the quiet way in
  crate(59.6, 0, 11);
  for (const [z0, top] of [[12, 2.6], [17, 5]]) {
    boxR(58.4, 61, z0, z0 + 5, top - 0.15, top, M.wood);
    for (const [px, pz] of [[60.85, z0 + 0.15], [60.85, z0 + 4.85]]) box(px, 0, pz, 0.14, top, 0.14, M.darkwood, { col: false });
  }
  chest(59.9, 5, 20.6, { gold: 30, bolts: 4 });

  // ================= outside the walls =================
  boxR(-3.2, 3.2, 73, 95, -0.15, 0.45, M.stone, { c: { walk: true } });
  boxR(-3.2, -2.8, 73, 95, 0.45, 1.3, M.stoneDark); boxR(2.8, 3.2, 73, 95, 0.45, 1.3, M.stoneDark);
  boxR(-3.2, 3.2, 79, 81, -3.6, -0.15, M.stoneDark, { col: false }); boxR(-3.2, 3.2, 87, 89, -3.6, -0.15, M.stoneDark, { col: false });
  for (const z of [73.3, 94.7]) for (const x of [-3, 3]) { box(x, 1.3, z, 0.14, 1.1, 0.14, M.darkwood, { col: false }); torch(x, 2.6, z, { s: 0.8 }); }
  // barn and field
  box(-25.5, -0.5, 65.5, 9, 3.9, 6, M.wood);
  roof(-25.5, 3.4, 65.5, 9, 6, 2.6, 'x', M.thatch, M.wood);
  box(-21.5, 0, 69.4, 1.6, 1.2, 1.6, M.hay, { c: { soft: true } });
  chest(-27.5, 0, 69.3, { gold: 40, arrows: 5 });
  for (let x = 9; x <= 31; x += 2.2) for (const z of [62, 71]) box(x, 0, z, 0.12, 1, 0.12, M.darkwood, { col: false });
  for (const z of [62, 71]) for (const y of [0.45, 0.85]) box(20, y, z, 22.4, 0.08, 0.06, M.darkwood, { col: false });
  for (let i = 0; i < 5; i++) box(13 + i * 4, 0, 66.5 + (i % 2), 1.1, 1.3, 1.1, M.hay, { col: false, ry: i });
  // camp
  const cy = CAMP.y;
  for (let i = 0; i < 8; i++) box(CAMP.x + Math.cos(i * 0.785) * 0.75, cy, CAMP.z + Math.sin(i * 0.785) * 0.75, 0.32, 0.22, 0.32, M.stoneDark, { col: false, ry: i });
  box(CAMP.x, cy, CAMP.z, 0.9, 0.16, 0.16, M.darkwood, { col: false, ry: 0.6 }); box(CAMP.x, cy + 0.1, CAMP.z, 0.9, 0.16, 0.16, M.darkwood, { col: false, ry: -0.7 });
  torch(CAMP.x, cy + 0.45, CAMP.z, { s: 2, fire: true });
  cone(13.5, cy, 131, 2.5, 2.7, 4, M.clothTan, Math.PI / 4); col(12.2, 14.8, 129.7, 132.3, cy, cy + 2);
  box(10.6, cy, 131.4, 0.8, 0.14, 1.9, M.clothRed, { col: false, ry: 0.3 });
  box(5.2, cy, 130.4, 2.2, 0.45, 0.45, M.darkwood, { ry: 0.5 });
  chest(10.5, cy, 125.4, { arrows: 6, potions: 1, knives: 2 });
  // windmill
  {
    const by = terrainHeight(96, 24) - 0.6;
    cyl(96, by, 24, 2.3, 3.4, 11.5, 12, M.timber2, 2.9);
    cone(96, by + 11.5, 24, 2.9, 3.2, 12, M.roofBrown);
    box(92.55, by + 5, 24, 0.1, 1.2, 0.8, M.winLit, { col: false });
    const blades = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const g = new THREE.BoxGeometry(0.12, 7.4, 1.1); g.translate(0, 4.2, 0);
      const b = new THREE.Mesh(g, M.clothTan); b.rotation.x = k * Math.PI / 2; b.castShadow = true;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 8, 0.16), M.darkwood); s.position.y = 4; b.add(s);
      blades.add(b);
    }
    blades.position.set(93, by + 10, 24);
    scene.add(blades); W.mill = blades;
  }
  // ruined watchtower in the woods
  {
    const by = terrainHeight(-72, 104) - 1;
    boxR(-76, -68, 100, 101, by, by + 6.2, M.stoneDark); boxR(-76, -75, 101, 108, by, by + 4.4, M.stoneDark);
    boxR(-75, -70.5, 107, 108, by, by + 3, M.stoneDark); boxR(-69, -68, 101, 104, by, by + 2.4, M.stoneDark);
    chest(-73.4, terrainHeight(-73.4, 103), 103, { gold: 120, knives: 3 });
    W.hide.push({ x: -71, z: 105.5, r: 2.3 });
  }

  // ================= forest =================
  const clearOf = (x, z) => {
    const d = Math.max(Math.abs(x), Math.abs(z));
    if (d < 63.5) return false;
    if (Math.abs(x) < 6.5 && z > 50 && z < 150) return false;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < 12) return false;
    if (Math.abs(z - riverZ(x)) < 9) return false;
    if (Math.hypot(x - 96, z - 24) < 9) return false;
    if (x > -32 && x < -18 && z > 60 && z < 72) return false;
    if (x > 6 && x < 34 && z > 60 && z < 73) return false;
    if (x > -78 && x < -66 && z > 98 && z < 110) return false;
    if (x > 57 && x < 64 && z > 6 && z < 26) return false;
    return true;
  };
  {
    const cones = [[2.3, 3.2, 2.6], [1.8, 2.8, 4.4], [1.2, 2.4, 6]].map(([r, h, y]) => { const g = new THREE.ConeGeometry(r, h, 7); g.translate(0, y + h / 2, 0); return g; });
    const foliage = mergeGeos(cones), trunk = new THREE.CylinderGeometry(0.2, 0.34, 3.4, 6); trunk.translate(0, 1.7, 0);
    const N = 520;
    const fm = new THREE.InstancedMesh(foliage, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), N);
    const tm = new THREE.InstancedMesh(trunk, std(null, 0x3a2a1e), N);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    let n = 0, guard = 0;
    while (n < N && guard++ < 20000) {
      const a = rnd() * Math.PI * 2, r = 64 + Math.pow(rnd(), 0.8) * 300;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!clearOf(x, z)) continue;
      const h = terrainHeight(x, z);
      if (h < -0.2) continue;
      const s = 0.8 + rnd() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
      mtx.compose(new THREE.Vector3(x, h - 0.25, z), q, new THREE.Vector3(s, s * (0.9 + rnd() * 0.4), s));
      fm.setMatrixAt(n, mtx); tm.setMatrixAt(n, mtx);
      c.setHSL(0.33 + rnd() * 0.07, 0.38 + rnd() * 0.15, 0.13 + rnd() * 0.07);
      fm.setColorAt(n, c);
      if (r < 190) col(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, h - 1, h + 7 * s, { tree: true });
      n++;
    }
    fm.count = tm.count = n;
    fm.castShadow = tm.castShadow = true; fm.receiveShadow = true;
    scene.add(fm, tm);
  }
  // bushes: crouch in them to vanish
  const hideSpots = [[-7.5, 66], [7.5, 69], [-12, 61.8], [12.5, 61.6], [62.6, 8.5], [63.2, 25], [-62.5, 40], [-36, -27], [-45, -44],
    [40.5, -27], [50, -50], [33, -52], [23, -37], [-16.5, -24.6], [-31.6, -9], [-31.6, 4], [0, 101], [-9, 112], [20, 96]];
  for (const [x, z] of hideSpots) W.hide.push({ x, z, r: 2.3 });
  {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const bm = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), W.hide.length * 6);
    const mtx = new THREE.Matrix4(), c = new THREE.Color(); let n = 0;
    for (const hz of W.hide) for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + rnd(), r = i === 0 ? 0 : 1.1 + rnd() * 0.7, x = hz.x + Math.cos(a) * r, z = hz.z + Math.sin(a) * r, s = 0.8 + rnd() * 0.55;
      mtx.compose(new THREE.Vector3(x, terrainHeight(x, z) + s * 0.45, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(s * 1.25, s, s * 1.25));
      bm.setMatrixAt(n, mtx); c.setHSL(0.3 + rnd() * 0.06, 0.45, 0.12 + rnd() * 0.06); bm.setColorAt(n, c); n++;
    }
    bm.castShadow = true; bm.receiveShadow = true;
    scene.add(bm);
  }
  // scattered rocks
  {
    const N = 110, rm = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std(null, 0x6a6862, { flatShading: true }), N);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      let x, z, k = 0;
      do { const a = rnd() * 6.283, r = 62 + rnd() * 200; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (!clearOf(x, z) && k++ < 20);
      const s = 0.25 + rnd() * rnd() * 1.6;
      mtx.compose(new THREE.Vector3(x, terrainHeight(x, z) + s * 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)), new THREE.Vector3(s * 1.3, s * 0.8, s));
      rm.setMatrixAt(i, mtx);
    }
    rm.castShadow = true; rm.receiveShadow = true;
    scene.add(rm);
  }

  batch.build(scene);

  // ================= living details =================
  // torches: a glow sprite each, real lights are a small pool moved to the nearest ones
  const flameMat = new THREE.SpriteMaterial({ map: T.flame, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const bracket = new THREE.BoxGeometry(0.07, 0.5, 0.07);
  for (const t of W.torches) {
    t.sprite = new THREE.Sprite(flameMat);
    t.sprite.position.set(t.x, t.y, t.z);
    t.phase = rnd() * 10;
    scene.add(t.sprite);
    if (!t.fire) { const b = new THREE.Mesh(bracket, M.iron); b.position.set(t.x, t.y - 0.35, t.z); scene.add(b); }
  }
  const pool = [];
  for (let i = 0; i < 7; i++) { const l = new THREE.PointLight(0xff9c4a, 0, 22, 1.7); scene.add(l); pool.push(l); }

  // banners
  const bannerGeo = () => new THREE.PlaneGeometry(1.5, 3.4, 4, 8);
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0x9c1f1f, side: THREE.DoubleSide, roughness: 1 });
  const bannerMat2 = new THREE.MeshStandardMaterial({ color: 0x1f3f8c, side: THREE.DoubleSide, roughness: 1 });
  for (const [x, y, z, m] of [[-6, 8, 60.5, bannerMat], [6, 8, 60.5, bannerMat], [-8, 4.8, -20.3, bannerMat2], [8, 4.8, -20.3, bannerMat2],
    [-4, 5.6, -46.3, bannerMat], [-9.5, 5.6, -46.3, bannerMat2], [9.5, 5.6, -46.3, bannerMat2], [0, 6, -31.9, bannerMat]]) {
    const b = new THREE.Mesh(bannerGeo(), m);
    b.position.set(x, y - 1.7, z); b.castShadow = true;
    b.userData.base = b.geometry.attributes.position.array.slice();
    scene.add(b); W.banners.push(b);
  }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6, 8, 3), bannerMat);
  flag.position.set(23.1, 32, -50.5); flag.userData.base = flag.geometry.attributes.position.array.slice(); flag.userData.flag = true;
  scene.add(flag); W.banners.push(flag);

  // fireflies
  const FN = 140, fpos = new Float32Array(FN * 3), fseed = [];
  for (let i = 0; i < FN; i++) {
    let x, z;
    do { const a = rnd() * 6.283, r = 62 + rnd() * 90; x = Math.cos(a) * r; z = Math.abs(Math.sin(a)) * r * 0.9 + 40; } while (Math.max(Math.abs(x), Math.abs(z)) < 60);
    fseed.push([x, terrainHeight(x, z) + 0.6 + rnd() * 2, z, rnd() * 10]);
  }
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flies = new THREE.Points(fgeo, new THREE.PointsMaterial({ color: 0xd8ff7a, size: 0.16, map: T.flame, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flies.frustumCulled = false;
  scene.add(flies);

  // ================= guards =================
  const G = (o) => W.spawns.push(o);
  G({ type: 'guard', post: [-2.6, 61.6], yaw: 0 }); G({ type: 'guard', post: [2.6, 61.6], yaw: 0 });
  G({ type: 'guard', path: [[0, 48], [0, 27], [0, -15], [0, 27]] });
  G({ type: 'guard', path: [[-13, 7.4], [13, 7.4], [13, 23.6], [-13, 23.6]] });
  G({ type: 'guard', path: [[-29.3, -18.4], [-29.3, 52.4]] }); G({ type: 'guard', path: [[29.3, 52.4], [29.3, -18.4]] });
  G({ type: 'guard', path: [[-53.8, -18.4], [-53.8, 52.4]] }); G({ type: 'guard', path: [[53.6, 52.4], [53.6, -18.4]] });
  G({ type: 'guard', post: [-2.6, -18.4], yaw: 0 }); G({ type: 'guard', post: [2.6, -18.4], yaw: 0 });
  G({ type: 'guard', path: [[-20, -27], [20, -27]] }); G({ type: 'guard', path: [[20, -30], [20, -43], [15.5, -43]] });
  G({ type: 'guard', path: [[-10, -36], [10, -36], [10, -45], [-10, -45]] });
  G({ type: 'guard', post: [4.6, -45.2], yaw: 0 });
  G({ type: 'marshal', path: [[0, -43.5], [0, -36], [0, -27], [-9, -27], [0, -36]], wait: 4 });
  G({ type: 'archer', fixed: [-17, 7, 57.2], yaw: 0 }); G({ type: 'archer', fixed: [17, 7, 57.2], yaw: 0 });
  G({ type: 'archer', fixed: [57.2, 7, -10], yaw: -Math.PI / 2 }); G({ type: 'archer', fixed: [-57.2, 7, 26], yaw: Math.PI / 2 });
  G({ type: 'archer', fixed: [13, 6, -21.2], yaw: 0 });
  W.reinforce = [[-3, -25], [3, -25], [-6, -24], [6, -24]];

  // ================= per-frame =================
  const tmp = [];
  let poolT = 0;
  W.update = (t, dt, cam) => {
    sky.position.copy(cam.position);
    sky.material.uniforms.time.value = t;
    // shadow frustum follows the player
    const sx = Math.round(cam.position.x / 6) * 6, sz = Math.round(cam.position.z / 6) * 6;
    moon.target.position.set(sx, 0, sz);
    moon.position.set(sx + MOON.x * 160, MOON.y * 160, sz + MOON.z * 160);
    // torch flicker
    for (const tc of W.torches) {
      const f = 0.85 + 0.15 * Math.sin(t * 11 + tc.phase) + 0.1 * Math.sin(t * 23.7 + tc.phase * 2);
      tc.f = f;
      const s = (tc.fire ? 1.5 : 1.05) * tc.s * f;
      tc.sprite.scale.set(s, s * 1.25, 1);
    }
    poolT -= dt;
    if (poolT <= 0) {
      poolT = 0.2;
      tmp.length = 0;
      for (const tc of W.torches) { tc.d = (tc.x - cam.position.x) ** 2 + (tc.y - cam.position.y) ** 2 + (tc.z - cam.position.z) ** 2; tmp.push(tc); }
      tmp.sort((a, b) => a.d - b.d);
      for (let i = 0; i < pool.length; i++) { pool[i].userData.t = tmp[i]; pool[i].position.set(tmp[i].x, tmp[i].y + 0.1, tmp[i].z); }
    }
    for (const l of pool) {
      const tc = l.userData.t;
      if (tc) l.intensity = 34 * tc.s * tc.f * (1 - sstep(38, 60, Math.sqrt(tc.d)));
    }
    for (const b of W.banners) {
      const p = b.geometry.attributes.position, base = b.userData.base;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const k = b.userData.flag ? (x + 1.5) / 3 : (1.7 - y) / 3.4;
        p.setZ(i, Math.sin(t * 2.4 + (b.userData.flag ? x * 2.2 : y * 1.8) + b.position.x) * 0.22 * k);
      }
      p.needsUpdate = true;
    }
    if (W.mill) W.mill.rotation.x = t * 0.45;
    waterTex.offset.set(t * 0.012, t * 0.004);
    for (let i = 0; i < FN; i++) {
      const s = fseed[i];
      fpos[i * 3] = s[0] + Math.sin(t * 0.5 + s[3]) * 1.6;
      fpos[i * 3 + 1] = s[1] + Math.sin(t * 0.9 + s[3] * 2) * 0.5;
      fpos[i * 3 + 2] = s[2] + Math.cos(t * 0.4 + s[3]) * 1.6;
    }
    fgeo.attributes.position.needsUpdate = true;
    flies.material.opacity = 0.6 + 0.4 * Math.sin(t * 3);
  };

  return W;
}
