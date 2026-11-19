# Crows of Ravenmoor

A first-person medieval stealth and combat game that runs in the browser. It is
self-contained: no build step, no assets to download. The town, textures,
music and sound effects are all generated in code. The only dependency is
three.js, which is copied into `vendor/`.

## Run it

Browsers won't load ES modules from `file://`, so serve this folder:

```sh
cd game
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works.

## The heist

Night has fallen on the walled town of Ravenmoor. The Ember Crown sits in the
keep's treasury, and Lord Marshal Varek carries the key.

1. **Get inside.** Guards watch the gate. Scaffolding on the east wall, the
   rooftops and the hay piles under the walls offer quieter ways in.
2. **Take the key.** Pick the Marshal's pocket from behind, or kill him. His
   death also pays a 500-gold contract.
3. **Steal the crown** from the treasury behind the throne in the great hall.
   This rings the alarm bell and brings reinforcements.
4. **Escape** across the river to your camp in the south.

You get a rank at the end: Phantom, Ghost, Shadow, Cutthroat or Butcher. It
depends on how often you were hunted and how many people you killed.

## Play styles

- **Sword:** left click for a three-hit combo (the third swing is heavy).
  Right click blocks; block just before a hit lands to parry and stagger the
  attacker.
- **Bow:** hold left click to draw and release to fire. A full draw zooms in
  and hits harder. You can pick arrows back up.
- **Crossbow:** a single shot that hits very hard, then a slow reload. Right
  click zooms in.
- **Assassin:** sneak up behind a guard, or drop on one from above, and press
  **F** to kill silently. Guards who aren't alert take extra damage from every
  weapon, and headshots double it again.
- **Thief:** press **E** to pick pockets from behind and loot chests. Press
  **Q** for a smoke bomb that blinds nearby guards, and **V** to whistle a
  guard over to you.

## Stealth

The gem above your weapon bar shows how visible you are. Torchlight exposes
you; darkness, crouching (**C**) and bushes hide you. Footsteps make noise:
sprinting and wading are loud, crouching is nearly silent. Guards build
suspicion before they raise the alarm, investigate sounds, notice bodies, and
call nearby guards when they spot you. If you break line of sight long enough,
they give up the hunt.

## Controls

| Action | Key |
| --- | --- |
| Move / sprint | W A S D / Shift |
| Look | Mouse (or arrow keys) |
| Jump, climb ledges | Space |
| Crouch | C |
| Attack / draw / shoot | Left click |
| Block, parry, aim | Right click |
| Weapons | 1 2 3 4 or mouse wheel |
| Assassinate | F |
| Use, loot, pick pocket | E |
| Smoke bomb / heal / whistle | Q / H / V |
| Pause / mute | P / M |

## Code

- `js/world.js`: terrain, town, keep, forest, sky, lighting, painted
  textures, and guard placements.
- `js/main.js`: player movement and climbing, weapons, guard AI with A*
  pathfinding over a navigation grid, stealth, HUD, and game flow.
- `js/audio.js`: WebAudio sound effects, wind, and adaptive music.
