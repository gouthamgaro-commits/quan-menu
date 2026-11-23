// Crows of Ravenmoor — medieval stealth and combat, in first or third person.
import * as THREE from 'three';
import { buildWorld, terrainHeight, WATER, CAMP, mergeGeos } from './world.js';
import { Sfx } from './audio.js';
import { makeHumanoid, poseHumanoid, hold, setShadow } from './actors.js';
import { createLife } from './life.js';
import { createPost } from './post.js';
import { addNature } from './nature.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.random() * a.length | 0];
const ease = (t) => t * t * (3 - 2 * t);
const V3 = THREE.Vector3;

// ---------------------------------------------------------------- renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.autoClear = false;

// ---------------------------------------------------------------- settings
const SETTINGS_KEY = 'ravenmoor.settings';
const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
const settings = Object.assign({ quality: coarse ? 'medium' : 'high', sens: 1, invert: false, volume: 0.9, music: 0.7, shake: true, fps: false },
  (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* kept for this visit only */ } }

// ---------------------------------------------------------------- loading
const loadBar = document.getElementById('loadF'), loadMsg = document.getElementById('loadT');
async function loadStep(frac, msg) {
  if (loadBar) loadBar.style.width = (frac * 100).toFixed(0) + '%';
  if (loadMsg) loadMsg.textContent = msg;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.08, 2400);
camera.rotation.order = 'YXZ';
await loadStep(0.08, 'Raising the walls of Ravenmoor…');
const W = buildWorld(scene);
await loadStep(0.4, 'Growing the grass…');
const nature = addNature(scene, W);
await loadStep(0.5, 'Lighting the torches…');
const post = createPost(renderer, scene, camera);
const C = W.colliders;
const sfx = new Sfx();
let life = null;
const actors = [];   // every creature that can be hit: guards plus everything life.js spawns
const live = (a) => !!a && !a.dead && !a.gone;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  post.resize(w, h);
  camera.aspect = vmCam.aspect = w / h;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
}

// Quality tiers trade sharpness, bloom, soft shadows and grass for speed.
const QUALITY = {
  high: { pr: 1.5, msaa: true, shadowSize: 2048, soft: true, shadowDist: 26, grass: 1 },
  medium: { pr: 1.25, msaa: false, shadowSize: 2048, soft: false, shadowDist: 16, grass: 0.6 },
  low: { pr: 1, msaa: false, shadowSize: 1024, soft: false, shadowDist: 0, grass: 0.3 },
};
function applyQuality(q = settings.quality) {
  const Q = QUALITY[q] || QUALITY.high;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr) * (q === 'low' && coarse ? 0.85 : 1));
  renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (W.moon.shadow.mapSize.x !== Q.shadowSize) {
    W.moon.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
    if (W.moon.shadow.map) { W.moon.shadow.map.dispose(); W.moon.shadow.map = null; }
  }
  G.shadowDist = Q.shadowDist;
  if (W.setGrass) W.setGrass(Q.grass);
  post.setQuality(q);
  resize();
}
function applyAudio() { sfx.setVolume(settings.volume, settings.music); }

// ---------------------------------------------------------------- collision
const STEP = 0.5;
function topAt(c, x, z) {
  if (!c.roof) return c.y1;
  const r = c.roof;
  return c.y0 + r.rh * clamp(1 - Math.abs((r.axis === 'x' ? z : x) - r.c) / r.half, 0, 1);
}
function groundAt(x, z, feet, info) {
  let g = terrainHeight(x, z), soft = false;
  for (const c of C) {
    if (x < c.x0 - 0.12 || x > c.x1 + 0.12 || z < c.z0 - 0.12 || z > c.z1 + 0.12) continue;
    const t = topAt(c, x, z);
    if (t <= feet + STEP && t > g) { g = t; soft = !!c.soft; }
  }
  if (info) info.soft = soft;
  return g;
}
function resolveXZ(p, r, feet, height) {
  for (let pass = 0; pass < 2; pass++) for (const c of C) {
    if (c.y0 >= feet + height - 0.15) continue;
    const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (topAt(c, cx, cz) <= feet + STEP) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else {
      const l = p.x - c.x0, rr = c.x1 - p.x, n = p.z - c.z0, f = c.z1 - p.z, m = Math.min(l, rr, n, f);
      if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === n) p.z = c.z0 - r; else p.z = c.z1 + r;
    }
  }
}
// Nearest hit distance along a ray against the world's boxes; returns maxT when clear.
function rayWorld(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT;
  const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
  for (const c of C) {
    let t0 = 0, t1 = best, a, b, s;
    a = (c.x0 - ox) * ix; b = (c.x1 - ox) * ix; if (a > b) { s = a; a = b; b = s; }
    if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) continue;
    a = (c.z0 - oz) * iz; b = (c.z1 - oz) * iz; if (a > b) { s = a; a = b; b = s; }
    if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) continue;
    a = (c.y0 - oy) * iy; b = (c.y1 - oy) * iy; if (a > b) { s = a; a = b; b = s; }
    if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) continue;
    if (t0 <= 1e-4) continue;
    if (c.roof) {
      let hit = -1;
      for (let k = 0; k <= 6; k++) { const t = t0 + (t1 - t0) * k / 6; if (oy + dy * t <= topAt(c, ox + dx * t, oz + dz * t)) { hit = t; break; } }
      if (hit < 0) continue;
      t0 = hit;
    }
    best = t0;
  }
  return best;
}
const smokes = [];
function los(ax, ay, az, bx, by, bz) {
  let dx = bx - ax, dy = by - ay, dz = bz - az;
  const d = Math.hypot(dx, dy, dz);
  if (d < 0.05) return true;
  dx /= d; dy /= d; dz /= d;
  if (rayWorld(ax, ay, az, dx, dy, dz, d) < d - 0.05) return false;
  for (const s of smokes) {
    const t = clamp((s.x - ax) * dx + (s.y - ay) * dy + (s.z - az) * dz, 0, d);
    if (Math.hypot(ax + dx * t - s.x, ay + dy * t - s.y, az + dz * t - s.z) < s.r) return false;
  }
  if (Math.max(Math.abs(ax), Math.abs(az), Math.abs(bx), Math.abs(bz)) > 60) {
    for (let t = 2.5; t < d - 1; t += 2.5) if (terrainHeight(ax + dx * t, az + dz * t) > ay + dy * t) return false;
  }
  return true;
}

// ---------------------------------------------------------------- navigation grid + A*
const NX = 128, NZ = 170, OX = -64, OZ = -64, NN = NX * NZ;
const blocked = new Uint8Array(NN), cellH = new Float32Array(NN);
function buildNav() {
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
    const x = OX + ix + 0.5, z = OZ + iz + 0.5, i = iz * NX + ix;
    let h = terrainHeight(x, z), b = 0;
    for (const c of C) if ((c.walk || c.y1 <= h + 0.5) && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.y1 > h) h = c.y1;
    for (const c of C) {
      if (c.walk || c.x1 < x - 0.85 || c.x0 > x + 0.85 || c.z1 < z - 0.85 || c.z0 > z + 0.85) continue;
      if (c.y0 < h + 1.5 && c.y1 > h + 0.5) { b = 1; break; }
    }
    if (h < WATER + 0.25) b = 1;
    blocked[i] = b; cellH[i] = h;
  }
}
const cellOf = (x, z) => {
  const ix = clamp(Math.floor(x - OX), 0, NX - 1), iz = clamp(Math.floor(z - OZ), 0, NZ - 1);
  return iz * NX + ix;
};
const navH = (x, z) => cellH[cellOf(x, z)];
function nearestFree(i) {
  if (!blocked[i]) return i;
  const cx = i % NX, cz = (i / NX) | 0;
  for (let r = 1; r < 7; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const x = cx + dx, z = cz + dz;
    if (x < 0 || z < 0 || x >= NX || z >= NZ) continue;
    if (!blocked[z * NX + x]) return z * NX + x;
  }
  return -1;
}
const gS = new Float32Array(NN), fS = new Float32Array(NN), from = new Int32Array(NN), mark = new Uint32Array(NN), closed = new Uint32Array(NN);
let gen = 0;
const heap = [];
function hpush(i) {
  heap.push(i);
  let k = heap.length - 1;
  while (k > 0) { const p = (k - 1) >> 1; if (fS[heap[p]] <= fS[heap[k]]) break; const t = heap[p]; heap[p] = heap[k]; heap[k] = t; k = p; }
}
function hpop() {
  const top = heap[0], last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    for (let k = 0; ;) {
      const l = 2 * k + 1, r = l + 1; let m = k;
      if (l < heap.length && fS[heap[l]] < fS[heap[m]]) m = l;
      if (r < heap.length && fS[heap[r]] < fS[heap[m]]) m = r;
      if (m === k) break;
      const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m;
    }
  }
  return top;
}
// Path of [x,z] points. If the goal can't be reached, leads to the closest reachable cell.
function findPath(sx, sz, tx, tz) {
  const s = nearestFree(cellOf(sx, sz)), t = nearestFree(cellOf(tx, tz));
  if (s < 0 || t < 0) return [];
  gen++; heap.length = 0;
  const tX = t % NX, tZ = (t / NX) | 0;
  const H = (i) => { const dx = Math.abs(i % NX - tX), dz = Math.abs(((i / NX) | 0) - tZ); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  gS[s] = 0; fS[s] = H(s); from[s] = -1; mark[s] = gen; hpush(s);
  let best = s, bestH = H(s), n = 0;
  while (heap.length && n++ < 12000) {
    const cur = hpop();
    if (closed[cur] === gen) continue;
    closed[cur] = gen;
    if (cur === t) { best = t; break; }
    const h = H(cur);
    if (h < bestH) { bestH = h; best = cur; }
    const cx = cur % NX, cz = (cur / NX) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
      const ni = nz * NX + nx;
      if (blocked[ni] || closed[ni] === gen) continue;
      if (dx && dz && (blocked[cz * NX + nx] || blocked[nz * NX + cx])) continue;
      const g = gS[cur] + (dx && dz ? 1.414 : 1);
      if (mark[ni] !== gen || g < gS[ni]) { mark[ni] = gen; gS[ni] = g; fS[ni] = g + H(ni); from[ni] = cur; hpush(ni); }
    }
  }
  const out = [];
  for (let i = best; i !== s && i >= 0; i = from[i]) out.push([OX + i % NX + 0.5, OZ + ((i / NX) | 0) + 0.5]);
  return out.reverse();
}

// ---------------------------------------------------------------- game + player state
const G = { state: 'menu', t: 0, view: (() => { try { return +localStorage.getItem('ravenmoor.view') || 3; } catch (e) { return 3; } })() };
const P = { pos: new V3(), vel: new V3() };
const keys = {};
const input = { fire: false, firePressed: false, alt: false, jump: false, mdx: 0, mdy: 0 };
const stick = { id: null, x: 0, y: 0, cx: 0, cy: 0, run: false };
let touchMode = matchMedia('(hover: none) and (pointer: coarse)').matches;

function resetState() {
  Object.assign(G, {
    t: 0, stage: 0, gold: 0, hasKey: false, hasCrown: false, doorOpen: false, alarm: false, marshalDead: false,
    stats: { kills: 0, stealth: 0, alerts: 0, picked: 0, time: 0, innocents: 0, beasts: 0, demons: 0 }, keyDrop: null, endT: 0,
    blessing: false, contract: false, shake: 0, alertN: 0,
  });
  P.pos.set(0, terrainHeight(0, 124), 124); P.vel.set(0, 0, 0);
  Object.assign(P, {
    yaw: 0, pitch: 0.04, hp: 100, st: 100, stDelay: 0, crouch: false, onGround: true, eye: 1.66, bob: 0, moveAmt: 0,
    weapon: 0, swT: 0, cd: 0, swing: null, combo: 0, comboT: -9, blocking: false, blockStart: 0, wasBlock: false,
    drawing: false, draw: 0, loaded: true, reload: 0, throwT: 0, lockT: 0, mantle: null, dead: false,
    arrows: 16, bolts: 6, knives: 5, potions: 2, smoke: 3, light: 0.2, vis: 0.2, hidden: false, sprint: false, hurtT: 0, roll: 0,
    violentT: 0, lastTarget: null, lastTargetT: -9, recoil: 0,
  });
}

// ---------------------------------------------------------------- HUD
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } }
function toast(msg, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls; el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4300);
  while ($('toasts').children.length > (window.innerHeight < 520 ? 3 : 5)) $('toasts').firstChild.remove();
}
let subT = 0;
function subtitle(msg) { $('sub').textContent = msg; $('sub').style.opacity = 1; subT = 2.8; }

const compassMarks = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].map(([l, dx, dz]) => {
  const el = document.createElement('span'); el.textContent = l; el.className = 'cm' + (l === 'N' ? ' north' : '');
  $('compass').appendChild(el);
  return { el, dx, dz };
});
const objMark = document.createElement('span'); objMark.className = 'cm objm'; objMark.textContent = '◆'; $('compass').appendChild(objMark);
const xMarks = [];
for (let i = 0; i < 4; i++) { const el = document.createElement('span'); el.className = 'cm xm'; $('compass').appendChild(el); xMarks.push(el); }
const detEls = [];
for (let i = 0; i < 6; i++) { const el = document.createElement('div'); el.className = 'det'; $('dets').appendChild(el); detEls.push(el); }

const OBJ = [
  ['Slip inside the walls of Ravenmoor', 'The gate is watched. Scaffolding clings to the east wall.'],
  ['Take the treasury key from Lord Marshal Varek', 'He keeps to the great hall of the keep. Pick his pocket from behind, or kill him.'],
  ['Steal the Ember Crown', 'The treasury lies behind the throne, in the great hall.'],
  ['Escape to your camp beyond the river', 'The whole garrison is awake. Run.'],
];
function objTarget() {
  if (G.stage === 0) return [0, 57];
  if (G.stage === 1) { if (G.keyDrop) return [G.keyDrop.x, G.keyDrop.z]; const m = guards.find((g) => g.type === 'marshal'); return m ? [m.pos.x, m.pos.z] : [0, -40]; }
  if (G.stage === 2) return [W.crown.x, W.crown.z];
  return [CAMP.x, CAMP.z];
}
function relAngle(dx, dz) {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  return Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
}

