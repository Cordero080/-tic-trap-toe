# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step or package manager. Open directly or serve locally (local server avoids ES module CORS issues in some browsers):

```
open index.html
# or
npx serve .
# or
python3 -m http.server
```

## Architecture

A 6-face cube tic-tac-toe game. Each face of a rotating 3D cube is an independent tic-tac-toe board. First player to win 3 faces wins the match. Built with Three.js (CDN importmap, no bundler) and vanilla ES modules.

**Module split:**
- `js/app.js` — pure game logic, no DOM/Three.js. Exports live bindings consumed each frame.
- `js/background.js` — entry point: renderer, scene, camera, lights, input handlers, score/message DOM, `tick()` loop
- `js/cube.js` — all 3-D cube geometry, marks, cell slabs, confetti, won-face overlays, rotation, color cycling
- `js/title.js` — 3-D extruded `TextGeometry` title mesh (async FontLoader)
- `js/audio.js` — Web Audio API synthesis (no audio files; everything synthesized)
- `css/style.css` — fixed-position HUD styles; `h1 { display: none }` (title is Three.js only)
- `css/fonts/` — local font files (Axion TTF, ClashDisplay OTF variants, Valorant TTF)

**Dependency graph:**
```
background.js → cube.js, title.js, app.js
cube.js       → audio.js, app.js
title.js      → THREE (FontLoader, TextGeometry)
audio.js      → (none)
app.js        → (none)
```

**`app.js` exports:**
- `faceStates` — array of 6 `{ board: string[9], turn, winner, moves }` objects, one per cube face
- `score` — `{ X: number, O: number }`
- `matchOver`, `matchWinner`, `vsComputer` — live-binding `let` exports
- `WIN_COMBOS` — the 8 winning index triples, used by cube.js to identify winning cells
- `makeMove(fi, ci)` — mutates faceStates, score, matchOver; returns true if the move was valid
- `getComputerMove(fi)` — returns best cell index for O (win → block → center → corner → random)
- `resetAll()` — resets all state

**`cube.js` key details:**
- `initCube(scene, animateScoreCb)` — builds all geometry; receives score-animation callback from background.js
- `hitPlaneMeshes` / `hoverMeshes` — exported arrays, read by background.js input handlers
- 6 `THREE.Group` objects (faceGroups, internal), each euler-rotated so local +Z points outward from the cube
- Each face contains: 4 grid-divider cylinders, 8 rainbow frame/halo cylinders, 4 corner spheres, 9 invisible hit planes, cell slabs, 1 hover highlight
- `NORMALS[fi]` — local-space outward normal; `.clone().applyQuaternion(cube.quaternion)` = world-space
- `updateCube(dt, t)` — rotation, rainbow color cycling, mark pop-in, slab extrusion, won-face overlay fade/HSL cycle, confetti physics

**`title.js` key details:**
- `initTitle(scene, camera)` — async font load; `TextGeometry` uses `height` param (NOT `depth`) for extrusion thickness
- `updateTitle(t)` — sine-wave float + `lookAt(camera.position)` every frame (keeps letters facing camera)
- To swap font: convert TTF at gero3.github.io/facetype.js → save JSON → change URL in `initTitle()`

**Turn flow:**
1. `canvas click` → `makeMove(fi, ci)` → `syncMarks()` → `onFaceWon()` if winner → `triggerComputer()` if vs AI
2. `triggerComputer` delays 500ms, calls `getComputerMove(fi)` then same flow

**Score animation:** Scrambles the digit 14 frames × 38 ms, then lands on real value. If `matchOver`, adds `.score-match-win` (yellow/red diagonal stripe via CSS `repeating-linear-gradient`).

**Board geometry constants** (defined in cube.js): `S=9`, `CELL=2.5`, `GAP=0.12`, `OFS=CELL+GAP` (cell centre spacing).

**Rotation:** `y = t * 0.22` continuous spin; `x = sin(t * 0.13) * 0.48` tilt. On match win: exponential deceleration + damped scale pulse. When ≤ 3 active faces remain, a `tanh`-shaped Y-offset biases the rotation toward unfinished face angles (steering strength indexed by face count: `[0, 1.2, 0.65, 0.28]`).

**Adaptive AI:** `difficulty` (0–4) tracks `totalXFaceWins` across rounds. `getComputerMove` rolls a slop probability `[0.7, 0.4, 0.15, 0, 0][difficulty]` for random play; at difficulty 4 calls `minimaxMove()` (full minimax, unbeatable). `resetRound()` keeps difficulty; `resetAll()` resets it to 0.

**Round progression:** `currentRound` in background.js increments on Next Round. `#round-label` (rainbow gradient CSS) is hidden on round 1, shown from round 2 onward.

---

## Before Every Commit

**This is a required step — do not skip it.**

When the user asks you to commit, before staging files you MUST:

1. **Update `docs/linkedin.md`** — rewrite the "Current Post" section to reflect what the game does now. Keep the tone: punchy, feature-led, no fluff. Update the Changelog table with today's date and a short summary of what changed.

2. **Check `README.md`** — if any features, mechanics, or the stack description are now out of date, update them to match the current state of the code.

3. Then proceed with the normal commit flow.

The LinkedIn post is the user's public-facing announcement. It should always be ready to copy-paste after a commit.
