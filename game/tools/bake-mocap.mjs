// Bakes Mixamo motion capture into the joint angles of Ravenmoor's humanoid rig (js/actors.js).
//
// The clips come from three Mixamo models that ship with the three.js examples:
//   https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Xbot.glb
//   https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Soldier.glb
//   https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Michelle.glb
// Download them into one folder, then from this folder run:
//   node bake-mocap.mjs <that folder> ../js/mocap.js [--dump]
// --dump prints the range of every channel of every clip; --debug keeps each loop's cycle shift in the output.
//
// Each source is first turned to face +z like the rig (the Soldier faces -z). For each frame it plays
// the clip on the source skeleton and converts it to the rig: hips and chest
// turn by how far they moved from the T-pose, arms and legs point the same way as the source's limbs
// (with the elbow and knee bend planes setting their twist), and the hips are raised or lowered so the
// rig's own feet are as high off the ground as the source's.
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';

const [, , DIR, OUT, ...flags] = process.argv;
const DUMP = flags.includes('--dump');

function loadGLB(path) {
  const buf = fs.readFileSync(path);
  const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const bl = buf.readUInt32LE(20 + jl);
  const bin = buf.subarray(28 + jl, 28 + jl + bl);
  return { json, bin };
}
function accessor(g, i) {
  const a = g.json.accessors[i], bv = g.json.bufferViews[a.bufferView];
  if (a.componentType !== 5126) throw new Error('non-float accessor');
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const stride = bv.byteStride || n * 4, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float32Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = g.bin.readFloatLE(off + k * stride + c * 4);
  return out;
}

function buildScene(g) {
  const nodes = g.json.nodes.map((n) => {
    const o = new THREE.Object3D();
    o.name = n.name || '';
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    o.userData.rest = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() };
    return o;
  });
  g.json.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
  const root = new THREE.Object3D();
  for (const i of g.json.scenes[g.json.scene || 0].nodes) root.add(nodes[i]);
  return { root, nodes };
}

function clipsOf(g, sc) {
  return (g.json.animations || []).map((a) => {
    const ch = a.channels.map((c) => {
      const s = a.samplers[c.sampler];
      return { node: sc.nodes[c.target.node], path: c.target.path, times: accessor(g, s.input), values: accessor(g, s.output) };
    });
    let times = ch[0].times;
    for (const c of ch) if (c.times.length > times.length) times = c.times;
    return { name: a.name, ch, times };
  });
}