let promptAct = null, ctxActs = [];
const ATK = [['i-sword', 'STRIKE'], ['i-bow', 'DRAW'], ['i-xbow', 'SHOOT'], ['i-knife', 'THROW']];
function toggleClass(id, cls, on) { const k = id + '.' + cls; if (hudCache[k] !== on) { hudCache[k] = on; $(id).classList.toggle(cls, on); } }
function updateHUD(dt) {
  setStyle('hpF', 'width', Math.max(0, P.hp).toFixed(0) + '%');
  setStyle('stF', 'width', Math.max(0, P.st).toFixed(0) + '%');
  setText('gold', String(G.gold));
  setText('potN', String(P.potions)); setText('smkN', String(P.smoke));
  toggleClass('iHeal', 'empty', P.potions <= 0); toggleClass('iSmoke', 'empty', P.smoke <= 0);
  setText('a1', String(P.arrows)); setText('a2', String(P.bolts)); setText('a3', String(P.knives));
  for (let i = 0; i < 4; i++) toggleClass('slot' + i, 'on', P.weapon === i);
  if (hudCache.stage !== G.stage) { hudCache.stage = G.stage; G.hintT = 10; }
  G.hintT = Math.max(0, (G.hintT || 0) - dt);
  setText('objT', OBJ[G.stage][0]); setText('objH', OBJ[G.stage][1]);
  setStyle('objH', 'display', G.hintT > 0 ? 'block' : 'none');
  const tags = (G.hasKey && !G.hasCrown ? '<span class="tag">KEY</span>' : '') + (G.hasCrown ? '<span class="tag">CROWN</span>' : '');
  if (hudCache.tags !== tags) { hudCache.tags = tags; $('tags').innerHTML = tags; }

  // touch buttons follow the weapon in hand
  if (touchMode) {
    const w = P.weapon;
    const atk = w === 1 && P.drawing ? 'LOOSE' : w === 2 && !P.loaded ? (P.bolts > 0 ? 'LOADING' : 'EMPTY') : ATK[w][1];
    if (hudCache.atkW !== w) { hudCache.atkW = w; $('atkIcon').setAttribute('href', '#' + ATK[w][0]); }
    setText('atkL', atk);
    const aim = w === 2;
    if (hudCache.blk !== aim) { hudCache.blk = aim; $('blkIcon').setAttribute('href', aim ? '#i-aim' : '#i-shield'); $('blkL').textContent = aim ? 'AIM' : 'BLOCK'; }
    setStyle('bBlock', 'opacity', w === 0 || w === 2 ? '1' : '0.35');
    toggleClass('bCrouch', 'on', P.crouch);
  }

  // compass
  const half = hudCache.cHalf || (hudCache.cHalf = Math.max(60, $('compass').clientWidth / 2 - 10));
  for (const m of compassMarks) {
    const px = relAngle(m.dx, m.dz) * 57.3 * 2.2;
    m.el.style.display = Math.abs(px) < half ? 'block' : 'none';
    m.el.style.transform = `translateX(${px.toFixed(1)}px)`;
  }
  const [ox, oz] = objTarget();
  const od = Math.hypot(ox - P.pos.x, oz - P.pos.z);
  objMark.style.transform = `translateX(${clamp(relAngle(ox - P.pos.x, oz - P.pos.z) * 57.3 * 2.2, -half, half).toFixed(1)}px)`;
  setText('objD', od.toFixed(0) + ' m');
  const ms = life.marks();
  xMarks.forEach((el, i) => {
    const m = ms[i];
    if (!m) { el.style.display = 'none'; return; }
    const px = relAngle(m.x - P.pos.x, m.z - P.pos.z) * 57.3 * 2.2;
    el.style.display = Math.abs(px) < half ? 'block' : 'none';
    if (el.textContent !== m.label) { el.textContent = m.label; el.className = 'cm xm ' + m.cls; }
    el.style.transform = `translateX(${px.toFixed(1)}px)`;
  });
  const bs = life.status();
  setStyle('broF', 'width', (bs.hp * 100).toFixed(0) + '%');
  setText('broL', bs.label);
  toggleClass('broBox', 'down', bs.down);

  // stealth read-out
  let maxDet = 0, alertN = 0, di = 0;
  for (const g of guards) {
    if (g.dead) continue;
    if (g.state === 'alert') { alertN++; continue; }
    if (g.det > maxDet) maxDet = g.det;
    if (g.det > 0.06 && di < detEls.length) {
      const el = detEls[di++];
      el.style.display = 'block';
      el.style.transform = `rotate(${relAngle(g.pos.x - P.pos.x, g.pos.z - P.pos.z).toFixed(2)}rad) translateY(-118px) scaleX(${(0.4 + g.det * 1.2).toFixed(2)})`;
      el.style.opacity = (0.3 + g.det * 0.7).toFixed(2);
      el.style.background = g.det > 0.4 ? '#ffb347' : '#e8e2d0';
    }
  }
  for (; di < detEls.length; di++) detEls[di].style.display = 'none';
  G.alertN = alertN + life.threatN;
  let label = 'UNSEEN', cls = 'ok';
  if (G.alertN) { label = 'HUNTED'; cls = 'bad'; }
  else if (maxDet > 0.4) { label = 'SUSPECTED'; cls = 'warn'; }
  else if (P.hidden) label = 'HIDDEN';
  else if (P.vis > 0.55) { label = 'EXPOSED'; cls = 'warn'; }
  else if (P.vis > 0.25) label = 'IN SHADOW';
  setText('eyeT', label);
  if (hudCache.eyeCls !== cls) { hudCache.eyeCls = cls; $('eye').className = cls; }
  setStyle('eyeF', 'width', (G.alertN ? 100 : maxDet * 100).toFixed(0) + '%');
  setStyle('gemF', 'opacity', (0.12 + P.vis * 0.88).toFixed(2));
  setStyle('gemF', 'transform', `scale(${(0.55 + P.vis * 0.45).toFixed(2)})`);

  // crosshair
  setStyle('draw', 'opacity', P.drawing ? '1' : '0');
  if (P.drawing) setStyle('draw', 'transform', `translate(-50%,-50%) scale(${(2.2 - P.draw * 1.5).toFixed(2)})`);

  // context actions: shown as key hints, tappable on touch screens
  const acts = [];
  if (G.state === 'play' && P.lockT <= 0 && !P.mantle) {
    const g = stealthTarget();
    if (g) {
      acts.push({ k: 'F', id: 'kill', label: 'Assassinate', icon: 'i-dagger', cls: 'kill', act: assassinate });
      if (!g.picked && g.pocket > 0 && (g.kind === 'guard' ? g.state !== 'alert' : !g.aware) && g.stun <= 0 && P.onGround) acts.push({ k: 'E', id: 'pick', label: 'Pick pocket', icon: 'i-hand', act: () => pickpocket(g) });
    }
    const lp = life.prompts();
    if (lp.length && !acts.some((x) => x.k === 'E')) acts.push(lp[0]);
    if (acts.length < 2 && !acts.some((x) => x.k === 'E')) { const it = findInteract(); if (it) acts.push({ k: 'E', id: 'use:' + it.label, label: it.label, icon: 'i-hand', act: it.act }); }
  }
  const eAct = acts.find((a) => a.k === 'E');
  promptAct = eAct ? eAct.act : null;
  ctxActs = acts;
  const sig = acts.map((a) => a.id).join('|');
  if (hudCache.ctx !== sig) {
    hudCache.ctx = sig;
    $('ctx').innerHTML = acts.map((a, i) => `<button class="chip ${a.cls || ''}" data-i="${i}"><kbd class="kb-only">${a.k}</kbd><svg class="i"><use href="#${a.icon}"/></svg>${a.label}</button>`).join('');
  }

  if (subT > 0) { subT -= dt; if (subT <= 0) $('sub').style.opacity = 0; }
  P.hurtT = Math.max(0, P.hurtT - dt);
  setStyle('vig', 'opacity', Math.min(1, P.hurtT * 2 + (P.hp < 35 ? (35 - P.hp) / 60 : 0)).toFixed(2));
  setStyle('shade', 'opacity', (P.crouch ? 0.55 : 0.15).toFixed(2));
}

// ---------------------------------------------------------------- particles
const partMat = {
  bone: new THREE.SpriteMaterial({ map: W.tex.puff, color: 0xe8e0c8, depthWrite: false }),
  blood: new THREE.SpriteMaterial({ map: W.tex.puff, color: 0x9a0d0d, depthWrite: false }),
  spark: new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false }),
  dust: new THREE.SpriteMaterial({ map: W.tex.puff, color: 0xc9bb8a, opacity: 0.5, depthWrite: false }),
  smoke: new THREE.SpriteMaterial({ map: W.tex.puff, color: 0xa3a8b3, opacity: 0.62, depthWrite: false }),
};
const parts = [];
function burst(kind, x, y, z, n, spd, size, life) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(partMat[kind]);
    s.position.set(x, y, z); s.scale.setScalar(size);
    scene.add(s);
    const floaty = kind === 'smoke' || kind === 'dust';
    parts.push({ s, v: new V3(rand(-1, 1), rand(floaty ? 0 : 0.2, 1.3), rand(-1, 1)).multiplyScalar(spd), t: 0, life: life * rand(0.7, 1.2), size, floaty, grow: kind === 'smoke' ? 1.6 : kind === 'dust' ? 1 : -0.8 });
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) { scene.remove(p.s); parts.splice(i, 1); continue; }
    if (p.floaty) p.v.multiplyScalar(Math.max(0, 1 - 1.6 * dt)); else p.v.y -= 9 * dt;
    p.s.position.addScaledVector(p.v, dt);
    p.s.scale.setScalar(p.size * Math.max(0.05, 1 + p.grow * p.t / p.life));
  }
  for (let i = smokes.length - 1; i >= 0; i--) { smokes[i].t -= dt; if (smokes[i].t <= 0) smokes.splice(i, 1); }
}

