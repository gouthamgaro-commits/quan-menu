// Every person, beast, demon and god is assembled here from rounded parts on a joint
// hierarchy (hips → spine → shoulders → elbows → hands, hips → knees → feet), then
// posed each frame. People stand, walk, run, sneak, nod and dance with Mixamo motion
// capture (mocap.js); fighting, aiming, climbing, sitting and dying are layered on top
// procedurally. All characters face +z in their own space.
import * as THREE from 'three';
import { MOCAP, N as MN, Q as MQ } from './mocap.js';
import { dressMixamo, attachMixamo, syncMixamo } from './mixamo.js';
export { loadMixamo, setDetail, hasMixamo } from './mixamo.js';

const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- motion capture
const MC = {};
for (const k in MOCAP) {
  const c = MOCAP[k], s = atob(c.d), d = new Float32Array(s.length >> 1);
  for (let i = 0; i < d.length; i++) d[i] = ((s.charCodeAt(i * 2) | (s.charCodeAt(i * 2 + 1) << 8)) << 16 >> 16) / MQ;
  MC[k] = { ...c, d };
}
// add w × (clip at u) into out; u is the fraction of the clip (it wraps when loop is set)
function addClip(out, c, u, w, loop) {
  if (!(w > 0)) return;
  const n = c.n;
  const f = loop ? (u - Math.floor(u)) * n : clamp(u, 0, 1) * (n - 1);
  const i0 = Math.min(n - 1, Math.floor(f)), i1 = loop ? (i0 + 1) % n : Math.min(n - 1, i0 + 1), k = f - Math.floor(f);
  const d = c.d, a = i0 * MN, b = i1 * MN;
  for (let j = 0; j < MN; j++) out[j] += w * (d[a + j] + (d[b + j] - d[a + j]) * k);
}
// the height of the lower foot's sole above the ground, for a pose v in poseHumanoid's layout
const fkQ = new THREE.Quaternion(), fkQ2 = new THREE.Quaternion(), fkE = new THREE.Euler(), fkV = new THREE.Vector3(), fkK = new THREE.Vector3(), fkH = new THREE.Quaternion();
const SOLE = [[0, -0.49, 0.04], [0, -0.49, 0.15], [0, -0.49, -0.07]];
function lowFoot(v, baseHip) {
  fkH.setFromEuler(fkE.set(v[24], v[25], v[26], 'YXZ'));
  let low = 1e9;
  for (let s = 0; s < 2; s++) {
    const side = s ? -1 : 1, tx = v[s], kn = v[2 + s], tz = v[22 + s], ty = v[28 + s];
    fkK.set(side * 0.095, -0.03, 0).applyQuaternion(fkH);
    const hy = fkK.y;
    fkQ.copy(fkH).multiply(fkQ2.setFromEuler(fkE.set(tx, ty, tz, 'XYZ')));
    const ky = hy + fkV.set(0, -0.44, 0).applyQuaternion(fkQ).y;
    fkQ.multiply(fkQ2.setFromEuler(fkE.set(kn, 0, 0, 'XYZ')));
    for (const p of SOLE) low = Math.min(low, ky + fkV.set(p[0], p[1], p[2]).applyQuaternion(fkQ).y);
  }
  return v[4] + low;
}
// two gaits: townsfolk (Mixamo's X Bot) and soldiers (Mixamo's Soldier), chosen with makeHumanoid's gait option
const GAITS = { town: { idle: MC.idle, walk: MC.walk, run: MC.run }, soldier: { idle: MC.idleS, walk: MC.walkS, run: MC.runS } };
export const GESTURES = { agree: MC.agree.dur, shake: MC.shake.dur };
export const DANCE_LEN = MC.dance.dur;

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) {
    const { basic, ...rest } = o;
    m = basic ? new THREE.MeshBasicMaterial({ color, ...rest }) : new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...rest });
    matCache.set(key, m);
  }
  return m;
}
const geoCache = new Map();
const geo = (key, make) => { let g = geoCache.get(key); if (!g) geoCache.set(key, g = make()); return g; };
const capsule = (r, len) => geo(`c${r.toFixed(3)},${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, len, 4, 10));
const sphere = () => geo('s', () => new THREE.SphereGeometry(1, 16, 12));
const lowSphere = () => geo('s2', () => new THREE.SphereGeometry(1, 8, 6));
const box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));
const cone = (seg = 10) => geo('k' + seg, () => new THREE.ConeGeometry(1, 1, seg));
const skirt = () => geo('sk', () => new THREE.CylinderGeometry(0.55, 1, 1, 16));
const cyl = (seg = 12) => geo('y' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
const ring = () => geo('r', () => new THREE.TorusGeometry(1, 0.12, 8, 28));
const arc = () => geo('a', () => new THREE.TorusGeometry(1, 0.035, 6, 20, Math.PI * 0.85));
const tri = () => geo('tri', () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0.15, 0, 0.75, -0.55, 0, 0, 0, 0, 0.75, -0.55, 0, 0.35, -0.75, 0, 0, 0, 0, 0.35, -0.75, 0, 0, -0.5, 0]), 3));
  g.computeVertexNormals();
  return g;
});

function mesh(parent, g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  o.castShadow = shadow; o.userData.cs = shadow;
  parent.add(o);
  return o;
}
function joint(parent, x = 0, y = 0, z = 0) { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); return j; }

export function setShadow(rig, on) {
  if (rig.shadowOn === on) return;
  rig.shadowOn = on;
  rig.root.traverse((o) => { if (o.isMesh) o.castShadow = on && !!o.userData.cs; });
}

// ---------------------------------------------------------------- held things
export function makeProp(kind, o = {}) {
  const F = o.fog === false ? { fog: false } : {};
  const g = new THREE.Group();
  const steel = mat(0xc3cad5, { metalness: 0.6, roughness: 0.35, ...F }), wood = mat(0x6b4a2b, F), dark = mat(0x2c221b, F), gold = mat(0xd9a33a, { metalness: 0.7, roughness: 0.4, ...F });
  switch (kind) {
    case 'sword':
      mesh(g, box(), steel, 0, 0, 0.5, 0.055, 0.016, 0.82);
      mesh(g, box(), gold, 0, 0, 0.07, 0.24, 0.035, 0.05);
      mesh(g, box(), dark, 0, 0, -0.04, 0.035, 0.035, 0.16);
      break;
    case 'greatsword': {
      const fire = mat(0xff6a20, { emissive: 0xff4a10, emissiveIntensity: 2.2, ...F });
      mesh(g, box(), o.flame ? fire : steel, 0, 0, 0.8, 0.09, 0.025, 1.35);
      mesh(g, box(), o.flame ? mat(0x1a0a08, F) : gold, 0, 0, 0.09, 0.36, 0.05, 0.07);
      mesh(g, box(), dark, 0, 0, -0.08, 0.045, 0.045, 0.28);
      break;
    }
    case 'axe':
      mesh(g, cyl(6), wood, 0, 0, 0.32, 0.025, 0.85, 0.025).rotation.x = Math.PI / 2;
      mesh(g, box(), steel, 0, 0.11, 0.66, 0.025, 0.24, 0.18);
      break;
    case 'club':
      mesh(g, cone(8), wood, 0, 0, 0.6, 0.13, 1.25, 0.13).rotation.x = -Math.PI / 2;
      break;
    case 'staff':
      mesh(g, cyl(6), wood, 0, 0, 0.2, 0.025, 2.1, 0.025).rotation.x = Math.PI / 2;
      break;
    case 'shield': {
      const s = mesh(g, cyl(16), o.color ? mat(o.color, F) : wood, 0, 0, 0, 0.3, 0.05, 0.3);
      s.rotation.z = Math.PI / 2;
      mesh(g, lowSphere(), steel, 0.04, 0, 0, 0.06);
      break;
    }
    case 'bow': {
      const a = mesh(g, arc(), wood, 0, 0, 0, 0.62);
      a.rotation.set(0, Math.PI / 2, Math.PI * 0.575);
      break;
    }
    case 'crossbow':
      mesh(g, box(), wood, 0, 0, 0.18, 0.06, 0.07, 0.6);
      mesh(g, box(), dark, 0, 0.03, 0.45, 0.62, 0.03, 0.045);
      break;
    case 'knife':
      mesh(g, box(), steel, 0, 0, 0.16, 0.035, 0.01, 0.22);
      mesh(g, box(), dark, 0, 0, 0, 0.03, 0.03, 0.1);
      break;
    case 'lute':
      mesh(g, sphere(), wood, 0, 0, 0, 0.15, 0.06, 0.2);
      mesh(g, box(), dark, 0, 0, 0.28, 0.04, 0.025, 0.36);
      break;
    case 'lantern': {
      mesh(g, box(), dark, 0, -0.12, 0, 0.12, 0.16, 0.12);
      mesh(g, box(), mat(0xffc070, { basic: true, ...F }), 0, -0.12, 0, 0.08, 0.11, 0.08, 1, 1, false);
      break;
    }
    case 'pole':
      mesh(g, cyl(6), wood, 0, 0.3, 0.1, 0.02, 2.2, 0.02).rotation.x = 0.25;
      break;
  }
  return g;
}

// ---------------------------------------------------------------- people and things shaped like them
// o: skin, top, pants, boots, armor ('mail' | 'plate'), tabard, apron, dress ('short' | 'long'), cape,
//    head ('hair' | 'bald' | 'hood' | 'helm' | 'kettle' | 'hat' | 'crown' | 'skull'), hair, beard, horns,
//    tusks, nose, wings, tail, glowEyes, bone, build, limb, fog, ghost
export function makeHumanoid(o = {}) {
  const F = o.fog === false ? { fog: false } : {};
  const M = (c, extra = {}) => (o.ghost ? o.ghost : mat(c, { ...F, ...extra }));
  const skinExtra = o.skinEmissive ? { emissive: o.skinEmissive, emissiveIntensity: 1 } : {};
  const bone = o.bone ? M(0xd8d0bb) : null;
  const skin = bone || M(o.skin ?? 0xc79a78, skinExtra);
  const top = o.top === 'skin' ? skin : bone || M(o.top ?? 0x5a4632);
  const pants = o.pants === 'skin' ? skin : bone || M(o.pants ?? 0x3a3027);
  const boots = o.boots === 'skin' ? skin : M(o.boots ?? 0x2a1d14);
  const armor = o.armor === 'mail' ? M(0x7a808b, { metalness: 0.5, roughness: 0.5 }) : o.armor === 'plate' ? M(o.armorColor ?? 0xaab2bf, { metalness: 0.75, roughness: 0.35 }) : null;
  const b = o.build ?? 1, lr = (o.limb ?? 1) * (o.bone ? 0.55 : 1);
  const sh = o.shadow !== false;

  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const hips = joint(root, 0, 0.95, 0);
  hips.rotation.order = 'YXZ';
  const rig = { root, hips, o, baseHip: 0.95, props: {}, seed: Math.random() * 10 };
  const body = (m) => { m.userData.body = true; return m; };
  body(mesh(hips, sphere(), pants, 0, 0, 0, 0.17 * b, 0.12, 0.12, 1, 1, sh));

  const leg = (side) => {
    const h = joint(hips, side * 0.095 * b, -0.03, 0);
    body(mesh(h, capsule(0.075 * lr * Math.sqrt(b), 0.3), pants, 0, -0.22, 0, 1, 1, 1, sh));
    const k = joint(h, 0, -0.44, 0);
    body(mesh(k, capsule(0.06 * lr * Math.sqrt(b), 0.32), o.tallBoots ? boots : pants, 0, -0.21, 0, 1, 1, 1, sh));
    body(mesh(k, box(), boots, 0, -0.455, 0.04, 0.1 * Math.sqrt(b), 0.07, 0.22, false));
    return { h, k };
  };
  rig.legL = leg(1); rig.legR = leg(-1);

  const spine = rig.spine = joint(hips, 0, 0.04, 0);
  if (o.bone) {
    mesh(spine, capsule(0.03, 0.42), bone, 0, 0.27, -0.06);
    for (let i = 0; i < 3; i++) mesh(spine, ring(), bone, 0, 0.2 + i * 0.1, 0, 0.13 - i * 0.004, 0.1, 0.09).rotation.x = Math.PI / 2;
  } else {
    body(mesh(spine, capsule(0.15, 0.24), armor || top, 0, 0.27, 0, 1.18 * b, 1, 0.78 * Math.sqrt(b), 1, 1, sh));
    body(mesh(spine, cyl(14), M(o.belt ?? 0x2c1f16), 0, 0.06, 0, 0.18 * b, 0.06, 0.135 * Math.sqrt(b), 1, 1, false));
  }
  if (o.tabard) {
    const t = M(o.tabard);
    mesh(spine, box(), t, 0, 0.2, 0.118 * Math.sqrt(b), 0.27 * b, 0.6, 0.025, 1, 1, false).userData.acc = 'tabard';
    mesh(spine, box(), t, 0, 0.2, -0.118 * Math.sqrt(b), 0.27 * b, 0.6, 0.025, 1, 1, false).userData.acc = 'tabard';
  }
  if (o.apron) mesh(spine, box(), M(o.apron), 0, 0.02, 0.12 * Math.sqrt(b), 0.26 * b, 0.55, 0.02, 1, 1, false).userData.acc = 'apron';
  if (o.dress) {
    const len = o.dress === 'long' ? 0.95 : 0.55;
    mesh(hips, skirt(), M(o.dressColor ?? o.top ?? 0x6a3a4a), 0, 0.08 - len / 2, 0, 0.24 * b, len, 0.2 * b, 1, 1, sh);
  }
  if (o.cape) {
    const c = rig.cape = joint(spine, 0, 0.5, -0.12 * Math.sqrt(b));
    mesh(c, box(), M(o.cape), 0, -0.48, -0.02, 0.44 * b, 0.95, 0.025, 1, 1, sh);
  }
  if (o.wings) {
    const wm = M(o.wings, { side: THREE.DoubleSide });
    rig.wings = [1, -1].map((s) => {
      const w = joint(spine, s * 0.08, 0.42, -0.12);
      const p = mesh(w, tri(), wm, 0, 0, 0, s * 0.75, 0.75, 0.75, 1, 1, false);
      p.rotation.y = s * -0.15;
      return w;
    });
  }
  if (o.tail) {
    const t = rig.tail = joint(hips, 0, -0.02, -0.12);
    const seg = mesh(t, capsule(0.03, 0.42), M(o.tail), 0, -0.1, -0.22, 1, 1, 1, false);
    seg.rotation.x = -1.1;
    mesh(t, cone(4), M(o.tail), 0, -0.32, -0.42, 0.06, 0.12, 0.03, 1, 1, false).rotation.x = -2.2;
  }

  // head
  const neck = rig.neck = joint(spine, 0, 0.53, 0);
  const head = rig.head = joint(neck, 0, 0.06, 0);
  if (o.bone || o.head === 'skull') {
    mesh(head, sphere(), bone || skin, 0, 0.12, 0, 0.1, 0.115, 0.11);
    mesh(head, box(), bone || skin, 0, 0.03, 0.04, 0.12, 0.05, 0.1);
  } else {
    body(mesh(head, sphere(), skin, 0, 0.11, 0, 0.105, 0.125, 0.115, 1, 1, sh));
    body(mesh(head, box(), skin, 0, 0.1, 0.11, 0.03, o.nose === 'big' ? 0.07 : 0.045, o.nose === 'big' ? 0.09 : 0.04, 1, 1, false));
  }
  if (o.glowEyes) {
    const ge = mat(o.glowEyes, { basic: true, ...F });
    for (const s of [1, -1]) mesh(head, lowSphere(), ge, s * 0.042, 0.13, 0.095, 0.022, 0.016, 0.012, 1, 1, false);
  }
  const hc = o.hair ?? 0x3b2a1c;
  switch (o.head) {
    case 'hair': mesh(head, sphere(), M(hc), 0, 0.15, -0.012, 0.112, 0.1, 0.12, 1, 1, false); break;
    case 'long': mesh(head, sphere(), M(hc), 0, 0.14, -0.02, 0.115, 0.11, 0.125, 1, 1, false); mesh(head, capsule(0.09, 0.3), M(hc), 0, -0.05, -0.08, 1, 1, 0.6, 1, 1, false); break;
    case 'hood': {
      const hm = M(o.hood ?? 0x232838);
      mesh(head, sphere(), hm, 0, 0.125, -0.02, 0.135, 0.15, 0.14, 1, 1, sh);
      mesh(head, cone(8), hm, 0, 0.21, -0.07, 0.07, 0.14, 0.07, 1, 1, false).rotation.x = -0.6;
      break;
    }
    case 'helm': {
      const st = M(0x9aa3ae, { metalness: 0.7, roughness: 0.35 });
      mesh(head, sphere(), st, 0, 0.16, -0.005, 0.125, 0.11, 0.13, 1, 1, sh);
      mesh(head, box(), st, 0, 0.1, 0.122, 0.025, 0.1, 0.02, 1, 1, false);
      break;
    }
    case 'kettle': {
      const st = M(0x8a929c, { metalness: 0.7, roughness: 0.35 });
      mesh(head, cyl(14), st, 0, 0.19, 0, 0.21, 0.02, 0.21, 1, 1, sh);
      mesh(head, sphere(), st, 0, 0.19, 0, 0.12, 0.1, 0.12, 1, 1, false);
      break;
    }
    case 'hat': {
      const hm = M(o.hatColor ?? 0x2a2420);
      mesh(head, cyl(14), hm, 0, 0.2, 0, 0.19, 0.02, 0.19, 1, 1, sh);
      mesh(head, cyl(12), hm, 0, 0.27, 0, 0.11, 0.13, 0.11, 1, 1, false);
      break;
    }
    case 'crown': {
      mesh(head, sphere(), M(hc), 0, 0.15, -0.012, 0.112, 0.1, 0.12, 1, 1, false);
      const gm = M(0xe0b040, { metalness: 0.9, roughness: 0.3 });
      mesh(head, cyl(12), gm, 0, 0.215, 0, 0.115, 0.035, 0.115, 1, 1, false).userData.acc = 'crown';
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(head, cone(4), gm, Math.sin(a) * 0.11, 0.26, Math.cos(a) * 0.11, 0.025, 0.07, 0.025, 1, 1, false).userData.acc = 'crown'; }
      break;
    }
    case 'flame': {
      const fm = mat(0xffa040, { basic: true, ...F });
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(head, cone(4), fm, Math.sin(a) * 0.1, 0.27, Math.cos(a) * 0.1, 0.03, 0.14 + (i % 2) * 0.08, 0.03, 1, 1, false); }
      break;
    }
    case 'halo': {
      mesh(head, sphere(), M(hc), 0, 0.14, -0.02, 0.115, 0.11, 0.125, 1, 1, false);
      mesh(head, capsule(0.09, 0.45), M(hc), 0, -0.12, -0.08, 1, 1, 0.6, 1, 1, false);
      mesh(head, ring(), o.ghost || mat(0xcfe4ff, { basic: true, ...F }), 0, 0.33, -0.06, 0.16, 0.16, 0.16, 1, 1, false).rotation.x = Math.PI / 2 - 0.3;
      break;
    }
  }
  if (o.beard) mesh(head, sphere(), M(o.beard), 0, 0.04, 0.075, 0.085, 0.09, 0.06, 1, 1, false);
  if (o.horns) {
    const hm = M(o.horns);
    for (const s of [1, -1]) {
      const h = mesh(head, cone(6), hm, s * 0.085, 0.24, 0.0, 0.035 * (o.hornSize ?? 1), 0.2 * (o.hornSize ?? 1), 0.035 * (o.hornSize ?? 1), 1, 1, false);
      h.rotation.set(-0.35, 0, -s * 0.55);
    }
  }
  if (o.tusks) for (const s of [1, -1]) mesh(head, cone(4), M(0xeee6cc), s * 0.035, 0.03, 0.105, 0.012, 0.05, 0.012, 1, 1, false);

  // arms; the right arm is on -x when facing +z
  const sleeve = armor || top, forearm = o.bareArms ? skin : sleeve;
  const arm = (side) => {
    const s = joint(spine, side * 0.215 * b, 0.47, 0);
    if (o.armor === 'plate') mesh(s, sphere(), armor, side * 0.02, 0.02, 0, 0.1 * b, 0.07, 0.1, 1, 1, false).userData.acc = 'pad';
    body(mesh(s, capsule(0.055 * lr * Math.sqrt(b), 0.22), sleeve, 0, -0.15, 0, 1, 1, 1, sh));
    const e = joint(s, 0, -0.3, 0);
    body(mesh(e, capsule(0.047 * lr * Math.sqrt(b), 0.2), forearm, 0, -0.13, 0, 1, 1, 1, sh));
    const hand = joint(e, 0, -0.28, 0);
    body(mesh(hand, sphere(), o.gloves ? M(o.gloves) : skin, 0, 0, 0, 0.05 * Math.sqrt(b), 0.055, 0.045, 1, 1, false));
    return { s, e, hand };
  };
  rig.armL = arm(1); rig.armR = arm(-1);
  if (o.scale) root.scale.setScalar(o.scale);
  if (o.mixamo) {
    const c = (v, d) => (v === 'skin' ? o.skin ?? 0xc79a78 : v ?? d);
    dressMixamo(rig, o.mixamo, { top: c(o.top, 0x5a4632), pants: c(o.pants, 0x3a3027), tint: o.tint });
  }
  return rig;
}

export function hold(rig, hand, kind, o) {
  const p = makeProp(kind, { fog: rig.o.fog, ...o });
  const h = hand === 'L' ? rig.armL.hand : rig.armR.hand;
  if (kind === 'shield') { p.position.set(0.06, 0.12, 0); rig.armL.e.add(p); }
  else if (kind === 'bow') { p.position.set(0, 0, 0.02); p.rotation.x = -1.4; h.add(p); }
  else if (kind === 'lantern') { p.position.set(0, -0.04, 0.02); h.add(p); }
  else { p.rotation.x = -0.25; h.add(p); }
  if (rig.mix) attachMixamo(rig, p.parent, p);
  rig.props[kind] = p;
  return p;
}

// p: phase, move (0 still, 1 walk, 2 run), pm (phase per metre, so steps match the ground), crouch, sit, air,
//    climb, atk (0..1 or <0), style, block, aim, draw, xbow, cower, talk, lute, lantern, drunk, fly, kneel, look,
//    nod, lean, hit (0..1 flinch), land (0..1 dip), bank (lean into a turn), dead (0..1), deadDir (1 falls back,
//    -1 falls forward), gesture ('agree' or 'shake'), gT (seconds into it), sad (0..1), dance (seconds), danceW,
//    ready (0..1, soldiers' combat stance), t, dt
// The motion-capture base comes first, then the procedural layers, then each joint eases toward its target,
// so moves blend into one another.
const J = 30;
const UPPER = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25, 26];
const LEGS = [0, 1, 2, 3, 22, 23, 24, 25, 26, 28, 29];
const tmp = new Float32Array(MN);
export function poseHumanoid(rig, p) {
  const t = p.t || 0, ph = p.phase || 0, mv = p.move || 0, dt = p.dt || 0;
  const cr = Math.min(1, (p.crouch || 0) + (p.land || 0) * 0.45), sit = p.sit || 0, kneel = p.kneel || 0, air = p.air || 0;
  const hit = p.hit || 0, dd = p.dead || 0, dir = p.deadDir || 1;
  const T = rig.T || (rig.T = new Float32Array(J));

  // ---- motion capture: idle, walk and run, with the stride locked to the distance actually covered
  const B = rig.B || (rig.B = new Float32Array(MN));
  B.fill(0);
  // layer weights ease, so the captured motion itself never needs smoothing
  const kw = dt ? 1 - Math.exp(-9 * dt) : 1;
  const W = rig.W || (rig.W = { m: clamp(mv, 0, 1), r: clamp(mv - 1, 0, 1), c: cr, sad: 0, dance: 0, rd: p.ready || 0 });
  W.m += (clamp(mv, 0, 1) - W.m) * kw; W.r += (clamp(mv - 1, 0, 1) - W.r) * kw;
  W.c += (cr - W.c) * kw; W.sad += ((p.sad || 0) - W.sad) * kw * 0.5; W.dance += ((p.danceW || 0) - W.dance) * kw * 0.5;
  const wm = W.m, wr = W.r;
  const dist = ph / (p.pm || 4.2);
  let step = rig.lastDist === undefined ? 0 : dist - rig.lastDist;
  rig.lastDist = dist;
  if (Math.abs(step) > 3) step = 0;
  const G = GAITS[rig.o.gait] || GAITS.town;
  const stride = lerp(G.walk.stride, G.run.stride, wr) * (rig.o.scale || 1) * (rig.o.stride || 1);
  rig.u = (rig.u || 0) + step / stride;
  // soldiers stand easy until something is up, then drop into their ready stance
  const rd = G === GAITS.town ? 0 : (W.rd += ((p.ready || 0) - W.rd) * kw * 0.6);
  addClip(B, GAITS.town.idle, (t + rig.seed) / GAITS.town.idle.dur, (1 - wm) * (1 - rd), true);
  addClip(B, G.idle, (t + rig.seed) / G.idle.dur, (1 - wm) * rd, true);
  addClip(B, G.walk, rig.u, wm * (1 - wr), true);
  addClip(B, G.run, rig.u, wm * wr, true);
  if (W.dance > 0.001) {
    tmp.fill(0); addClip(tmp, MC.dance, (p.dance || 0) / MC.dance.dur, 1, true);
    for (let j = 0; j < MN; j++) B[j] = lerp(B[j], tmp[j], W.dance);
  }
  // sneaking and slumping are offsets on the upper body; the legs crouch procedurally below
  for (const j of UPPER) B[j] += MC.sneak.d[j] * W.c + MC.sad.d[j] * W.sad;
  if (p.gesture) {
    const g = MC[p.gesture === 'shake' ? 'shake' : 'agree'], u = (p.gT || 0) / g.dur;
    addClip(B, g, u, clamp(Math.min(u, 1 - u) * 8, 0, 1), false);
  }

  // ---- legs
  let tl = B[0] - cr * 0.95, tr = B[1] - cr * 0.95;
  let kl = B[2] * (1 - cr * 0.35) + cr * 1.55, kr = B[3] * (1 - cr * 0.35) + cr * 1.55;
  if (air) { tl = lerp(tl, -0.9, air); tr = lerp(tr, -0.3, air); kl = lerp(kl, 1.4, air); kr = lerp(kr, 0.9, air); }
  if (sit) { tl = lerp(tl, -1.45, sit); tr = lerp(tr, -1.35, sit); kl = lerp(kl, 0.35, sit); kr = lerp(kr, 0.6, sit); }
  if (kneel) { tl = lerp(tl, -1.5, kneel); tr = lerp(tr, 0.1, kneel); kl = lerp(kl, 1.6, kneel); kr = lerp(kr, 1.7, kneel); }
  if (p.fly) { tl = 0.35 + Math.sin(t * 3) * 0.1; tr = 0.25 - Math.sin(t * 3) * 0.1; kl = kr = 0.5; }
  // a dying body's knees buckle before it falls
  const buckle = dd ? Math.sin(Math.min(1, dd / 0.55) * Math.PI) * (1 - dd) : 0;
  kl += buckle * 1.2; kr += buckle * 1.0; tl -= buckle * 0.6; tr -= buckle * 0.5;
  if (dd) { const k = ease(clamp((dd - 0.3) / 0.7, 0, 1)); tl *= 1 - k; tr *= 1 - k; kl = lerp(kl, 0.15, k); kr = lerp(kr, 0.35, k); }
  // poses that take the legs over damp the captured hip sway and thigh twist
  const held = clamp(sit + kneel + air + (p.fly ? 1 : 0) + (p.climb || 0) + dd, 0, 1), free = 1 - held;
  T[0] = tl; T[1] = tr; T[2] = kl; T[3] = kr;
  T[22] = lerp(0.04, B[22], free); T[23] = lerp(-0.04, B[23], free);
  T[28] = B[28] * free; T[29] = B[29] * free;
  T[4] = rig.baseHip + B[4] * free - sit * 0.82 - kneel * 0.42 + air * 0.05 - buckle * 0.25;
  T[20] = B[20] * free; T[27] = B[27] * free;
  T[24] = B[24] * free; T[25] = B[25] * free; T[26] = B[26] * free;

  // ---- spine
  let lean = B[5] + (p.lean || 0) + sit * 0.1 + kneel * 0.25 - hit * 0.35;
  let twist = B[6], roll = B[7];
  if (p.drunk) { roll += Math.sin(t * 1.3) * 0.12; lean += Math.sin(t * 0.9) * 0.08; }

  // ---- arms: as captured, then overridden by whatever the hands are doing
  let ls = [B[8], B[9], B[10]], rs = [B[12], B[13], B[14]], le = B[11], re = B[15];
  const rs0 = rs.slice(), re0 = re;
  if (p.fly) { ls = [-0.3, 0, 0.4]; rs = [-0.3, 0, -0.4]; le = re = -0.8; }
  if (p.talk) { const g = Math.sin(t * 2.6) * 0.35 * p.talk; rs = [-0.55 - g, 0, -0.25]; re = -0.9 - g * 0.5; ls[2] = 0.2; }
  if (p.lantern) { ls = [-0.65, 0, 0.12]; le = -0.95; }
  if (p.lute) { ls = [-0.95, 0.2, 0.35]; le = -1.35; rs = [-0.65 + Math.sin(t * 9) * 0.06, 0, -0.35]; re = -1.45; }
  if (p.cower) { const c = p.cower; ls = [lerp(ls[0], -2.5, c), lerp(ls[1], 0, c), lerp(ls[2], 0.55, c)]; rs = [lerp(rs[0], -2.5, c), lerp(rs[1], 0, c), lerp(rs[2], -0.55, c)]; le = lerp(le, -1.7, c); re = lerp(re, -1.7, c); }
  if (p.climb) { const c = p.climb; ls = [lerp(ls[0], -2.8, c), lerp(ls[1], 0, c), lerp(ls[2], 0.15, c)]; rs = [lerp(rs[0], -2.8, c), lerp(rs[1], 0, c), lerp(rs[2], -0.15, c)]; le = lerp(le, -0.4, c); re = lerp(re, -0.4, c); }
  if (air && !p.climb) { ls[2] += air * 0.5; rs[2] -= air * 0.5; ls[0] -= air * 0.4; rs[0] -= air * 0.4; }
  if (sit) { ls = [-0.5, 0, 0.15]; rs = [-0.5, 0, -0.15]; le = re = -0.9; }
  if (kneel) { ls = [-0.2, 0, 0.1]; rs = [-0.2, 0, -0.1]; le = re = -0.6; }
  if (p.block) { const k = p.block; rs = [lerp(rs[0], -1.25, k), lerp(rs[1], 0, k), lerp(rs[2], 0.55, k)]; re = lerp(re, -1.3, k); ls = [lerp(ls[0], -1.1, k), lerp(ls[1], 0, k), lerp(ls[2], 0.2, k)]; le = lerp(le, -1.2, k); }
  if (p.aim) {
    const k = p.aim, d = p.draw || 0;
    ls = [lerp(ls[0], -1.55, k), lerp(ls[1], 0, k), lerp(ls[2], 0.1, k)]; le = lerp(le, -0.05, k);
    rs = [lerp(rs[0], -1.6, k), lerp(rs[1], 0, k), lerp(rs[2], -0.25 + d * 0.35, k)]; re = lerp(re, -(0.9 + d * 1.9), k);
    twist += 0.25 * k;
  }
  if (p.xbow) { ls = [-1.35, 0, 0.45]; le = -0.65; rs = [-1.2, 0, -0.15]; re = -1.0; }
  const attacking = p.atk >= 0;
  if (attacking) {
    const u = p.atk, st = p.style || 'slash';
    const w = clamp(u / 0.42, 0, 1), s = clamp((u - 0.42) / 0.2, 0, 1), r = clamp((u - 0.62) / 0.38, 0, 1);
    const ew = ease(w), es = ease(s), er = ease(r), ry = rs[1] * Math.max(1 - ew, er);
    if (st === 'slash' || st === 'slashL') {
      const d = st === 'slash' ? 1 : -1;
      const A = [-2.4, 0, -0.75 * d], B = [-0.55, 0, 0.75 * d];
      const x = lerp(lerp(rs[0], A[0], ew), B[0], es), z = lerp(lerp(rs[2], A[2], ew), B[2], es);
      rs = [lerp(x, rs[0], er), ry, lerp(z, rs[2], er)];
      re = lerp(lerp(lerp(re, -1.1, ew), -0.15, es), re, er);
      twist += (0.45 * ew - 0.9 * es) * (1 - er) * d;
      roll += 0.08 * (ew - es) * (1 - er) * d;
    } else if (st === 'overhead' || st === 'slam') {
      const x = lerp(lerp(rs[0], -2.9, ew), -0.4, es);
      rs = [lerp(x, rs[0], er), ry, rs[2]];
      re = lerp(lerp(lerp(re, -0.9, ew), -0.1, es), re, er);
      if (st === 'slam') { ls = [lerp(x, ls[0], er), ls[1] * Math.max(1 - ew, er), ls[2]]; le = re; }
      lean += (-0.18 * ew + 0.45 * es) * (1 - er);
    } else if (st === 'thrust' || st === 'stab') {
      rs = [lerp(lerp(rs[0], -1.2, ew), -1.55, es), ry, lerp(-0.1, rs0[2], er)]; re = lerp(lerp(re, -1.9, ew), -0.05, es);
      rs[0] = lerp(rs[0], rs0[0], er); re = lerp(re, re0, er);
      lean += 0.2 * es * (1 - er);
    } else if (st === 'cast') {
      rs = [lerp(lerp(rs[0], -2.7, ew), -1.3, es), ry, lerp(-0.2, rs0[2], er)]; re = lerp(lerp(re, -1.2, ew), -0.1, es);
      rs[0] = lerp(rs[0], rs0[0], er); re = lerp(re, re0, er);
      twist += (0.3 * ew - 0.5 * es) * (1 - er);
    } else if (st === 'claw') {
      const x = lerp(lerp(rs[0], -2.2, ew), -0.6, es);
      rs = [lerp(x, rs[0], er), ry, -0.3]; ls = [lerp(lerp(lerp(ls[0], -2.2, ew), -0.6, es), ls[0], er), ls[1] * Math.max(1 - ew, er), 0.3];
      re = le = -0.4; lean += 0.3 * es * (1 - er);
    }
  }
  if (hit) { ls[2] += hit * 0.5; rs[2] -= hit * 0.5; ls[0] += hit * 0.4; rs[0] += hit * 0.4; }
  if (dd) {
    const k = ease(clamp((dd - 0.25) / 0.75, 0, 1));
    const fx = dir > 0 ? -2.3 : -2.6;
    ls = [lerp(ls[0], fx, k), lerp(ls[1], 0, k), lerp(ls[2], 0.6, k)]; rs = [lerp(rs[0], dir > 0 ? -1.2 : -2.4, k), lerp(rs[1], 0, k), lerp(rs[2], -0.5, k)];
    le = lerp(le, -0.5, k); re = lerp(re, -0.8, k);
    lean = lerp(lean, dir > 0 ? -0.2 : 0.3, k);
  }
  T[5] = lean; T[6] = twist; T[7] = roll;
  T[8] = ls[0]; T[9] = ls[1]; T[10] = ls[2]; T[11] = le;
  T[12] = rs[0]; T[13] = rs[1]; T[14] = rs[2]; T[15] = re;
  T[16] = B[16] + (p.nod || 0) + sit * 0.2 - kneel * 0.15 - hit * 0.3 + (dd ? dir * 0.4 * dd : 0);
  T[17] = B[17] + (p.look || 0);
  T[18] = B[18] + (p.drunk ? Math.sin(t * 1.1) * 0.15 : 0);
  T[19] = -dir * ease(clamp((dd - 0.25) / 0.75, 0, 1)) * 1.45;
  T[21] = p.bank || 0;

  // The captured motion plays as it is; only the procedural difference from it eases, so moves blend into
  // one another without dulling the capture. Attacks and deaths move faster than everyday motion.
  B[4] += rig.baseHip; B[19] = B[21] = 0;
  const C = rig.C;
  if (!C || !dt) { rig.C = Float32Array.from(T, (x, i) => x - B[i]); }
  else {
    const kq = 1 - Math.exp(-(attacking || hit > 0.5 ? 34 : 15) * dt), kl2 = 1 - Math.exp(-24 * dt);
    for (let i = 0; i < J; i++) C[i] += (T[i] - B[i] - C[i]) * (i <= 4 || i >= 22 && i !== 24 && i !== 25 && i !== 26 ? kl2 : kq);
  }
  const V = rig.V || (rig.V = new Float32Array(J));
  for (let i = 0; i < J; i++) V[i] = B[i] + rig.C[i];
  // keep the feet on the ground: whatever the procedural layers did to the legs (crouching, landing),
  // move the hips so the lower foot sits where the capture had it
  if (free > 0.01) {
    let off = 0;
    for (const i of LEGS) off = Math.max(off, Math.abs(rig.C[i]));
    if (off > 0.01) V[4] += (lowFoot(B, rig.baseHip) - lowFoot(V, rig.baseHip)) * free;
  }
  const { legL, legR, armL, armR, spine, neck, hips } = rig;
  legL.h.rotation.set(V[0], V[28], V[22]); legR.h.rotation.set(V[1], V[29], V[23]);
  legL.k.rotation.x = V[2]; legR.k.rotation.x = V[3];
  hips.position.set(V[20], V[4], V[27]);
  hips.rotation.set(V[24], V[25], V[26]);
  spine.rotation.set(V[5], V[6], V[7]);
  armL.s.rotation.set(V[8], V[9], V[10]); armL.e.rotation.set(V[11], 0, 0);
  armR.s.rotation.set(V[12], V[13], V[14]); armR.e.rotation.set(V[15], 0, 0);
  neck.rotation.set(V[16], V[17], V[18]);
  rig.root.rotation.x = V[19];
  rig.root.rotation.z = V[21];
  syncMixamo(rig);

  if (rig.cape) {
    // a cape on a spring: it trails behind when running and swings back when you stop
    const target = 0.06 + Math.min(1.6, mv) * 0.38 + cr * 0.4 + air * 0.5 + Math.sin(t * 2.3) * 0.04;
    if (!dt) { rig.capeA = target; rig.capeV = 0; }
    else {
      rig.capeV = (rig.capeV || 0) + ((target - (rig.capeA ?? target)) * 55 - (rig.capeV || 0) * 7) * dt;
      rig.capeA = (rig.capeA ?? target) + rig.capeV * dt;
    }
    rig.cape.rotation.x = clamp(rig.capeA, -0.1, 1.6);
  }
  if (rig.tail) rig.tail.rotation.y = Math.sin(t * 2.5) * 0.4;
  if (rig.wings) {
    const f = p.fly ? Math.sin(t * 16) * 0.75 : Math.sin(t * 1.5) * 0.1;
    rig.wings[0].rotation.y = -0.35 - f; rig.wings[1].rotation.y = 0.35 + f;
  }
}

// ---------------------------------------------------------------- four-legged things: wolves and dogs
export function makeBeast(o = {}) {
  const fur = mat(o.color ?? 0x55575c), dark = mat(o.dark ?? 0x2a2a2e);
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const body = joint(root, 0, 0.62, 0);
  const rig = { root, body, o, legs: [] };
  mesh(body, capsule(0.19, 0.5), fur, 0, 0, -0.02, 1, 1, 1).rotation.x = Math.PI / 2;
  mesh(body, sphere(), fur, 0, 0.03, 0.24, 0.21, 0.23, 0.22);
  const neck = rig.neck = joint(body, 0, 0.12, 0.4);
  const head = rig.head = joint(neck, 0, 0.04, 0.06);
  mesh(head, sphere(), fur, 0, 0, 0, 0.12, 0.11, 0.13);
  rig.jaw = mesh(head, box(), fur, 0, -0.04, 0.14, 0.09, 0.07, 0.18, 1, 1, false);
  mesh(head, lowSphere(), dark, 0, -0.01, 0.235, 0.025, 1, 1, false);
  for (const s of [1, -1]) {
    const e = mesh(head, cone(4), o.floppy ? fur : dark, s * 0.065, o.floppy ? 0.04 : 0.11, -0.03, 0.035, 0.1, 0.03, 1, 1, false);
    if (o.floppy) e.rotation.z = s * 2.4;
    if (o.glowEyes) mesh(head, lowSphere(), mat(o.glowEyes, { basic: true }), s * 0.05, 0.03, 0.105, 0.015, 0.012, 0.01, 1, 1, false);
  }
  for (const [x, z] of [[0.11, 0.26], [-0.11, 0.26], [0.11, -0.27], [-0.11, -0.27]]) {
    const h = joint(body, x, -0.05, z);
    mesh(h, capsule(0.05, 0.2), fur, 0, -0.14, 0, 1, 1, 1, false);
    const k = joint(h, 0, -0.28, 0);
    mesh(k, capsule(0.035, 0.2), fur, 0, -0.13, 0, 1, 1, 1, false);
    mesh(k, lowSphere(), dark, 0, -0.27, 0.02, 0.045, 0.03, 0.06, 1, 1, false);
    rig.legs.push({ h, k, front: z > 0 });
  }
  const tail = rig.tail = joint(body, 0, 0.06, -0.33);
  mesh(tail, capsule(0.045, 0.3), fur, 0, -0.08, -0.15, 1, 1, 1, false).rotation.x = -1.0;
  if (o.scale) root.scale.setScalar(o.scale);
  return rig;
}
export function poseBeast(rig, p) {
  const t = p.t || 0, ph = p.phase || 0, mv = p.move || 0;
  const run = Math.max(0, Math.min(1, mv - 1)), amp = Math.min(1, mv) * 0.5 + run * 0.3;
  rig.legs.forEach((l, i) => {
    const off = run > 0.5 ? (l.front ? 0 : Math.PI * 0.85) : (i === 0 || i === 3 ? 0 : Math.PI);
    const s = Math.sin(ph + off);
    l.h.rotation.x = s * amp + (p.sit && !l.front ? -1.3 : 0) + (p.dead ? 0.6 : 0);
    l.k.rotation.x = (l.front ? -1 : 1) * Math.max(0, Math.cos(ph + off)) * amp * 0.8 + (p.sit && !l.front ? 1.9 : 0);
  });
  rig.body.position.y = 0.62 - Math.abs(Math.sin(ph)) * 0.03 * Math.min(1, mv) - (p.crouch || 0) * 0.15 - (p.sit ? 0.12 : 0);
  rig.body.rotation.x = (p.lunge || 0) * 0.25 - (p.sit ? 0.45 : 0) - run * 0.05;
  rig.root.position.z = 0;
  rig.neck.rotation.set((p.lunge || 0) * 0.4 - (p.bark || 0) * 0.5 + (p.sniff || 0) * 0.6 + (p.sit ? 0.4 : 0) - (p.howl || 0) * 1.0, p.look || 0, 0);
  rig.jaw.rotation.x = Math.max(p.bark || 0, p.lunge || 0, p.howl || 0) * 0.5;
  rig.tail.rotation.set(-0.2 + (p.wag ? Math.sin(t * 14) * 0.15 : 0) - run * 0.3, p.wag ? Math.sin(t * 14) * 0.6 : Math.sin(t * 2) * 0.15, 0);
  rig.root.rotation.z = p.dead ? ease(Math.min(1, p.dead)) * Math.PI / 2 : (p.hit || 0) * 0.25;
}

// ---------------------------------------------------------------- birds: chickens and crows
export function makeBird(kind) {
  const crow = kind === 'crow';
  const c = mat(crow ? 0x16161a : 0xe9e3d3), beakM = mat(crow ? 0x2a2a2a : 0xe0a030);
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const body = joint(root, 0, crow ? 0.1 : 0.22, 0);
  const rig = { root, body, kind };
  mesh(body, sphere(), c, 0, 0, 0, crow ? 0.07 : 0.13, crow ? 0.065 : 0.12, crow ? 0.13 : 0.16, 1, 1, !crow);
  const head = rig.head = joint(body, 0, crow ? 0.05 : 0.11, crow ? 0.1 : 0.11);
  mesh(head, lowSphere(), c, 0, 0, 0, crow ? 0.045 : 0.065, 1, 1, false);
  mesh(head, cone(4), beakM, 0, -0.005, crow ? 0.06 : 0.075, 0.018, crow ? 0.06 : 0.045, 0.018, 1, 1, false).rotation.x = Math.PI / 2;
  if (!crow) mesh(head, box(), mat(0xc8231b), 0, 0.06, 0.01, 0.015, 0.05, 0.07, 1, 1, false);
  rig.wings = [1, -1].map((s) => {
    const w = joint(body, s * (crow ? 0.06 : 0.11), 0.02, 0);
    mesh(w, box(), c, s * (crow ? 0.12 : 0.03), 0, -0.02, crow ? 0.24 : 0.05, 0.015, crow ? 0.12 : 0.18, 1, 1, false);
    return w;
  });
  if (crow) mesh(body, box(), c, 0, 0, -0.14, 0.06, 0.012, 0.1, 1, 1, false);
  if (!crow) for (const s of [1, -1]) mesh(body, cyl(4), beakM, s * 0.05, -0.15, 0, 0.012, 0.16, 0.012, 1, 1, false);
  return rig;
}
export function poseBird(rig, p) {
  const t = p.t || 0;
  const flap = p.fly ? Math.sin(t * (rig.kind === 'crow' ? 18 : 26)) * 0.9 : p.flutter ? Math.sin(t * 30) * 0.6 : 0;
  rig.wings[0].rotation.z = (rig.kind === 'crow' && !p.fly ? -0.05 : 0) - flap;
  rig.wings[1].rotation.z = (rig.kind === 'crow' && !p.fly ? 0.05 : 0) + flap;
  rig.head.rotation.x = (p.peck || 0) * 1.2;
  rig.body.position.y = (rig.kind === 'crow' ? 0.1 : 0.22) + (p.move ? Math.abs(Math.sin(t * 12)) * 0.02 : 0);
  rig.root.rotation.z = p.dead ? Math.PI / 2 : 0;
}

export { ease };
