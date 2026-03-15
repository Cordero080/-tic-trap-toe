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
- `js/app.js` — pure game logic, no DOM except the vs-computer checkbox listener. Exports live bindings (`export let matchOver`, etc.) consumed by background.js each frame.
- `js/background.js` — owns everything visual: Three.js scene, cube geometry, raycasting, mark rendering, confetti, DOM score/message updates. Imports from app.js.
- `css/style.css` — layout, typography, button glow (conic-gradient pseudo-elements), score animations
- `css/fonts/` — local font files (Axion TTF, ClashDisplay OTF variants, Valorant TTF)

**Key data structures:**

`app.js` exports:
- `faceStates` — array of 6 `{ board: string[9], turn, winner, moves }` objects, one per cube face
- `score` — `{ X: number, O: number }`
- `matchOver`, `matchWinner`, `vsComputer` — live-binding `let` exports
- `WIN_COMBOS` — the 8 winning index triples, exported so background.js can identify winning cells for visual styling
- `makeMove(fi, ci)` — mutates faceStates, score, matchOver; returns true if the move was valid
- `getComputerMove(fi)` — returns best cell index for O (win → block → center → corner → random)
- `resetAll()` — resets all state

**Three.js face setup (`background.js`):**
- 6 `THREE.Group` objects (`faceGroups[fi]`), each euler-rotated so local +Z points outward from the cube
- Each face group contains: 4 grid-divider cylinders, 8 rainbow frame/halo cylinders (`frameMats`), 4 corner sphere nodes (`cornerMats`), 9 invisible hit planes (for raycasting), 1 hover highlight mesh
- `NORMALS[fi]` — local-space outward normal per face; `NORMALS[fi].clone().applyQuaternion(cube.quaternion)` gives world-space normal
- Marks (`faceMarks[fi][ci]`) are built by `buildX()` / `buildO()` and scale-animated from 0→1 in `tick()`
- Hit detection uses `raycaster.intersectObjects(hitPlaneMeshes)` — Three.js FrontSide backface culling prevents clicking through the cube; no manual dot-product guard needed

**Won-face visuals (`applyWonFaceVisuals(fi)`):**
- Finds the winning cell triple via `WIN_COMBOS`
- Winning-line marks → red (`#ff1a00`) with warm emissive
- Losing marks → near-black (`#111111`)
- Adds a `MeshStandardMaterial` (metalness 0.95, roughness 0.05) plane overlay that fades in and HSL-color-cycles in `tick()` via `wonOverlays[]`

**Confetti (`spawnConfetti(fi, ci)`):**
- `cube.updateWorldMatrix(true, true)` then `faceGroups[fi].localToWorld(cellPos)` converts the winning cell's local position to world space
- 44 neon `PlaneGeometry` particles burst outward along the face normal, with gravity and fade in `tick()`

**Score animation (`animateScore(winner, onDone)`):**
- Scrambles the digit 14 frames at 38 ms each, then sets the real value and calls `onDone(el)`
- If `matchOver`, the callback adds `.score-match-win` (yellow/red diagonal stripe text via `repeating-linear-gradient`)

**Reset:** Removes all mark meshes, disposes and clears `wonOverlays[]`, strips `.score-match-win` from score elements, calls `resetAll()`.

**Rotation constants:**
- `cube.rotation.y = t * 0.22` (continuous Y spin)
- `cube.rotation.x = Math.sin(t * 0.13) * 0.48` (gentle X tilt)
- Board geometry: `S=9` (cube side length), `CELL=2.5`, `GAP=0.12`, `OFS = CELL + GAP` (cell centre spacing)