// ---------------------------------------------------------------- guards
const UB = new THREE.BoxGeometry(1, 1, 1);
const sm = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const GM = {
  skin: sm(0xc79a78), mail: sm(0x777d88, { metalness: 0.55, roughness: 0.5 }), steel: sm(0xaab2bf, { metalness: 0.8, roughness: 0.35 }),
  leather: sm(0x3d2b1e), red: sm(0x8e2222), green: sm(0x2f5a34), black: sm(0x18181d), gold: sm(0xffc94a, { metalness: 1, roughness: 0.3 }),
  cape: sm(0x6a1010), wood: sm(0x5d4126),
};
function part(parent, mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(UB, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true;
  parent.add(m);
  return m;
}
function makeModel(type) {
  const skin = pick([0xc79a78, 0xb98a68, 0xd9a882, 0xa8785a]);
  const o = type === 'marshal'
    ? { armor: 'plate', cape: 0x6a1010, head: 'crown', hair: 0x2a1d14, beard: 0x2a1d14, skin: 0xc49170, scale: 1.12, gloves: 0x2a2a2a, tallBoots: true }
    : type === 'archer'
      ? { top: 0x2f5a34, pants: 0x3a3027, head: 'kettle', tabard: 0x2a4a2c, skin, gloves: 0x3d2b1e, tallBoots: true }
      : { armor: 'mail', tabard: 0x8e2222, head: 'helm', skin, gloves: 0x3d2b1e, tallBoots: true, beard: Math.random() < 0.4 ? 0x4a2c18 : undefined };
  const rig = makeHumanoid(o);
  if (type === 'archer') hold(rig, 'L', 'bow');
  else if (type === 'marshal') hold(rig, 'R', 'greatsword');
  else { hold(rig, 'R', 'sword'); hold(rig, 'L', 'shield', { color: 0x7a1c1c }); }
  scene.add(rig.root);
  return rig;
}

const guards = [];
function makeGuard(s) {
  const p = s.fixed ? new V3(s.fixed[0], s.fixed[1], s.fixed[2]) : s.post ? new V3(s.post[0], 0, s.post[1]) : new V3(s.path[0][0], 0, s.path[0][1]);
  if (!s.fixed) p.y = navH(p.x, p.z);
  const hp = s.type === 'marshal' ? 280 : s.type === 'archer' ? 70 : 100;
  const g = {
    s, type: s.type, kind: 'guard', team: 'town', R: 0.42, H: s.type === 'marshal' ? 2.05 : 1.8, body: true, canAssassinate: true, foe: null, foeT: Math.random() * 0.5, hy: 0, mv: 0, m: makeModel(s.type), pos: p, yaw: s.yaw || 0, look: s.yaw || 0, headYaw: 0, hp, state: 'patrol', det: 0,
    path: null, pi: 0, wp: 0, wait: 0, repath: 0, pgx: 1e9, pgz: 1e9, seenT: 0, last: new V3(), goal: new V3(), stun: 0, atk: null, atkCd: 0,
    shootCd: rand(0.5, 2), searchT: 0, susT: 0, lookT: 0, dead: false, deathT: 0, found: false, picked: false, walk: 0, sw: 0,
    pocket: s.type === 'marshal' ? 150 : 12 + (Math.random() * 30 | 0), barkCd: 0, bodyT: Math.random(), seed: Math.random() * 10,
    pitch: s.type === 'marshal' ? 0.72 : rand(0.9, 1.2), dmg: s.type === 'marshal' ? 27 : 16, run: s.type === 'marshal' ? 4.5 : 4.75,
  };
  guards.push(g); actors.push(g);
  poseGuard(g, false);
  return g;
}

const LINES = {
  sus: ['Hm? What was that?', 'Is someone there?', 'Show yourself.', 'I heard something.'],
  lost: ['Must have been rats.', 'Nothing. Just the wind.', 'Jumping at shadows again.', 'Bah. Nobody.'],
  alert: ['INTRUDER!', 'Thief! Seize them!', 'To arms! To arms!', "You'll hang for this!"],
  monster: ['Monster! To arms!', 'Beast at the walls!', 'Kill it! Kill it!', 'Stand your ground, lads!'],
  body: ['A body! Sound the alarm!', "Murder! Someone's killed him!"],
  search: ['Come out, coward!', "They can't have gone far.", 'Spread out! Find them!'],
};
const volAt = (pos) => clamp(1 - Math.hypot(pos.x - P.pos.x, pos.z - P.pos.z) / 45, 0, 1) ** 2;
function bark(g, kind) {
  if (g.barkCd > 0) return;
  g.barkCd = 3.5;
  const v = volAt(g.pos);
  if (v > 0.06) { subtitle(`${g.type === 'marshal' ? 'Lord Marshal Varek' : 'Guard'}: “${pick(LINES[kind])}”`); sfx.bark(g.pitch, v); }
}
function alertGuard(g, shout = true) {
  if (g.dead || g.state === 'alert') return;
  g.state = 'alert'; g.det = 1; g.seenT = 0; g.last.copy(P.pos); g.path = null; g.repath = 0;
  G.stats.alerts++;
  bark(g, 'alert');
  if (shout) for (const o of guards) if (o !== g && !o.dead && o.state !== 'alert' && o.pos.distanceTo(g.pos) < 22) investigate(o, P.pos, 12, true);
}
function investigate(g, pos, time, quiet) {
  if (g.dead || g.state === 'alert') return;
  g.state = 'search'; g.goal.copy(pos); g.searchT = time; g.path = null; g.repath = 0; g.lookT = 2;
  g.det = Math.max(g.det, 0.45);
  if (!quiet) bark(g, 'sus');
}
function makeNoise(pos, radius) {
  if (life) life.onNoise(pos, radius);
  for (const g of guards) if (!g.dead && g.state !== 'alert' && Math.hypot(g.pos.x - pos.x, g.pos.z - pos.z) < radius && Math.abs(g.pos.y - pos.y) < 9) investigate(g, pos, 9);
}
function turn(a, target, amt) {
  let d = (target - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + clamp(d, -amt, amt);
}
function goTo(g, x, z, speed, dt) {
  const dd = Math.hypot(x - g.pos.x, z - g.pos.z);
  if (dd < 0.45) return 'done';
  g.repath -= dt;
  if (!g.path || (g.repath <= 0 && Math.abs(g.pgx - x) + Math.abs(g.pgz - z) > 1)) {
    g.path = findPath(g.pos.x, g.pos.z, x, z); g.pi = 0; g.pgx = x; g.pgz = z; g.repath = 0.5 + Math.random() * 0.3;
  }
  let tx, tz;
  if (g.pi < g.path.length) { tx = g.path[g.pi][0]; tz = g.path[g.pi][1]; }
  else if (dd < 1.7) { tx = x; tz = z; }
  else return 'stuck';
  const dx = tx - g.pos.x, dz = tz - g.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.3) { if (g.pi < g.path.length) g.pi++; return 'move'; }
  const st = Math.min(d, speed * dt);
  g.pos.x += dx / d * st; g.pos.z += dz / d * st;
  g.pos.y = lerp(g.pos.y, navH(g.pos.x, g.pos.z), 0.25);
  g.yaw = turn(g.yaw, Math.atan2(dx, dz), dt * 8);
  g.walk += st * 4.2;
  return 'move';
}
function poseGuard(g, moving) {
  const m = g.m;
  m.root.position.copy(g.pos); m.root.rotation.y = g.yaw;
  g.hy = lerp(g.hy, g.headYaw, 0.15);
  g.look = g.yaw + g.hy;
  const fighting = g.state === 'alert' || !!g.foe;
  g.mv = lerp(g.mv, moving ? (fighting ? 1.7 : g.state === 'search' ? 1.15 : 0.85) : 0, 0.2);
  const p = { t: G.t + g.seed, dt: g.pdt, phase: g.walk, move: g.mv, look: g.hy, lean: g.stun > 0 ? 0.35 : 0, atk: -1, hit: g.hitT || 0, dead: g.dead ? g.deathT : 0, deadDir: g.deadDir };
  if (g.atk) { p.atk = g.atk.t < g.atk.wind ? g.atk.t / g.atk.wind * 0.42 : 0.42 + (g.atk.t - g.atk.wind) / 0.45 * 0.58; p.style = g.type === 'marshal' ? 'overhead' : 'slash'; }
  if (g.type === 'archer') { p.aim = fighting ? 1 : 0; p.draw = clamp(1 - g.shootCd / 1.5, 0, 1); }
  else if (fighting && !g.atk) p.block = 0.35;
  poseHumanoid(m, p);
}
function guardShoot(g, T = P) {
  const o = new V3(g.pos.x + Math.sin(g.yaw) * 0.5, g.pos.y + 1.5, g.pos.z + Math.cos(g.yaw) * 0.5);
  const tp = T === P ? P.pos : T.pos, tv = T === P ? P.vel : { x: 0, z: 0 };
  const sp = 44, d0 = o.distanceTo(tp), tt = d0 / sp;
  const tgt = new V3(tp.x + tv.x * tt * 0.7, tp.y + (T === P ? (P.crouch ? 0.6 : 1.1) : T.H * 0.55) + 4.5 * tt * tt, tp.z + tv.z * tt * 0.7);
  const dir = tgt.sub(o).normalize();
  dir.x += rand(-0.03, 0.03); dir.y += rand(-0.02, 0.02); dir.z += rand(-0.03, 0.03);
  spawnShot('bolt', o, dir.normalize(), sp, g.type === 'archer' ? 14 : 11, g);
  sfx.bow(volAt(g.pos));
}

function updateGuard(g, dt) {
  const m = g.m;
  if (g.dead) {
    if (g.deathT < 1) { g.pdt = dt; g.deathT = Math.min(1, g.deathT + dt * 1.5); poseGuard(g, false); }
    return;
  }
  g.pdt = dt;
  if (g.hitT) g.hitT = Math.max(0, g.hitT - dt * 3.5);
  g.barkCd -= dt; g.atkCd -= dt; g.shootCd -= dt;
  const dx = P.pos.x - g.pos.x, dz = P.pos.z - g.pos.z, dy = P.pos.y - g.pos.y, dxz = Math.hypot(dx, dz);
  const alert = g.state === 'alert';

  // --- perception
  let sees = false;
  if (!P.dead && g.stun <= 0) {
    const range = (alert ? 48 : 32) * (0.2 + 0.8 * P.vis), dist = Math.hypot(dxz, dy);
    if (dist < range) {
      const dot = dxz > 0.01 ? (dx * Math.sin(g.look) + dz * Math.cos(g.look)) / dxz : 1;
      if ((dist < (P.crouch && !alert ? 0.6 : 1.3) || dot > (alert ? -0.35 : 0.3)) &&
        los(g.pos.x, g.pos.y + 1.62, g.pos.z, P.pos.x, P.pos.y + (P.crouch ? 0.65 : 1.25), P.pos.z)) {
        sees = true;
        if (!alert) {
          let rate = 2.9 * Math.pow(P.vis, 1.25) * (1 - dist / range) + (dist < 1.6 && !P.crouch ? 1.4 : 0);
          if (G.alarm) rate *= 1.5;
          if (g.state === 'search') rate *= 1.4;
          g.det += rate * dt;
        }
      }
    }
  }
  if (!sees && !alert) g.det = Math.max(0, g.det - dt * (g.state === 'search' ? 0.07 : 0.22));

  // --- noticing the dead
  g.bodyT -= dt;
  if (g.bodyT <= 0 && !alert) {
    g.bodyT = 0.6;
    for (const o of actors) {
      if (!o.dead || o.found || !o.body) continue;
      const bx = o.pos.x - g.pos.x, bz = o.pos.z - g.pos.z, bd = Math.hypot(bx, bz);
      if (bd > 15 || Math.abs(o.pos.y - g.pos.y) > 3 || bd < 0.01) continue;
      if ((bx * Math.sin(g.look) + bz * Math.cos(g.look)) / bd < 0.3) continue;
      if (!los(g.pos.x, g.pos.y + 1.62, g.pos.z, o.pos.x, o.pos.y + 0.4, o.pos.z)) continue;
      o.found = true;
      bark(g, 'body');
      investigate(g, o.pos, 18, true);
      g.det = Math.max(g.det, 0.6);
      break;
    }
  }

  // soldiers turn on monsters that come into sight
  g.foeT -= dt;
  if (g.foeT <= 0) {
    g.foeT = 0.5;
    if (alert) g.foe = null;
    else if (!live(g.foe) || g.foe.pos.distanceTo(g.pos) > 30) { const f = life.nearestFoe(g, 18); if (f && !g.foe) bark(g, 'monster'); g.foe = f; }
  }
  if (g.foe && !alert && g.stun <= 0) {
    if (g.det >= 1) { g.foe = null; alertGuard(g); } else { fightFoe(g, dt); return; }
  }

  let moving = false, head = 0;
  const faceP = () => { g.yaw = turn(g.yaw, Math.atan2(dx, dz), dt * 7); };
  if (g.stun > 0) { g.stun -= dt; g.atk = null; poseGuard(g, false); return; }

  switch (g.state) {
    case 'patrol':
      if (g.det >= 1) { alertGuard(g); break; }
      if (g.det >= 0.4) { g.state = 'sus'; g.susT = 0; g.goal.copy(P.pos); bark(g, 'sus'); break; }
      if (g.s.fixed) head = Math.sin(G.t * 0.5 + g.seed) * 0.95;
      else if (g.s.post) {
        if (Math.hypot(g.s.post[0] - g.pos.x, g.s.post[1] - g.pos.z) > 0.7) moving = goTo(g, g.s.post[0], g.s.post[1], 1.5, dt) === 'move';
        else { g.yaw = turn(g.yaw, g.s.yaw, dt * 3); head = Math.sin(G.t * 0.45 + g.seed) * 0.75; }
      } else if (g.wait > 0) { g.wait -= dt; head = Math.sin(G.t * 0.8 + g.seed) * 0.6; }
      else {
        const wp = g.s.path[g.wp], r = goTo(g, wp[0], wp[1], 1.45, dt);
        if (r === 'move') moving = true;
        else { g.wp = (g.wp + 1) % g.s.path.length; g.wait = g.s.wait || 1.2; g.path = null; }
      }
      break;
    case 'sus':
      g.susT += dt;
      if (sees) g.goal.copy(P.pos);
      g.yaw = turn(g.yaw, Math.atan2(g.goal.x - g.pos.x, g.goal.z - g.pos.z), dt * 3.5);
      if (g.det >= 1) { alertGuard(g); break; }
      if (g.susT > 1.7) { if (g.det >= 0.3) investigate(g, g.goal, 7, true); else { g.state = 'patrol'; bark(g, 'lost'); } }
      break;
    case 'search':
      if (g.det >= 1) { alertGuard(g); break; }
      g.searchT -= dt;
      if (g.s.fixed) { g.yaw = turn(g.yaw, Math.atan2(g.goal.x - g.pos.x, g.goal.z - g.pos.z), dt * 3); head = Math.sin(G.t * 1.2 + g.seed) * 0.6; }
      else {
        const r = goTo(g, g.goal.x, g.goal.z, 2.4, dt);
        if (r === 'move') moving = true;
        else {
          head = Math.sin(G.t * 1.7 + g.seed) * 1.1; g.lookT -= dt;
          if (g.lookT <= 0) { g.lookT = 2.6; g.goal.x += rand(-6, 6); g.goal.z += rand(-6, 6); g.path = null; }
        }
      }
      if (g.searchT <= 0) { g.state = 'patrol'; g.path = null; g.det = Math.min(g.det, 0.25); bark(g, 'lost'); }
      break;
    case 'alert': {
      if (sees) { g.seenT = 0; g.last.copy(P.pos); } else { g.seenT += dt; if (g.seenT < 1.2) g.last.copy(P.pos); }
      if (g.seenT > 7 || P.dead) { g.state = 'search'; g.goal.copy(g.last); g.searchT = 15; g.path = null; g.det = 0.6; g.atk = null; bark(g, 'search'); break; }
      if (g.atk) {
        g.atk.t += dt; faceP();
        if (!g.atk.hit && g.atk.t >= g.atk.wind) {
          g.atk.hit = true; sfx.swing(volAt(g.pos));
          if (dxz < 2.7 && Math.abs(dy) < 1.6 && (dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw)) / Math.max(dxz, 0.01) > 0.3) hurtPlayer(g.dmg, g.pos, g);
        }
        if (g.atk.t >= g.atk.wind + 0.45) { g.atk = null; g.atkCd = rand(0.45, 1.1); }
        break;
      }
      if (g.s.fixed) {
        if (sees) { faceP(); if (g.shootCd <= 0) { guardShoot(g); g.shootCd = rand(2.2, 3.2); } } else head = Math.sin(G.t * 1.3 + g.seed) * 0.9;
        break;
      }
      if (sees && dxz < 2.05 && Math.abs(dy) < 1.3) { faceP(); if (g.atkCd <= 0) g.atk = { t: 0, wind: g.type === 'marshal' ? 0.5 : 0.62, hit: false }; break; }
      const r = goTo(g, g.last.x, g.last.z, g.run, dt);
      moving = r === 'move';
      if (!moving) { faceP(); head = sees ? 0 : Math.sin(G.t * 2 + g.seed) * 1; }
      if (sees && g.shootCd <= 0 && dxz > 4 && (Math.abs(dy) > 1.5 || r === 'stuck')) { faceP(); guardShoot(g); g.shootCd = rand(2.8, 4.2); }
      break;
    }
  }
  g.headYaw = head;
  poseGuard(g, moving);
}

function fightFoe(g, dt) {
  const f = g.foe;
  if (!live(f)) { g.foe = null; return; }
  const dx = f.pos.x - g.pos.x, dz = f.pos.z - g.pos.z, d = Math.hypot(dx, dz);
  let moving = false;
  const face = () => { g.yaw = turn(g.yaw, Math.atan2(dx, dz), dt * 7); };
  if (g.atk) {
    g.atk.t += dt; face();
    if (!g.atk.hit && g.atk.t >= g.atk.wind) { g.atk.hit = true; sfx.swing(volAt(g.pos)); if (d < 2.3 + f.R) hurtActor(f, g.dmg, { from: g }); }
    if (g.atk.t >= g.atk.wind + 0.45) { g.atk = null; g.atkCd = rand(0.4, 0.9); }
  } else if (g.s.fixed) {
    face();
    if (g.shootCd <= 0 && los(g.pos.x, g.pos.y + 1.6, g.pos.z, f.pos.x, f.pos.y + f.H * 0.6, f.pos.z)) { guardShoot(g, f); g.shootCd = rand(1.8, 2.6); }
  } else if (d < 1.7 + f.R) { face(); if (g.atkCd <= 0) g.atk = { t: 0, wind: 0.55, hit: false }; }
  else moving = goTo(g, f.pos.x, f.pos.z, g.run, dt) === 'move';
  g.headYaw = 0;
  poseGuard(g, moving);
}
function hurtGuard(g, dmg, o = {}) {
  if (g.dead) return;
  g.lastHit = o.from; g.hitT = 1;
  g.hp -= dmg;
  burst('blood', g.pos.x, g.pos.y + 1.3, g.pos.z, 7, 2.2, 0.16, 0.5);
  if (g.hp <= 0) { killGuard(g, o.silent, o.from); return; }
  sfx.grunt(volAt(g.pos));
  g.stun = Math.max(g.stun, 0.22);
  const f = o.from;
  if (f && f !== P && typeof f === 'object' && f.kind !== 'bro' && live(f)) g.foe = f;
  else if (f !== 'god') alertGuard(g);
}
function killGuard(g, silent, from = P) {
  g.dead = true; g.state = 'dead'; g.deathT = 0; g.atk = null; g.foe = null;
  g.deadDir = silent ? -1 : Math.random() < 0.6 ? 1 : -1;
  const byUs = from === P || (life && from === life.bro);
  if (byUs) { G.stats.kills++; if (silent) G.stats.stealth++; }
  if (!silent) makeNoise(g.pos, 11);
  if (life) life.onKill(g, { from, silent });
  if (g.type === 'marshal') {
    G.marshalDead = true; G.contract = byUs;
    toast(byUs ? 'Lord Marshal Varek is dead. The contract is fulfilled.' : 'Lord Marshal Varek is dead.', 'gold');
    if (!G.hasKey) dropKey(g.pos);
  }
}
// who may hurt whom: a guard only fights the player once he has been raised to the alarm
function hostile(a, b) {
  const ta = a === P ? 'player' : a.team, tb = b === P ? 'player' : b.team;
  if (ta === tb || ta === 'critter' || tb === 'critter') return false;
  if (ta === 'town' && tb === 'player') return a.kind === 'guard' && a.state === 'alert';
  return true;
}
function hurtActor(a, dmg, o = {}) {
  if (!live(a)) return;
  if (a.kind === 'guard') hurtGuard(a, dmg, o); else a.hurt(dmg, o);
}
function damageArea(pos, r, dmg, from) {
  const team = from && typeof from === 'object' ? (from === P ? 'player' : from.team) : null;
  if (team !== 'player' && !P.dead) {
    const d = Math.hypot(P.pos.x - pos.x, P.pos.y + 0.8 - pos.y, P.pos.z - pos.z);
    if (d < r) hurtPlayer(dmg * (1 - 0.6 * d / r), pos, null);
  }
  for (const a of actors.slice()) {
    if (!live(a) || a === from || (team && a.team === team)) continue;
    const d = Math.hypot(a.pos.x - pos.x, a.pos.y + a.H * 0.4 - pos.y, a.pos.z - pos.z);
    if (d < r + a.R) hurtActor(a, dmg * (1 - 0.6 * Math.min(1, d / r)), { from, area: true });
  }
}
function onLifeDeath(a, h) {
  const byUs = h.from === P || h.from === life.bro;
  if (byUs) {
    if (a.kind === 'villager') { G.stats.innocents++; toast('An innocent dies.', 'bad'); }
    else if (a.team === 'wild') G.stats.beasts++;
    else if (a.team === 'demon') G.stats.demons++;
  }
  if (a.body && !h.silent) makeNoise(a.pos, 11);
  life.onKill(a, h);
}

