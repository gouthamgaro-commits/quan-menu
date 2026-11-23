// Everything alive besides the player and the guards: Bro, the townsfolk and their animals,
// the beasts and the dead outside the walls, the demons of the rift, and the gods.
import * as THREE from 'three';
import { makeHumanoid, poseHumanoid, hold, makeBeast, poseBeast, makeBird, poseBird, setShadow, ease } from './actors.js';

const V3 = THREE.Vector3;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.random() * a.length | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function turn(a, target, amt) {
  let d = (target - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + clamp(d, -amt, amt);
}
function textSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '700 38px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(text, 128, 34);
  g.fillStyle = color; g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
}

const SKINS = [0xe0b090, 0xc79a78, 0xa8785a, 0x8a5a3c, 0xd9a882, 0xb98a68];
const CLOTH = [0x6b3b2a, 0x3d5a3a, 0x5a4a7a, 0x7a6a4a, 0x8a3a3a, 0x3a4a6a, 0x6a5a3a, 0x7a4a5a, 0x4a5a5a];
const HAIR = [0x2a1d14, 0x4a2c18, 0x7a5a30, 0x1a1a1a, 0x9a9590, 0xa05a2a];

const GOSSIP = [
  ['Did you hear? The Marshal doubled the night watch.', 'Afraid of his own shadow, that one.'],
  ['My cousin swears he saw red light in the old tower.', 'Demon fire, I tell you. Stay clear of it.'],
  ['Something big sleeps by the river bridge.', "Then I'm taking the long way home."],
  ['They say the Ember Crown was stolen from a god.', "And gods don't forget, mark me."],
  ['Graves were found open by the west wall.', "Hush. Don't speak of the dead after dark."],
  ["Bread's gone up again.", 'Everything has, since Varek came.'],
  ['Wolves took two sheep from the camp road.', 'Keep your door barred tonight.'],
  ["The priest says the Pale Lady hides the faithful.", 'Then she can hide me from my wife.'],
];
const LINES = {
  merchant: ['Fresh apples! Crisp as the night air!', 'Cloth from the south! Finest weave in Ravenmoor!', 'Candles, lamp oil, flint! Light against the dark!', 'Hot pies, two coppers!'],
  priest: ['The Pale Lady watches the faithful.', 'Her shrine stands on the hill by the camp road. Pray there, wanderer.', 'The Ember God sleeps in the northern peaks. Let him sleep.'],
  drunk: ['*hic* Another round!', "The moon's... spinning.", 'Who moved the well?', 'I love you. I love all of you.'],
  lamplighter: ['Mind the dark, friend.', 'Every lamp lit keeps a wolf away. So they say.'],
  child: ["You're it!", 'Catch the dog!', 'I can see you! ...Maybe.'],
  bard: ['♪ Oh the crows fly high o’er Ravenmoor... ♪', '♪ ...and the crown burns red in the keep so tall... ♪'],
  beggar: ['Spare a coin for an old soldier?', 'A coin buys a secret, friend.'],
  folk: ['Evening.', 'Cold night.', "Don't stand in the road.", 'Late to be out, stranger.'],
};
const TITLE = { merchant: 'Merchant', priest: 'Priest', drunk: 'Drunk', lamplighter: 'Lamplighter', child: 'Child', bard: 'Bard', beggar: 'Beggar', folk: 'Townsfolk' };
const SCREAM = {
  body: ['A body! Murder! Guards!', 'Somebody help! Guards!'],
  murder: ['Murderer! Guards! Guards!', 'Help! A killer!'],
  monster: ['Monster! Run!', 'Run! Get inside!'],
  alarm: ['The bell! Get indoors!', 'The alarm! Bar the doors!'],
  hurt: ['Help! Help me!', 'Ow! Stop!'],
};
const TIPS = [
  'The Marshal keeps the treasury key on his belt. Light fingers could lift it.',
  'Scaffolding clings to the east wall. The masons never finished, praise be.',
  "A troll sleeps by the river bridge. Tread softly, or it'll wake hungry.",
  'Demon fire burns in the old tower west of the bridge. Break its heart and the imps die with it.',
  "The Pale Lady's shrine is on the hill by your camp. Pray there, and the night will hide you.",
  'Never steal from a god. The Ember Crown belongs to the one asleep in the northern peaks.',
];
const BRO = {
  fight: ['I got your back, bro!', 'Come on then!', 'Swing first, ask later!', 'Two on one. Bad odds for you, mate.'],
  kill: ['Down you go.', 'And stay down.', "That one's mine."],
  stealth: ['Clean. Real clean.', 'Quiet as a cat, us.', 'Nobody saw nothing.'],
  wait: ["I'll hold here. Shout if you need me.", "Waiting. Don't be long."],
  follow: ['Right behind you, bro.', 'Lead on.'],
  down: ['Argh... bro... a little help?', "I'm down! Get over here!"],
  up: ['Thanks, bro. I owe you one.', "Back on my feet. Let's go."],
  idle: ['Nice night for a heist.', "Remind me why we're not just buying the crown?", "If we die, I'm blaming you.", 'Smell that? Bread. Focus, bro. Focus.'],
  god: ['Bro. BRO. The mountain is MOVING.', 'Run now, scream later!'],
};
const MELODY = [293.66, 349.23, 392, 440, 0, 392, 349.23, 329.63, 293.66, 0, 261.63, 293.66, 349.23, 329.63, 293.66, 0, 0];
const LAMPS = [[-15.5, 6.8], [15.5, 6.8], [15.5, 23.6], [-15.5, 23.6], [4.6, 39.2], [-4.6, 30.8], [4.6, -2.2], [-4.6, -13.2]];
const MARKET = [[-10.5, 12.1], [10.5, 17.9], [-10.5, 21.2], [10.5, 8.8], [6, 13.2], [6, 16.8], [-6, 13], [0, 15], [-3, 9], [3, 21]];

