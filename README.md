# Battlefront: Reforged v2

A flat, GitHub-Pages-ready browser game inspired by the third-person Tower Battles: Battlefront format.

## IMPORTANT
This ZIP intentionally contains NO folders. Upload every file directly to a GitHub repository root.

## v2 systems
- Third-person-style arena combat with a camera that follows the player
- Play as Defenders/Towers or Zombies
- 40-wave Classic mode
- 40-wave Hardmode
- Full Sandbox control panel
- Player bots on the Defender team
- Zombie Mode-style playable zombie roster
- Kings, Lords, Void and Void2-style endgame ladder
- Cash earned during combat
- Class roster swapping
- Boss health bars
- Respawns, kill feed, wave timer, ammo/reloading
- Mobile/iPad twin-stick controls
- Halloween Front event through Nov 1, 2026
- Fall Front event through Dec 1, 2026
- Six maps including seasonal maps and a Sandbox-themed map
- Local save data for level, XP, wins, cash, Candy and Leaves
- Procedural sound effects; no external audio required
- No third-party libraries or CDNs required

## Controls
WASD / Arrow Keys = move
Mouse = aim
Left click / Space = attack
Shift = sprint
Q / E = abilities
R = reload
Tab = roster
N = Sandbox menu

## GitHub Pages
1. Create a repository.
2. Upload all six files from the ZIP directly into the repository root.
3. Enable GitHub Pages from the main branch/root.
4. Open the Pages URL.

All game code, maps, UI, and art in this build are original. It imitates the broad TBBF gameplay format without copying its source code or proprietary assets.

## v2.1 Combat AI patch
- Defender bots aggressively detect and target the human player in Zombie mode.
- Defender bullets and rockets damage the human Zombie player.
- Zombie AI actively targets the human player when playing as a Tower.
- Human players are prioritized at close/medium range so combat feels intentional instead of accidental.

## v2.2 Audio + polish
- Procedural lobby, battle, and boss music with no external copyrighted audio.
- Weapon, hit, hurt, kill, death, reload, wave, UI, and ability sound effects.
- Settings panel with Master, Music, and SFX volume from 0% to 2000%.
- Audio limiter for extreme boost settings.
- Persistent audio/gameplay settings.
- Camera shake slider and optional damage numbers.
- Fixed Defender shotgun/ram bots getting stuck outside their useful range.
- Fixed Zombie class wave unlock enforcement.
- Fixed swapping classes while alive outside Sandbox.
- Fixed boss HUD disappearing when another boss is still alive.
- Boss music correctly returns to battle music after the last boss dies.

- AI combat audio is intentionally filtered so huge waves do not create unbearable sound spam or thousands of damage-number elements.

## v2.3 S+ systems pass
- Rebuilt early wave pacing: 4 Normal -> 6 Normal -> 8 Normal -> 5 Speedy, then gradual mixed escalation.
- 40-wave Classic with Kings and escalating late-game bosses.
- Hardmode automatically replaces King encounters with Lord variants.
- Added King Hidden Boss, Lord Hidden Boss, and Lord Boss3 to the playable roster.
- Added playable Halloween zombies: Mummy, Witch, Reaper, Jack, King Jack.
- Added playable Fall zombies: Leaf Runner, Scarecrow, Gourd Brute, Autumn King, Autumn Lord.
- Added Halloween Tower: Lantern Bomber.
- Added Fall Tower: Harvest Ranger.
- Added Halloween Assault: dedicated 15-wave event mode.
- Added Autumn Siege: dedicated 20-wave event mode.
- Seasonal decorations now populate maps: pumpkins, graves, candles, hay, leaf piles, autumn trees.
- Much busier simulated servers: 18 Defender bots normally, 24 in Private Grind, 16 in event modes.
- Zombie Mode now adds 9 Zombie player bots normally, 12 in Private Grind, and 8 in event modes; they respawn and upgrade over time.
- Defender bots now have their own cash, kills, class progression and upgrades.
- Bots earn wave income and kill income, then buy stronger Towers as the match progresses.
- Added Private Grind Server mode with extra bots and +25% XP.
- Private Grind in this static build is a local private session. True online invite-only servers require a network backend.
- Event modes have their own wave totals, event rewards and final-boss result text.
- Reworked boss-wave detection so timers/music match the actual current wave table.
- Additional bug fixes for dynamic wave totals and Sandbox wave display.

### v2.3 hotfixes
- Projectile ownership now preserves kill credit for both the human Defender and AI Defender bots.
- Ranged kills correctly award match cash and bot cash.
- Bot upgrade ranks now match their starting Tower and cannot accidentally downgrade.
- Fixed Halloween/Fall event reward detection.
- Upgraded long-range bot projectiles now live long enough to reach their intended range.

## v2.3.1 interruption-resume fixes
- Fixed Zombie player bots permanently dying after their first elimination.
- Increased bot wave income so class/tower upgrades happen often enough to visibly change the team during a match.
- Defender bot nameplates now show their current Tower, upgrade level and cash so their progression is visible.
- Fixed an out-of-scope audio click listener that could throw `AUDIO is not defined` on button clicks.