// ---------------------------------------------------------------- projectiles
const shotMat = sm(0xb9a27a), boltMat = sm(0x3b3027), knifeMat = GM.steel;
const mkBox = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const arrowGeo = mergeGeos([mkBox(0.022, 0.022, 0.8, 0, 0, 0), mkBox(0.05, 0.05, 0.08, 0, 0, 0.42), mkBox(0.1, 0.006, 0.16, 0, 0, -0.32), mkBox(0.006, 0.1, 0.16, 0, 0, -0.32)]);
const knifeGeo = mergeGeos([mkBox(0.035, 0.008, 0.2, 0, 0, 0.08), mkBox(0.03, 0.03, 0.12, 0, 0, -0.08)]);
const shots = [];
const ZAX = new V3(0, 0, 1);
const fireGeo = new THREE.SphereGeometry(0.16, 10, 8), fireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.9, 0.25) });
const fireGlow = new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false });
function spawnShot(kind, o, dir, speed, dmg, owner) {
  let m;
  if (kind === 'fire') { m = new THREE.Mesh(fireGeo, fireMat); const gl = new THREE.Sprite(fireGlow); gl.scale.setScalar(1.3); m.add(gl); }
  else m = new THREE.Mesh(kind === 'knife' ? knifeGeo : arrowGeo, kind === 'knife' ? knifeMat : owner ? boltMat : shotMat);
  if (kind === 'bolt') m.scale.set(1.3, 1.3, 0.6);
  m.position.copy(o); m.quaternion.setFromUnitVectors(ZAX, dir); m.castShadow = true;
  scene.add(m);
  shots.push({ kind, m, p: o.clone(), v: dir.clone().multiplyScalar(speed), dmg, owner, stuck: false, life: 0, grav: kind === 'fire' ? 2 : kind === 'bolt' ? 7 : kind === 'knife' ? 13 : 10, spin: 0 });
}
function segSphere(p, d, len, cx, cy, cz, r) {
  const mx = p.x - cx, my = p.y - cy, mz = p.z - cz;
  const b = mx * d.x + my * d.y + mz * d.z, c = mx * mx + my * my + mz * mz - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = Math.max(0, -b - Math.sqrt(disc));
  return t <= len ? t : -1;
}
const _d = new V3();
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.stuck) {
      if (!s.owner && Math.hypot(s.p.x - P.pos.x, s.p.z - P.pos.z) < 1.3 && Math.abs(s.p.y - P.pos.y - 0.8) < 1.8) {
        if (s.kind === 'arrow') P.arrows++; else if (s.kind === 'bolt') P.bolts++; else P.knives++;
        sfx.click(); scene.remove(s.m); shots.splice(i, 1);
      }
      continue;
    }
    s.life += dt;
    s.v.y -= s.grav * dt;
    const len = s.v.length() * dt;
    _d.copy(s.v).normalize();
    let tHit = rayWorld(s.p.x, s.p.y, s.p.z, _d.x, _d.y, _d.z, len), hitG = null, head = false;
    for (const g of actors) {
      if (!live(g) || g === s.owner || Math.abs(g.pos.x - s.p.x) > len + 2 + g.R * 2 || Math.abs(g.pos.z - s.p.z) > len + 2 + g.R * 2) continue;
      if (s.owner ? !hostile(s.owner, g) : g.kind === 'bro') continue;
      const sc = g.H / 1.8;
      const th = segSphere(s.p, _d, len, g.pos.x, g.pos.y + g.H * 0.955, g.pos.z, 0.25 * sc);
      const tb = Math.min(...[0.28, 0.58, 0.78].map((y) => { const t = segSphere(s.p, _d, len, g.pos.x, g.pos.y + y * g.H, g.pos.z, g.R); return t < 0 ? 1e9 : t; }));
      const t = th >= 0 && th <= tb ? th : tb;
      if (t < tHit) { tHit = t; hitG = g; head = th >= 0 && th <= tb; }
    }
    if (s.owner && !P.dead && hostile(s.owner, P)) {
      const t = Math.min(...[0.45, P.crouch ? 0.8 : 1.25].map((y) => { const q = segSphere(s.p, _d, len, P.pos.x, P.pos.y + y, P.pos.z, 0.42); return q < 0 ? 1e9 : q; }));
      if (t < tHit) {
        hurtPlayer(s.dmg, s.owner.pos, null);
        if (s.kind === 'fire') burst('spark', s.p.x, s.p.y, s.p.z, 8, 3, 0.2, 0.4);
        scene.remove(s.m); shots.splice(i, 1); continue;
      }
    }
    if (hitG) {
      if (s.owner) hurtActor(hitG, s.dmg, { from: s.owner, missile: true });
      else {
        const unaware = hitG.kind === 'guard' ? hitG.state !== 'alert' : !hitG.aware;
        const dmg = s.dmg * (head ? 2.3 : 1) * (unaware ? 2 : 1);
        if (head && hitG.kind !== 'rift') toast('Headshot', 'dim');
        P.violentT = 1.5; P.lastTarget = hitG; P.lastTargetT = G.t;
        hurtActor(hitG, dmg, { from: P, silent: unaware, missile: true });
      }
      sfx.hit(volAt(hitG.pos));
      if (s.kind === 'fire') burst('spark', s.p.x, s.p.y, s.p.z, 8, 3, 0.2, 0.4);
      scene.remove(s.m); shots.splice(i, 1);
      continue;
    }
    const nx = s.p.x + _d.x * len, ny = s.p.y + _d.y * len, nz = s.p.z + _d.z * len;
    const ground = Math.max(Math.abs(nx), Math.abs(nz)) > 57 ? terrainHeight(nx, nz) : 0;
    if (tHit < len || ny < ground) {
      if (s.kind === 'fire') { burst('spark', s.p.x, s.p.y, s.p.z, 8, 3, 0.2, 0.4); scene.remove(s.m); shots.splice(i, 1); continue; }
      const t = tHit < len ? tHit : len;
      s.p.set(s.p.x + _d.x * (t - 0.12), Math.max(s.p.y + _d.y * (t - 0.12), ground + 0.03), s.p.z + _d.z * (t - 0.12));
      s.m.position.copy(s.p); s.m.quaternion.setFromUnitVectors(ZAX, _d);
      s.stuck = true;
      sfx.thunk(volAt(s.p) * 0.8);
      if (!s.owner) makeNoise(s.p, 6.5);
      continue;
    }
    s.p.set(nx, ny, nz);
    s.m.position.copy(s.p);
    s.m.quaternion.setFromUnitVectors(ZAX, _d);
    if (s.kind === 'knife') { s.spin += dt * 28; s.m.rotateX(s.spin); }
    if (s.life > 8) { scene.remove(s.m); shots.splice(i, 1); }
  }
  let stuck = 0;
  for (const s of shots) if (s.stuck) stuck++;
  for (let i = 0; stuck > 50 && i < shots.length; i++) if (shots[i].stuck) { scene.remove(shots[i].m); shots.splice(i--, 1); stuck--; }
}

// ---------------------------------------------------------------- world objects: chests, crown, door, key
function buildChests() {
  for (const c of W.chests) {
    const g = new THREE.Group();
    part(g, GM.wood, 0.9, 0.4, 0.6, 0, 0.2, 0);
    part(g, GM.steel, 0.94, 0.06, 0.64, 0, 0.36, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.4, -0.3);
    part(lid, GM.wood, 0.9, 0.2, 0.6, 0, 0.1, 0.3); part(lid, GM.steel, 0.12, 0.22, 0.62, 0, 0.1, 0.3); part(lid, GM.gold, 0.1, 0.12, 0.04, 0, 0.02, 0.61);
    g.add(lid);
    g.position.set(c.x, c.y, c.z); g.rotation.y = c.ry ? Math.PI / 2 : 0;
    scene.add(g);
    c.lid = lid;
  }
}
const crown = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), GM.gold); ring.rotation.x = Math.PI / 2; crown.add(ring);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), GM.gold);
    sp.position.set(Math.cos(i * 1.047) * 0.2, 0.12, Math.sin(i * 1.047) * 0.2); crown.add(sp);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.5, 0.1) })); gem.position.set(0, 0.06, 0.2); crown.add(gem);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xffb040, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); glow.scale.setScalar(1.6); crown.add(glow);
  crown.position.set(W.crown.x, W.crown.y, W.crown.z);
  scene.add(crown);
}
const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.3), W.mat.darkwood);
door.position.set(4.6, 1.6, -46.7); door.castShadow = true;
for (const y of [-0.9, 0.9]) part(door, W.mat.iron, 3.22, 0.16, 0.34, 0, y, 0);
scene.add(door);
const doorCol = { x0: 3, x1: 6.2, z0: -47, z1: -46.4, y0: 0, y1: 3.2 };
C.push(doorCol);
const keyMesh = new THREE.Group();
part(keyMesh, GM.gold, 0.08, 0.3, 0.04, 0, 0, 0).castShadow = false; part(keyMesh, GM.gold, 0.18, 0.14, 0.04, 0, 0.2, 0);
{ const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.2); keyMesh.add(glow); }
keyMesh.visible = false; scene.add(keyMesh);

function dropKey(pos) { G.keyDrop = { x: pos.x, y: pos.y + 0.9, z: pos.z }; keyMesh.position.set(pos.x, pos.y + 0.9, pos.z); keyMesh.visible = true; }
function gainKey() { G.hasKey = true; G.keyDrop = null; keyMesh.visible = false; sfx.coin(); toast('Treasury key taken.', 'gold'); }
function openChest(c) {
  c.opened = true; c.openT = 0; sfx.chest();
  const L = c.loot, got = [];
  if (L.gold) { G.gold += L.gold; got.push(`${L.gold} gold`); setTimeout(() => sfx.coin(), 180); }
  if (L.arrows) { P.arrows += L.arrows; got.push(`${L.arrows} arrows`); }
  if (L.bolts) { P.bolts += L.bolts; got.push(`${L.bolts} bolts`); }
  if (L.knives) { P.knives += L.knives; got.push(`${L.knives} throwing knives`); }
  if (L.potions) { P.potions += L.potions; got.push(`${L.potions} healing draught`); }
  if (L.smoke) { P.smoke += L.smoke; got.push(`${L.smoke} smoke bomb${L.smoke > 1 ? 's' : ''}`); }
  toast('Looted: ' + got.join(', '), 'gold');
}
function openDoor() {
  if (!G.hasKey) { toast('Locked. The Lord Marshal carries the key.'); sfx.click(); return; }
  G.doorOpen = true; doorCol.y0 = doorCol.y1 = -60; sfx.chest(); toast('The treasury door grinds open.');
}
function takeCrown() {
  G.hasCrown = true; crown.visible = false; G.gold += 1000; G.alarm = true;
  sfx.coin(); sfx.bell();
  toast('You hold the Ember Crown.', 'gold');
  setTimeout(() => toast('The alarm bell tolls. Get out!', 'bad'), 1300);
  for (const [x, z] of W.reinforce) investigate(makeGuard({ type: 'guard', post: [x, z], yaw: 0 }), new V3(rand(-4, 4), 0, rand(-40, -36)), 30, true);
  for (const g of guards) if (!g.dead && g.state === 'patrol' && !g.s.fixed && g.pos.z < -18) investigate(g, new V3(rand(-6, 6), 0, rand(-42, -30)), 25, true);
  life.onCrownStolen();
}
function findInteract() {
  let best = null, bd = 2.6;
  const test = (x, y, z, o) => { const d = Math.hypot(x - P.pos.x, z - P.pos.z); if (d < bd && Math.abs(y - P.pos.y) < 1.9) { bd = d; best = o; } };
  for (const c of W.chests) if (!c.opened) test(c.x, c.y, c.z, { label: 'Open chest', act: () => openChest(c) });
  if (!G.doorOpen) test(4.6, 0, -46.7, { label: G.hasKey ? 'Unlock the treasury' : 'Treasury door', act: openDoor });
  if (!G.hasCrown) test(W.crown.x, 0, W.crown.z, { label: 'Steal the Ember Crown', act: takeCrown });
  return best;
}

