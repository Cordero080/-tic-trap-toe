import * as THREE from "three";
import {
  WIN_COMBOS,
  faceStates,
  score,
  matchOver,
  matchWinner,
  vsComputer,
  makeMove,
  getComputerMove,
  resetAll,
} from "./app.js";

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

/* ── Board constants ── */
const S = 9;
const CELL = 2.5;
const GAP = 0.12;
const HALF = (3 * CELL + 2 * GAP) / 2; // ≈ 3.87
const OFS = CELL + GAP; // ≈ 2.62 — cell centre spacing
const LPOS = HALF - CELL - GAP / 2; // ≈ 1.31 — divider positions

/* ── Cube group + slab ── */
const cube = new THREE.Group();
scene.add(cube);
cube.add(
  new THREE.Mesh(
    new THREE.BoxGeometry(S, S, S),
    new THREE.MeshStandardMaterial({
      color: 0x020406,
      roughness: 0.65,
      metalness: 0.12,
    }),
  ),
);

/* ── Face normals in local space ── */
const NORMALS = [
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
];

/* ── Cylinder helper ── */
function cyl(a, b, mat, r = 0.06) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a.clone().add(b).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/* ── Face configs: euler so local +Z faces outward ── */
const FACES = [
  { euler: [0, 0, 0], pos: [0, 0, S / 2] }, // front  +Z
  { euler: [0, Math.PI, 0], pos: [0, 0, -S / 2] }, // back   -Z
  { euler: [-Math.PI / 2, 0, 0], pos: [0, S / 2, 0] }, // top    +Y
  { euler: [Math.PI / 2, 0, 0], pos: [0, -S / 2, 0] }, // bottom -Y
  { euler: [0, Math.PI / 2, 0], pos: [S / 2, 0, 0] }, // right  +X
  { euler: [0, -Math.PI / 2, 0], pos: [-S / 2, 0, 0] }, // left   -X
];

/* ── Per-face data ── */
const frameMats = [];
const cornerMats = [];
const faceGroups = [];
const hitPlaneMeshes = [];
const faceMarks = Array.from({ length: 6 }, () => new Array(9).fill(null));
const hoverMeshes = [];

/* ── Shared geometries / materials ── */
const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2f2ff });
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hoverMat = new THREE.MeshBasicMaterial({
  color: 0x3513e1,
  transparent: true,
  opacity: 0.18,
});
const nodeGeo = new THREE.SphereGeometry(0.12, 8, 8);
const hitGeo = new THREE.PlaneGeometry(CELL - 0.08, CELL - 0.08);
const hoverGeo = new THREE.PlaneGeometry(CELL - 0.14, CELL - 0.14);