const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();
function applyFrame(sc, clip, t) {
  for (const n of sc.nodes) { const r = n.userData.rest; n.position.copy(r.p); n.quaternion.copy(r.q); n.scale.copy(r.s); }
  if (clip) for (const c of clip.ch) {
    const T = c.times, n = c.path === 'rotation' ? 4 : 3;
    let i = 0;
    while (i < T.length - 2 && T[i + 1] < t) i++;
    const k = T.length < 2 ? 0 : Math.min(1, Math.max(0, (t - T[i]) / ((T[i + 1] - T[i]) || 1)));
    const j = Math.min(i + 1, T.length - 1);
    if (c.path === 'rotation') {
      tmpQ.fromArray(c.values, i * 4); tmpQ2.fromArray(c.values, j * 4);
      c.node.quaternion.copy(tmpQ).slerp(tmpQ2, k);
    } else if (c.path === 'translation' || c.path === 'scale') {
      const v = c.path === 'translation' ? c.node.position : c.node.scale;
      v.set(...[0, 1, 2].map((q) => c.values[i * n + q] * (1 - k) + c.values[j * n + q] * k));
    }
  }
  sc.root.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- the target rig (see makeHumanoid)
const HIP = 0.95, HIPJ = [0.095, -0.03], THIGH = 0.44, SHIN = 0.49;
const FOOT_PTS = [[0, -SHIN, 0.04], [0, -SHIN, 0.15], [0, -SHIN, -0.07]];
const N = 30; // same layout as poseHumanoid's target array

const V3 = THREE.Vector3;
const eu = new THREE.Euler();
function eulerOf(q, order = 'XYZ') { eu.setFromQuaternion(q, order); return [eu.x, eu.y, eu.z]; }

function makeRetargeter(sc, restClip) {
  const B = (name) => {
    const n = sc.nodes.find((o) => o.name === 'mixamorig:' + name || o.name === 'mixamorig' + name);
    if (!n) throw new Error('missing bone ' + name);
    return n;
  };
  const bones = {};
  for (const n of ['Hips', 'Spine2', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']) bones[n] = B(n);
  const wq = (b) => b.getWorldQuaternion(new THREE.Quaternion());
  const wp = (b) => b.getWorldPosition(new V3());
  // which way a pair of left/right bones faces, as a yaw from +z
  const faceOf = (l, r) => { const d = wp(bones[l]).sub(wp(bones[r])); return Math.atan2(-d.z, d.x); };
  // turn the whole source so its rest pose faces +z, as the rig does (the Soldier faces -z)
  applyFrame(sc, restClip || null, restClip ? restClip.times[0] : 0);
  sc.root.rotation.y = -faceOf('LeftUpLeg', 'RightUpLeg');
  const baseYaw = sc.root.rotation.y;
  applyFrame(sc, restClip || null, restClip ? restClip.times[0] : 0);
  const rest = {};
  for (const k in bones) rest[k] = { q: wq(bones[k]), p: wp(bones[k]) };
  const footRest = { L: Math.min(rest.LeftFoot.p.y, rest.LeftToeBase.p.y), R: Math.min(rest.RightFoot.p.y, rest.RightToeBase.p.y) };
  const S = HIP / rest.Hips.p.y; // metres in the rig per unit in the source
  const prevZ = { L: new V3(0, 0, 1), R: new V3(0, 0, 1), legL: new V3(0, 0, 1), legR: new V3(0, 0, 1) };

  const delta = (k) => wq(bones[k]).multiply(rest[k].q.clone().invert());

  function arm(side, chestInv) {
    const pre = side === 'L' ? 'Left' : 'Right';
    const a = wp(bones[pre + 'Arm']), f = wp(bones[pre + 'ForeArm']), h = wp(bones[pre + 'Hand']);
    const u = f.clone().sub(a).normalize().applyQuaternion(chestInv);
    const w = h.clone().sub(f).normalize().applyQuaternion(chestInv);
    const Y = u.clone().negate();
    const Z = w.clone().addScaledVector(u, -w.dot(u));
    // a straight elbow has no bend plane, so lean on the last frame's
    Z.addScaledVector(prevZ[side].clone().addScaledVector(u, -prevZ[side].dot(u)), 0.12);
    if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1).addScaledVector(u, -u.z);
    Z.normalize(); prevZ[side].copy(Z);
    const X = new V3().crossVectors(Y, Z).normalize();
    Z.crossVectors(X, Y).normalize();
    const m = new THREE.Matrix4().makeBasis(X, Y, Z);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const e = -Math.acos(Math.max(-1, Math.min(1, u.dot(w))));
    return [...eulerOf(q), e];
  }
  function leg(side, hipsInv) {
    const pre = side === 'L' ? 'Left' : 'Right';
    const a = wp(bones[pre + 'UpLeg']), k = wp(bones[pre + 'Leg']), f = wp(bones[pre + 'Foot']), toe = wp(bones[pre + 'ToeBase']);
    const u = k.clone().sub(a).normalize().applyQuaternion(hipsInv);
    const w = f.clone().sub(k).normalize().applyQuaternion(hipsInv);
    // the knee is a hinge, so the foot's heading sets how the thigh is twisted
    const fd = toe.clone().sub(f).normalize().applyQuaternion(hipsInv);
    const Y = u.clone().negate();
    // forward for the thigh: away from where the bent shin points, with the foot's heading for a straight leg
    const Z = w.clone().addScaledVector(u, -w.dot(u)).negate();
    Z.addScaledVector(fd.clone().addScaledVector(u, -fd.dot(u)), 0.2);
    Z.addScaledVector(prevZ['leg' + side].clone().addScaledVector(u, -prevZ['leg' + side].dot(u)), 0.1);
    if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1).addScaledVector(u, -u.z);
    Z.normalize(); prevZ['leg' + side].copy(Z);
    const X = new V3().crossVectors(Y, Z).normalize();
    Z.crossVectors(X, Y).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const [ex, ey, ez] = eulerOf(q);
    const wl = w.clone().applyQuaternion(q.clone().invert());
    const kn = Math.atan2(-wl.z, -wl.y);
    return [ex, ey, ez, kn];
  }
  // the rig's own forward kinematics, to put its feet on the ground
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  function feet(v) {
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(v[24], v[25], v[26], 'YXZ'));
    const hp = new V3(v[20], HIP + v[4], v[27]);
    const out = {};
    for (const [side, s, hx, kn, hz, hyw] of [['L', 1, v[0], v[2], v[22], v[28]], ['R', -1, v[1], v[3], v[23], v[29]]]) {
      const hj = new V3(s * HIPJ[0], HIPJ[1], 0).applyQuaternion(hq).add(hp);
      qa.copy(hq).multiply(qb.setFromEuler(new THREE.Euler(hx, hyw, hz)));
      const knee = new V3(0, -THIGH, 0).applyQuaternion(qa).add(hj);
      qa.multiply(qb.setFromEuler(new THREE.Euler(kn, 0, 0)));
      let low = null;
      for (const p of FOOT_PTS) { const w = new V3(...p).applyQuaternion(qa).add(knee); if (!low || w.y < low.y) low = w; }
      out[side] = low;
    }
    return out;
  }
  function frame() {
    const v = new Array(N).fill(0);
    const dh = delta('Hips'), dc = delta('Spine2'), dhead = delta('Head');
    const hipsInv = dh.clone().invert(), chestInv = dc.clone().invert();
    [v[24], v[25], v[26]] = eulerOf(dh, 'YXZ');
    [v[5], v[6], v[7]] = eulerOf(hipsInv.clone().multiply(dc));
    [v[16], v[17], v[18]] = eulerOf(chestInv.clone().multiply(dhead));
    [v[8], v[9], v[10], v[11]] = arm('L', chestInv);
    [v[12], v[13], v[14], v[15]] = arm('R', chestInv);
    const L = leg('L', hipsInv), R = leg('R', hipsInv);
    v[0] = L[0]; v[28] = L[1]; v[22] = L[2]; v[2] = L[3];
    v[1] = R[0]; v[29] = R[1]; v[23] = R[2]; v[3] = R[3];
    const hp = wp(bones.Hips);
    v[20] = (hp.x - rest.Hips.p.x) * S;
    v[27] = (hp.z - rest.Hips.p.z) * S;
    // how high the source's lowest foot is lifted off its rest height, and the same for the rig
    const lift = Math.min(
      Math.min(wp(bones.LeftFoot).y - rest.LeftFoot.p.y, wp(bones.LeftToeBase).y - rest.LeftToeBase.p.y),
      Math.min(wp(bones.RightFoot).y - rest.RightFoot.p.y, wp(bones.RightToeBase).y - rest.RightToeBase.p.y)) * S;
    v[4] = 0;
    const ft = feet(v);
    const low = Math.min(ft.L.y, ft.R.y);
    v[4] = Math.max(-0.6, lift - low - 0.0);
    return v;
  }
  return { frame, feet, S, rest, baseYaw, chestYaw: () => faceOf('LeftArm', 'RightArm') };
}