// ---------------------------------------------------------------- stealth actions
function stealthTarget() {
  let best = null, bd = 1e9;
  for (const g of actors) {
    if (!live(g) || !g.canAssassinate || g.kind === 'bro') continue;
    const dx = P.pos.x - g.pos.x, dz = P.pos.z - g.pos.z, d = Math.hypot(dx, dz), dy = P.pos.y - g.pos.y;
    const air = !P.onGround && dy > 0.9 && dy < 6 && d < 2.3;
    if (!air && (d > 2.3 || Math.abs(dy) > 1.4)) continue;
    const behind = (dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw)) / Math.max(d, 0.01) < 0.25;
    const unaware = g.kind === 'guard' ? g.state !== 'alert' : !g.aware;
    if ((air || g.stun > 0.2 || (unaware && behind)) && d < bd) { bd = d; best = g; }
  }
  return best;
}
function assassinate() {
  if (P.lockT > 0 || P.mantle || P.dead) return;
  const g = stealthTarget();
  if (!g) return;
  P.lockT = 0.55; P.swing = null; P.drawing = false; P.draw = 0;
  sfx.stab();
  burst('blood', g.pos.x, g.pos.y + g.H * 0.75, g.pos.z, 10, 2.4, 0.16, 0.6);
  P.violentT = 1; P.lastTarget = g; P.lastTargetT = G.t;
  if (g.kind === 'guard') killGuard(g, true, P); else hurtActor(g, 9999, { from: P, silent: true });
}
function pickpocket(g) {
  g.picked = true; if (g.kind === 'guard') g.det += 0.12; G.stats.picked++;
  G.gold += g.pocket; sfx.coin();
  toast(`Lifted ${g.pocket} gold.`, 'gold');
  if (g.type === 'marshal' && !G.hasKey) gainKey();
}
function throwSmoke() {
  if (P.smoke <= 0 || P.dead) return;
  P.smoke--;
  const x = P.pos.x - Math.sin(P.yaw) * 1.5, z = P.pos.z - Math.cos(P.yaw) * 1.5, y = P.pos.y + 1;
  smokes.push({ x, y, z, r: 5.5, t: 9 });
  burst('smoke', x, y, z, 18, 2.4, 3.4, 9);
  sfx.smoke();
  for (const g of guards) if (!g.dead && Math.hypot(g.pos.x - x, g.pos.z - z) < 5.5 && Math.abs(g.pos.y - y) < 3) { g.stun = 2.6; if (g.state === 'alert') g.seenT = 4.5; }
}
function drinkPotion() {
  if (P.potions <= 0 || P.hp >= 100 || P.dead) return;
  P.potions--; P.hp = Math.min(100, P.hp + 55); sfx.potion(); toast('You drink a healing draught.');
}
function whistle() { sfx.whistle(); makeNoise(P.pos, 16); }

function hurtPlayer(dmg, from, attacker) {
  if (G.state !== 'play' || P.dead) return;
  if (from && P.blocking && P.st > 0) {
    const dx = from.x - P.pos.x, dz = from.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
    if ((dx * -Math.sin(P.yaw) + dz * -Math.cos(P.yaw)) / d > 0.25) {
      sfx.clang();
      burst('spark', P.pos.x + dx / d * 0.7, P.pos.y + 1.4, P.pos.z + dz / d * 0.7, 6, 2.5, 0.14, 0.3);
      if (attacker && G.t - P.blockStart < 0.3) { attacker.stun = 1.7; toast('Parried!', 'dim'); return; }
      dmg *= 0.15; P.st -= 18; P.stDelay = 1;
    }
  }
  P.hp -= dmg; P.hurtT = 0.5; P.roll = rand(-0.08, 0.08);
  sfx.hurt();
  if (P.hp <= 0) die();
}

// ---------------------------------------------------------------- player movement
function tryMantle() {
  if (P.st < 6) return false;
  let fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const ml = Math.hypot(P.vel.x, P.vel.z);
  if (G.view === 3 && ml > 1) { fx = P.vel.x / ml; fz = P.vel.z / ml; }
  const reach = P.onGround ? 3.2 : 2.7;
  for (const dist of [0.6, 1.0]) {
    const px = P.pos.x + fx * dist, pz = P.pos.z + fz * dist;
    let top = -1e9, tooTall = false;
    for (const c of C) {
      if (px < c.x0 - 0.05 || px > c.x1 + 0.05 || pz < c.z0 - 0.05 || pz > c.z1 + 0.05) continue;
      const t = topAt(c, px, pz), rel = t - P.pos.y;
      if (rel > reach) { if (c.y0 < P.pos.y + reach + 1.7) tooTall = true; continue; }
      if (rel > 0.55 && t > top) top = t;
    }
    if (tooTall || top < -1e8) continue;
    for (const c of C) if (px > c.x0 && px < c.x1 && pz > c.z0 && pz < c.z1 && c.y0 > top + 0.2 && c.y0 < top + 1.2) tooTall = true;
    if (tooTall) continue;
    P.mantle = { t: 0, x0: P.pos.x, y0: P.pos.y, z0: P.pos.z, x: px + fx * 0.25, z: pz + fz * 0.25, top };
    P.st -= 6; P.stDelay = 0.6; P.crouch = false;
    sfx.step(1, 0.6);
    return true;
  }
  return false;
}
let visT = 0;
function computeVis(dt) {
  visT -= dt;
  if (visT > 0) return;
  visT = 0.1;
  const I = W.indoor, indoor = P.pos.x > I.x0 && P.pos.x < I.x1 && P.pos.z > I.z0 && P.pos.z < I.z1 && P.pos.y < 6;
  let L = indoor ? 0.07 : 0.2;
  for (const tc of W.torches) {
    const r = (tc.fire ? 13 : 10) * tc.s, d = Math.hypot(tc.x - P.pos.x, tc.y - P.pos.y - 1, tc.z - P.pos.z);
    if (d < r && los(tc.x, tc.y, tc.z, P.pos.x, P.pos.y + 1, P.pos.z)) L += Math.pow(1 - d / r, 1.4) * 0.95;
  }
  P.light = Math.min(1, L);
  let v = P.light;
  const sp = Math.hypot(P.vel.x, P.vel.z);
  if (P.crouch) v *= 0.55;
  if (sp > 5.5) v *= 1.35; else if (sp < 0.3) v *= 0.8;
  P.hidden = false;
  if (P.crouch) for (const h of W.hide) if (Math.hypot(h.x - P.pos.x, h.z - P.pos.z) < h.r && Math.abs(terrainHeight(h.x, h.z) - P.pos.y) < 1.5) { v *= 0.2; P.hidden = true; break; }
  if (G.blessing) v *= 0.65;
  P.vis = clamp(v, 0.04, 1);
}

function updatePlayer(dt) {
  if (P.mantle) {
    const m = P.mantle;
    m.t += dt / 0.5;
    const u = Math.min(1, m.t), a = Math.min(1, u / 0.62), b = clamp((u - 0.45) / 0.55, 0, 1);
    P.pos.set(lerp(m.x0, m.x, ease(b)), lerp(m.y0, m.top + 0.02, ease(a)), lerp(m.z0, m.z, ease(b)));
    P.eye = lerp(P.eye, 1.25, 0.2);
    if (u >= 1) { P.mantle = null; P.vel.set(0, 0, 0); P.onGround = true; }
    return;
  }
  let f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), mag = 1;
  if (stick.id !== null) {
    const m = Math.hypot(stick.x, stick.y);
    if (m > 0.12) { f = -stick.y / m; s = stick.x / m; mag = clamp((m - 0.12) / 0.75, 0.35, 1); }
  }
  if (P.lockT > 0) { f = 0; s = 0; }
  if (keys.ArrowLeft) P.yaw += dt * 2.3;
  if (keys.ArrowRight) P.yaw -= dt * 2.3;
  if (keys.ArrowUp) P.pitch = Math.min(1.5, P.pitch + dt * 1.5);
  if (keys.ArrowDown) P.pitch = Math.max(-1.5, P.pitch - dt * 1.5);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
  const wl = Math.hypot(wx, wz);
  if (wl > 0) { wx /= wl; wz /= wl; }
  const inWater = P.pos.y < WATER - 0.7;
  P.sprint = !!(keys.ShiftLeft || keys.ShiftRight || (stick.id !== null && stick.run)) && f > 0.4 && !P.crouch && P.st > 1 && !P.drawing && !P.blocking;
  let sp = P.crouch ? 2.2 : P.sprint ? 6.9 : 4.3;
  if (P.drawing || P.blocking) sp *= 0.55;
  if (stick.id !== null) sp *= mag;
  if (inWater) sp *= 0.5;
  const acc = P.onGround ? 1 - Math.exp(-12 * dt) : 1 - Math.exp(-2.5 * dt);
  P.vel.x += (wx * sp - P.vel.x) * acc; P.vel.z += (wz * sp - P.vel.z) * acc;
  if (P.sprint && wl > 0) { P.st -= 12 * dt; P.stDelay = 0.6; }

  if (input.jump) {
    input.jump = false;
    if (P.lockT <= 0 && !tryMantle() && P.onGround && P.st >= 5) { P.vel.y = 7.3; P.onGround = false; P.st -= 5; P.stDelay = 0.5; }
  } else if (!P.onGround && keys.Space && f > 0 && P.vel.y < 3) tryMantle();
  if (P.mantle) return;

  const prevY = P.pos.y, hh = P.crouch ? 1.1 : 1.8;
  P.vel.y -= 22 * dt;
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
  resolveXZ(P.pos, 0.35, P.pos.y, hh);
  for (const g of actors) {
    if (!live(g) || g.fly || g.kind === 'bro') continue;
    const dx = P.pos.x - g.pos.x, dz = P.pos.z - g.pos.z, d = Math.hypot(dx, dz), rr = g.R + 0.2;
    if (d < rr && d > 0.001 && Math.abs(P.pos.y - g.pos.y) < Math.max(1.5, g.H * 0.8)) { P.pos.x = g.pos.x + dx / d * rr; P.pos.z = g.pos.z + dz / d * rr; }
  }
  P.pos.y += P.vel.y * dt;
  if (P.vel.y > 0) for (const c of C) {
    if (P.pos.x > c.x0 && P.pos.x < c.x1 && P.pos.z > c.z0 && P.pos.z < c.z1 && c.y0 > P.pos.y + 0.6 && c.y0 < P.pos.y + hh + 0.05) { P.vel.y = 0; break; }
  }
  const gi = {};
  let g = groundAt(P.pos.x, P.pos.z, Math.max(P.pos.y, prevY), gi), swim = false;
  if (g < WATER - 1.25) { g = WATER - 1.25; swim = true; }
  const was = P.onGround;
  if (P.pos.y <= g || (was && P.vel.y <= 0 && P.pos.y - g < 0.55)) {
    if (!was) {
      const v = -P.vel.y;
      if (v > 4) {
        if (gi.soft) { sfx.hay(); burst('dust', P.pos.x, g + 0.4, P.pos.z, 8, 2, 0.7, 0.8); }
        else if (swim) sfx.step(2, 1);
        else { sfx.land(Math.min(1, v / 12)); if (v > 9) makeNoise(P.pos, 9); }
      }
      if (v > 13.5 && !gi.soft && !swim) hurtPlayer((v - 13.5) * 7, null, null);
      if (v > 3) P.landT = Math.min(1, v / 11);
    }
    P.pos.y = g; P.vel.y = 0; P.onGround = true;
  } else P.onGround = false;

  const hs = Math.hypot(P.vel.x, P.vel.z);
  P.moveAmt = lerp(P.moveAmt, P.onGround ? Math.min(1, hs / 4.3) : 0, 0.15);
  if (P.onGround && hs > 0.6) {
    const before = Math.floor(P.bob / Math.PI);
    P.bob += hs * dt * 1.95;
    if (Math.floor(P.bob / Math.PI) !== before) {
      sfx.step(inWater ? 2 : Math.max(Math.abs(P.pos.x), Math.abs(P.pos.z)) < 58 ? 1 : 0, P.crouch ? 0.25 : P.sprint ? 1 : 0.6);
      if (inWater) makeNoise(P.pos, 8); else if (P.sprint) makeNoise(P.pos, 9.5); else if (!P.crouch) makeNoise(P.pos, 3.6);
    }
  }
  P.stDelay -= dt;
  if (P.stDelay <= 0) P.st = Math.min(100, P.st + 20 * dt);
  P.st = Math.max(0, P.st);
  P.eye = lerp(P.eye, P.crouch ? 0.95 : 1.66, 1 - Math.exp(-12 * dt));
  if (P.lockT > 0) P.lockT -= dt;
  P.violentT = Math.max(0, P.violentT - dt);
  if (G.blessing && P.vis < 0.3 && P.hp < 100 && !P.dead) P.hp = Math.min(100, P.hp + 1.5 * dt);
  if (G.keyDrop && Math.hypot(G.keyDrop.x - P.pos.x, G.keyDrop.z - P.pos.z) < 1.7) gainKey();
}

// ---------------------------------------------------------------- weapons
const camDir = new V3(), eyePos = new V3();
// Where the player is looking, from the eye; independent of when the camera was last rendered.
function aim() {
  const cp = Math.cos(P.pitch);
  camDir.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
  if (G.view === 3) {
    const r = computeTP(), o = { x: r.x + r.dx * r.t, y: r.y + r.dy * r.t, z: r.z + r.dz * r.t };
    const t = Math.max(4, rayWorld(o.x, o.y, o.z, camDir.x, camDir.y, camDir.z, 90));
    const tx = o.x + camDir.x * t, ty = o.y + camDir.y * t, tz = o.z + camDir.z * t;
    eyePos.set(P.pos.x + Math.cos(P.yaw) * 0.22, P.pos.y + (P.crouch ? 1.05 : 1.5), P.pos.z - Math.sin(P.yaw) * 0.22);
    camDir.set(tx - eyePos.x, ty - eyePos.y, tz - eyePos.z).normalize();
  } else eyePos.set(P.pos.x, P.pos.y + P.eye, P.pos.z);
}
function fireShot(kind, speed, dmg) {
  aim();
  const o = eyePos.clone().addScaledVector(camDir, 0.45);
  o.y -= 0.06;
  spawnShot(kind, o, camDir, speed, dmg, null);
}
function swordHit(heavy) {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  let any = false;
  for (const g of actors.slice()) {
    if (!live(g) || g.kind === 'bro') continue;
    const dx = g.pos.x - P.pos.x, dz = g.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > 2.5 + g.R || P.pos.y - g.pos.y > 1.9 || g.pos.y - P.pos.y > 1.9 + g.H * 0.3) continue;
    if (d > 0.5 && (dx * fx + dz * fz) / d < 0.45) continue;
    any = true;
    P.lastTarget = g; P.lastTargetT = G.t;
    if (g.kind !== 'guard') {
      let dmg = heavy ? 56 : 34;
      if (!g.aware && g.kind !== 'rift') dmg *= 2.6; else if (g.stun > 0) dmg *= 1.8;
      sfx.hit(); hurtActor(g, dmg, { from: P, melee: true });
      continue;
    }
    const unaware = g.state !== 'alert';
    const facing = (-dx * Math.sin(g.yaw) - dz * Math.cos(g.yaw)) / Math.max(d, 0.01) > 0.3;
    if (!unaware && g.stun <= 0 && facing && Math.random() < (g.type === 'marshal' ? 0.45 : 0.28)) {
      sfx.clang(); burst('spark', g.pos.x - dx / d * 0.5, g.pos.y + 1.3, g.pos.z - dz / d * 0.5, 6, 2.5, 0.14, 0.3);
      continue;
    }
    let dmg = heavy ? 56 : 34;
    if (unaware) dmg *= 2.6; else if (g.stun > 0) dmg *= 1.8;
    sfx.hit();
    hurtGuard(g, dmg, { from: P });
  }
  if (any) { makeNoise(P.pos, 12); P.violentT = 1.5; return; }
  aim();
  const o = eyePos, t = rayWorld(o.x, o.y, o.z, camDir.x, camDir.y, camDir.z, 2.3);
  if (t < 2.3) { sfx.clang(0.45); burst('spark', o.x + camDir.x * t, o.y + camDir.y * t, o.z + camDir.z * t, 5, 2, 0.12, 0.3); makeNoise(P.pos, 9); }
}
function switchWeapon(i) {
  if (i === P.weapon || P.lockT > 0) return;
  P.weapon = i; P.swT = 0.25; P.swing = null; P.drawing = false; P.draw = 0; P.blocking = false;
  sfx.click();
}
function updateWeapons(dt) {
  P.cd = Math.max(0, P.cd - dt);
  P.swT = Math.max(0, P.swT - dt);
  P.throwT = Math.max(0, P.throwT - dt);
  const busy = P.lockT > 0 || P.mantle || P.swT > 0;
  const w = P.weapon;
  if (w === 0) {
    P.blocking = input.alt && !P.swing && !busy && P.st > 0;
    if (P.blocking && !P.wasBlock) P.blockStart = G.t;
    P.wasBlock = P.blocking;
    if (P.swing) {
      P.swing.t += dt;
      if (!P.swing.hit && P.swing.t >= 0.15) { P.swing.hit = true; swordHit(P.swing.heavy); }
      if (P.swing.t >= P.swing.dur) P.swing = null;
    } else if (input.fire && !busy && P.cd <= 0 && P.st >= 6 && !P.blocking) {
      if (G.t - P.comboT > 1) P.combo = 0;
      const heavy = P.combo % 3 === 2;
      P.swing = { t: 0, dur: heavy ? 0.52 : 0.38, dir: P.combo % 3, heavy, hit: false };
      P.combo++; P.comboT = G.t; P.cd = P.swing.dur + 0.04; P.st -= heavy ? 13 : 8; P.stDelay = 0.7;
      sfx.swing();
    }
  } else if (w === 1) {
    if (input.fire && P.arrows > 0 && P.cd <= 0 && !busy) {
      if (!P.drawing) { P.drawing = true; P.draw = 0; sfx.bowDraw(); }
      P.draw = Math.min(1, P.draw + dt / 0.85);
    } else if (P.drawing) {
      P.drawing = false;
      if (P.draw > 0.22 && !busy) { P.arrows--; fireShot('arrow', 22 + 50 * P.draw, 20 + 58 * P.draw); sfx.bow(); P.cd = 0.4; }
      P.draw = 0;
    }
  } else if (w === 2) {
    if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) { P.loaded = true; sfx.click(); } }
    else if (!P.loaded && P.bolts > 0) P.reload = 1.9;
    if (input.firePressed && P.loaded && !busy && P.bolts > 0) {
      P.loaded = false; P.bolts--; fireShot('bolt', 88, 96); sfx.crossbow(); P.recoil = 1;
      makeNoise(P.pos, 5);
      if (P.bolts > 0) P.reload = 1.9;
    }
  } else if (w === 3) {
    if (input.firePressed && P.knives > 0 && P.cd <= 0 && !busy) { P.knives--; P.cd = 0.5; P.throwT = 0.5; fireShot('knife', 36, 46); sfx.swing(0.6); }
  }
  if (P.loaded && P.bolts <= 0) P.loaded = false;
  P.recoil = Math.max(0, (P.recoil || 0) - dt * 5);
}

