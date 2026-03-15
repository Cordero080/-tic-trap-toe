# Tic-Trap-Toe

![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![No Build Step](https://img.shields.io/badge/build-none-brightgreen?style=flat)

Six tic-tac-toe boards. One rotating cube. First to win 3 faces wins the match.

![Title and cube overview](assets/screenshots/title-cube-overview.jpg)
![Active face gameplay](assets/screenshots/active-face-gameplay.jpg)
![Golden win bar on won face](assets/screenshots/golden-win-bar.jpg)
![Confetti burst on face win](assets/screenshots/confetti-face-win.jpg)
![Holographic won face overlay](assets/screenshots/holographic-won-face.jpg)
![Match win score state](assets/screenshots/match-win-score.jpg)

---

## Concept

The cube never stops spinning. Faces rotate toward you, become playable, then rotate away. At any moment you may be looking at two or three boards at once — each at a different stage of play. The rotation is the game mechanic, not a gimmick.

**There is no timer. No forced order. If you can see the cells, you can play them.**

---

## How to Play

1. Open `index.html` — no build step required
2. Click any empty cell on a visible face
3. Each face tracks its own X/O turn independently
4. Win a face by getting 3 in a row — **first to 3 faces wins**

**vs Computer** — check the box; the AI plays O on whichever face you just moved on. Toggling the checkbox resets the game for a clean start.
**Reset** — clears all six boards and the score.

---

## When a Face Is Won

- A golden 3D bar strikes through the winning three cells
- Confetti bursts from the winning cell in 3D space
- The face surface turns metallic white — winning marks glow red, losing marks go black
- The score digit scrambles before landing on the new count
- On match win: the score burns yellow-red stripes, the cube decelerates and pulses

---

## Stack

- **Three.js** via importmap CDN — raycasting, TextGeometry, per-frame animation
- Vanilla JS ES modules — four files with clear separation:
  - `app.js` — pure game logic, no DOM
  - `cube.js` — all 3-D geometry, marks, slabs, confetti, win visuals
  - `title.js` — extruded 3-D title mesh with foreshortening tilt
  - `audio.js` — fully synthesized Web Audio (no audio files)
  - `background.js` — scene, input, DOM, tick loop
- CSS — conic-gradient button glow, glitch score animation, diagonal-stripe match-win
- Local fonts: Valorant · ClashDisplay · Axion · Barlow Condensed

---

## Run Locally

```bash
open index.html
# or (if browser blocks ES modules from file://)
npx serve .
```