function bakeClip(sc, rt, clip, o = {}) {
  const fps = o.fps || 30;
  const dur = clip.times[clip.times.length - 1] - clip.times[0];
  const n = Math.max(1, Math.round(dur * fps));
  const frames = [];
  const count = o.loop ? n : n + 1;
  const at = (i) => clip.times[0] + (i / n) * dur;
  if (o.faceForward) {
    // an idle that stands turned away: turn it so the chest faces forward on average
    let sx = 0, sz = 0;
    for (let i = 0; i < count; i++) { applyFrame(sc, clip, at(i)); const y = rt.chestYaw(); sx += Math.sin(y); sz += Math.cos(y); }
    sc.root.rotation.y = rt.baseYaw - Math.atan2(sx, sz);
  }
  for (let i = 0; i < count; i++) { applyFrame(sc, clip, at(i)); frames.push(rt.frame()); }
  sc.root.rotation.y = rt.baseYaw;
  return { dur, fps, frames };
}

// unwrap angles so neighbouring frames never jump by a full turn
function unwrap(frames) {
  for (let c = 0; c < N; c++) for (let i = 1; i < frames.length; i++) {
    let d = frames[i][c] - frames[i - 1][c];
    while (d > Math.PI) { frames[i][c] -= Math.PI * 2; d -= Math.PI * 2; }
    while (d < -Math.PI) { frames[i][c] += Math.PI * 2; d += Math.PI * 2; }
  }
}