## v3 S-Prime → S+ systems pass
- Levels now scale into the thousands. XP requirement grows slowly enough to make Level 6000 grindy but reachable.
- Zombie Mode unlocks at Level 500.
- Tower milestones include Level 1000 Shock Trooper and Level 2000 Overseer.
- Every King requires Level 3000. Planet3arth requires Level 4000. Every Lord requires Level 6000.
- Major bosses (Void, Void2, King Jack, Autumn Lord and Anomaly Majors) are never playable.
- Normal/Classic final Major is Void. Hardmode final Major is Void2.
- Major bosses have dedicated defeat timers; if Towers run out of time they lose. Zombie players win by protecting the Major until the timer expires.
- Paid Zombie classes are one-life purchases. Death forces the player back to Normal, starts a cooldown, and the class must be purchased again.
- Lords cost $50,000 per use.
- Mode wins give 0 XP. XP is granted live only for the human player's own damage and eliminations. Bot kills and wave clears do not level the human.
- Private Grind gives +25% personal combat XP, never passive/win XP.
- Every non-Sandbox victory unlocks both a Tower reward and Zombie reward for that mode.
- Added many more Towers plus victory-reward Towers/Zombies.
- Added selectable skins. A 4.5% rare post-victory Anomaly can interrupt a Tower win with strange music, two odd bosses, then a special version of the mode's Major boss; defeating it unlocks a skin.
- Boss rendering was rebuilt with oversized armor, crowns, glowing chest cores, spikes, energy weapons, neon cracks and special silhouettes inspired by the supplied TBBF boss reference images without copying those assets.
- Tower bots are substantially nerfed in health, damage, aim accuracy, fire rate, upgrade power and upgrade pacing.
- Zombie player bots no longer earn XP for the human.
- Fixed the interrupted v2.3 settings syntax bug.

- Paid Zombie purchases can be queued while dead. The class is charged once, used for the next life, then goes on cooldown after death; the player falls back to Normal unless another class is bought.
- Failing the rare Anomaly bonus keeps the underlying mode victory, but awards no secret skin.
- Seasonal victory reward classes stay usable after the seasonal mode closes.
- Sandbox ignores level requirements for playable test classes, while Major bosses remain spawn-only.
- Added Level 8000 Eclipse General as an extreme endgame Tower milestone.


## v4.1 iOS stability recovery
- Safe localStorage wrapper: the game no longer dies when Safari/File preview blocks storage.
- Start validation happens before hiding the lobby, preventing blank-screen failures.
- Stronger iPad/iPhone detection using maxTouchPoints + touch support.
- Pointer controls now include touch-event fallback and pointer-capture error handling.
- Mobile ability buttons use reliable click/tap handlers.
- Audio initialization is guarded so Safari audio restrictions cannot crash the game.
- Runtime errors surface visibly instead of silently leaving a dead screen.
- iOS safe-area / touch-callout / overscroll hardening.

## v4.2 — TBBF wave pacing + iOS upgrade fix
- Keeps the documented Classic wave totals (for example 15 Normals on Wave 1, 25 Normals on Wave 2, 15 Speedies + 20 Normals on Wave 3) but stops dumping the entire wave onto the arena at once.
- Adds an active NPC cap that grows from 14 early-game to 30 late-game; the rest of each wave stays queued and streams in as enemies die.
- Adds a HUD Horde counter showing ACTIVE and QUEUED counts.
- Adds a dedicated large UPGRADE button on iPhone/iPad.
- Mobile Upgrade displays the next cost or required wave and supports direct touch/pointer input.
- Hardened all mobile action buttons with pointer-up + touch-end + click fallback and debounce.

## v4.3 — researched boss design accuracy pass
This pass removes the old shared "same armored body + different glow" boss renderer.

Research-backed visual identities now include:
- Boss1: green skin, diamond-plate armor and armbands; no crown or chest core.
- King Boss1: bright-green skin, diamond-plate armor/crown, black cape and emerald chest core.
- Lord Boss1: molten-rock skin, black armor/cape, black crown with red crystal and double armbands.
- Boss2 / King Boss2 / Lord Boss2 now share a visibly corroded family lineage, with Lord Boss2 using dark-blue skin and cyan crystal growths.
- Boss3 is a gold suit/top-hat boss in Classic; King Boss3 gets the brown armor, gold tie, top hat + crown identity; Lord Boss3 is pale/green-neon.
- Boss4 has its asymmetrical black outfit and head knife; King Boss4 uses massive green diamond-plate armor; Lord Boss4 is the huge black/purple six-wing neon Lord.
- Boss5 uses its dominus/torn-sleeve/ragged-cape silhouette.
- Guardian uses a dominus, visible eyes, energy details and a huge axe.
- King/Lord Hidden bosses now have separate trench-coat vs spectral/granite silhouettes.
- Void and Void2 now have separate silhouettes instead of being recolors: Void is huge/veined/crystalline, while Void2 has six wings, floating crystal and a giant greatsword.

The in-game Boss Index now states each researched visual identity.

## v4.4 — persistent Tower upgrades + respawn loadout
- Tower upgrade levels are now saved per Tower for the entire match.
- Dying no longer resets Upgrade 4 back to Upgrade 1.
- Switching away from an upgraded Tower and later returning to it restores its saved upgrade level.
- Buying a Tower once owns it for the rest of that match; selecting it again is free.
- Selecting a Tower while alive queues it as NEXT RESPAWN instead of instantly swapping.
- Selecting a Tower while dead changes the queued respawn Tower.
- The Tower roster automatically opens shortly after death so mobile players can quickly choose what they want next.
- Respawn time is 5 seconds to give touch players a fair selection window.
- HUD now displays NEXT: <Tower> • UPGRADE <level>.