// ---------------------------------------------------------------- first-person view model
const vmScene = new THREE.Scene(), vmCam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
const vmAmb = new THREE.AmbientLight(0x93a4cc, 1), vmKey = new THREE.DirectionalLight(0xffd9b0, 1.2);
vmKey.position.set(-0.6, 1, 0.8); vmScene.add(vmAmb, vmKey);
const VM = {
  steel: sm(0xc2cad6, { metalness: 0.3, roughness: 0.35, emissive: 0x2a3038 }), fuller: sm(0x8c95a3, { metalness: 0.3, roughness: 0.5 }), gold: sm(0xe0a93a, { metalness: 0.35, roughness: 0.4 }), leather: sm(0x4a2f1d),
  glove: sm(0x2a211c), sleeve: sm(0x1b202b), wood: sm(0x6b4a2b), dark: sm(0x2c221b), string: new THREE.LineBasicMaterial({ color: 0xe2dbc6 }),
};
function vb(parent, mat, w, h, d, x, y, z) { const m = new THREE.Mesh(UB, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function arm(parent, x, y, z, rx, ry) {
  const a = new THREE.Group(); a.position.set(x, y, z); a.rotation.set(rx, ry, 0);
  vb(a, VM.glove, 0.085, 0.085, 0.12, 0, 0, 0); vb(a, VM.sleeve, 0.1, 0.1, 0.55, 0, 0, 0.32); vb(a, VM.leather, 0.11, 0.11, 0.1, 0, 0, 0.1);
  parent.add(a); return a;
}
const vmSword = new THREE.Group();
vb(vmSword, VM.steel, 0.085, 0.74, 0.014, 0, 0.48, 0); vb(vmSword, VM.fuller, 0.024, 0.6, 0.018, 0, 0.42, 0);
vb(vmSword, VM.steel, 0.06, 0.06, 0.014, 0, 0.85, 0).rotation.z = Math.PI / 4;
vb(vmSword, VM.gold, 0.3, 0.04, 0.055, 0, 0.09, 0); vb(vmSword, VM.leather, 0.04, 0.18, 0.04, 0, -0.01, 0); vb(vmSword, VM.gold, 0.06, 0.06, 0.06, 0, -0.12, 0);
arm(vmSword, 0.01, -0.02, 0.03, 0.9, 0);
vmSword.scale.setScalar(0.86);
const vmBow = new THREE.Group();
{
  const limb = new THREE.TorusGeometry(0.5, 0.013, 6, 22, Math.PI * 0.8);
  limb.rotateZ(-Math.PI * 0.4); limb.rotateY(Math.PI / 2); limb.translate(0, 0, 0.5);
  vmBow.add(new THREE.Mesh(limb, VM.wood));
  vb(vmBow, VM.leather, 0.035, 0.14, 0.035, 0, 0, 0);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  vmBow.userData.string = new THREE.Line(sg, VM.string); vmBow.add(vmBow.userData.string);
  const ar = new THREE.Group();
  vb(ar, VM.wood, 0.012, 0.012, 0.78, 0, 0, -0.39); vb(ar, VM.steel, 0.03, 0.03, 0.06, 0, 0, -0.8); vb(ar, VM.sleeve, 0.06, 0.004, 0.1, 0, 0, -0.05);
  vmBow.add(ar); vmBow.userData.arrow = ar;
  arm(vmBow, -0.01, -0.02, 0.03, 0.5, 0.35);
  vmBow.userData.hand = arm(vmBow, 0.03, -0.02, 0.4, 0.25, -0.5);
}
const vmXbow = new THREE.Group();
{
  vb(vmXbow, VM.wood, 0.06, 0.07, 0.62, 0, 0, -0.1); vb(vmXbow, VM.dark, 0.66, 0.028, 0.045, 0, 0.03, -0.4); vb(vmXbow, VM.steel, 0.03, 0.05, 0.05, 0, 0.05, 0.08);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  vmXbow.userData.string = new THREE.Line(sg, VM.string); vmXbow.add(vmXbow.userData.string);
  vmXbow.userData.bolt = vb(vmXbow, VM.steel, 0.014, 0.014, 0.36, 0, 0.05, -0.27);
  arm(vmXbow, 0.02, -0.07, 0.12, 0.3, -0.25); arm(vmXbow, -0.03, -0.07, -0.22, 0.35, 0.7);
}
const vmKnife = new THREE.Group();
vb(vmKnife, VM.steel, 0.042, 0.24, 0.01, 0, 0.19, 0); vb(vmKnife, VM.dark, 0.03, 0.12, 0.03, 0, 0.01, 0); vb(vmKnife, VM.gold, 0.07, 0.015, 0.03, 0, 0.07, 0);
arm(vmKnife, 0.01, -0.02, 0.03, 0.75, 0);
// A short glowing ribbon left behind the blade while it cuts.
class Trail {
  constructor(parent, color, n = 14) {
    this.n = n; this.pts = []; this.color = new THREE.Color(color);
    this.pos = new Float32Array(n * 6); this.col = new Float32Array(n * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.mesh.frustumCulled = false; this.mesh.visible = false;
    parent.add(this.mesh);
  }
  update(base, tip, active, dt, strength = 1) {
    if (active) this.pts.unshift({ b: base.clone(), t: tip.clone(), age: 0 });
    for (const q of this.pts) q.age += dt;
    while (this.pts.length > this.n || (this.pts.length && this.pts[this.pts.length - 1].age > 0.16)) this.pts.pop();
    this.mesh.visible = this.pts.length > 1;
    if (!this.mesh.visible) return;
    for (let i = 0; i < this.n; i++) {
      const q = this.pts[Math.min(i, this.pts.length - 1)];
      const f = Math.max(0, 1 - q.age / 0.16) * (1 - i / this.n) * strength * (i < this.pts.length ? 1 : 0);
      this.pos.set([q.b.x, q.b.y, q.b.z, q.t.x, q.t.y, q.t.z], i * 6);
      this.col.set([this.color.r * f * 0.15, this.color.g * f * 0.15, this.color.b * f * 0.15, this.color.r * f, this.color.g * f, this.color.b * f], i * 6);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}
const _tb = new V3(), _tt = new V3();
const swinging = () => P.swing && P.swing.t > P.swing.dur * 0.25 && P.swing.t < P.swing.dur * 0.72;

const vmRoot = new THREE.Group();
vmRoot.add(vmSword, vmBow, vmXbow, vmKnife); vmScene.add(vmRoot);
const fpTrail = new Trail(vmScene, 0xbfd4ff), tpTrail = new Trail(scene, 0xbfd4ff);
let swayX = 0, swayY = 0;
function setString(line, ax, ay, az, mx, my, mz, bx, by, bz) {
  const p = line.geometry.attributes.position;
  p.setXYZ(0, ax, ay, az); p.setXYZ(1, mx, my, mz); p.setXYZ(2, bx, by, bz); p.needsUpdate = true;
}
function updateVM(dt) {
  const w = P.weapon, stab = P.lockT > 0;
  swayX = lerp(swayX, clamp(-input.mdx * 0.0009, -0.06, 0.06), 0.12);
  swayY = lerp(swayY, clamp(input.mdy * 0.0009, -0.05, 0.05), 0.12);
  const bx = Math.cos(P.bob) * 0.012 * P.moveAmt, by = -Math.abs(Math.sin(P.bob)) * 0.016 * P.moveAmt;
  vmRoot.position.set(swayX + bx, swayY + by - (P.swT / 0.25) * 0.45 + Math.sin(G.t * 1.6) * 0.004 - (P.landT || 0) * 0.07, 0);
  vmRoot.rotation.x = lerp(vmRoot.rotation.x, P.sprint && P.moveAmt > 0.5 ? -0.12 : 0, 0.12);
  vmRoot.rotation.z = swayX * 0.8;
  if (touchMode) { vmRoot.position.x += 0.05; vmRoot.position.y -= 0.03; }
  vmSword.scale.setScalar(touchMode ? 0.7 : 0.86);
  vmSword.visible = w === 0 && !stab; vmBow.visible = w === 1 && !stab; vmXbow.visible = w === 2 && !stab; vmKnife.visible = stab || w === 3;
  const k = 1 - Math.exp(-22 * dt);

  if (vmSword.visible) {
    let px = 0.4, py = -0.4, pz = -0.66, rx = -0.5, ry = -0.5, rz = 0.3, snap = false;
    if (P.swing) {
      const u = P.swing.t / P.swing.dur, e = ease(Math.min(1, u / 0.5)), back = ease(clamp((u - 0.55) / 0.45, 0, 1));
      let sx, sy2, sz = -0.7, srx, srz;
      if (P.swing.dir === 0) { sx = lerp(0.6, -0.4, e); sy2 = -0.3; srx = -1.3; srz = lerp(-1.35, 1.75, e); }
      else if (P.swing.dir === 1) { sx = lerp(-0.45, 0.6, e); sy2 = -0.28; srx = -1.3; srz = lerp(1.75, -1.35, e); }
      else { sx = 0.16; sy2 = lerp(-0.1, -0.55, e); srx = lerp(0.6, -2.05, e); srz = 0.12; sz = -0.68; }
      px = lerp(sx, px, back); py = lerp(sy2, py, back); pz = lerp(sz, pz, back); rx = lerp(srx, rx, back); rz = lerp(srz, rz, back); ry = lerp(0, ry, back);
      snap = true;
    } else if (P.blocking) { px = 0.16; py = -0.34; pz = -0.7; rx = -0.2; ry = 0.2; rz = 1.15; }
    const q = snap ? 1 : k;
    vmSword.position.set(lerp(vmSword.position.x, px, q), lerp(vmSword.position.y, py, q), lerp(vmSword.position.z, pz, q));
    vmSword.rotation.set(lerp(vmSword.rotation.x, rx, q), lerp(vmSword.rotation.y, ry, q), lerp(vmSword.rotation.z, rz, q));
  }
  if (vmBow.visible) {
    const d = P.draw, has = P.arrows > 0 && P.cd <= 0.15;
    vmBow.position.set(lerp(vmBow.position.x, lerp(0.3, 0.12, d), k), lerp(vmBow.position.y, lerp(-0.24, -0.13, d), k), lerp(vmBow.position.z, lerp(-0.95, -0.82, d), k));
    vmBow.rotation.set(0.04, lerp(0.28, 0.1, d), lerp(-0.5, -0.24, d));
    const nz = 0.345 + d * 0.3 + (P.cd > 0.25 ? Math.sin(G.t * 90) * 0.01 : 0);
    setString(vmBow.userData.string, 0, 0.475, 0.345, 0, 0, has ? nz : 0.345, 0, -0.475, 0.345);
    vmBow.userData.arrow.visible = has; vmBow.userData.arrow.position.set(0.012, 0, nz);
    vmBow.userData.hand.visible = has; vmBow.userData.hand.position.set(0.03, -0.02, nz + 0.05);
  }
  if (vmXbow.visible) {
    const rl = P.reload > 0 ? Math.sin(clamp(1 - P.reload / 1.9, 0, 1) * Math.PI) : 0, aim = input.alt ? 1 : 0;
    vmXbow.position.set(lerp(vmXbow.position.x, lerp(0.2, 0, aim), k), lerp(vmXbow.position.y, lerp(-0.24, -0.135, aim) - rl * 0.16, k), lerp(vmXbow.position.z, -0.45 + P.recoil * 0.07, k));
    vmXbow.rotation.set(P.recoil * 0.12 - rl * 0.5, lerp(0.06, 0, aim), rl * 0.3);
    vmXbow.userData.bolt.visible = P.loaded;
    setString(vmXbow.userData.string, -0.32, 0.045, -0.4, 0, 0.045, P.loaded ? -0.1 : -0.37, 0.32, 0.045, -0.4);
  }
  if (vmKnife.visible) {
    if (stab) {
      const u = 1 - P.lockT / 0.55, e = Math.sin(Math.min(1, u * 1.25) * Math.PI);
      vmKnife.position.set(0.14, -0.2, -0.38 - e * 0.36); vmKnife.rotation.set(-1.45, 0, 0.2);
    } else {
      const u = P.throwT > 0 ? 1 - P.throwT / 0.5 : 1, fl = u < 0.3 ? u / 0.3 : 1;
      vmKnife.position.set(0.3, -0.3 + (u < 1 ? Math.sin(fl * Math.PI) * 0.1 : 0), -0.5 - (u < 0.5 ? Math.sin(u * 2 * Math.PI) * 0.12 : 0));
      vmKnife.rotation.set(u < 0.3 ? lerp(0.5, -1.7, fl) : lerp(-1.7, -0.55, clamp((u - 0.3) / 0.5, 0, 1)), 0, 0.15);
      vmKnife.children[0].visible = vmKnife.children[2].visible = stab || (P.knives > 0 && u > 0.55);
    }
    if (stab) vmKnife.children[0].visible = vmKnife.children[2].visible = true;
  }
  vmAmb.intensity = 0.9 + P.light * 1.3;
  vmKey.intensity = 0.9 + P.light * 2;
  input.mdx = input.mdy = 0;
}

// ---------------------------------------------------------------- third person
const pRig = makeHumanoid({ skin: 0xc49572, top: 0x1f2533, pants: 0x161a22, boots: 0x2a1d14, head: 'hood', hood: 0x1d2230, cape: 0x1a1e29, belt: 0x8e2222, gloves: 0x2a1d14, tallBoots: true });
const pW = [hold(pRig, 'R', 'sword'), hold(pRig, 'L', 'bow'), hold(pRig, 'R', 'crossbow'), hold(pRig, 'R', 'knife')];
pRig.root.visible = false;
scene.add(pRig.root);
let pYaw = 0, pMv = 0, pCr = 0, tpDist = 3.3, tpCr = 0, pBank = 0;
const tpPivot = new V3();
function toggleView(v) {
  G.view = v || (G.view === 3 ? 1 : 3);
  try { localStorage.setItem('ravenmoor.view', String(G.view)); } catch (e) { /* remembered only for this visit */ }
  updateViewUI();
  if (!v && G.state === 'play') toast(G.view === 3 ? 'Third-person view' : 'First-person view', 'dim');
}
function updateViewUI() {
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(+b.dataset.view === G.view));
}
// The over-the-shoulder camera: a pivot at the player's head, pushed back and to the right,
// pulled in wherever a wall or the hillside is in the way. Aiming uses the same ray.
const tpRay = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, t: 3.3 };
function computeTP() {
  const cp = Math.cos(P.pitch), fx = -Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * cp;
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const zoom = P.drawing ? P.draw : P.weapon === 2 && input.alt ? 1 : 0;
  const back = lerp(3.3, 1.7, zoom), side = 0.62;
  const py = P.mantle ? P.pos.y + 1.3 : P.dead ? P.pos.y + 0.9 : P.pos.y + lerp(1.62, 1.12, tpCr);
  tpPivot.set(P.pos.x + rx * side * 0.4, py, P.pos.z + rz * side * 0.4);
  let dx = -fx * back + rx * side * 0.6, dy = -fy * back + 0.3, dz = -fz * back + rz * side * 0.6;
  const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
  let t = rayWorld(tpPivot.x, tpPivot.y, tpPivot.z, dx, dy, dz, L + 0.3) - 0.3;
  for (let k = 1; k <= 6; k++) {
    const sd = L * k / 6, x = tpPivot.x + dx * sd, z = tpPivot.z + dz * sd;
    if (Math.max(Math.abs(x), Math.abs(z)) > 56 && terrainHeight(x, z) + 0.3 > tpPivot.y + dy * sd) { t = Math.min(t, L * (k - 1) / 6); break; }
  }
  Object.assign(tpRay, { x: tpPivot.x, y: tpPivot.y, z: tpPivot.z, dx, dy, dz, t: clamp(t, 0.3, L) });
  return tpRay;
}
function thirdPersonCam(dt) {
  tpCr = lerp(tpCr, P.crouch ? 1 : 0, 1 - Math.exp(-10 * dt));
  const r = computeTP();
  tpDist = r.t < tpDist ? r.t : lerp(tpDist, r.t, 1 - Math.exp(-5 * dt));
  camera.position.set(r.x + r.dx * tpDist, r.y + r.dy * tpDist, r.z + r.dz * tpDist);
  camera.rotation.set(P.pitch, P.yaw, P.roll * 0.5);
  P.roll = lerp(P.roll, 0, 0.1);
}
function updatePlayerModel(dt) {
  const showIt = G.view === 3 && G.state !== 'menu';
  pRig.root.visible = showIt && tpDist > 0.75;
  if (!showIt) return;
  setShadow(pRig, G.shadowDist > 0);
  pW.forEach((w, i) => { w.visible = P.lockT > 0 ? i === 3 : i === P.weapon; });
  pRig.root.position.copy(P.pos);
  const hs = Math.hypot(P.vel.x, P.vel.z);
  const combat = P.swing || P.blocking || P.drawing || P.lockT > 0 || P.throwT > 0 || (P.weapon === 2 && (input.alt || P.recoil > 0)) || P.mantle;
  const want = combat ? P.yaw + Math.PI : hs > 0.6 ? Math.atan2(P.vel.x, P.vel.z) : pYaw;
  const prevYaw = pYaw;
  pYaw = turn(pYaw, want, dt * (combat ? 16 : 9));
  const yawRate = dt > 0 ? turn(0, pYaw - prevYaw, 9) / dt : 0;
  pBank = lerp(pBank, clamp(-yawRate * 0.045 * Math.min(1.6, hs / 4.3), -0.22, 0.22), 1 - Math.exp(-8 * dt));
  pRig.root.rotation.y = pYaw;
  P.landT = Math.max(0, (P.landT || 0) - dt * 3.5);
  const backwards = hs > 0.5 && (P.vel.x * Math.sin(pYaw) + P.vel.z * Math.cos(pYaw)) / hs < -0.3;
  pMv = lerp(pMv, P.onGround ? hs / 4.3 : 0, 1 - Math.exp(-12 * dt));
  pCr = lerp(pCr, P.crouch ? 1 : 0, 1 - Math.exp(-10 * dt));
  const p = { t: G.t, dt, phase: backwards ? -P.bob : P.bob, move: pMv, crouch: pCr, air: P.onGround || P.mantle ? 0 : 1, climb: P.mantle ? 1 - Math.min(1, P.mantle.t) : 0, atk: -1, dead: P.dead ? Math.min(1, G.endT / 1.1) : 0, hit: Math.min(1, P.hurtT * 2), land: P.landT, bank: pBank };
  if (P.swing) { p.atk = Math.min(1, P.swing.t / P.swing.dur); p.style = ['slash', 'slashL', 'overhead'][P.swing.dir]; }
  else if (P.lockT > 0) { p.atk = 1 - P.lockT / 0.55; p.style = 'stab'; }
  else if (P.throwT > 0) { p.atk = 1 - P.throwT / 0.5; p.style = 'cast'; }
  if (P.blocking) p.block = 1;
  if (P.weapon === 1 && (P.drawing || P.cd > 0)) { p.aim = 1; p.draw = P.draw; }
  if (P.weapon === 2) p.xbow = 1;
  poseHumanoid(pRig, p);
}

// ---------------------------------------------------------------- flow
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function clearDynamic() {
  for (const g of guards) scene.remove(g.m.root);
  guards.length = 0; actors.length = 0;
  for (const s of shots) scene.remove(s.m);
  shots.length = 0;
  for (const p of parts) scene.remove(p.s);
  parts.length = 0; smokes.length = 0;
}
function resetGame() {
  clearDynamic();
  resetState();
  for (const s of W.spawns) makeGuard(s);
  life.reset();
  for (const c of W.chests) { c.opened = false; c.openT = 1; c.lid.rotation.x = 0; }
  crown.visible = true; keyMesh.visible = false; door.position.y = 1.6;
  doorCol.y0 = 0; doorCol.y1 = 3.2;
  $('toasts').innerHTML = '';
  $('ctx').innerHTML = '';
  for (const k in hudCache) delete hudCache[k];
  releaseTouch();
}
let locked = false, freeLook = false;
function requestLock() {
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* fall through to free look */ }
  setTimeout(() => {
    if (document.pointerLockElement !== canvas && G.state === 'play' && !freeLook) {
      freeLook = true;
      toast('Mouse capture is unavailable here: move the mouse to look, or use the arrow keys.');
    }
  }, 900);
}
function startGame() {
  sfx.init();
  resetGame();
  G.state = 'play';
  show('menu', false); show('end', false); show('pause', false); show('hud', true);
  if (!touchMode) requestLock();
  const run = G.run = (G.run || 0) + 1, later = (ms, f) => setTimeout(() => { if (G.run === run && G.state === 'play') f(); }, ms);
  later(600, () => toast('Night falls on Ravenmoor. Stay low, stay dark.'));
  later(4200, () => toast(touchMode ? 'Left thumb moves, right thumb looks. Tap the prompts to act.' : '[C] crouch · [Space] climb ledges · [F] strike from behind'));
  later(9000, () => toast("Contract: Lord Marshal Varek's death pays 500 gold.", 'gold'));
  later(2200, () => { life.broSayNow('Ready when you are, bro. I follow your lead.'); });
  later(13000, () => toast(touchMode ? 'Tap the Bro button to make him wait or follow. The eye button switches the camera.' : '[G] Bro waits or follows · [T] switch first or third person', 'dim'));
}
function pause(on) {
  if (on && G.state === 'play') {
    G.state = 'pause';
    releaseTouch();
    $('pObjT').textContent = OBJ[G.stage][0]; $('pObjH').textContent = OBJ[G.stage][1];
    $('pObjX').style.display = G.marshalDead ? 'none' : 'block';
    $('soundBtn').textContent = G.muted ? 'SOUND OFF' : 'SOUND ON';
    const q = life.quests;
    $('deeds').innerHTML = [
      [q.blessing, "Pray at the Pale Lady's shrine, on the hill by your camp"],
      [q.troll, 'Deal with the troll sleeping by the river bridge'],
      [q.grave, 'Lay the risen dead to rest, in the graveyard west of the walls'],
      [q.rift, 'Seal the demon rift in the ruined tower west of the bridge'],
      [q.demon, 'Banish the hellspawn that guards the rift'],
    ].map(([done, t]) => `<li class="${done ? 'done' : ''}">${t}</li>`).join('');
    show('pause', true);
  } else if (!on && G.state === 'pause') { G.state = 'play'; show('pause', false); sfx.init(); if (!freeLook && !touchMode) requestLock(); }
}
function endScreen(title, html, btn) {
  releaseTouch();
  $('endT').textContent = title; $('endB').innerHTML = html; $('endBtn').textContent = btn;
  show('end', true); show('hud', false);
  if (document.pointerLockElement) document.exitPointerLock();
}
function die() {
  P.dead = true; P.hp = 0; G.state = 'dead'; G.endT = 0;
  sfx.setTension(0);
  setTimeout(() => endScreen('You Are Slain', '<p>Your body will hang from the gatehouse by morning.</p>', 'Try again'), 1600);
}
function win() {
  G.state = 'won';
  sfx.setTension(0); sfx.fanfare();
  const s = G.stats, ghost = s.alerts === 0, clean = s.kills === 0 && s.innocents === 0, q = life.quests;
  const bonus = (G.contract ? 500 : 0) + (ghost ? 750 : 0) + (clean ? 500 : 0);
  const rank = s.innocents >= 3 ? 'Butcher' : ghost && clean ? 'Phantom' : ghost ? 'Ghost' : s.alerts <= 3 ? 'Shadow' : s.kills > 12 ? 'Butcher' : 'Cutthroat';
  const deeds = [q.blessing && 'blessed by the Pale Lady', q.troll && 'troll slain', q.grave && 'graveyard laid to rest', q.rift && 'demon rift sealed', q.demon && 'hellspawn banished'].filter(Boolean);
  const mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
  endScreen('The Crown Is Yours', `
    <p class="rank">Rank: <b>${rank}</b></p>
    <table>
      <tr><td>Plunder</td><td>${G.gold} gold</td></tr>
      <tr><td>Bonuses</td><td>${bonus} gold${G.contract ? ' · contract' : ''}${ghost ? ' · never hunted' : ''}${clean ? ' · bloodless' : ''}</td></tr>
      <tr><td>Guards slain</td><td>${s.kills} (${s.stealth} silent)</td></tr>
      <tr><td>Beasts and demons</td><td>${s.beasts + s.demons}</td></tr>
      <tr><td>Innocents slain</td><td>${s.innocents}</td></tr>
      <tr><td>Deeds</td><td>${deeds.length ? deeds.join(' · ') : 'none'}</td></tr>
      <tr><td>Pockets picked</td><td>${s.picked}</td></tr>
      <tr><td>Times hunted</td><td>${s.alerts}</td></tr>
      <tr><td>Time</td><td>${mm}:${ss}</td></tr>
    </table>
    <p class="total">Total: ${G.gold + bonus} gold</p>`, 'Play again');
}
function updateObjectives() {
  if (G.stage === 0 && Math.abs(P.pos.x) < 56 && Math.abs(P.pos.z) < 56) { G.stage = 1; toast('You are inside Ravenmoor.', 'dim'); }
  if (G.stage <= 1 && G.hasKey) G.stage = 2;
  if (G.stage <= 2 && G.hasCrown) G.stage = 3;
  if (G.stage === 3 && Math.hypot(P.pos.x - CAMP.x, P.pos.z - CAMP.z) < 6.5) win();
}

// ---------------------------------------------------------------- input
document.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (!$('settings').classList.contains('hidden')) { if (e.code === 'Escape') show('settings', false); return; }
  if (G.state === 'pause') { if (e.code === 'KeyP' || e.code === 'Enter') pause(false); return; }
  if (G.state !== 'play') return;
  switch (e.code) {
    case 'Space': input.jump = true; break;
    case 'KeyC': P.crouch = !P.crouch; break;
    case 'KeyF': assassinate(); break;
    case 'KeyE': if (promptAct) promptAct(); break;
    case 'KeyQ': throwSmoke(); break;
    case 'KeyH': drinkPotion(); break;
    case 'KeyV': whistle(); break;
    case 'KeyG': life.broCommand(); break;
    case 'KeyT': toggleView(); break;
    case 'KeyM': G.muted = !G.muted; sfx.mute(G.muted); toast(G.muted ? 'Sound off' : 'Sound on', 'dim'); break;
    case 'KeyP': pause(true); break;
    case 'Escape': if (freeLook) pause(true); break;
    case 'Digit1': switchWeapon(0); break;
    case 'Digit2': switchWeapon(1); break;
    case 'Digit3': switchWeapon(2); break;
    case 'Digit4': switchWeapon(3); break;
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.fire = input.alt = false; releaseTouch(); });
document.addEventListener('mousemove', (e) => {
  if (touchMode || G.state !== 'play' || (!locked && !freeLook)) return;
  const mx = clamp(e.movementX || 0, -120, 120), my = clamp(e.movementY || 0, -120, 120);
  const s = 0.0022 * settings.sens * (camera.fov / 75);
  P.yaw -= mx * s; P.pitch = clamp(P.pitch - my * s * (settings.invert ? -1 : 1), -1.5, 1.5);
  input.mdx += mx; input.mdy += my;
});
document.addEventListener('mousedown', (e) => {
  if (touchMode || G.state !== 'play' || (e.target.closest && e.target.closest('button'))) return;
  if (!locked && !freeLook) { requestLock(); return; }
  if (e.button === 0) { input.fire = true; input.firePressed = true; } else if (e.button === 2) input.alt = true;
});
document.addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; else if (e.button === 2) input.alt = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (G.state === 'play') switchWeapon((P.weapon + (e.deltaY > 0 ? 1 : 3)) % 4); }, { passive: true });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) freeLook = false; else if (G.state === 'play' && !freeLook) pause(true);
});
$('startBtn').addEventListener('click', startGame);
$('endBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', () => pause(false));
$('restartBtn').addEventListener('click', startGame);
$('soundBtn').addEventListener('click', () => { G.muted = !G.muted; sfx.mute(G.muted); $('soundBtn').textContent = G.muted ? 'SOUND OFF' : 'SOUND ON'; });
$('rotateBtn').addEventListener('click', () => $('rotate').classList.add('dismissed'));
window.addEventListener('resize', () => { resize(); delete hudCache.cHalf; if (stick.id === null) placeStick(); });