// locomotion: centre the hips, find the stride, and line up the cycle so u = 0.25 has the left thigh forward
function locomotion(rt, b) {
  const F = b.frames, n = F.length;
  for (const c of [20, 27]) { const m = F.reduce((s, f) => s + f[c], 0) / n; for (const f of F) f[c] -= m; }
  // stance foot speed (in-place clips): how fast the planted foot slides back
  let dist = 0, time = 0;
  for (let i = 0; i < n; i++) {
    const a = rt.feet(F[i]), bb = rt.feet(F[(i + 1) % n]);
    const side = a.L.y < a.R.y ? 'L' : 'R';
    if (a[side].y > 0.03) continue;
    const dz = a[side].z - bb[side].z;
    if (Math.abs(dz) > 0.5) continue;
    dist += dz; time += 1 / b.fps;
  }
  const speed = time ? dist / time : 0;
  let best = 0;
  for (let i = 0; i < n; i++) if (F[i][0] < F[best][0]) best = i;
  const shift = (best - Math.round(n * 0.25) + n) % n;
  b.frames = F.slice(shift).concat(F.slice(0, shift));
  b.speed = speed; b.stride = speed * b.dur; b.shift = shift;
  return b;
}

function deltaOf(b, ref) {
  const r = ref || b.frames[0];
  b.frames = b.frames.map((f) => f.map((x, i) => x - r[i]));
  return b;
}

const round = (x) => Math.round(x * 1000) / 1000;
const Q = 4000; // int16 fixed point: 1/4000 rad (or metre) steps, range about +-8.2
function pack(b, extra = {}) {
  unwrap(b.frames);
  const flat = b.frames.flat();
  const i16 = new Int16Array(flat.length);
  flat.forEach((x, i) => {
    const q = Math.round(x * Q);
    if (q > 32767 || q < -32768) throw new Error('value out of range ' + x);
    i16[i] = q;
  });
  const d = Buffer.from(i16.buffer).toString('base64');
  return { dur: round(b.dur), fps: b.fps, n: b.frames.length, ...(b.stride ? { stride: round(b.stride) } : {}), ...(b.shift != null ? { sh: b.shift } : {}), ...extra, d, _flat: flat.map(round) };
}

function load(name) {
  const g = loadGLB(`${DIR}/${name}.glb`);
  const sc = buildScene(g);
  const clips = clipsOf(g, sc);
  return { sc, clips, rt: makeRetargeter(sc, clips.find((c) => /tpose/i.test(c.name))) };
}

const X = load('Xbot'), Mi = load('Michelle'), Sd = load('Soldier');
const clip = (src, name) => { const c = src.clips.find((c) => c.name === name); if (!c) throw new Error('no clip ' + name); return c; };