/* ── Build all 6 faces ── */
for (let fi = 0; fi < 6; fi++) {
  const cfg = FACES[fi];
  const fg = new THREE.Group();
  fg.position.set(...cfg.pos);
  fg.rotation.set(...cfg.euler);
  cube.add(fg);
  faceGroups.push(fg);

  const LZ = 0.02; // grid lines above face surface
  const FZ = 0.04; // frame
  const MZ = 0.08; // marks
  fg.userData.mz = MZ;

  /* Grid dividers */
  fg.add(
    cyl(
      new THREE.Vector3(-LPOS, -HALF, LZ),
      new THREE.Vector3(-LPOS, HALF, LZ),
      lineMat,
      0.05,
    ),
  );
  fg.add(
    cyl(
      new THREE.Vector3(LPOS, -HALF, LZ),
      new THREE.Vector3(LPOS, HALF, LZ),
      lineMat,
      0.05,
    ),
  );
  fg.add(
    cyl(
      new THREE.Vector3(-HALF, -LPOS, LZ),
      new THREE.Vector3(HALF, -LPOS, LZ),
      lineMat,
      0.05,
    ),
  );
  fg.add(
    cyl(
      new THREE.Vector3(-HALF, LPOS, LZ),
      new THREE.Vector3(HALF, LPOS, LZ),
      lineMat,
      0.05,
    ),
  );

  /* Rainbow frame + halo */
  const fc = [
    new THREE.Vector3(-HALF, -HALF, FZ),
    new THREE.Vector3(HALF, -HALF, FZ),
    new THREE.Vector3(HALF, HALF, FZ),
    new THREE.Vector3(-HALF, HALF, FZ),
  ];
  for (let i = 0; i < 4; i++) {
    const fm = new THREE.MeshBasicMaterial({ color: 0x5500ff });
    frameMats.push(fm);
    fg.add(cyl(fc[i], fc[(i + 1) % 4], fm, 0.09));

    const hm = new THREE.MeshBasicMaterial({
      color: 0x5500ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    frameMats.push(hm);
    fg.add(cyl(fc[i], fc[(i + 1) % 4], hm, 0.165));
  }

  /* Corner nodes */
  for (let i = 0; i < 4; i++) {
    const nm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    cornerMats.push(nm);
    const m = new THREE.Mesh(nodeGeo, nm);
    m.position.copy(fc[i]);
    fg.add(m);
  }

  /* Hit planes — one per cell */
  for (let ci = 0; ci < 9; ci++) {
    const r = Math.floor(ci / 3),
      c = ci % 3;
    const hp = new THREE.Mesh(hitGeo, hitMat);
    hp.position.set((c - 1) * OFS, (1 - r) * OFS, LZ + 0.01);
    hp.userData = { fi, ci };
    fg.add(hp);
    hitPlaneMeshes.push(hp);
  }

  /* Hover highlight (one per face, repositioned on hover) */
  const hv = new THREE.Mesh(hoverGeo, hoverMat);
  hv.position.z = 0.06;
  hv.visible = false;
  fg.add(hv);
  hoverMeshes.push(hv);
}

/* ── Mark builders ── */
function buildX() {
  const g = new THREE.Group();
  const len = CELL * 0.55;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.1,
  });
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 9), mat);
    m.rotation.z = angle;
    g.add(m);
  }
  return g;
}

function buildO() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xddd0ff,
    roughness: 0.35,
    metalness: 0.1,
  });
  return new THREE.Mesh(new THREE.TorusGeometry(CELL * 0.28, 0.1, 14, 44), mat);
}

/* ── Sync game state → 3-D marks ── */
function syncMarks() {
  for (let fi = 0; fi < 6; fi++) {
    const state = faceStates[fi];
    const fg = faceGroups[fi];
    const mz = fg.userData.mz;
    for (let ci = 0; ci < 9; ci++) {
      const val = state.board[ci];
      const existing = faceMarks[fi][ci];
      if (val && !existing) {
        const mesh = val === "X" ? buildX() : buildO();
        const r = Math.floor(ci / 3),
          c = ci % 3;
        mesh.position.set((c - 1) * OFS, (1 - r) * OFS, mz);
        mesh.scale.setScalar(0.01);
        fg.add(mesh);
        faceMarks[fi][ci] = { mesh, s: 0.01 };
      } else if (!val && existing) {
        fg.remove(existing.mesh);
        faceMarks[fi][ci] = null;
      }
    }
  }
}

/* ── Face visibility ── */
const CLICK_THRESHOLD = 0.08; // any face generally toward camera is playable
const _wn = new THREE.Vector3();

function getFaceDot(fi) {
  return _wn.copy(NORMALS[fi]).applyQuaternion(cube.quaternion).z;
}

function getActiveFaceIdx() {
  let best = -1,
    bestDot = CLICK_THRESHOLD;
  for (let fi = 0; fi < 6; fi++) {
    const d = getFaceDot(fi);
    if (d > bestDot) {
      bestDot = d;
      best = fi;
    }
  }
  return best;
}

