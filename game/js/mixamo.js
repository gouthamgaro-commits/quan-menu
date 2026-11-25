// Mixamo characters. Each person is still posed on the game's own joint rig (actors.js), which stays
// invisible and drives the skeleton of a skinned Mixamo model: every frame each Mixamo bone takes its
// rig joint's rotation, corrected by the difference between the two skeletons in a T-pose. Hats,
// hoods, capes, weapons and shields move from the rig's joints onto the matching Mixamo bones.
// Far away, people switch back to the rig's own light bodies (see setDetail).
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/jsm/utils/SkeletonUtils.js';

const MODELS = {
  // Mixamo's two mannequins, repainted per person: body in their top's colour, joints in their trousers'.
  // Alpha is the man (from three.js's "Samba Dancing" example), X Bot the woman.
  // Their chests are deeper than the rig's, so aprons would sink in.
  alpha: { file: 'models/alpha.glb', tint: { Alpha_Body_MAT: 'top', Alpha_Joints_MAT: 'pants' }, hide: ['apron'] },
  xbot: { file: 'models/xbot.glb', tint: { 'asdf1:Beta_HighLimbsGeoSG2': 'top', Beta_Joints_MAT: 'pants' }, hide: ['apron'] },
  // the Soldier: armour and a helmet of his own, so no hats, hair or tabards
  soldier: { file: 'models/soldier.glb', tint: { VanguardBodyMat: 'tint' }, hide: ['head', 'tabard', 'pad', 'apron'] },
  // Michelle has her own hair
  michelle: { file: 'models/michelle.glb', tint: {}, hide: ['head'] },
};
const PROTO = {};

export async function loadMixamo(onProgress) {
  const loader = new GLTFLoader();
  const keys = Object.keys(MODELS);
  let done = 0;
  await Promise.all(keys.map(async (k) => {
    try {
      const g = await loader.loadAsync(MODELS[k].file);
      PROTO[k] = prepare(k, g.scene);
    } catch (e) {
      console.warn('Mixamo model failed to load, using the classic body:', k, e);
    }
    onProgress && onProgress(++done / keys.length);
  }));
}
export const hasMixamo = (k) => !!PROTO[k];

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
// which rig rotation drives each bone (see DRIVERS in syncMixamo)
const DRIVE = { Hips: 0, Spine: 1, Spine1: 2, Spine2: 3, Neck: 4, Head: 5, LeftArm: 6, LeftForeArm: 7, LeftHand: 7, RightArm: 8, RightForeArm: 9, RightHand: 9, LeftUpLeg: 10, LeftLeg: 11, LeftFoot: 11, RightUpLeg: 12, RightLeg: 13, RightFoot: 13 };
// the rig's joints in a T-pose: everything straight, arms out to the sides
const zq = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
const DRIVER_T = [0, 0, 0, 0, 0, 0, 1, 1, -1, -1, 0, 0, 0, 0].map((s) => zq(s * Math.PI / 2));
const find = (root, name) => {
  let hit = null;
  root.traverse((o) => { if (!hit && (o.name === 'mixamorig' + name || o.name === 'mixamorig:' + name)) hit = o; });
  return hit;
};

function prepare(kind, scene) {
  scene.updateMatrixWorld(true);
  const hips = find(scene, 'Hips');
  const hipY = hips.getWorldPosition(new THREE.Vector3()).y;
  const meshes = [];
  scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    meshes.push(o);
    o.castShadow = true; o.userData.cs = true;
    for (const m of [o.material].flat()) { m.metalness = Math.min(m.metalness ?? 0, 0.15); m.roughness = Math.max(m.roughness ?? 1, 0.6); }
  });
  // curl the fingers a little, so hands look like they hold something
  scene.traverse((o) => {
    const m = /(Left|Right)Hand(Index|Middle|Ring|Pinky)[123]$/.exec(o.name.replace(':', ''));
    if (m) o.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.55));
  });
  return { kind, scene, scale: 0.95 / hipY };
}