const out = {};
out.idle = pack(bakeClip(X.sc, X.rt, clip(X, 'idle'), { loop: true }));
out.walk = pack(locomotion(X.rt, bakeClip(X.sc, X.rt, clip(X, 'walk'), { loop: true })));
out.run = pack(locomotion(X.rt, bakeClip(X.sc, X.rt, clip(X, 'run'), { loop: true })));
// a second gait, for soldiers
out.idleS = pack(bakeClip(Sd.sc, Sd.rt, clip(Sd, 'Idle'), { loop: true, faceForward: true }));
out.walkS = pack(locomotion(Sd.rt, bakeClip(Sd.sc, Sd.rt, clip(Sd, 'Walk'), { loop: true })));
out.runS = pack(locomotion(Sd.rt, bakeClip(Sd.sc, Sd.rt, clip(Sd, 'Run'), { loop: true })));
// additive poses and gestures, relative to their own first frame (as three.js's makeClipAdditive does)
for (const [k, name] of [['sneak', 'sneak_pose'], ['sad', 'sad_pose']]) {
  const b = bakeClip(X.sc, X.rt, clip(X, name));
  b.frames = [b.frames[b.frames.length - 1].map((x, i) => x - b.frames[0][i])];
  out[k] = pack(b);
}
out.agree = pack(deltaOf(bakeClip(X.sc, X.rt, clip(X, 'agree'))));
out.shake = pack(deltaOf(bakeClip(X.sc, X.rt, clip(X, 'headShake'))));
{
  const b = bakeClip(Mi.sc, Mi.rt, clip(Mi, 'SambaDance'), { fps: 15 });
  // the dance wanders; keep its sway but pin it to its spot
  for (const c of [20, 27]) { const m = b.frames.reduce((s, f) => s + f[c], 0) / b.frames.length; for (const f of b.frames) f[c] -= m; }
  out.dance = pack(b);
}

if (DUMP) {
  const names = ['tl', 'tr', 'kl', 'kr', 'hy', 'lean', 'twist', 'roll', 'lsx', 'lsy', 'lsz', 'le', 'rsx', 'rsy', 'rsz', 're', 'nx', 'ny', 'nz', '-', 'hx', '-', 'tlz', 'trz', 'hrx', 'hry', 'hrz', 'hz', 'tly', 'try'];
  for (const k in out) {
    const c = out[k];
    const rows = c.n;
    const stat = names.map((nm, i) => {
      let lo = 1e9, hi = -1e9;
      for (let r = 0; r < rows; r++) { const x = c._flat[r * N + i]; lo = Math.min(lo, x); hi = Math.max(hi, x); }
      return `${nm}[${lo.toFixed(2)},${hi.toFixed(2)}]`;
    }).filter((s) => !s.startsWith('-'));
    console.log(k, 'dur', c.dur, 'n', c.n, 'stride', c.stride, '\n  ', stat.join(' '));
  }
  console.log('scales', X.rt.S, Mi.rt.S);
}
if (OUT) {
  const body = Object.entries(out).map(([k, c]) => {
    const { _flat, sh, ...rest } = c;
    // --debug keeps each loop's cycle shift, for lining frames up with the source when checking
    return `  ${k}: ${JSON.stringify(flags.includes('--debug') ? { ...rest, sh } : rest)}`;
  }).join(',\n');
  fs.writeFileSync(OUT, `// Motion capture from Mixamo (mixamo.com), taken from the X Bot, Soldier and Michelle models that ship
// with the three.js examples, and baked offline into the joint angles of the rig in actors.js
// by tools/bake-mocap.mjs.
// Each clip is n frames of ${N} channels in poseHumanoid's layout, stored as little-endian int16 / ${Q}
// in base64. Walk and run loops are lined up so a quarter of the way in, the left thigh is furthest forward;\n// stride is metres per loop.
// idle, walk, run (X Bot) and idleS, walkS, runS (Soldier): absolute poses. sneak, sad: one-frame
// offsets. agree, shake: offsets from frame 0.
// dance: absolute, 15 fps.
export const N = ${N}, Q = ${Q};
export const MOCAP = {\n${body}\n};\n`);
  console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
}
