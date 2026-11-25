# Crows of Ravenmoor

A first-person medieval stealth and combat game that runs in the browser. It is
self-contained: no build step. The town, textures, music and sound effects are
all generated in code. The people are Mixamo characters moving with Mixamo
motion capture. The only dependency is three.js, which is copied into
`vendor/`.

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

## A living world

- **Bro**, your partner in crime, walks at your side, sneaks when you sneak,
  and wades into any fight that comes for you. Press **G** (or the Bro button)
  to make him wait or follow. If he goes down, get to him and help him up.
- **The town is alive.** Merchants cry their wares, a bard plays by the well,
  drunks stagger about, a priest walks his rounds, a lamplighter tends the
  lamps, a beggar sells secrets for a coin, and children chase a dog through
  the square, and a dancer dances to the bard's song. They gossip, often about
  things worth knowing: one talks with their hands while the other nods or
  shakes their head. Kill in front of them and they scream for the guards and
  run home to hide.
- **Animals give you away.** Dogs bark at you, chickens flap and cluck, and
  crows on the rooftops scatter, cawing, when you come too close.
- **Beyond the walls:** wolf packs howl in the forest, a troll sleeps by the
  river bridge (sprinting wakes it), and the dead climb out of their graves
  west of the walls. Guards fight any monster that comes into view.
- **The demon rift** burns in the ruined tower west of the bridge. Imps fly
  out and throw fire, and a hellspawn with a flaming greatsword guards it.
  Smash the rift's heart to seal it.
- **Gods.** Pray at the Pale Lady's shrine on the hill by your camp and she
  appears and blesses you: you're harder to see, and darkness heals you. The
  Ember God kneels in the northern peaks. Steal his crown and he stands up,
  the sky burns red, and he hurls meteors at you all the way out of town.
  Glowing rings on the ground show where they'll land.

Press **T** to switch between third person (the default) and first person.

## The people

Everyone in town is a Mixamo character. Guards wear Mixamo's armoured Soldier
(archers in green, the Marshal in gold with his crown and cape). Men, Bro and you are
Mixamo's Alpha mannequin, and women are Michelle or the X Bot mannequin, each
repainted in their own colours and wearing the town's hats, hoods, hair,
capes and dresses. They carry the game's swords, shields, bows, axes and
lanterns in their hands. Monsters, beasts and gods are made in code.

Far-off people switch to light stand-in bodies, which keeps the game smooth
on phones; the distance depends on the graphics quality setting.

## Finding your way

- A gold diamond on screen marks your objective, with its distance. When it's
  off screen it becomes an arrow at the edge.
- **M** (or the map button) opens a map of the town and the land around it,
  with you, Bro, your objective, unopened chests, the shrine and the rift.
- Tips appear the first time something new happens (being spotted, getting
  hurt, a new weapon, the shrine, the rift). Each shows once.
- If you die, you can retry from the last checkpoint: entering town, taking
  the key, or taking the crown.

## Settings

The settings panel (from the start screen or the pause menu) has graphics
quality, camera view, look sensitivity, invert look, volume, music volume,
camera shake and a frame-rate readout. Choices are remembered. Graphics
quality controls resolution, bloom, shadows and grass density, and the game
steps it down on its own if the frame rate drops too low.

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

## Playing on a phone or tablet

Touch controls appear automatically. Hold the phone sideways.

- **Move:** put your left thumb anywhere on the left side and a stick appears
  under it. Push it to the edge to run.
- **Look:** drag anywhere on the right side.
- **Buttons, bottom right:** Strike (hold it to draw the bow), Jump (hold it at
  a ledge to climb), Sneak, and Block (Aim when the crossbow is out).
- **Prompts:** tap them when they appear (Assassinate, Pick pocket, Open
  chest).
- **Weapons and items:** tap the weapon bar at the bottom, and the smoke,
  draught, whistle, Bro and camera buttons under your gold. The pause button
  is top right.

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
| Bro: wait or follow | G |
| Third or first person | T |
| Map | M |
| Pause (sound and settings are in the pause menu) | P |

## Code

- `js/world.js`: terrain, town, keep, forest, sky, lighting, painted
  textures, and guard placements.
- `js/main.js`: player movement and climbing, weapons, the first- and
  third-person cameras, guard AI with A* pathfinding over a navigation grid,
  stealth, combat between every kind of creature, HUD, and game flow.
- `js/actors.js`: builds every character (people, wolves, birds, demons,
  gods) from rounded parts on a joint skeleton, and animates them. People
  stand, walk, run, sneak, nod and dance with motion capture, with the stride
  locked to the ground so feet don't slide; sword swings, bow draws, blocking,
  climbing, sitting, flinching and falling are layered on top.
- `js/mocap.js`: the motion capture, baked into the skeleton's joint angles.
- `js/mixamo.js`: loads the Mixamo characters and drives each one's skeleton
  from the game's joint rig, so they do everything the game's people do;
  moves hats, capes and weapons onto their bones; and swaps distant people to
  light stand-ins.
- `models/`: the Mixamo characters. Their animations were stripped, their
  T-pose made the default pose and the Soldier turned to face forward
  (`tools/slim-glb.py`). The mannequins were simplified to 30% of their
  triangles (`tools/simplify-glb.cjs`), and the Alpha mannequin was converted
  from three.js's `Samba Dancing.fbx` with its FBX loader and glTF exporter.
- `tools/bake-mocap.mjs`: the offline baker that made `mocap.js` (its header
  says how to run it).
- `js/life.js`: Bro, the townsfolk and their animals, the monsters, the
  demon rift, the gods, and the meteors.
- `js/nature.js`: grass and wind, the river shader, chimney smoke, torch
  embers, mist and laundry.
- `js/post.js`: bloom and colour grading.
- `js/audio.js`: WebAudio sound effects, wind, and adaptive music.
- `vendor/jsm/`: three.js's post-processing passes, copied unchanged.

## Credits

The characters (Soldier, Alpha, X Bot and Michelle) and the idle, walk, run,
sneak, nod, head-shake and samba animations are from Mixamo (mixamo.com,
Adobe), taken from the models that ship with the three.js examples. Guards
move with the Soldier's walk, run and ready stance; everyone else with the X
Bot's. Everything else is made in code.