/* ── Confetti — bursts from the winning cell in world space ── */
const NEON = [
  0xff00ff, 0x00ffff, 0xffff00, 0xff4400, 0x44ff00, 0x0088ff, 0xff0088,
];
const confetti = [];

function spawnConfetti(fi, ci) {
  cube.updateWorldMatrix(true, true);
  const r = Math.floor(ci / 3),
    c = ci % 3;
  const cellPos = new THREE.Vector3((c - 1) * OFS, (1 - r) * OFS, 0.08);
  faceGroups[fi].localToWorld(cellPos); // cellPos now in world space
  const faceNormal = NORMALS[fi].clone().applyQuaternion(cube.quaternion);

  for (let i = 0; i < 44; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: NEON[Math.floor(Math.random() * NEON.length)],
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(
        0.12 + Math.random() * 0.42,
        0.07 + Math.random() * 0.26,
      ),
      mat,
    );
    mesh.position.copy(cellPos);
    mesh.position.x += (Math.random() - 0.5) * 0.6;
    mesh.position.y += (Math.random() - 0.5) * 0.6;
    mesh.rotation.set(
      Math.random() * 6.28,
      Math.random() * 6.28,
      Math.random() * 6.28,
    );
    scene.add(mesh);

    const speed = 5 + Math.random() * 10;
    const vel = faceNormal.clone().multiplyScalar(speed);
    vel.x += (Math.random() - 0.5) * 6;
    vel.y += (Math.random() - 0.5) * 6 + 1.5;
    vel.z += (Math.random() - 0.5) * 6;

    confetti.push({
      mesh,
      mat,
      vel,
      rx: (Math.random() - 0.5) * 13,
      ry: (Math.random() - 0.5) * 13,
      rz: (Math.random() - 0.5) * 13,
      life: 0,
      maxLife: 1.0 + Math.random() * 0.9,
    });
  }
}

/* ── Won-face visuals: holographic overlay + red marks ── */
const wonOverlays = []; // { mesh, mat, fg, t }

function applyWonFaceVisuals(fi) {
  const fg = faceGroups[fi];
  const board = faceStates[fi].board;

  // Find the winning cell indices
  const winSet = new Set();
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      winSet.add(a);
      winSet.add(b);
      winSet.add(c);
      break;
    }
  }

  // Holographic metallic white plane — fades in, HSL-cycles in tick()
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf8f6ff,
    metalness: 0.95,
    roughness: 0.05,
    transparent: true,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.08, S - 0.08), mat);
  mesh.position.z = 0.018;
  fg.add(mesh);
  wonOverlays.push({ mesh, mat, fg, t: 0 });

  // Style each mark: winners → vivid red + emissive; losers → black
  for (let ci = 0; ci < 9; ci++) {
    const mark = faceMarks[fi][ci];
    if (!mark) continue;
    const isWinner = winSet.has(ci);
    mark.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        if (isWinner) {
          child.material.color.set(0xff1a00);
          child.material.emissive = new THREE.Color(0x991000);
          child.material.emissiveIntensity = 0.55;
        } else {
          // Losing marks sink to near-black
          child.material.color.set(0x111111);
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }
}

/* ── Score DOM animation ── */
const scoreXEl = document.getElementById("score-x");
const scoreOEl = document.getElementById("score-o");