export function createLife(ctx) {
  const { scene, W, P, G, actors, sfx } = ctx;
  const mine = [];
  const L = { mine, bro: null, quests: {}, threatN: 0 };
  const live = (a) => a && !a.dead && !a.gone;
  const groundY = (a) => ctx.groundAt(a.pos.x, a.pos.z, a.pos.y + 0.3);
  const terrainY = (x, z) => ctx.groundAt(x, z, ctx.terrainHeight(x, z) + 0.3);
  let chatCd = 3, sayQ = [];

  function say(who, line, pos, range = 14) {
    if (pos && Math.hypot(pos.x - P.pos.x, pos.z - P.pos.z) > range) return;
    ctx.subtitle(`${who}: “${line}”`);
  }

  // ---------------------------------------------------------------- shared plumbing
  function base(kind, team, rig, x, z, o = {}) {
    const a = Object.assign({
      kind, team, rig, yaw: rand(0, 6.28), hp: 50, dead: false, gone: false, R: 0.42, H: 1.8, stun: 0, deathT: 0, phase: 0, mv: 0,
      crouch: 0, state: 'idle', canAssassinate: true, body: false, pocket: 0, picked: false, aware: false, t: rand(0, 10), think: rand(0, 0.4),
      acc: 0, atk: null, atkCd: 0, target: null, seenT: 0, path: null, pi: 0, repath: 0, pgx: 1e9, pgz: 1e9, stuckT: 0, lastX: x, lastZ: z,
      detour: 0, detourT: 0, stride: 4.2,
    }, o);
    a.pos = new V3(x, o.y ?? terrainY(x, z), z);
    a.maxHp = a.hp;
    a.hurt = (dmg, h) => damage(a, dmg, h || {});
    scene.add(rig.root);
    actors.push(a); mine.push(a);
    return a;
  }
  function damage(a, dmg, h) {
    if (!live(a) || a.downed) return;
    if (h.missile && a.missileMul) dmg *= a.missileMul;
    a.hp -= dmg;
    ctx.burst(a.bleed || 'blood', a.pos.x, a.pos.y + a.H * 0.6, a.pos.z, 6, 2.2, 0.15 * Math.max(1, a.H / 1.8), 0.5);
    a.hitT = 1;
    if (a.hp <= 0) { a.hp = 0; if (a.kind === 'bro') downBro(a); else kill(a, h); return; }
    if (a.onHurt) a.onHurt(h);
  }
  function kill(a, h) {
    a.dead = true; a.deathT = 0; a.atk = null; a.aware = false; a.target = null;
    a.deadDir = h.silent ? -1 : Math.random() < 0.6 ? 1 : -1;
    if (a.onDeath) a.onDeath(h);
    ctx.onDeath(a, h);
  }
  function stepTo(a, tx, tz, speed, dt, stop = 0.45) {
    const d = Math.hypot(tx - a.pos.x, tz - a.pos.z);
    if (d < stop) return 'done';
    let mx = tx - a.pos.x, mz = tz - a.pos.z;
    if (!a.fly && ctx.inNav(a.pos.x, a.pos.z) && ctx.inNav(tx, tz)) {
      a.repath -= dt;
      if (!a.path || (a.repath <= 0 && Math.abs(a.pgx - tx) + Math.abs(a.pgz - tz) > 1.2)) {
        a.path = ctx.findPath(a.pos.x, a.pos.z, tx, tz); a.pi = 0; a.pgx = tx; a.pgz = tz; a.repath = 0.7 + Math.random() * 0.4;
      }
      while (a.pi < a.path.length && Math.hypot(a.path[a.pi][0] - a.pos.x, a.path[a.pi][1] - a.pos.z) < 0.4) a.pi++;
      if (a.pi < a.path.length) { mx = a.path[a.pi][0] - a.pos.x; mz = a.path[a.pi][1] - a.pos.z; }
      else if (d > 1.6) { a.path = null; a.repath = 0; return 'stuck'; }
    } else if (a.detourT > 0) {
      a.detourT -= dt;
      const c = Math.cos(a.detour), s = Math.sin(a.detour);
      [mx, mz] = [mx * c - mz * s, mx * s + mz * c];
    }
    const l = Math.hypot(mx, mz) || 1, st = Math.min(speed * dt, d);
    a.pos.x += mx / l * st; a.pos.z += mz / l * st;
    if (!a.fly) ctx.resolveXZ(a.pos, a.R * 0.75, a.pos.y, Math.min(1.7, a.H));
    a.yaw = turn(a.yaw, Math.atan2(mx, mz), dt * 8);
    a.phase += st * a.stride;
    a.stuckT += dt;
    if (a.stuckT > 1.2) {
      if (Math.hypot(a.pos.x - a.lastX, a.pos.z - a.lastZ) < speed * 0.3) { a.detour = (Math.random() < 0.5 ? -1 : 1) * rand(0.9, 1.5); a.detourT = 1.1; }
      a.stuckT = 0; a.lastX = a.pos.x; a.lastZ = a.pos.z;
    }
    return 'move';
  }
  function seesPlayer(a, range, fov = -2) {
    if (P.dead || G.state !== 'play') return false;
    const dx = P.pos.x - a.pos.x, dz = P.pos.z - a.pos.z, d = Math.hypot(dx, dz, P.pos.y - a.pos.y);
    if (d > range) return false;
    if (fov > -2 && d > 2.5 && (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / Math.max(0.01, Math.hypot(dx, dz)) < fov) return false;
    return ctx.los(a.pos.x, a.pos.y + a.H * 0.85, a.pos.z, P.pos.x, P.pos.y + (P.crouch ? 0.7 : 1.3), P.pos.z);
  }
  function seesActor(a, o, range) {
    if (dist(a.pos, o.pos) > range) return false;
    return ctx.los(a.pos.x, a.pos.y + a.H * 0.85, a.pos.z, o.pos.x, o.pos.y + o.H * 0.6, o.pos.z);
  }
  const tpos = (T) => (T === P ? P.pos : T.pos);
  function pickTarget(a, aggro, lightFactor = true) {
    const T = a.target;
    if (T) {
      const ok = T === P ? !P.dead && G.state === 'play' : live(T) && !T.downed;
      if (ok) {
        if (T === P ? seesPlayer(a, aggro * 1.8) : seesActor(a, T, aggro * 1.8)) a.seenT = 0;
        if (dist(a.pos, tpos(T)) < aggro * 2.2 && a.seenT < 6) return T;
      }
    }
    let best = null, bd = 1e9;
    if (seesPlayer(a, aggro * (lightFactor ? 0.3 + 0.7 * P.vis : 1), a.aware ? -2 : -0.3)) { best = P; bd = dist(a.pos, P.pos); }
    for (const o of actors) {
      if (o === a || !live(o) || o.downed || !(o.kind === 'bro' || o.kind === 'guard' || o.kind === 'villager')) continue;
      if (o.fly && !a.ranged) continue;
      const d = dist(a.pos, o.pos);
      if (d >= bd || d > aggro * 0.8 || !seesActor(a, o, aggro)) continue;
      best = o; bd = d;
    }
    if (best) a.seenT = 0;
    return best;
  }
  function strike(a, T, dmg) { if (T === P) ctx.hurtPlayer(dmg, a.pos, a); else ctx.hurtActor(T, dmg, { from: a }); }
  function melee(a, T, dt, o) {
    const tp = tpos(T), dx = tp.x - a.pos.x, dz = tp.z - a.pos.z, d = Math.hypot(dx, dz);
    if (a.atk) {
      a.atk.t += dt;
      a.yaw = turn(a.yaw, Math.atan2(dx, dz), dt * (o.turn || 6));
      if (!a.atk.hit && a.atk.t >= o.wind) {
        a.atk.hit = true;
        sfx.swing(ctx.volAt(a.pos));
        if (o.aoe) {
          const fx = a.pos.x + Math.sin(a.yaw) * o.reach * 0.75, fz = a.pos.z + Math.cos(a.yaw) * o.reach * 0.75;
          ctx.damageArea(new V3(fx, a.pos.y, fz), o.aoe, o.dmg, a);
          sfx.land(ctx.volAt(a.pos)); G.shake = Math.max(G.shake || 0, 0.6 * ctx.volAt(a.pos));
          ctx.burst('dust', fx, a.pos.y + 0.2, fz, 12, 3, 0.9, 0.8);
        } else if (d < o.reach + 0.6 + (T.R || 0.35) && Math.abs(tp.y - a.pos.y) < 2.2 && (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / Math.max(d, 0.01) > 0.2) strike(a, T, typeof o.dmg === 'function' ? o.dmg(T) : o.dmg);
      }
      if (a.atk.t >= o.wind + o.rec) { a.atk = null; a.atkCd = o.cd * rand(0.8, 1.3); }
      return true;
    }
    if (d <= o.reach && a.atkCd <= 0) { a.atk = { t: 0, hit: false, o }; a.yaw = turn(a.yaw, Math.atan2(dx, dz), 1); return true; }
    return false;
  }
  const atkP = (a) => (a.atk ? (a.atk.t < a.atk.o.wind ? a.atk.t / a.atk.o.wind * 0.42 : 0.42 + (a.atk.t - a.atk.o.wind) / a.atk.o.rec * 0.58) : -1);
  const humanPose = (a, extra) => poseHumanoid(a.rig, Object.assign({ t: a.t, dt: a.pdt, phase: a.phase, move: a.mv, crouch: a.crouch, atk: atkP(a), style: a.atk ? a.atk.o.style : null, hit: a.hitT || 0, dead: a.dead ? a.deathT : 0, deadDir: a.deadDir }, extra));
  function wander(a, home, radius, speed, dt, idleMin = 2, idleMax = 6) {
    if (a.wait > 0) { a.wait -= dt; a.mv = lerp(a.mv, 0, 0.2); return; }
    if (!a.goal) { const r = rand(2, radius), an = rand(0, 6.28); a.goal = new V3(home.x + Math.cos(an) * r, 0, home.z + Math.sin(an) * r); }
    const res = stepTo(a, a.goal.x, a.goal.z, speed, dt, 0.6);
    a.mv = lerp(a.mv, 0.8, 0.2);
    if (res !== 'move') { a.goal = null; a.wait = rand(idleMin, idleMax); }
  }

  // ---------------------------------------------------------------- Bro
  function spawnBro() {
    const rig = makeHumanoid({ skin: 0xb98a68, top: 0x6b4a2e, pants: 0x3a2f26, boots: 0x231810, head: 'hair', hair: 0x3a2412, beard: 0x3a2412, build: 1.25, bareArms: true, gloves: 0x2a1d14, belt: 0x7a2a1a, tallBoots: true });
    hold(rig, 'R', 'axe');
    const tag = textSprite('BRO', '#a6dc84'); tag.position.y = 2.3; tag.scale.set(0.9, 0.225, 1); rig.root.add(tag);
    const a = base('bro', 'player', rig, P.pos.x - 1.6, P.pos.z + 1.8, { hp: 160, R: 0.45, H: 1.85, canAssassinate: false, mode: 'follow', downed: false, barkCd: 6, tag, idleT: rand(35, 60), following: false, stuckFar: 0 });
    a.ai = broAI;
    a.pose = (a) => humanPose(a, { kneel: a.downed ? 1 : 0, nod: a.downed ? 0.5 : 0 });
    a.onHurt = (h) => { if (h.from && h.from !== P && typeof h.from === 'object' && live(h.from)) a.target = h.from; a.fightT = 6; sfx.grunt(ctx.volAt(a.pos)); };
    return a;
  }
  function broSay(kind, force) {
    const a = L.bro;
    if (!a || (!force && a.barkCd > 0)) return;
    a.barkCd = 7;
    say('Bro', pick(BRO[kind]), a.pos, 30);
  }
  function downBro(a) {
    a.downed = true; a.atk = null; a.target = null; a.hp = 0;
    ctx.toast('Bro is down! Get to him and help him up.', 'bad');
    broSay('down', true);
  }
  function reviveBro() {
    const a = L.bro;
    a.downed = false; a.hp = a.maxHp * 0.6; a.fightT = 0;
    broSay('up', true);
  }
  function broTarget(a) {
    let best = null, bd = 16;
    const lt = P.lastTarget;
    if (lt && live(lt) && G.t - P.lastTargetT < 6 && lt.kind !== 'villager' && lt.team !== 'critter' && lt.kind !== 'bro') {
      const d = dist(a.pos, lt.pos) * 0.5;
      if (d < bd && !(lt.fly && lt.pos.y - groundY(lt) > 2.4)) { best = lt; bd = d; }
    }
    for (const o of actors) {
      if (!live(o) || o === a) continue;
      if (o.team === 'wild' || o.team === 'demon') {
        if (o.kind === 'rift' || !(o.target === P || o.target === a)) continue;
        if (o.fly && o.pos.y - groundY(o) > 2.4) continue;
      } else if (o.kind === 'guard') { if (o.state !== 'alert' || dist(o.pos, P.pos) > 12) continue; } else continue;
      const d = dist(a.pos, o.pos);
      if (d < bd && ctx.los(a.pos.x, a.pos.y + 1.5, a.pos.z, o.pos.x, o.pos.y + 1, o.pos.z)) { best = o; bd = d; }
    }
    return best;
  }
  function teleportBro(a) {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    let x = P.pos.x - fx * 0.6 - Math.cos(P.yaw) * 2.2, z = P.pos.z - fz * 0.6 + Math.sin(P.yaw) * 2.2;
    if (ctx.inNav(x, z)) [x, z] = ctx.freeNear(x, z);
    a.pos.set(x, terrainY(x, z), z); a.path = null;
    ctx.burst('dust', x, a.pos.y + 0.15, z, 5, 1.2, 0.5, 0.7);
  }
  function broAI(a, dt) {
    a.barkCd -= dt; a.fightT = Math.max(0, (a.fightT || 0) - dt);
    if (a.downed) { a.mv = 0; return; }
    if (a.fightT <= 0) a.hp = Math.min(a.maxHp, a.hp + 6 * dt);
    a.crouch = lerp(a.crouch, P.crouch && !a.target ? 1 : 0, 0.15);
    a.think -= dt;
    if (a.think <= 0) { a.think = 0.4; const prev = a.target; a.target = P.dead ? null : broTarget(a); if (a.target && a.target !== prev) broSay('fight'); }
    const T = a.target;
    if (T) {
      a.fightT = 3;
      const unaware = T.kind === 'guard' ? T.state !== 'alert' : !T.aware;
      if (!melee(a, T, dt, { reach: 1.8 + (T.R - 0.4), wind: 0.42, rec: 0.45, dmg: unaware ? 55 : 22, cd: 0.55, style: 'overhead' })) {
        stepTo(a, T.pos.x, T.pos.z, 6.0, dt, 1.2 + T.R * 0.5); a.mv = 1.8;
      } else a.mv = lerp(a.mv, 0, 0.3);
      return;
    }
    const dP = dist(a.pos, P.pos);
    if (a.mode === 'wait') {
      a.mv = lerp(a.mv, 0, 0.2);
      if (dP < 25) a.yaw = turn(a.yaw, Math.atan2(P.pos.x - a.pos.x, P.pos.z - a.pos.z), dt * 2);
      return;
    }
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const gx = P.pos.x - fx * 0.5 - rx * 1.7, gz = P.pos.z - fz * 0.5 - rz * 1.7;   // abreast, on the left: clear of the over-the-shoulder camera
    if (dP > 34 || a.stuckFar > 5) { teleportBro(a); a.stuckFar = 0; return; }
    const dG = Math.hypot(gx - a.pos.x, gz - a.pos.z);
    if (dG > (a.following ? 0.6 : 2.4)) {
      a.following = true;
      const ps = Math.hypot(P.vel.x, P.vel.z);
      const sp = dP > 9 ? 6.8 : P.crouch ? 2.4 : clamp(ps + 0.8, 2.4, 6.8);
      const r = stepTo(a, gx, gz, sp, dt, 0.5);
      a.stuckFar = r === 'stuck' && dP > 8 ? a.stuckFar + dt : Math.max(0, a.stuckFar - dt);
      a.mv = sp > 5.2 ? 1.8 : sp < 2.8 ? 0.6 : 1;
      if (r === 'done') a.following = false;
    } else {
      a.following = false; a.mv = lerp(a.mv, 0, 0.25);
      a.yaw = turn(a.yaw, P.yaw + Math.PI, dt * 3);
      a.idleT -= dt;
      if (a.idleT <= 0) { a.idleT = rand(45, 80); if (!P.crouch || Math.random() < 0.3) broSay('idle'); }
    }
  }
  L.broSayNow = (line) => { if (L.bro && live(L.bro)) say('Bro', line); };
  L.broCommand = () => {
    const a = L.bro;
    if (!a || a.downed) return;
    a.mode = a.mode === 'wait' ? 'follow' : 'wait';
    broSay(a.mode === 'wait' ? 'wait' : 'follow', true);
    ctx.toast(a.mode === 'wait' ? 'Bro waits here.' : 'Bro follows you.', 'dim');
  };

  // ---------------------------------------------------------------- townsfolk
  function folkLook(role) {
    const fem = Math.random() < 0.5 && role !== 'priest' && role !== 'beggar';
    const o = { skin: pick(SKINS), top: pick(CLOTH), pants: pick([0x3a3027, 0x2e2a26, 0x4a3a2a]), boots: 0x2a1d14, head: fem ? 'long' : pick(['hair', 'hair', 'bald', 'hat']), hair: pick(HAIR), hatColor: pick([0x3a2a1a, 0x2a2a2a, 0x5a3a2a]) };
    if (fem) { o.dress = role === 'child' ? 'short' : 'long'; o.dressColor = pick(CLOTH); }
    if (!fem && Math.random() < 0.45) o.beard = o.hair;
    if (role === 'merchant') o.apron = 0xd8cfb8;
    if (role === 'priest') { o.dress = 'long'; o.dressColor = 0x1c1c22; o.top = 0x1c1c22; o.head = 'bald'; o.beard = 0x9a9590; }
    if (role === 'beggar') { o.top = 0x5a5040; o.pants = 0x4a4234; o.head = 'hood'; o.hood = 0x4a4234; o.beard = 0x9a9590; }
    if (role === 'lamplighter') { o.head = 'hat'; o.hatColor = 0x1a1a1a; o.cape = 0x3a3a4a; }
    if (role === 'bard') { o.top = 0x8a3a6a; o.head = 'hat'; o.hatColor = 0x5a1a3a; o.cape = 0x3a5a8a; }
    if (role === 'child') { o.scale = 0.66; delete o.beard; if (o.head === 'bald' || o.head === 'hat') o.head = 'hair'; }
    return o;
  }
  function spawnVillager(role, x, z, o = {}) {
    const rig = makeHumanoid(folkLook(role));
    if (role === 'bard') hold(rig, 'L', 'lute');
    if (role === 'lamplighter') { hold(rig, 'R', 'pole'); hold(rig, 'L', 'lantern'); }
    if (role === 'priest') hold(rig, 'L', 'lantern');
    let home = null, hd = 1e9;
    for (const d of W.doors) { const k = Math.hypot(d.x - x, d.z - z); if (k < hd) { hd = k; home = d; } }
    const child = role === 'child';
    const a = base('villager', 'town', rig, x, z, {
      role, hp: child ? 25 : 40, R: child ? 0.3 : 0.38, H: child ? 1.2 : 1.75, body: true, home: home || { x, z },
      pocket: role === 'merchant' ? 40 : role === 'beggar' ? 2 : 5 + (Math.random() * 20 | 0), stride: child ? 5.5 : 4.4,
      wait: rand(1, 6), speed: child ? 3.2 : role === 'drunk' ? 0.9 : 1.3, senseT: rand(0, 0.3), lineCd: rand(3, 12), noteT: 0, note: 0, ri: 0, ...o,
    });
    a.spot = o.spot ? { x: o.spot[0], z: o.spot[1] } : null;
    a.ai = villagerAI;
    a.pose = (a) => humanPose(a, {
      sit: a.state === 'sit' ? 1 : 0, cower: a.state === 'cower' ? 1 : 0, talk: a.talking ? 1 : 0,
      lute: a.role === 'bard' && a.state === 'idle' ? 1 : 0, lantern: a.role === 'lamplighter' || a.role === 'priest' ? 1 : 0,
      drunk: a.role === 'drunk' && !a.dead ? 1 : 0, look: a.look || 0,
    });
    a.onHurt = (h) => fright(a, h.from && h.from.pos ? h.from.pos : P.pos, 'hurt');
    return a;
  }
  function fright(a, pos, why) {
    if (!live(a) || a.state === 'flee' || a.state === 'cower') return;
    a.aware = true; a.path = null; a.talking = false;
    a.state = a.role === 'beggar' || a.role === 'child' && why === 'monster' ? 'cower' : 'flee'; a.cowerT = 9;
    const v = ctx.volAt(a.pos);
    if (why !== 'panic') {
      if (v > 0.05) { sfx.scream(v, a.role === 'child' ? 1.5 : rand(0.85, 1.2)); say(TITLE[a.role], pick(SCREAM[why]), a.pos, 30); }
      for (const g of ctx.guards) {
        if (g.dead || g.state === 'alert' || dist(g.pos, a.pos) > 26) continue;
        ctx.investigate(g, pos, 16, true);
        if (why === 'murder') g.det = Math.max(g.det, 0.75);
      }
      for (const o of mine) if (o !== a && o.kind === 'villager' && live(o) && dist(o.pos, a.pos) < 9) fright(o, pos, 'panic');
    }
  }
  function sense(a) {
    if (a.state === 'flee' || a.state === 'cower' || a.state === 'hidden') return;
    if (G.alarm) return fright(a, P.pos, 'alarm');
    if (P.violentT > 0 && dist(a.pos, P.pos) < 18 && ctx.los(a.pos.x, a.pos.y + 1.5, a.pos.z, P.pos.x, P.pos.y + 1.2, P.pos.z)) return fright(a, P.pos, 'murder');
    for (const o of actors) {
      if (o === a || o.gone || dist(a.pos, o.pos) > 14) continue;
      const threat = o.dead ? o.body && !o.reported : (o.team === 'wild' || o.team === 'demon') && o.kind !== 'rift' && o.state !== 'sleep';
      if (!threat || !ctx.los(a.pos.x, a.pos.y + 1.5, a.pos.z, o.pos.x, o.pos.y + 0.5, o.pos.z)) continue;
      if (o.dead) o.reported = true;
      return fright(a, o.pos, o.dead ? 'body' : 'monster');
    }
  }
  function planNext(a) {
    let g;
    switch (a.role) {
      case 'merchant': case 'bard':
        if (dist(a.pos, a.spot) > 0.8) g = [a.spot.x, a.spot.z]; else { a.wait = rand(5, 10); a.faceYaw = a.spotYaw; return; }
        break;
      case 'lamplighter': a.ri = (a.ri + 1) % LAMPS.length; g = LAMPS[a.ri]; break;
      case 'priest': g = pick([[-41, 11.6], [-41, 11.6], [6, 12.9], [0, 18]]); break;
      case 'child': {
        const dog = mine.find((o) => o.kind === 'dog' && live(o) && dist(o.pos, a.pos) < 14);
        g = dog && Math.random() < 0.5 ? [dog.pos.x + rand(-1, 1), dog.pos.z + rand(-1, 1)] : [rand(-8, 8), rand(7, 23)];
        if (dog) dog.chased = 2;
        break;
      }
      case 'drunk': g = Math.random() < 0.6 ? pick(MARKET) : [a.home.x, a.home.z]; break;
      default: {
        const r = Math.random();
        if (r < 0.45) g = pick(MARKET);
        else if (r < 0.75) { const d = pick(W.doors.filter((d) => Math.abs(d.x) < 36 && d.z > -16 && d.z < 52)) || { x: 0, z: 30 }; g = [d.x, d.z]; }
        else g = pick([[0, 45], [0, 32], [0, 2], [-17.3, 15], [17.3, 15], [-41, 12], [-17.3, 40]]);
      }
    }
    a.goal = new V3(g[0] + rand(-0.4, 0.4), 0, g[1] + rand(-0.4, 0.4));
    a.state = 'walk'; a.faceYaw = undefined; a.talking = false;
  }
  function villagerAI(a, dt) {
    a.senseT -= dt; a.lineCd -= dt;
    if (a.senseT <= 0) { a.senseT = 0.3; sense(a); }
    const dP = dist(a.pos, P.pos);
    switch (a.state) {
      case 'hidden':
        a.hideT -= dt;
        if (a.hideT <= 0 && !G.alarm) { a.gone = false; a.state = 'idle'; a.wait = rand(2, 5); a.aware = false; a.rig.root.visible = true; }
        return;
      case 'flee': {
        const r = stepTo(a, a.home.x, a.home.z, a.role === 'child' ? 4.2 : 4.6, dt, 0.8);
        a.mv = 1.8;
        if (r === 'done') { a.state = 'hidden'; a.gone = true; a.rig.root.visible = false; a.hideT = rand(40, 70); }
        else if (r === 'stuck') { a.state = 'cower'; a.cowerT = 8; }
        return;
      }
      case 'cower':
        a.mv = 0; a.cowerT -= dt;
        if (a.cowerT <= 0) { if (a.role === 'beggar') { a.state = 'sit'; a.aware = false; } else a.state = 'flee'; }
        return;
      case 'sit':
        a.mv = 0; a.yaw = turn(a.yaw, a.spotYaw, dt * 2);
        a.look = dP < 6 ? clamp(turn(0, Math.atan2(P.pos.x - a.pos.x, P.pos.z - a.pos.z) - a.yaw, 9), -1, 1) : 0;
        if (dP < 6 && a.lineCd <= 0 && chatCd <= 0) { a.lineCd = 14; chatCd = 4; say('Beggar', pick(LINES.beggar)); }
        return;
      case 'walk': {
        const r = stepTo(a, a.goal.x, a.goal.z, a.speed, dt, 0.5);
        a.mv = a.role === 'child' ? 1.6 : a.role === 'drunk' ? 0.55 : 0.8;
        if (r !== 'move') { a.state = 'idle'; a.wait = a.role === 'child' ? rand(0.5, 2.5) : rand(4, 11); a.mv = 0; if (a.spot && dist(a.pos, a.spot) < 1) a.faceYaw = a.spotYaw; }
        return;
      }
      default: {
        a.mv = lerp(a.mv, 0, 0.2); a.wait -= dt;
        if (a.faceYaw !== undefined) a.yaw = turn(a.yaw, a.faceYaw, dt * 3);
        a.look = dP < 5 ? clamp(turn(0, Math.atan2(P.pos.x - a.pos.x, P.pos.z - a.pos.z) - a.yaw, 9), -0.9, 0.9) : lerp(a.look || 0, 0, 0.05);
        // strike up a conversation with a neighbour
        if (!a.talking && (a.role === 'folk' || a.role === 'drunk')) {
          for (const o of mine) {
            if (o === a || o.kind !== 'villager' || !live(o) || o.state !== 'idle' || !(o.role === 'folk' || o.role === 'drunk') || dist(o.pos, a.pos) > 2.6) continue;
            a.talking = o.talking = true;
            a.faceYaw = Math.atan2(o.pos.x - a.pos.x, o.pos.z - a.pos.z); o.faceYaw = a.faceYaw + Math.PI;
            a.wait = o.wait = Math.max(a.wait, o.wait, rand(6, 10));
            if (dP < 10 && chatCd <= 0) {
              chatCd = 9;
              const [l1, l2] = pick(GOSSIP);
              say(TITLE[a.role], l1); sayQ.push({ t: 3.2, who: TITLE[o.role], line: l2, a: o });
            }
            break;
          }
        }
        if (a.role === 'merchant' && dP < 14 && a.lineCd <= 0 && chatCd <= 0) { a.lineCd = rand(10, 16); chatCd = 4; say('Merchant', pick(LINES.merchant)); a.talking = true; }
        else if (a.role !== 'merchant' && a.role !== 'folk' && dP < 5 && a.lineCd <= 0 && chatCd <= 0) { a.lineCd = rand(14, 22); chatCd = 4; say(TITLE[a.role], pick(LINES[a.role])); }
        if (a.role === 'bard' && dP < 18) {
          a.noteT -= dt;
          if (a.noteT <= 0) {
            a.noteT = 0.34; const f = MELODY[a.note++ % MELODY.length];
            const v = ctx.volAt(a.pos);
            if (f && v > 0.02) { sfx.pluck(f, 0.07 * v); if (a.note % 4 === 1) sfx.pluck(f / 2, 0.04 * v); }
          }
        }
        if (a.wait <= 0) planNext(a);
      }
    }
  }
  L.violence = () => { for (const a of mine) if (a.kind === 'villager' && live(a)) sense(a); };

  // ---------------------------------------------------------------- animals
  function spawnDog(x, z) {
    const rig = makeBeast({ color: pick([0x8a6a45, 0x5a4a3a, 0xb09070]), dark: 0x2a1c12, floppy: true, scale: 0.72 });
    const a = base('dog', 'critter', rig, x, z, { hp: 30, R: 0.35, H: 0.7, home: new V3(x, 0, z), canAssassinate: false, stride: 4.2, barkT: 0, barkAnim: 0, chased: 0 });
    a.ai = dogAI;
    a.pose = (a) => poseBeast(a.rig, { t: a.t, hit: a.hitT || 0, phase: a.phase, move: a.mv, bark: a.barkAnim, wag: a.chased > 0 || a.state === 'idle' && a.wait > 0, dead: a.dead ? a.deathT : 0 });
    a.onHurt = () => { a.fleeT = 6; sfx.bark(2.2, ctx.volAt(a.pos)); };
    return a;
  }
  function dogAI(a, dt) {
    a.barkT -= dt; a.barkAnim = Math.max(0, a.barkAnim - dt * 4); a.chased -= dt;
    if (a.fleeT > 0) { a.fleeT -= dt; const ax = a.pos.x - P.pos.x, az = a.pos.z - P.pos.z, l = Math.hypot(ax, az) || 1; stepTo(a, a.pos.x + ax / l * 4, a.pos.z + az / l * 4, 5, dt); a.mv = 2; return; }
    if (seesPlayer(a, 10 * (0.35 + 0.65 * P.vis), -0.3) && !P.hidden) {
      a.yaw = turn(a.yaw, Math.atan2(P.pos.x - a.pos.x, P.pos.z - a.pos.z), dt * 6); a.mv = lerp(a.mv, 0, 0.3);
      if (a.barkT <= 0) {
        a.barkT = 1.3; a.barkAnim = 1;
        const v = ctx.volAt(a.pos);
        sfx.bark(1.6, v); ctx.makeNoise(P.pos, 9);
        if (chatCd <= 0) { chatCd = 6; ctx.subtitle('*A dog barks at you. Guards will come to look.*'); }
      }
      return;
    }
    if (a.chased > 0) { wander(a, a.pos, 5, 3.4, dt, 0.2, 0.6); a.mv = 1.7; return; }
    wander(a, a.home, 9, 1.4, dt, 2, 7);
  }
  function spawnChicken(x, z) {
    const a = base('chicken', 'critter', makeBird('chicken'), x, z, { hp: 6, R: 0.22, H: 0.45, home: new V3(x, 0, z), canAssassinate: false, stride: 14, peck: 0, cluckT: 0, fleeT: 0 });
    a.ai = (a, dt) => {
      a.cluckT -= dt;
      const dP = dist(a.pos, P.pos), scare = P.sprint ? 5 : P.crouch ? 1.6 : 3.2;
      if (dP < scare && !P.dead) {
        a.fleeT = 1.4;
        if (a.cluckT <= 0) { a.cluckT = 4; sfx.cluck(ctx.volAt(a.pos)); sfx.flap(ctx.volAt(a.pos) * 0.6); ctx.makeNoise(P.pos, 5); }
      }
      if (a.fleeT > 0) { a.fleeT -= dt; const ax = a.pos.x - P.pos.x, az = a.pos.z - P.pos.z, l = Math.hypot(ax, az) || 1; stepTo(a, a.pos.x + ax / l * 3, a.pos.z + az / l * 3, 3.4, dt); a.mv = 1; return; }
      a.peck = a.wait > 0 ? Math.max(0, Math.sin(a.t * 5)) : 0;
      wander(a, a.home, 4, 0.6, dt, 1, 4);
    };
    a.pose = (a) => poseBird(a.rig, { t: a.t, move: a.mv > 0.1, peck: a.peck, flutter: a.fleeT > 0, dead: a.dead });
    return a;
  }
  // crows sit in flocks on rooftops and scatter, cawing, when someone comes too close
  const flocks = [];
  function makeFlock(x, y, z, n, spread) {
    const f = { x, y, z, state: 'perch', t: 0, crows: [] };
    for (let i = 0; i < n; i++) {
      const rig = makeBird('crow');
      const hx = x + rand(-spread, spread), hz = z + rand(-0.3, 0.3);
      rig.root.position.set(hx, y, hz); rig.root.rotation.y = rand(0, 6.28);
      scene.add(rig.root);
      f.crows.push({ rig, hx, hz, v: new V3(), p: new V3(hx, y, hz), ph: rand(0, 6) });
    }
    flocks.push(f);
  }
  function updateFlocks(dt) {
    for (const f of flocks) {
      f.t += dt;
      const dP = Math.hypot(P.pos.x - f.x, P.pos.z - f.z);
      if (f.state === 'perch') {
        if (dP < (P.crouch ? 4 : 8) && Math.abs(P.pos.y - f.y) < 7 && G.state === 'play') {
          f.state = 'fly'; f.t = 0;
          const v = ctx.volAt(new V3(f.x, f.y, f.z));
          for (let i = 0; i < 3; i++) setTimeout(() => sfx.caw(v), i * 160 + Math.random() * 100);
          sfx.flap(v); ctx.makeNoise(P.pos, 9);
          if (chatCd <= 0) { chatCd = 5; ctx.subtitle('*Crows scatter, cawing. Someone may come to look.*'); }
          for (const c of f.crows) c.v.set(rand(-3, 3), rand(3, 5), rand(-3, 3));
        }
      } else if (f.state === 'fly') {
        for (const c of f.crows) {
          c.ph += dt;
          if (f.t < 4) { c.v.y = lerp(c.v.y, 2, dt); c.p.addScaledVector(c.v, dt); }
          else { const a = c.ph * 0.9; c.p.x = lerp(c.p.x, f.x + Math.cos(a) * 14, dt); c.p.z = lerp(c.p.z, f.z + Math.sin(a) * 14, dt); c.p.y = lerp(c.p.y, f.y + 12 + Math.sin(a * 2) * 2, dt); }
        }
        if (f.t > 35) f.state = 'return';
      } else {
        let all = true;
        for (const c of f.crows) {
          c.p.x = lerp(c.p.x, c.hx, dt * 1.2); c.p.y = lerp(c.p.y, f.y, dt * 1.2); c.p.z = lerp(c.p.z, c.hz, dt * 1.2);
          if (Math.abs(c.p.x - c.hx) + Math.abs(c.p.y - f.y) + Math.abs(c.p.z - c.hz) > 0.15) all = false;
        }
        if (all && dP > 12) { f.state = 'perch'; for (const c of f.crows) c.p.set(c.hx, f.y, c.hz); }
      }
      for (const c of f.crows) {
        c.rig.root.visible = dP < 110;
        const prev = c.rig.root.position;
        if (f.state !== 'perch') { const dx = c.p.x - prev.x, dz = c.p.z - prev.z; if (dx * dx + dz * dz > 1e-5) c.rig.root.rotation.y = Math.atan2(dx, dz); }
        prev.copy(c.p);
        poseBird(c.rig, { t: G.t + c.ph, fly: f.state !== 'perch', peck: f.state === 'perch' ? Math.max(0, Math.sin(G.t * 0.7 + c.ph * 3) - 0.6) * 2 : 0 });
      }
    }
  }

  // ---------------------------------------------------------------- beasts of the forest
  const WOLF = { reach: 1.5, wind: 0.32, rec: 0.5, dmg: 9, cd: 0.9, style: 'lunge', turn: 9 };
  function spawnWolf(x, z, pack) {
    const rig = makeBeast({ color: pick([0x4f5156, 0x6a6660, 0x3e3f44]), dark: 0x1e1e22, glowEyes: 0xffd060 });
    const a = base('wolf', 'wild', rig, x, z, { hp: 55, R: 0.5, H: 0.95, pack, stride: 3.4, howlT: 0, wait: rand(1, 4) });
    pack.members.push(a);
    a.ai = wolfAI;
    a.pose = (a) => poseBeast(a.rig, { t: a.t, hit: a.hitT || 0, phase: a.phase, move: a.mv, lunge: a.atk ? Math.sin(clamp(atkP(a), 0, 1) * Math.PI) : 0, howl: a.howlT > 0 ? 1 : 0, sit: a.sitting, dead: a.dead ? a.deathT : 0 });
    a.onHurt = (h) => { if (h.from && h.from !== 'god') { a.target = h.from; a.seenT = 0; alertPack(a); } sfx.bark(2.4, ctx.volAt(a.pos) * 0.7); };
    a.onDeath = () => sfx.bark(2.8, ctx.volAt(a.pos) * 0.8);
    return a;
  }
  function alertPack(a) { for (const o of a.pack.members) if (live(o) && !o.target) { o.target = a.target; o.seenT = 0; o.aware = true; } }
  function wolfAI(a, dt) {
    a.howlT -= dt;
    a.think -= dt; a.seenT += dt;
    if (a.think <= 0) {
      a.think = 0.35;
      const prev = a.target; a.target = pickTarget(a, 17);
      if (a.target && !prev) { alertPack(a); sfx.growl(ctx.volAt(a.pos)); }
      a.aware = !!a.target;
    }
    const T = a.target;
    a.sitting = false;
    if (T) {
      if (!melee(a, T, dt, WOLF)) { const tp = tpos(T); stepTo(a, tp.x, tp.z, 6.2, dt, 1.2); a.mv = 2.2; } else a.mv = lerp(a.mv, 0, 0.3);
      return;
    }
    if (a === a.pack.members[0]) {
      a.pack.howl -= dt;
      if (a.pack.howl <= 0) {
        a.pack.howl = rand(28, 50); a.howlT = 2.5;
        const d = dist(a.pos, P.pos), v = clamp(1 - d / 140, 0, 1);
        if (v > 0.05) { sfx.howl(v); if (!L.heardWolves) { L.heardWolves = true; ctx.subtitle('*Wolves howl somewhere in the forest.*'); } }
      }
    }
    if (a.howlT > 0) { a.mv = 0; return; }
    if (a.wait > 3) a.sitting = true;
    wander(a, a.pack.den, 14, 1.6, dt, 2, 8);
  }

  // ---------------------------------------------------------------- the risen dead
  const SKEL = { reach: 1.7, wind: 0.55, rec: 0.55, dmg: 11, cd: 1.0, style: 'slash' };
  function spawnSkeleton(gr) {
    const rig = makeHumanoid({ bone: true, glowEyes: 0x7dff9a, boots: 0xd8d0bb, head: Math.random() < 0.35 ? 'helm' : 'none' });
    hold(rig, 'R', 'sword'); if (Math.random() < 0.5) hold(rig, 'L', 'shield', { color: 0x4a3a2a });
    const a = base('skeleton', 'wild', rig, gr.x, gr.z, { hp: 45, R: 0.38, H: 1.8, missileMul: 0.5, bleed: 'bone', gone: true, state: 'grave', stride: 3.6, riseT: 0, grave: gr, yaw: Math.PI });
    rig.root.visible = false;
    a.ai = skelAI;
    a.pose = (a) => humanPose(a, { lean: 0.12, look: Math.sin(a.t * 0.7) * 0.3 });
    a.onHurt = (h) => { if (h.from && h.from !== 'god') { a.target = h.from; a.seenT = 0; } sfx.rattle(ctx.volAt(a.pos)); };
    a.onDeath = () => {
      sfx.rattle(ctx.volAt(a.pos)); ctx.burst('bone', a.pos.x, a.pos.y + 1, a.pos.z, 14, 2.6, 0.12, 1.2);
      if (mine.every((o) => o.kind !== 'skeleton' || o.dead) && !L.quests.grave) {
        L.quests.grave = true; G.gold += 150;
        ctx.toast('The graveyard rests again. You find 150 gold among the bones.', 'gold');
      }
    };
    return a;
  }
  function skelAI(a, dt) {
    if (a.state === 'grave') {
      a.think -= dt;
      if (a.think > 0) return;
      a.think = 0.4;
      const near = (p) => Math.hypot(p.x - W.grave.x, p.z - W.grave.z) < 15;
      if ((near(P.pos) && !P.dead) || (L.bro && live(L.bro) && near(L.bro.pos))) {
        a.state = 'rise'; a.riseT = -rand(0, 1.2); a.gone = false; a.rig.root.visible = true; a.aware = true;
        if (!L.dead) { L.dead = true; ctx.subtitle('*The ground splits. The dead are rising!*'); }
      }
      return;
    }
    if (a.state === 'rise') {
      a.riseT += dt;
      const u = clamp(a.riseT / 1.6, 0, 1);
      a.pos.y = terrainY(a.pos.x, a.pos.z) - 1.9 * (1 - ease(u));
      if (a.riseT > 0 && a.riseT - dt <= 0) { sfx.rattle(ctx.volAt(a.pos)); ctx.burst('dust', a.pos.x, a.pos.y + 1.9, a.pos.z, 10, 1.8, 0.8, 1.2); }
      a.noGround = u < 1;
      if (u >= 1) { a.state = 'hunt'; a.noGround = false; }
      return;
    }
    a.think -= dt; a.seenT += dt;
    if (a.think <= 0) { a.think = 0.4; a.target = pickTarget(a, 20, false); }
    const T = a.target;
    if (T) { if (!melee(a, T, dt, SKEL)) { const tp = tpos(T); stepTo(a, tp.x, tp.z, 2.7, dt, 1.2); a.mv = 1; } else a.mv = 0; return; }
    wander(a, W.grave, 10, 1.0, dt, 2, 6);
  }

  // ---------------------------------------------------------------- the bridge troll
  const TROLL = { reach: 2.8, wind: 0.95, rec: 0.8, dmg: 26, cd: 1.5, style: 'slam', aoe: 2.4, turn: 3 };
  function spawnTroll() {
    const rig = makeHumanoid({ skin: 0x6f7f5a, top: 'skin', pants: 0x4a3a28, boots: 'skin', head: 'bald', nose: 'big', tusks: true, build: 1.55, limb: 1.45, scale: 1.7, bareArms: true, belt: 0x3a2a1a });
    hold(rig, 'R', 'club');
    const zz = textSprite('z z z', '#cfe0ff'); zz.scale.set(0.6, 0.15, 1); zz.position.set(0.2, 2.1, 0.2); rig.root.add(zz);
    const a = base('troll', 'wild', rig, W.lair.x, W.lair.z, { hp: 380, R: 0.95, H: 3.05, canAssassinate: false, state: 'sleep', stride: 2.6, yaw: -2.4, zz, lost: 0 });
    a.ai = trollAI;
    a.pose = (a) => humanPose(a, { sit: a.state === 'sleep' ? 1 : a.state === 'rise' ? 1 - clamp(a.riseT / 1.4, 0, 1) : 0, nod: a.state === 'sleep' ? 0.55 + Math.sin(a.t * 0.8) * 0.05 : 0, lean: 0.25 });
    a.onHurt = (h) => { if (h.from && h.from !== 'god') a.target = h.from; wakeTroll(a); sfx.grunt(ctx.volAt(a.pos) * 1.5); };
    a.onDeath = () => {
      L.quests.troll = true; G.gold += 200; sfx.roar(ctx.volAt(a.pos), 0.6);
      ctx.toast("The troll falls. Its hoard of stolen coin is yours: 200 gold.", 'gold');
    };
    return a;
  }
  function wakeTroll(a) {
    if (a.state !== 'sleep') return;
    a.state = 'rise'; a.riseT = 0; a.aware = true; a.zz.visible = false;
    if (!a.target && !P.dead) a.target = P;
    sfx.roar(ctx.volAt(a.pos) + 0.2, 0.8);
    say('Troll', 'WHO WALKS ON MY BRIDGE?!', a.pos, 60);
  }
  function trollAI(a, dt) {
    a.zz.position.y = 2.0 + Math.sin(a.t * 1.2) * 0.08;
    if (a.state === 'sleep') {
      a.mv = 0;
      if (!P.dead && dist(a.pos, P.pos) < (P.crouch ? 2.4 : 4.6)) wakeTroll(a);
      return;
    }
    if (a.state === 'rise') { a.riseT += dt; if (a.riseT > 1.4) a.state = 'hunt'; return; }
    if (a.state === 'home') {
      if (stepTo(a, W.lair.x, W.lair.z, 2.4, dt, 0.8) !== 'move') { a.state = 'sleep'; a.zz.visible = true; a.aware = false; a.yaw = -2.4; }
      a.mv = 0.8;
      return;
    }
    a.think -= dt; a.seenT += dt;
    if (a.think <= 0) { a.think = 0.4; a.target = pickTarget(a, 26, false); }
    const T = a.target;
    if (!T) { a.lost += dt; a.mv = lerp(a.mv, 0, 0.2); if (a.lost > 8) { a.state = 'home'; a.lost = 0; } return; }
    a.lost = 0;
    if (!melee(a, T, dt, TROLL)) { const tp = tpos(T); stepTo(a, tp.x, tp.z, 3.1, dt, 1.8); a.mv = 1; } else a.mv = 0;
  }

  // ---------------------------------------------------------------- the demon rift
  const riftY = terrainY(W.rift.x, W.rift.z);
  const rift = new THREE.Group();
  rift.position.set(W.rift.x, riftY + 3.4, W.rift.z);
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,120,30,0.9)'); gr.addColorStop(0.7, 'rgba(160,10,0,0.7)'); gr.addColorStop(1, 'rgba(40,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(30,0,0,0.55)'; g.lineWidth = 9;
    for (let k = 0; k < 5; k++) { g.beginPath(); for (let i = 0; i < 60; i++) { const a = k * 1.256 + i * 0.09, r = i * 2; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const dm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    rift.userData.d1 = new THREE.Mesh(new THREE.CircleGeometry(1.55, 40), dm); rift.add(rift.userData.d1);
    rift.userData.d2 = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), dm); rift.userData.d2.position.z = 0.02; rift.add(rift.userData.d2);
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 10, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.45, 0.12) }));
    rift.add(ringM);
    rift.userData.light = new THREE.PointLight(0xff4a20, 40, 26, 1.6); rift.add(rift.userData.light);
    rift.rotation.y = 0.6;
    scene.add(rift);
  }
  const heartM = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff2a10, emissiveIntensity: 1.6, roughness: 0.3 });
  function spawnRiftHeart() {
    const root = new THREE.Group();
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), heartM); gem.position.y = 3.4; gem.scale.y = 1.5; root.add(gem);
    const a = base('rift', 'demon', { root }, W.rift.x, W.rift.z, { hp: 260, R: 0.6, H: 3.6, canAssassinate: false, aware: true, bleed: 'spark', yaw: 0, spawnT: 4, gem });
    a.ai = (a, dt) => {
      a.gem.rotation.y += dt * 1.5;
      a.spawnT -= dt;
      if (a.spawnT <= 0 && dist(a.pos, P.pos) < 55 && mine.filter((o) => o.kind === 'imp' && live(o)).length < 3) {
        a.spawnT = rand(6, 9); spawnImp(); sfx.screech(ctx.volAt(a.pos));
      }
    };
    a.pose = () => {};
    a.onHurt = () => { heartM.emissiveIntensity = 4; sfx.clang(ctx.volAt(a.pos) * 0.6); };
    a.onDeath = () => {
      L.quests.rift = true; G.gold += 400;
      rift.userData.closing = 1; sfx.boom(ctx.volAt(a.pos) + 0.3);
      ctx.burst('spark', a.pos.x, a.pos.y + 3.4, a.pos.z, 40, 6, 0.3, 1.2);
      a.gem.visible = false;
      for (const o of mine) if (o.kind === 'imp' && live(o)) kill(o, { from: 'rift' });
      ctx.toast('The rift collapses. The imps burn away with it. +400 gold', 'gold');
    };
    return a;
  }
  function spawnImp() {
    const rig = makeHumanoid({ skin: 0xa8241a, skinEmissive: 0x300800, top: 'skin', pants: 'skin', boots: 'skin', head: 'bald', horns: 0x2a0a06, wings: 0x5a1010, tail: 0xa8241a, glowEyes: 0xffd040, scale: 0.62, bareArms: true, belt: 0x2a0a06 });
    const a = base('imp', 'demon', rig, W.rift.x, W.rift.z, { hp: 26, R: 0.38, H: 1.15, fly: true, ranged: true, canAssassinate: false, y: riftY + 3.4, orbit: rand(0, 6.28), shootCd: rand(1.5, 3), stride: 0 });
    a.ai = impAI;
    a.pose = (a) => humanPose(a, { fly: a.dead ? 0 : 1, atk: a.castT > 0 ? 1 - a.castT / 0.6 : -1, style: 'cast' });
    a.onHurt = (h) => { if (h.from && h.from !== 'god' && h.from !== 'rift') a.target = h.from; sfx.screech(ctx.volAt(a.pos)); };
    a.onDeath = () => { a.fly = false; ctx.burst('spark', a.pos.x, a.pos.y + 0.6, a.pos.z, 12, 3, 0.2, 0.6); };
    return a;
  }
  const _o = new V3(), _dir = new V3();
  function impAI(a, dt) {
    a.think -= dt; a.seenT += dt; a.shootCd -= dt; a.castT = Math.max(0, (a.castT || 0) - dt);
    if (a.think <= 0) { a.think = 0.4; a.target = pickTarget(a, 34); a.aware = !!a.target; }
    const T = a.target;
    a.orbit += dt * 0.55;
    let hx, hy, hz;
    if (T) { const tp = tpos(T); hx = tp.x + Math.cos(a.orbit) * 6.5; hz = tp.z + Math.sin(a.orbit) * 6.5; hy = tp.y + 3.4; }
    else { hx = W.rift.x + Math.cos(a.orbit) * 4; hz = W.rift.z + Math.sin(a.orbit) * 4; hy = riftY + 3.5; }
    if (Math.hypot(a.pos.x - W.rift.x, a.pos.z - W.rift.z) > 70) { a.target = null; }
    const dx = hx - a.pos.x, dy = hy - a.pos.y, dz = hz - a.pos.z, d = Math.hypot(dx, dy, dz);
    if (d > 0.1) { const s = Math.min(d, 6 * dt); a.pos.x += dx / d * s; a.pos.y += dy / d * s; a.pos.z += dz / d * s; }
    a.pos.y = Math.max(a.pos.y, terrainY(a.pos.x, a.pos.z) + 1.2) + Math.sin(a.t * 3) * 0.01;
    if (T) {
      const tp = tpos(T);
      a.yaw = turn(a.yaw, Math.atan2(tp.x - a.pos.x, tp.z - a.pos.z), dt * 6);
      if (a.shootCd <= 0 && seesActorOrPlayer(a, T)) {
        a.shootCd = rand(2.6, 3.8); a.castT = 0.6;
        _o.set(a.pos.x + Math.sin(a.yaw) * 0.4, a.pos.y + 0.9, a.pos.z + Math.cos(a.yaw) * 0.4);
        const vel = T === P ? P.vel : { x: 0, z: 0 }, tt = _o.distanceTo(tp) / 19;
        _dir.set(tp.x + vel.x * tt * 0.6 - _o.x, tp.y + (T === P ? (P.crouch ? 0.7 : 1.2) : T.H * 0.55) + tt * tt * 1 - _o.y, tp.z + vel.z * tt * 0.6 - _o.z).normalize();
        ctx.spawnShot('fire', _o.clone(), _dir.clone(), 19, 9, a);
        sfx.fireball(ctx.volAt(a.pos));
      }
    }
  }
  const seesActorOrPlayer = (a, T) => (T === P ? seesPlayer(a, 40) : seesActor(a, T, 40));
  const DEMON = { reach: 2.6, wind: 0.7, rec: 0.6, dmg: 24, cd: 1.1, style: 'overhead', turn: 5 };
  const novaRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xff5a20, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  novaRing.rotation.x = -Math.PI / 2; scene.add(novaRing);
  function spawnDemon() {
    const rig = makeHumanoid({ skin: 0x3a0d08, skinEmissive: 0x5a1500, top: 'skin', pants: 0x1a0a08, boots: 'skin', head: 'bald', horns: 0x1a0a08, hornSize: 1.7, glowEyes: 0xff8a20, tail: 0x3a0d08, wings: 0x2a0806, build: 1.4, limb: 1.25, scale: 1.5, bareArms: true, belt: 0x1a0a08 });
    hold(rig, 'R', 'greatsword', { flame: true });
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false })); fl.scale.set(0.7, 1.6, 1); fl.position.z = 0.8; rig.props.greatsword.add(fl);
    const a = base('demon', 'demon', rig, W.rift.x + 3, W.rift.z - 4, { hp: 420, R: 0.75, H: 2.75, canAssassinate: false, stride: 2.8, novaT: rand(5, 8), nova: null, wait: 2 });
    a.ai = demonAI;
    a.pose = (a) => humanPose(a, a.nova ? { atk: 0.3, style: 'slam', lean: -0.2 } : { lean: 0.1 });
    a.onHurt = (h) => { if (h.from && h.from !== 'god') a.target = h.from; sfx.grunt(ctx.volAt(a.pos) * 1.4); };
    a.onDeath = () => { L.quests.demon = true; G.gold += 250; sfx.roar(ctx.volAt(a.pos), 1.4); ctx.toast('The hellspawn is banished. +250 gold', 'gold'); };
    return a;
  }
  function demonAI(a, dt) {
    a.think -= dt; a.seenT += dt; a.novaT -= dt;
    if (a.think <= 0) { a.think = 0.4; const prev = a.target; a.target = pickTarget(a, 22); if (a.target && !prev) { sfx.roar(ctx.volAt(a.pos), 1.3); say('Hellspawn', pick(['Your soul smells of theft. Delicious.', 'Kneel, little thief.', 'BURN.']), a.pos, 30); } a.aware = !!a.target; }
    if (a.nova) {
      a.nova.t += dt; a.mv = 0;
      novaRing.position.set(a.pos.x, a.pos.y + 0.12, a.pos.z); novaRing.scale.setScalar(0.5 + a.nova.t * 5); novaRing.material.opacity = 0.7 * (1 - a.nova.t);
      if (a.nova.t >= 1) {
        a.nova = null; a.novaT = rand(8, 11); novaRing.material.opacity = 0;
        ctx.damageArea(a.pos, 5.5, 20, a); sfx.boom(ctx.volAt(a.pos));
        for (let i = 0; i < 16; i++) { const an = i / 16 * 6.28; ctx.burst('spark', a.pos.x + Math.cos(an) * 3, a.pos.y + 0.4, a.pos.z + Math.sin(an) * 3, 2, 3, 0.4, 0.6); }
        G.shake = Math.max(G.shake || 0, 0.5 * ctx.volAt(a.pos));
      }
      return;
    }
    const T = a.target;
    if (T) {
      if (a.novaT <= 0 && dist(a.pos, tpos(T)) < 6 && !a.atk) { a.nova = { t: 0 }; sfx.fireball(ctx.volAt(a.pos) + 0.2); return; }
      if (!melee(a, T, dt, DEMON)) { const tp = tpos(T); stepTo(a, tp.x, tp.z, 3.7, dt, 1.8); a.mv = 1.1; } else a.mv = 0;
      return;
    }
    wander(a, W.rift, 7, 1.3, dt, 2, 5);
  }

  // ---------------------------------------------------------------- gods
  // The Ember God kneels in the northern peaks. Steal his crown and he stands up.
  const GOD = { x: 0, z: -430 };
  const god = makeHumanoid({ fog: false, skin: 0x2b2320, skinEmissive: 0x2a0800, top: 'skin', pants: 'skin', boots: 'skin', build: 1.35, head: 'flame', glowEyes: 0xffb050, horns: 0x1a1210, hornSize: 1.8, gloves: 0x5a1a08, belt: 0x1a1210, shadow: false });
  god.root.scale.setScalar(68);
  god.root.position.set(GOD.x, ctx.terrainHeight(GOD.x, GOD.z) - 3, GOD.z);
  const godEye = new THREE.MeshBasicMaterial({ color: 0x331000, fog: false }), godFlame = new THREE.MeshBasicMaterial({ color: 0x441400, fog: false });
  let godSkin = null;
  god.root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false; o.userData.cs = false;
    const h = o.material.color.getHex();
    if (h === 0xffb050) o.material = godEye; else if (h === 0xffa040) o.material = godFlame;
    else if (o.material.emissive && o.material.emissive.getHex() === 0x2a0800) godSkin = o.material;
  });
  const godGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xff6a20, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
  godGlow.scale.set(1.2, 1.2, 1); godGlow.position.set(0, 0.12, 0.1); god.head.add(godGlow);
  scene.add(god.root);
  const G0 = { wake: 0, waking: false, throwT: 4, atk: -1, t: 0 };
  L.god = G0;
  function godSay(line) { ctx.subtitle(`The Ember God: “${line}”`); }
  L.onCrownStolen = () => {
    G0.waking = true; G0.wake = 0;
    setTimeout(() => { sfx.roar(1, 0.35); G.shake = 1.2; godSay('THIEF. THAT CROWN IS MINE.'); broSay('god', true); }, 1800);
    setTimeout(() => ctx.toast('The Ember God has woken in the north. Get out before his fire finds you!', 'bad'), 4200);
  };
  const meteors = [];
  const meteorGeo = new THREE.SphereGeometry(1.3, 14, 10), meteorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.8, 0.2) });
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xff3a10, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const _hand = new V3();
  function launchMeteor() {
    let tx = P.pos.x + P.vel.x * 1.6 + rand(-6, 6), tz = P.pos.z + P.vel.z * 1.6 + rand(-6, 6);
    if (Math.random() < 0.25) {
      const near = actors.filter((o) => live(o) && (o.kind === 'guard' || o.kind === 'villager') && dist(o.pos, P.pos) < 35);
      if (near.length) { const o = pick(near); tx = o.pos.x; tz = o.pos.z; }
    }
    const ty = ctx.groundAt(tx, tz, 60);
    god.root.updateMatrixWorld(true);
    god.armR.hand.getWorldPosition(_hand);
    const mesh = new THREE.Mesh(meteorGeo, meteorMat);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.flame, color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.setScalar(9); mesh.add(glow);
    const warn = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.4, 40), warnMat.clone());
    warn.rotation.x = -Math.PI / 2; warn.position.set(tx, ty + 0.08, tz);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40), warnMat.clone()); fill.material.opacity = 0.2; fill.rotation.x = -Math.PI / 2; fill.position.set(tx, ty + 0.06, tz);
    scene.add(mesh, warn, fill);
    meteors.push({ mesh, warn, fill, from: _hand.clone(), to: new V3(tx, ty, tz), t: 0, dur: 2.6 });
    sfx.fireball(0.6);
  }
  function updateGods(dt) {
    G0.t += dt;
    if (G0.waking && G0.wake < 1) { G0.wake = Math.min(1, G0.wake + dt / 7); W.setRage(ease(G0.wake)); }
    const w = ease(G0.wake);
    godEye.color.setRGB(0.2 + 1.8 * w, 0.06 + 0.9 * w, 0.0 + 0.2 * w);
    godFlame.color.setRGB(0.27 + 1.6 * w, 0.08 + 0.6 * w, 0.02);
    if (godSkin) godSkin.emissiveIntensity = 0.4 + 2.4 * w;
    godGlow.material.opacity = w;
    if (G0.wake >= 1 && G.state === 'play' && G.hasCrown && P.pos.z < 102) {
      G0.throwT -= dt;
      if (G0.throwT <= 0) { G0.throwT = rand(2.6, 4); G0.atk = 0; }
    }
    if (G0.atk >= 0) { G0.atk += dt / 1.4; if (G0.atk >= 0.45 && G0.atk - dt / 1.4 < 0.45) launchMeteor(); if (G0.atk >= 1) G0.atk = -1; }
    poseHumanoid(god, { t: G0.t * 0.4, dt, kneel: 1 - w, nod: 0.45 * (1 - w) - 0.12 * w, atk: G0.atk, style: 'cast', look: Math.sin(G0.t * 0.15) * 0.15 * w });
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.t += dt;
      const u = Math.min(1, m.t / m.dur);
      m.mesh.position.lerpVectors(m.from, m.to, u * u);
      m.mesh.position.y += Math.sin(u * Math.PI) * 30;
      m.warn.material.opacity = 0.35 + 0.35 * Math.sin(m.t * 14);
      m.fill.scale.setScalar(Math.max(0.01, u));
      if (u > 0.5 && Math.random() < 0.7) ctx.burst('spark', m.mesh.position.x, m.mesh.position.y, m.mesh.position.z, 1, 1.5, 0.8, 0.6);
      if (u >= 1) {
        scene.remove(m.mesh, m.warn, m.fill); m.warn.geometry.dispose(); m.fill.geometry.dispose();
        meteors.splice(i, 1);
        ctx.damageArea(m.to, 4.8, 34, 'god');
        ctx.burst('spark', m.to.x, m.to.y + 0.5, m.to.z, 30, 9, 0.35, 0.9);
        ctx.burst('smoke', m.to.x, m.to.y + 1, m.to.z, 10, 2.5, 3, 3);
        const v = ctx.volAt(m.to);
        sfx.boom(Math.max(0.15, v)); G.shake = Math.max(G.shake || 0, 0.25 + v);
      }
    }
  }
  // The Pale Lady answers prayers at her shrine
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const lady = makeHumanoid({ ghost: ghostMat, dress: 'long', head: 'halo', fog: false, shadow: false });
  lady.root.scale.setScalar(15); lady.root.visible = false;
  lady.root.position.set(W.shrine.x, W.shrine.y - 6, W.shrine.z);
  lady.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.userData.cs = false; } });
  scene.add(lady.root);
  let ladyT = -1;
  function pray() {
    L.quests.blessing = true; G.blessing = true; ladyT = 0; lady.root.visible = true;
    if (W.shrineFx) W.shrineFx.done = true;
    sfx.choir();
    setTimeout(() => ctx.subtitle('The Pale Lady: “Walk unseen, little shadow. The night is yours.”'), 1600);
    ctx.toast('Blessing of the Pale Lady: you are harder to see, and darkness slowly heals you.', 'gold');
  }
  function updateLady(dt) {
    if (ladyT < 0) return;
    ladyT += dt;
    const fade = ladyT < 2 ? ladyT / 2 : ladyT < 6.5 ? 1 : Math.max(0, 1 - (ladyT - 6.5) / 2);
    ghostMat.opacity = 0.32 * fade;
    lady.root.position.y = W.shrine.y - 6 + ease(Math.min(1, ladyT / 3)) * 6;
    lady.root.rotation.y = Math.atan2(P.pos.x - W.shrine.x, P.pos.z - W.shrine.z);
    poseHumanoid(lady, { t: ladyT, cast: 0 });
    lady.armL.s.rotation.set(-0.6, 0, 0.9); lady.armR.s.rotation.set(-0.6, 0, -0.9);
    if (ladyT > 8.5) { ladyT = -1; lady.root.visible = false; }
  }

  // ---------------------------------------------------------------- spawning
  L.reset = () => {
    for (const a of mine) { scene.remove(a.rig.root); const i = actors.indexOf(a); if (i >= 0) actors.splice(i, 1); }
    mine.length = 0;
    for (const m of meteors) scene.remove(m.mesh, m.warn, m.fill);
    meteors.length = 0;
    for (const f of flocks) for (const c of f.crows) scene.remove(c.rig.root);
    flocks.length = 0;
    L.quests = {}; L.heardWolves = false; L.dead = false; L.tip = 0; chatCd = 3; sayQ = [];
    G0.wake = 0; G0.waking = false; G0.atk = -1; G0.throwT = 4; W.setRage(0);
    rift.scale.setScalar(1); rift.userData.closing = 0; rift.userData.light.intensity = 40; rift.visible = true; heartM.emissiveIntensity = 1.6;
    ladyT = -1; lady.root.visible = false; if (W.shrineFx) W.shrineFx.done = false;
    novaRing.material.opacity = 0;

    L.bro = spawnBro();
    spawnVillager('merchant', -10.5, 9.0, { spot: [-10.5, 9.0], spotYaw: 0 });
    spawnVillager('merchant', 10.5, 21.0, { spot: [10.5, 21.0], spotYaw: Math.PI });
    spawnVillager('priest', -41, 11.6);
    spawnVillager('bard', 3.9, 18.2, { spot: [3.9, 18.2], spotYaw: -2.4 });
    spawnVillager('drunk', -3, 12); spawnVillager('drunk', 2.5, 22);
    spawnVillager('lamplighter', -15.5, 6.8);
    spawnVillager('beggar', -5.6, 53.6, { state: 'sit', spotYaw: Math.PI, yaw: Math.PI });
    for (const [x, z] of [[-2, 30], [1.5, 2], [-17, 15], [17, 34], [0, -8], [-6, 18]]) spawnVillager('folk', x, z);
    spawnVillager('child', -2, 16); spawnVillager('child', 2, 14);
    spawnDog(0, 15); spawnDog(-22, 70);
    for (let i = 0; i < 6; i++) spawnChicken(-21 + rand(-3, 3), 69 + rand(-2, 2));
    makeFlock(0, 9.05, 57.4, 6, 2.6);
    makeFlock(W.grave.x + 6, W.grave.y + 5.1, W.grave.z - 6, 5, 0.6);
    makeFlock(-12, 6.05, -20.9, 5, 2.5);
    for (const [den, n] of [[[-46, 142], 3], [[96, 92], 3]]) {
      const pack = { den: new V3(den[0], 0, den[1]), members: [], howl: rand(4, 14) };
      for (let i = 0; i < n; i++) spawnWolf(den[0] + rand(-3, 3), den[1] + rand(-3, 3), pack);
    }
    for (const gr of W.graves.slice(0, 6)) spawnSkeleton(gr);
    spawnTroll();
    spawnRiftHeart();
    spawnDemon();
  };

  L.prompts = () => {
    const out = [];
    const b = L.bro;
    if (b && b.downed && dist(b.pos, P.pos) < 2.3) out.push({ k: 'E', id: 'revive', label: 'Help Bro up', icon: 'i-hand', act: reviveBro });
    if (!L.quests.blessing && dist(P.pos, W.shrine) < 4.2 && Math.abs(P.pos.y - W.shrine.y) < 3) out.push({ k: 'E', id: 'pray', label: 'Pray to the Pale Lady', icon: 'i-hand', act: pray });
    const beg = mine.find((o) => o.role === 'beggar' && live(o) && o.state === 'sit');
    if (beg && dist(beg.pos, P.pos) < 2.4 && L.tip < TIPS.length) {
      out.push({ k: 'E', id: 'coin' + L.tip, label: G.gold >= 10 ? 'Give a coin (10 gold)' : 'Need 10 gold for a secret', icon: 'i-hand', act: () => {
        if (G.gold < 10) return;
        G.gold -= 10; sfx.coin();
        say('Beggar', TIPS[L.tip++]);
      } });
    }
    return out;
  };
  L.marks = () => {
    const m = [];
    if (L.bro && L.bro.mode === 'wait' || L.bro && L.bro.downed) m.push({ x: L.bro.pos.x, z: L.bro.pos.z, cls: 'bro', label: '●' });
    if (!L.quests.blessing) m.push({ x: W.shrine.x, z: W.shrine.z, cls: 'shrine', label: '☾' });
    if (!L.quests.rift) m.push({ x: W.rift.x, z: W.rift.z, cls: 'rift', label: '✶' });
    return m;
  };
  L.status = () => {
    const b = L.bro;
    return { hp: b.hp / b.maxHp, label: b.downed ? 'DOWN' : b.target ? 'FIGHTING' : b.mode === 'wait' ? 'WAITING' : 'WITH YOU', down: b.downed };
  };
  L.onNoise = (pos, r) => {
    for (const a of mine) if (a.kind === 'troll' && a.state === 'sleep' && dist(a.pos, pos) < r * 0.9) wakeTroll(a);
  };
  L.onKill = (a, h) => {
    if (h.from === L.bro && a.kind !== 'chicken') broSay('kill');
    else if (h.from === P && h.silent && Math.random() < 0.4 && L.bro && live(L.bro) && dist(L.bro.pos, P.pos) < 15) broSay('stealth');
  };
  L.nearestFoe = (g, range) => {
    let best = null, bd = range;
    for (const o of mine) {
      if (!live(o) || (o.team !== 'wild' && o.team !== 'demon') || o.kind === 'rift' || o.state === 'sleep') continue;
      if (o.fly && !g.s.fixed) continue;
      const d = dist(o.pos, g.pos);
      if (d >= bd || !ctx.los(g.pos.x, g.pos.y + 1.6, g.pos.z, o.pos.x, o.pos.y + o.H * 0.6, o.pos.z)) continue;
      best = o; bd = d;
    }
    return best;
  };

  // ---------------------------------------------------------------- per frame
  let shadowT = 0;
  L.update = (dt) => {
    chatCd -= dt;
    for (let i = sayQ.length - 1; i >= 0; i--) { const q = sayQ[i]; q.t -= dt; if (q.t <= 0) { sayQ.splice(i, 1); if (live(q.a)) say(q.who, q.line); } }
    shadowT -= dt;
    const doShadows = shadowT <= 0;
    if (doShadows) shadowT = 0.5;
    let threat = 0;
    for (const a of mine) {
      const d = dist(a.pos, P.pos);
      if (a.gone) { a.ai(a, dt); continue; }
      a.rig.root.visible = d < 150;
      if (a.dead) {
        if (a.deathT < 1) {
          a.deathT = Math.min(1, a.deathT + dt * (a.rig.legL ? 1.4 : 2.2)); a.pdt = dt;
          if (!a.noGround) a.pos.y = lerp(a.pos.y, groundY(a), a.kind === 'imp' ? 0.2 : 1);
          a.rig.root.position.copy(a.pos); a.pose(a);
        }
        continue;
      }
      a.acc += dt;
      if (d > 80 && a.acc < 0.2) continue;
      const sdt = Math.min(a.acc, 0.25);
      a.acc = 0; a.t += sdt; a.atkCd -= sdt; a.pdt = sdt;
      if (a.hitT) a.hitT = Math.max(0, a.hitT - sdt * 3.5);
      if (a.stun > 0) { a.stun -= sdt; a.atk = null; } else a.ai(a, sdt);
      if (!a.fly && !a.noGround) a.pos.y = groundY(a);
      a.rig.root.position.copy(a.pos); a.rig.root.rotation.y = a.yaw;
      if (d < 150) a.pose(a);
      if (doShadows && a.rig.legL || doShadows && a.rig.legs) setShadow(a.rig, d < (G.shadowDist ?? 22));
      if ((a.team === 'wild' || a.team === 'demon') && a.target === P && d < 35) threat++;
    }
    // keep bodies from stacking up
    for (let i = 0; i < mine.length; i++) {
      const a = mine[i];
      if (!live(a) || a.fly || dist(a.pos, P.pos) > 40) continue;
      for (let j = i + 1; j < mine.length; j++) {
        const b = mine[j];
        if (!live(b) || b.fly) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, r = (a.R + b.R) * 0.85, d2 = dx * dx + dz * dz;
        if (d2 >= r * r || d2 < 1e-6 || Math.abs(a.pos.y - b.pos.y) > 1.5) continue;
        const d = Math.sqrt(d2), push = (r - d) * 0.5;
        a.pos.x -= dx / d * push; a.pos.z -= dz / d * push; b.pos.x += dx / d * push; b.pos.z += dz / d * push;
      }
    }
    if (L.bro && L.bro.tag) L.bro.tag.material.opacity = clamp((dist(L.bro.pos, P.pos) - 4) / 4, 0, 1);
    L.threatN = threat;
    updateFlocks(dt);
    updateGods(dt);
    updateLady(dt);
    rift.userData.d1.rotation.z += dt * 1.6; rift.userData.d2.rotation.z -= dt * 2.4;
    if (rift.userData.closing > 0) {
      rift.userData.closing = Math.max(0, rift.userData.closing - dt * 0.8);
      rift.scale.setScalar(Math.max(0.001, rift.userData.closing)); rift.userData.light.intensity = 40 * rift.userData.closing;
      if (rift.userData.closing === 0) rift.visible = false;
    } else if (rift.visible) {
      rift.userData.light.intensity = 32 + Math.sin(G.t * 7) * 8;
      if (Math.random() < 0.3 && dist(rift.position, P.pos) < 60) ctx.burst('spark', rift.position.x + rand(-1.5, 1.5), rift.position.y + rand(-1.5, 1.5), rift.position.z, 1, 1.2, 0.18, 0.9);
    }
    heartM.emissiveIntensity = lerp(heartM.emissiveIntensity, 1.6 + Math.sin(G.t * 4) * 0.4, 0.1);
  };

  return L;
}