// X Bot mannequins are repainted in the person's colours; the Soldier's painted armour is tinted over
const tints = new Map();
function tinted(m, color, repaint) {
  if (color == null) return m;
  const key = m.uuid + ':' + color + ':' + repaint;
  let t = tints.get(key);
  if (!t) {
    t = m.clone();
    if (repaint) t.color.set(color).multiplyScalar(1.35); else t.color.multiply(new THREE.Color(color));
    tints.set(key, t);
  }
  return t;
}

// Give a rig built by makeHumanoid a Mixamo body. Returns false if that model isn't loaded.
export function dressMixamo(rig, kind, colors = {}) {
  const P = PROTO[kind];
  if (!P) return false;
  const def = MODELS[kind];
  const model = cloneSkinned(P.scene);
  const box = new THREE.Group();
  box.name = 'mixamo:' + kind;
  box.scale.setScalar(P.scale);
  box.add(model);
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.castShadow = true; o.userData.cs = true;
    const want = def.tint[o.material.name];
    const c = want === 'tint' ? colors.tint : want ? colors[want] : null;
    o.material = tinted(o.material, c, kind === 'xbot' || kind === 'alpha');
  });
  rig.root.add(box);

  // the rig in a T-pose, and both skeletons' joints in root space
  const { hips, spine, neck, head, armL, armR, legL, legR } = rig;
  const drivers = [hips, spine, spine, spine, neck, head, armL.s, armL.e, armR.s, armR.e, legL.h, legL.k, legR.h, legR.k];
  armL.s.rotation.z = Math.PI / 2; armR.s.rotation.z = -Math.PI / 2;
  rig.root.updateMatrixWorld(true);
  const rootInv = rig.root.matrixWorld.clone().invert();
  const rootSpace = (o) => new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
  const qOf = (m) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(m));

  const bones = {}, plan = [], index = new Map();
  for (const n of BONES) bones[n] = find(model, n);
  // every bone on the way from the model's root to a driven bone, parents first
  const add = (b) => {
    if (index.has(b)) return index.get(b);
    const parent = b.parent && b.parent !== box && BONES.some((n) => bones[n] === b.parent) ? add(b.parent) : -1;
    const name = BONES.find((n) => bones[n] === b);
    const step = { bone: b, parent, drive: name in DRIVE ? DRIVE[name] : -1, offset: null, base: null };
    if (parent < 0) step.base = qOf(rootSpace(b.parent));
    if (step.drive >= 0) step.offset = DRIVER_T[step.drive].clone().invert().multiply(qOf(rootSpace(b)));
    plan.push(step); index.set(b, plan.length - 1);
    return plan.length - 1;
  };
  for (const n of BONES) if (bones[n]) add(bones[n]);
  const hipsParentInv = rootSpace(bones.Hips.parent).invert();
  const hipsRest = new THREE.Vector3().setFromMatrixPosition(rootSpace(bones.Hips)).sub(hips.position);

  // where each rig joint's things go on the Mixamo body. 'match' keeps them where they were on the rig
  // in the T-pose; otherwise they sit on the bone itself (plus a grip offset for hands)
  const slots = [
    [hips, 'Hips', true], [spine, 'Spine2', true], [head, 'Head', false],
    [armL.s, 'LeftArm', false], [armL.e, 'LeftForeArm', false], [armL.hand, 'LeftHand', false, 0.07],
    [armR.s, 'RightArm', false], [armR.e, 'RightForeArm', false], [armR.hand, 'RightHand', false, 0.07],
    [legL.h, 'LeftUpLeg', false], [legL.k, 'LeftLeg', false], [legR.h, 'RightUpLeg', false], [legR.k, 'RightLeg', false],
  ];
  // the rig's head is 0.235 m from its base to its crown
  const top = find(model, 'HeadTop_End');
  const headTop = top && bones.Head ? Math.min(1.2, Math.max(0.6, new THREE.Vector3().setFromMatrixPosition(rootSpace(top)).distanceTo(new THREE.Vector3().setFromMatrixPosition(rootSpace(bones.Head))) / 0.235)) : 1;
  const wraps = new Map();
  for (const [joint, name, match, grip] of slots) {
    const bone = bones[name];
    if (!bone) continue;
    const L = rootSpace(bone).invert().multiply(rootSpace(joint));
    const w = new THREE.Group();
    L.decompose(w.position, w.quaternion, w.scale);
    if (!match) w.position.set(0, -(grip || 0), 0).multiply(w.scale).applyQuaternion(w.quaternion);
    // Mixamo heads are smaller than the rig's: shrink hats, hoods and hair to fit
    if (joint === head && headTop) w.scale.multiplyScalar(headTop);
    bone.add(w);
    wraps.set(joint, w);
  }
  armL.s.rotation.z = 0; armR.s.rotation.z = 0;

  // the rig's own body parts, and the things worn or carried on its joints
  const joints = new Set([hips, spine, neck, head, armL.s, armL.e, armL.hand, armR.s, armR.e, armR.hand, legL.h, legL.k, legR.h, legR.k]);
  const acc = [];
  for (const j of joints) {
    for (const c of [...j.children]) {
      if (joints.has(c) || c.userData.body) continue;
      const tag = j === head ? c.userData.acc || 'head' : c.userData.acc;
      acc.push({ obj: c, joint: j, wrap: wraps.get(j) || null, hide: def.hide.includes(tag) });
    }
  }
  const body = [];
  rig.root.traverse((o) => { if (o.userData.body) body.push(o); });
  rig.mix = { kind, box, plan, hipsParentInv, hipsRest, acc, body, wraps, on: false, D: Array.from({ length: 14 }, () => new THREE.Quaternion()), W: plan.map(() => new THREE.Quaternion()) };
  setDetail(rig, true);
  return true;
}

