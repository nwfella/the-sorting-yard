# The Sorting Yard — SPEC

A classification & sorting game for a young train fan (≈4–7). Single-file HTML, zero network deps, procedural train art, works offline on desktop + tablet + phone.

## The learning goal (from the user's brief)
Pattern recognition, data organization, visual discrimination, and **rule-following flexibility** — sorting by one attribute, then by a second attribute *within* the first groups (multi-pass rules).

## Two modes

### 1. Dispatcher's Orders (guided challenges)
Progressive levels, each a rule to follow. Cards sit in the staging tray; the kid drags (or tap-tap) them into labeled sidings; **Check the Yard** grades the placement.

| # | Level | Rule | Bins | Cards |
|---|-------|------|------|-------|
| 1 | Steam or Diesel? | fuel | steam 💨 / diesel ⚙️ | 8 |
| 2 | Freight or Passenger? | service | freight 📦 / passenger 🧳 | 8 |
| 3 | Count the Wheels | wheels | 4 / 6 / 8 | 12 |
| 4 | Color Parade | color | red 🔴 / blue 🔵 / green 🟢 | 9 |
| 5 | Old-Timey or Space-Age? | era | retro 🕰️ / modern 🛸 | 8 |
| 6 | Wheels, **Then** Color | two-pass | stage A: 3 wheel sidings → stage B: color sub-lanes inside each siding | 12 |
| 7 | Double Duty | fuel × service | 4 combo bins (Steam+Freight, Steam+Passenger, Diesel+Freight, Diesel+Passenger) | 12 |

**Anti-shortcut deck building:** within each level, non-target attributes are spread ~evenly across target groups (e.g. steam isn't all red, wheels aren't all the same color), so the kid must use the *named* attribute. Levels 3 & 4 include near-twin cards (same color/type, different wheel counts) to force genuine discrimination.

**Two-pass rule (level 6):** stage A sorts into 3 wheel sidings. After a correct stage A check, each siding grows color sub-lanes (stage B). The final check validates the **full hierarchy** (wheel group AND color lane). This is the "sort by wheels, then by color" from the brief.

**Stars:** 0 wrong = 3★, ≤2 = 2★, else 1★. Best per level in `localStorage` (`tsy_best_<id>` = JSON `{m, t}`). Wrong = a card reported wrong by a Check (mistake counter).

### 2. Build Your Own Yard (free play)
Kid picks 6/9/12 random trains, 2–4 sidings, **names the sidings himself** (tap the plaque → type, or suggestion chips). No right/wrong.

- **"Read My Mind"** button: the app analyzes the placement and guesses the kid's rule (any attribute where every bin is homogeneous and ≥2 values are used). If bins are mixed → "I can't figure it out — try making each pile have one thing in common!" and shows per-bin breakdown. If two attributes are both uniform → reports both. This turns free play into pattern-recognition feedback.
- **"Roll a Rule"** button: suggests a random rule (including multi-pass ones) for inspiration.

## Card design (visual discrimination)
Each card = one locomotive + one trailing car, drawn procedurally on a per-card canvas (like the memory-game faces pattern):
- **fuel:** steam = boiler, smokestack + smoke puffs, steam dome, cowcatcher, bell; diesel = boxy body, roof fan, stripes, no stack.
- **service:** freight car = open cargo (coal hopper / logs / crates); passenger car = coach with windows + tiny passengers.
- **wheels:** total 4 / 6 / 8 — drawn large & chunky (spoked wheels, light hubs) so they're countable at a glance. 4 = loco 1 pair + car 1 pair; 6 = loco 2 + car 1; 8 = loco 2 + car 2.
- **color:** locomotive body color (red/blue/green/orange/purple).
- **era:** retro = gold trim, brass bell, round shapes; modern = angular cab, silver roof, bright stripe.

Tap/pick a card → voice reads its attributes ("Red old-timey freight steam train… six wheels") when voice is on.

## Interaction
- Pointer Events drag (mouse/touch/stylus unified) + **tap-tap fallback** (tap card → it lifts; tap a siding → it places; tap empty → returns). Big chunky cards, generous drop zones, `.highlight` on hovered zone, placeholder keeps layout stable while a card floats.
- Keyboard: arrows to navigate slots (tray cards + sidings/lanes), Enter/Space pick up & drop, Esc cancels, M mute, H hint.
- Check button is locked while cards remain in the tray ("some trains are still in the yard entrance!").
- Non-blocking overlays (skill pattern: `pointer-events:none` by default, `.active` opts in; buttons inherit).
- Hint button: Dispatcher's Tip (text + voice), e.g. "Steam engines have a smokestack and puff smoke."

## Audio / voice
- WebAudio SFX: pick blip, drop thunk, correct chime, sad-horn wrong, star ding, win jingle. Mute toggle (M), persisted.
- `speechSynthesis` reads: level rules, hints, card attributes on pickup, win praise. Separate Voice toggle (local OS voices, offline). Guarded, no network.

## Persistence (per-game prefix `tsy_`)
`tsy_best_<id>` best per level · `tsy_muted` · `tsy_voice` · `tsy_win_<id>` (first-clear flag for level select stars).

## Verification contract
- `window.GAME = { start(levelId), menu, freePlay(opts), check, readMyMind, state(), getDeck(), place(cardId, binId), setKey, tick }` — drives the Node harness (`harness.js`, DOM-stubbed) and the preview-pane selftest (`selftest.html`, auto-boot + pixel probes + report mirrored into `document.title`).
- Harness asserts: deck balance per level (target values equal counts, non-targets spread), check engine (all-right = 0 mistakes; one wrong = 1), two-pass flow (stage A pass → stage B expands; hierarchy check catches wrong lane), star thresholds, read-my-mind detection (uniform → rule; mixed → none), menu-state guards, keyboard nav, localStorage prefix.
- Selftest probes train-art canvases (body color present, wheel pixels present, steam smoke pixels) with tolerance, report PASS/FAIL.

## Deploy
Repo `nwfella/the-sorting-yard` → GitHub Pages (`.nojekyll`, branch root), matching the sibling game repos.
