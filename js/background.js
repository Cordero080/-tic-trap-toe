/* ── background.js — scene setup, input, DOM, and tick loop ──
 *
 *  This is the entry point. It owns:
 *    - Three.js renderer, scene, camera, lights
 *    - Canvas click + mousemove input (raycasting into cube.js hit planes)
 *    - Reset button handler
 *    - Score DOM animation (animateScore)
 *    - Status message updates (updateMessage)
 *    - The tick() loop — orchestrates cube, title, and render
 *
 *  Heavy lifting is delegated to:
 *    cube.js   — all 3-D cube geometry, marks, slabs, confetti, rotation
 *    title.js  — 3-D extruded title mesh
 *    audio.js  — Web Audio synthesis (imported transitively through cube.js)
 *    app.js    — pure game logic (no DOM, no Three.js)
 * ── */

import * as THREE from "three";
import {
  faceStates,
  score,
  matchOver,
  matchWinner,
  vsComputer,
  makeMove,
  resetAll,
} from "./app.js";
import {
  hitPlaneMeshes,
  hoverMeshes,
  initCube,
  syncMarks,
  onFaceWon,
  triggerComputer,
  updateCube,
  getActiveFaceIdx,
  resetCubeVisuals,
} from "./cube.js";
import { initTitle, updateTitle } from "./title.js";

/* ── Renderer ── */
const canvas = document.getElementById("bg-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

/* ── Scene ── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f8);

/* ── Camera ── */
const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.z = 28;

/* ── Lights ── */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(5, 10, 10);
scene.add(sun);
// Second light from above-front so the extruded title letters catch highlights
const titleLight = new THREE.DirectionalLight(0xffffff, 0.5);
titleLight.position.set(0, 20, 15);
scene.add(titleLight);

/* ── Score DOM elements ── */
const scoreXEl = document.getElementById("score-x");
const scoreOEl = document.getElementById("score-o");

/* ── animateScore — scrambles the digit before landing on the new value ── */
function animateScore(winner, onDone) {
  const el = winner === "X" ? scoreXEl : scoreOEl;
  const target = score[winner];
  el.classList.remove("score-pop", "score-match-win");
  void el.offsetWidth; // force reflow so the animation restarts
  el.classList.add("score-pop");
  let frame = 0;
  const iv = setInterval(() => {
    frame++;
    if (frame >= 14) {
      clearInterval(iv);
      el.textContent = target;
      if (onDone) onDone(el);
    } else {
      el.textContent = Math.floor(Math.random() * 10);
    }
  }, 38);
}

/* ── Init cube + title (pass animateScore callback so cube.js can trigger it) ── */
initCube(scene, (winner) => {
  animateScore(winner, (el) => {
    if (matchOver) {
      el.classList.remove("score-pop");
      el.classList.add("score-match-win");
    }
  });
});
initTitle(scene, camera);

/* ── Input ── */
const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const OFS = 2.5 + 0.12; // CELL + GAP — matches cube.js constants

function setPtr(e) {
  ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
  ptr.y = (e.clientY / window.innerHeight) * -2 + 1;
}

canvas.addEventListener("click", (e) => {
  setPtr(e);
  raycaster.setFromCamera(ptr, camera);
  const hits = raycaster.intersectObjects(hitPlaneMeshes);
  if (!hits.length) return;
  const { fi, ci } = hits[0].object.userData;
  // Three.js backface culling handles "can't click through cube" — no dot-product guard needed
  if (vsComputer && faceStates[fi].turn !== "X") return; // computer's turn — wait
  const prevWinner = faceStates[fi].winner;
  if (makeMove(fi, ci)) {
    syncMarks();
    if (!prevWinner && faceStates[fi].winner) onFaceWon(fi, ci);
    if (vsComputer && !faceStates[fi].winner && faceStates[fi].turn === "O") {
      triggerComputer(fi);
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  setPtr(e);
  raycaster.setFromCamera(ptr, camera);
  const hits = raycaster.intersectObjects(hitPlaneMeshes);
  hoverMeshes.forEach((hv) => {
    hv.visible = false;
  });
  canvas.style.cursor = "default";
  if (!hits.length) return;
  const { fi, ci } = hits[0].object.userData;
  if (faceStates[fi].winner || faceStates[fi].board[ci]) return;
  const r = Math.floor(ci / 3),
    c = ci % 3;
  const hv = hoverMeshes[fi];
  hv.position.x = (c - 1) * OFS;
  hv.position.y = (1 - r) * OFS;
  hv.visible = true;
  canvas.style.cursor = "pointer";
});

/* ── Reset ── */
function doReset() {
  resetAll();
  resetCubeVisuals();
  scoreXEl.classList.remove("score-match-win");
  scoreOEl.classList.remove("score-match-win");
}

document.getElementById("reset-btn").addEventListener("click", doReset);

// Toggling vs-computer mid-game resets so the AI state starts clean
document.getElementById("vs-computer").addEventListener("change", doReset);

/* ── Resize ── */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ── Message ── */
const msgEl = document.getElementById("message");

function updateMessage() {
  if (matchOver) {
    msgEl.textContent = `${matchWinner} wins the match!`;
    return;
  }
  const fi = getActiveFaceIdx();
  if (fi < 0) {
    msgEl.textContent = `X: ${score.X}  ·  O: ${score.O}  ·  First to 3`;
    return;
  }
  const face = faceStates[fi];
  if (face.winner === "draw") {
    msgEl.textContent = `Draw on this face  ·  X: ${score.X}  O: ${score.O}`;
  } else if (face.winner) {
    msgEl.textContent = `${face.winner} won this face  ·  X: ${score.X}  O: ${score.O}`;
  } else {
    msgEl.textContent = `${face.turn}'s turn  ·  X: ${score.X}  O: ${score.O}`;
  }
}

/* ── Tick loop ── */
const clock = new THREE.Clock();
let prevT = 0;

function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  const dt = Math.min(t - prevT, 0.05);
  prevT = t;

  updateCube(dt, t);
  updateTitle(t);
  updateMessage();
  renderer.render(scene, camera);
}

tick();