// a held prop or new accessory added after dressing (see hold in actors.js)
export function attachMixamo(rig, joint, obj) {
  const m = rig.mix;
  if (!m) return;
  const a = { obj, joint, wrap: m.wraps.get(joint) || null, hide: false };
  m.acc.push(a);
  if (m.on && a.wrap) a.wrap.add(obj);
}

// near: the Mixamo body; far: the rig's own body, which is much lighter to draw
export function setDetail(rig, near) {
  const m = rig.mix;
  if (!m || m.on === near) return;
  m.on = near;
  m.box.visible = near;
  for (const b of m.body) b.visible = !near;
  for (const a of m.acc) {
    if (a.hide) a.obj.visible = !near;
    else if (a.wrap) (near ? a.wrap : a.joint).add(a.obj);
  }
}

const tq = new THREE.Quaternion(), iq = new THREE.Quaternion(), tv = new THREE.Vector3();
// copy the rig's pose onto the Mixamo skeleton; call after the rig has been posed
export function syncMixamo(rig) {
  const m = rig.mix;
  if (!m || !m.on) return;
  const { hips, spine, neck, head, armL, armR, legL, legR } = rig;
  const D = m.D;
  D[0].copy(hips.quaternion);
  D[3].copy(D[0]).multiply(spine.quaternion);
  D[1].copy(D[0]).slerp(D[3], 0.34); D[2].copy(D[0]).slerp(D[3], 0.67);
  D[5].copy(D[3]).multiply(neck.quaternion).multiply(head.quaternion);
  D[4].copy(D[3]).slerp(D[5], 0.5);
  D[6].copy(D[3]).multiply(armL.s.quaternion); D[7].copy(D[6]).multiply(armL.e.quaternion);
  D[8].copy(D[3]).multiply(armR.s.quaternion); D[9].copy(D[8]).multiply(armR.e.quaternion);
  D[10].copy(D[0]).multiply(legL.h.quaternion); D[11].copy(D[10]).multiply(legL.k.quaternion);
  D[12].copy(D[0]).multiply(legR.h.quaternion); D[13].copy(D[12]).multiply(legR.k.quaternion);
  const W = m.W;
  for (let i = 0; i < m.plan.length; i++) {
    const s = m.plan[i];
    const pq = s.parent < 0 ? s.base : W[s.parent];
    if (s.drive >= 0) {
      W[i].copy(D[s.drive]).multiply(s.offset);
      s.bone.quaternion.copy(iq.copy(pq).invert()).multiply(W[i]);
    } else W[i].copy(pq).multiply(s.bone.quaternion);
  }
  // the hips go where the rig's hips are
  const hb = m.plan[0].bone;
  hb.position.copy(tv.copy(hips.position).add(m.hipsRest)).applyMatrix4(m.hipsParentInv);
}
