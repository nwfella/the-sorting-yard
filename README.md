# 🚂 The Sorting Yard

A classification & sorting game for young train fans. Sort procedurally-drawn trains into sidings by steam/diesel, freight/passenger, wheel count, color, era — or **two rules in a row** ("wheels, THEN color"). In Build Your Own Yard, the kid makes the rules, names his own sidings, and the game tries to read his mind.

**Live:** https://nwfella.github.io/the-sorting-yard/

## Features
- **7 Dispatcher's Orders levels** — progressive rules: fuel, service, wheel counting, color, era, a two-pass rule (wheels then color, with nested color lanes and full hierarchy checking), and a fuel×service combo
- **Anti-shortcut decks** — every level's card groups are guaranteed diverse in all non-target attributes, so you can't win by sorting on color when the rule is wheels
- **Build Your Own Yard** — free play with self-named sidings, 🧠 Read My Mind (the app infers the kid's rule from the placement, or explains why it can't), 🎲 Roll a Rule prompts
- **Fully touch-first**: drag *or* tap-tap (tap a train, tap a siding), plus full keyboard navigation
- **Talking trains** — WebSpeech reads rules, hints, and card attributes aloud (pre-reader friendly); WebAudio SFX; independent sound/voice/label toggles
- **Stars & persistence** — 3★ flawless, best per level in localStorage
- Zero dependencies, single ~60KB HTML file, works offline

## How to play
- Drag a train into the siding it belongs in (or tap it, then tap a siding)
- 💡 Dispatcher's Tip gives a hint; ✅ Check the Yard grades the placement
- Tap a wooden plaque to rename a siding in free play

## Tech stack
Canvas 2D (procedural train art, one 240×130 canvas per card), Pointer Events, Web Audio API, Web Speech API, localStorage. Single-file vanilla HTML/CSS/JS — no build step, no assets, no network.

## Verification
`node harness.js` — 81/81 logic assertions (deck integrity, check engine, two-pass hierarchy, stars, read-my-mind, keyboard, drag-tap). `node make-selftest.js` + preview pane — 18/18 render probes on real canvas pixels.