// ---------------------------------------------------------------- touch controls
// Left side: a floating stick that appears under the thumb. Right side: drag to look.
// Buttons and prompts sit above that layer and take their own touches.
function setTouch(on) { touchMode = on; document.body.classList.toggle('touch', on); for (const k in hudCache) if (k.startsWith('atk') || k === 'blk' || k === 'cHalf') delete hudCache[k]; }
setTouch(touchMode);
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && !touchMode) setTouch(true);
  else if (e.pointerType === 'mouse' && touchMode && matchMedia('(hover: hover)').matches) setTouch(false);
}, true);
const look = { id: null, x: 0, y: 0 };
const STICK_R = 52;
const tz = $('tz'), stickEl = $('stick'), knob = $('knob');
function placeStick(x, y) {
  if (x === undefined) { stickEl.style.left = stickEl.style.top = stickEl.style.bottom = ''; return; }
  const r = 62;
  stickEl.style.left = clamp(x, r + 4, window.innerWidth * 0.5) - r + 'px';
  stickEl.style.top = clamp(y, r + 4, window.innerHeight - r - 4) - r + 'px';
  stickEl.style.bottom = 'auto';
}
function resetStick() {
  stick.id = null; stick.x = stick.y = 0; stick.run = false;
  knob.style.transform = ''; stickEl.classList.remove('live', 'run');
  placeStick();
}
function releaseTouch() {
  if (stick.id !== null) resetStick();
  look.id = null;
  if (touchMode) { input.fire = input.alt = false; keys.Space = false; }
  for (const el of document.querySelectorAll('.tb.down')) el.classList.remove('down');
}
tz.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (G.state !== 'play') return;
  if (e.clientX < window.innerWidth * 0.42 && stick.id === null) {
    stick.id = e.pointerId; stick.cx = e.clientX; stick.cy = e.clientY;
    stickEl.classList.add('live'); placeStick(e.clientX, e.clientY);
    stick.cx = parseFloat(stickEl.style.left) + 62; stick.cy = parseFloat(stickEl.style.top) + 62;
  } else if (look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
  else return;
  try { tz.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
});
tz.addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) {
    const dx = e.clientX - stick.cx, dy = e.clientY - stick.cy, d = Math.hypot(dx, dy), k = d > STICK_R ? STICK_R / d : 1;
    stick.x = dx * k / STICK_R; stick.y = dy * k / STICK_R;
    const run = d > STICK_R * 1.4;
    if (run !== stick.run) { stick.run = run; stickEl.classList.toggle('run', run); }
    knob.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`;
  } else if (e.pointerId === look.id && G.state === 'play') {
    const dx = e.clientX - look.x, dy = e.clientY - look.y;
    look.x = e.clientX; look.y = e.clientY;
    const s = 0.0062 * settings.sens * (camera.fov / 75);
    P.yaw -= dx * s; P.pitch = clamp(P.pitch - dy * s * (settings.invert ? -1 : 1), -1.45, 1.45);
    input.mdx += dx * 1.4; input.mdy += dy * 1.4;
  }
});
const endTouch = (e) => { if (e.pointerId === stick.id) resetStick(); if (e.pointerId === look.id) look.id = null; };
tz.addEventListener('pointerup', endTouch);
tz.addEventListener('pointercancel', endTouch);
function holdBtn(id, down, up) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (G.state !== 'play') return;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    el.classList.add('down'); down();
  });
  const rel = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); if (up) up(); };
  el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel);
}
holdBtn('bAtk', () => { input.fire = true; input.firePressed = true; }, () => { input.fire = false; });
holdBtn('bJump', () => { input.jump = true; keys.Space = true; }, () => { keys.Space = false; });
holdBtn('bBlock', () => { input.alt = true; }, () => { input.alt = false; });
holdBtn('bCrouch', () => { P.crouch = !P.crouch; });
holdBtn('iSmoke', throwSmoke); holdBtn('iHeal', drinkPotion); holdBtn('iWhistle', whistle);
holdBtn('iBro', () => life.broCommand()); holdBtn('iView', () => toggleView());
for (let i = 0; i < 4; i++) holdBtn('slot' + i, () => switchWeapon(i));
$('pauseBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pause(true); });
$('obj').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); G.hintT = G.hintT > 0 ? 0 : 8; });
$('ctx').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const a = ctxActs[+b.dataset.i];
  if (a && G.state === 'play') a.act();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------------------------------------------------------------- main loop
let last = performance.now(), tensionT = 0, fpsT = 0, fpsN = 0, lowFps = 0, guardLodT = 0;
function logic(dt) {
  if (G.state === 'play') {
    G.stats.time += dt;
    updatePlayer(dt);
    computeVis(dt);
    updateWeapons(dt);
    for (const g of guards) updateGuard(g, dt);
    life.update(dt);
    updateShots(dt);
    updateObjectives();
  } else if (G.state === 'dead' || G.state === 'won') {
    G.endT += dt;
    for (const g of guards) updateGuard(g, dt);
    life.update(dt);
    updateShots(dt);
  }
  guardLodT -= dt;
  if (guardLodT <= 0) {
    guardLodT = 0.5;
    for (const g of guards) { const d = Math.hypot(g.pos.x - P.pos.x, g.pos.z - P.pos.z); setShadow(g.m, d < G.shadowDist + 2); g.m.root.visible = d < 160; }
  }
  updateParts(dt);
  input.firePressed = false;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.state === 'pause') return;
  G.t += dt;

  logic(dt);
  for (const c of W.chests) if (c.opened && c.openT < 1) { c.openT = Math.min(1, c.openT + dt * 3); c.lid.rotation.x = -ease(c.openT) * 1.9; }
  if (G.doorOpen && door.position.y < 4.85) door.position.y = Math.min(4.85, door.position.y + dt * 2.2);
  crown.rotation.y = G.t * 0.8; crown.position.y = W.crown.y + Math.sin(G.t * 1.7) * 0.05;
  keyMesh.rotation.y = G.t * 2;

  // camera
  if (G.state === 'menu') {
    const a = G.t * 0.035 + 1.9;
    camera.position.set(Math.sin(a) * 104, 30 + Math.sin(G.t * 0.1) * 4, Math.cos(a) * 104 + 12);
    camera.lookAt(0, 6, -14);
  } else if (G.view === 3) {
    thirdPersonCam(dt);
    const fov = 72 - P.draw * 10 - (P.weapon === 2 && input.alt ? 26 : 0) + (P.sprint ? 4 : 0);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 0.15); camera.updateProjectionMatrix(); }
  } else {
    const bobY = Math.abs(Math.sin(P.bob)) * 0.045 * P.moveAmt;
    let ey = P.eye + bobY, roll = P.roll;
    if (P.dead) { ey = lerp(P.eye, 0.35, ease(Math.min(1, G.endT / 0.9))); roll = ease(Math.min(1, G.endT / 0.9)) * 0.9; }
    camera.position.set(P.pos.x, P.pos.y + ey, P.pos.z);
    P.roll = lerp(P.roll, 0, 0.1);
    camera.rotation.set(P.pitch, P.yaw, roll);
    const fov = 75 - P.draw * 13 - (P.weapon === 2 && input.alt ? 30 : 0) + (P.sprint ? 5 : 0);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 0.15); camera.updateProjectionMatrix(); }
  }
  if (!settings.shake) G.shake = 0;
  if (G.shake > 0 && G.state !== 'menu') {
    const k = G.shake * 0.22;
    camera.position.x += rand(-k, k); camera.position.y += rand(-k, k); camera.position.z += rand(-k, k);
    G.shake = Math.max(0, G.shake - dt * 1.8);
  }
  updatePlayerModel(dt);
  W.update(G.t, dt, camera);
  nature.update(G.t, dt, camera, renderer, P.pos, W.rage);

  tensionT -= dt;
  if (tensionT <= 0) { tensionT = 0.4; sfx.setTension(G.state === 'play' && G.alertN ? 1 : 0); }
  if (G.state !== 'menu') { updateVM(dt); if (G.state === 'play') updateHUD(dt); }
  // sword trails: in the view model for first person, on the player's own blade in third person
  if (G.view === 1) {
    vmRoot.updateMatrixWorld(true);
    vmSword.localToWorld(_tb.set(0, 0.2, 0)); vmSword.localToWorld(_tt.set(0, 0.86, 0));
    fpTrail.update(_tb, _tt, swinging() && vmSword.visible, dt, P.swing && P.swing.heavy ? 1.3 : 0.9);
    tpTrail.update(_tb, _tt, false, dt);
  } else {
    pRig.root.updateMatrixWorld(true);
    pW[0].localToWorld(_tb.set(0, 0, 0.2)); pW[0].localToWorld(_tt.set(0, 0, 0.92));
    tpTrail.update(_tb, _tt, swinging() && pRig.root.visible, dt, P.swing && P.swing.heavy ? 1.3 : 0.9);
    fpTrail.update(_tb, _tt, false, dt);
  }

  post.render(dt, W.rage);
  if (G.view === 1 && (G.state === 'play' || G.state === 'dead')) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }

  // step the graphics down if the machine is struggling
  fpsT += dt; fpsN++;
  if (fpsT > 2) {
    const fps = fpsN / fpsT;
    if (settings.fps) $('fps').textContent = fps.toFixed(0) + ' FPS';
    if (G.state === 'play' && fps < 26 && !autoQ.done) {
      if (++lowFps >= 2) {
        lowFps = 0;
        const next = autoQ.q === 'high' ? 'medium' : autoQ.q === 'medium' ? 'low' : null;
        if (next) { autoQ.q = next; applyQuality(next); toast(`Graphics lowered to ${next} to keep things smooth. Change it in Settings.`, 'dim'); }
        else autoQ.done = true;
      }
    } else lowFps = 0;
    fpsT = 0; fpsN = 0;
  }
}
const autoQ = { q: settings.quality, done: false };

await loadStep(0.6, 'Charting the streets…');
buildNav();
buildChests();
await loadStep(0.72, 'Waking the townsfolk, the beasts and the gods…');
life = createLife({
  scene, W, P, G, actors, guards, camera, sfx,
  terrainHeight, groundAt, resolveXZ, los, findPath, makeNoise, hurtPlayer, hurtActor, damageArea, spawnShot, investigate, burst, volAt, toast, subtitle,
  onDeath: onLifeDeath,
  inNav: (x, z) => x >= OX && x < OX + NX && z >= OZ && z < OZ + NZ,
  freeNear: (x, z) => { const i = nearestFree(cellOf(x, z)); return i < 0 ? [x, z] : [OX + i % NX + 0.5, OZ + ((i / NX) | 0) + 0.5]; },
});
for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => toggleView(+b.dataset.view));
updateViewUI();

// ---------------------------------------------------------------- settings panel
function syncSettingsUI() {
  for (const b of document.querySelectorAll('[data-set="quality"] button')) b.setAttribute('aria-pressed', String(b.dataset.v === settings.quality));
  $('sSens').value = settings.sens; $('oSens').textContent = settings.sens.toFixed(2) + '×';
  $('sVol').value = settings.volume; $('oVol').textContent = Math.round(settings.volume * 100) + '%';
  $('sMus').value = settings.music; $('oMus').textContent = Math.round(settings.music * 100) + '%';
  $('sInv').checked = settings.invert; $('sShake').checked = settings.shake; $('sFps').checked = settings.fps;
  $('fps').hidden = !settings.fps;
  updateViewUI();
}
for (const b of document.querySelectorAll('[data-set="quality"] button')) b.addEventListener('click', () => {
  settings.quality = autoQ.q = b.dataset.v; autoQ.done = false;
  saveSettings(); applyQuality(); syncSettingsUI();
});
const bindRange = (id, key, after) => $(id).addEventListener('input', (e) => { settings[key] = +e.target.value; saveSettings(); if (after) after(); syncSettingsUI(); });
bindRange('sSens', 'sens'); bindRange('sVol', 'volume', applyAudio); bindRange('sMus', 'music', applyAudio);
const bindCheck = (id, key) => $(id).addEventListener('change', (e) => { settings[key] = e.target.checked; saveSettings(); syncSettingsUI(); });
bindCheck('sInv', 'invert'); bindCheck('sShake', 'shake'); bindCheck('sFps', 'fps');
function openSettings() { syncSettingsUI(); show('settings', true); $('setDone').focus(); }
$('menuSet').addEventListener('click', openSettings);
$('pauseSet').addEventListener('click', openSettings);
$('setDone').addEventListener('click', () => show('settings', false));
syncSettingsUI();
resetGame();
applyQuality();
applyAudio();
show('hud', false);
await loadStep(0.86, 'Forging shaders…');
renderer.compile(scene, camera);
post.render(0, 0);
await loadStep(1, 'Ready');
$('loading').classList.add('gone');
setTimeout(() => $('loading').remove(), 700);
show('menu', true);
window.__game = { G, P, W, actors, get life() { return life; }, toggleView, guards, shots, camera, renderer, startGame, findPath, blocked, C, keys, input, stick, logic, stealthTarget, setTouch: (v) => setTouch(v), pause, assassinate, navH, pickpocket, findInteract, los, alertGuard };
requestAnimationFrame(frame);