function animateScore(winner, onDone) {
  const el = winner === "X" ? scoreXEl : scoreOEl;
  const target = score[winner];
  el.classList.remove("score-pop", "score-match-win");
  void el.offsetWidth;
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

function onFaceWon(fi, ci) {
  const winner = faceStates[fi].winner;
  if (!winner || winner === "draw") return;
  spawnConfetti(fi, ci);
  applyWonFaceVisuals(fi);
  animateScore(winner, (el) => {
    if (matchOver) {
      el.classList.remove("score-pop");
      el.classList.add("score-match-win");
    }
  });
}

/* ── Computer move ── */
function triggerComputer(fi) {
  setTimeout(() => {
    const prevWinner = faceStates[fi].winner;
    const move = getComputerMove(fi);
    if (move >= 0) {
      makeMove(fi, move);
      syncMarks();
      if (!prevWinner && faceStates[fi].winner) onFaceWon(fi, move);
    }
  }, 500);
}

/* ── Input ── */
const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();

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
document.getElementById("reset-btn").addEventListener("click", () => {
  resetAll();
  for (let fi = 0; fi < 6; fi++) {
    for (let ci = 0; ci < 9; ci++) {
      const m = faceMarks[fi][ci];
      if (m) {
        faceGroups[fi].remove(m.mesh);
        faceMarks[fi][ci] = null;
      }
    }
  }
  // Remove holographic won-face overlays
  for (const o of wonOverlays) {
    o.fg.remove(o.mesh);
    o.mat.dispose();
    o.mesh.geometry.dispose();
  }
  wonOverlays.length = 0;
  // Clear match-win score styling
  scoreXEl.classList.remove("score-match-win");
  scoreOEl.classList.remove("score-match-win");
  hoverMeshes.forEach((hv) => {
    hv.visible = false;
  });
});

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

/* ── Animate ── */
const clock = new THREE.Clock();
const col = new THREE.Color();
let prevT = 0;
let matchOverT = -1; // clock time when matchOver first detected
let frozenRotY = 0;
let frozenRotX = 0;

function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  const dt = Math.min(t - prevT, 0.05);
  prevT = t;

  if (matchOver) {
    if (matchOverT < 0) {
      // Capture rotation at the moment of match win
      matchOverT = t;
      frozenRotY = cube.rotation.y;
      frozenRotX = cube.rotation.x;
    }
    const age = t - matchOverT;
    const slow = Math.exp(-age * 2.0); // exponential deceleration
    cube.rotation.y = frozenRotY + age * 0.22 * slow;
    cube.rotation.x = frozenRotX * Math.exp(-age * 2.5); // eases back to level
    // Damped scale pulse — two quick thumps then settles
    const pulse = 1 + 0.11 * Math.sin(age * 16) * Math.exp(-age * 4.5);
    cube.scale.setScalar(pulse);
  } else {
    matchOverT = -1;
    cube.rotation.y = t * 0.22;
    cube.rotation.x = Math.sin(t * 0.13) * 0.48;
    cube.scale.setScalar(1);
  }

  const h = (t * 0.08) % 1;
  frameMats.forEach((fm, i) => {
    col.setHSL((h + i * 0.04) % 1, 1.0, 0.5);
    fm.color.copy(col);
  });
  cornerMats.forEach((cm, i) => {
    col.setHSL((h + i * 0.12) % 1, 1.0, 0.6);
    cm.color.copy(col);
  });

  for (const row of faceMarks) {
    for (const mark of row) {
      if (mark && mark.s < 1) {
        mark.s = Math.min(1, mark.s + 0.065);
        mark.mesh.scale.setScalar(mark.s);
      }
    }
  }

  /* Won-face holographic overlay — fade in + HSL color cycle */
  for (const o of wonOverlays) {
    o.t += dt;
    o.mat.opacity = Math.min(0.72, o.t * 0.9);
    col.setHSL((t * 0.12 + o.t * 0.3) % 1, 0.9, 0.82);
    o.mat.color.copy(col);
  }

  /* Confetti particle simulation */
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.life += dt;
    p.vel.y -= 11 * dt; // gravity
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += p.rx * dt;
    p.mesh.rotation.y += p.ry * dt;
    p.mesh.rotation.z += p.rz * dt;
    p.mat.opacity = Math.max(0, 1 - p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      scene.remove(p.mesh);
      p.mat.dispose();
      p.mesh.geometry.dispose();
      confetti.splice(i, 1);
    }
  }

  updateMessage();
  renderer.render(scene, camera);
}

tick();
