/* ── 6-Face Cube Tic-Tac-Toe — Game Logic ── */

export const WIN_COMBOS = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // center column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left → bottom-right
  [2, 4, 6], // diagonal top-right → bottom-left
];

// Each of the 6 cube faces gets its own independent game state.
// board: 9 cells ("", "X", or "O"), indexed 0–8 left-to-right, top-to-bottom
export const faceStates = Array.from({ length: 6 }, () => ({
  board: Array(9).fill(""),
  turn: "X", // whose turn it is on this face
  winner: null, // null | "X" | "O" | "draw"
  moves: 0,
}));

export const score = { X: 0, O: 0 };
export let matchOver = false;
export let matchWinner = "";
export let vsComputer = false;

// difficulty — 0 to 4, increases each time X wins a face (across all rounds).
// It never resets between rounds — only the Reset button sets it back to 0.
// [0=Rookie, 1=Casual, 2=Focused, 3=Sharp, 4=Unbeatable]
export let difficulty = 0;

// totalXFaceWins — cumulative face wins by X across every round ever played.
// This is the source of truth for difficulty so it survives round resets.
export let totalXFaceWins = 0;

// A match is first to win TARGET faces.
const TARGET = 3;

// ── checkWin ────────────────────────────────────────────────────────────────
// Scans all 8 win combos. Returns "X", "O", or null.
function checkWin(board) {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return null;
}

// ── makeMove ─────────────────────────────────────────────────────────────────
// Places the current player's mark on a face. Returns false if the move is
// illegal (game over, face done, cell taken). Returns true on success.
export function makeMove(faceIdx, cellIdx) {
  if (matchOver) return false;
  const face = faceStates[faceIdx];
  if (face.winner || face.board[cellIdx]) return false;

  face.board[cellIdx] = face.turn;
  face.moves++;

  const winner = checkWin(face.board);
  if (winner) {
    face.winner = winner;
    score[winner]++;

    // Difficulty tracks X's total face wins across all rounds.
    // The more games X wins historically, the smarter the AI becomes.
    if (winner === "X") {
      totalXFaceWins++;
      difficulty = Math.min(4, totalXFaceWins);
    }

    if (score[winner] >= TARGET) {
      matchOver = true;
      matchWinner = winner;
    }
  } else if (face.moves === 9) {
    face.winner = "draw";
  } else {
    face.turn = face.turn === "X" ? "O" : "X";
  }
  return true;
}

// ── minimaxScore ─────────────────────────────────────────────────────────────
// Recursively scores every possible future game state.
//
// isMaximizing = true  → it's O's turn (AI wants to MAXIMIZE the score)
// isMaximizing = false → it's X's turn (AI imagines X will MINIMIZE the score)
//
// Terminal scores:
//   O wins → +10  (great for AI)
//   X wins → -10  (bad for AI)
//   Draw   →   0  (neutral)
//
// This is the core of why Unbeatable is truly unbeatable: it explores every
// possible game tree and picks the path that guarantees the best outcome for O
// no matter what X does. On a 3×3 board with perfect play, the result is
// always a draw — O cannot be beaten.
function minimaxScore(board, isMaximizing) {
  const winner = checkWin(board);
  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (board.every((v) => v !== "")) return 0; // all 9 cells filled = draw

  if (isMaximizing) {
    // O's turn — try every empty cell, keep the highest score found
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = "O";
        best = Math.max(best, minimaxScore(board, false));
        board[i] = ""; // undo the move (backtrack)
      }
    }
    return best;
  } else {
    // X's turn — try every empty cell, keep the lowest score found
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = "X";
        best = Math.min(best, minimaxScore(board, true));
        board[i] = ""; // undo the move (backtrack)
      }
    }
    return best;
  }
}

// ── minimaxMove ──────────────────────────────────────────────────────────────
// Picks the cell with the highest minimax score for O.
// Called only at difficulty 4 (Unbeatable). Guaranteed never to lose.
//
// HOW TO BEAT IT (you can't win, but you can draw):
//   1. Take the center (index 4) immediately if it's free.
//   2. If O takes center, play a corner on your first move.
//   3. Never let O build two threats at once — always block the most dangerous one.
//   4. With perfect play, every game ends in a draw. That's the best you can do.
//
// WHY it's hard to draw against: O will always take a move that gives it
// the maximum number of future winning paths. It doesn't just react — it
// creates double-threat forks that force you to lose unless you see them coming.
function minimaxMove(board) {
  let bestScore = -Infinity;
  let bestIdx = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      board[i] = "O";
      const s = minimaxScore(board, false);
      board[i] = "";
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
  }
  return bestIdx;
}

// ── getComputerMove ──────────────────────────────────────────────────────────
// Returns the cell index the AI should play on the given face.
// Returns -1 if the face is already won or it isn't O's turn.
//
// The AI's strategy ladder (difficulty 0→4):
//   0 Rookie     — plays randomly 70% of the time, smart 30%
//   1 Casual     — plays randomly 40% of the time, smart 60%
//   2 Focused    — plays randomly 15% of the time, smart 85%
//   3 Sharp      — always plays the smart heuristic (never random)
//   4 Unbeatable — runs full minimax, provably optimal
//
// The "smart heuristic" (levels 1–3) follows classic tic-tac-toe priority:
//   Win > Block > Center > Corner > Any empty cell
// This beats most casual players but a skilled player can still find traps.
// Minimax (level 4) closes those gaps entirely.
export function getComputerMove(faceIdx) {
  // Get the face and board first — everything below depends on these
  const face = faceStates[faceIdx];
  if (face.winner || face.turn !== "O") return -1;
  const b = face.board;

  // Build the list of empty cells once — reused by slop roll and fallback
  const empty = b.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);

  // Unbeatable — minimax always finds the optimal move
  if (difficulty >= 4) return minimaxMove(b);

  // Slop roll — lower difficulty means higher chance of picking randomly.
  // [0.7, 0.4, 0.15, 0, 0] maps to [Rookie, Casual, Focused, Sharp, Unbeatable].
  // At Sharp and Unbeatable slop=0 so Math.random() never passes and AI always plays smart.
  const slop = [0.7, 0.4, 0.15, 0, 0][difficulty];
  if (Math.random() < slop) {
    // Random move — the AI "doesn't care" at lower difficulties
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Win — if O has 2 in a row and the 3rd is empty, take it
  for (const [a, b2, c] of WIN_COMBOS) {
    const vals = [b[a], b[b2], b[c]];
    if (vals.filter((v) => v === "O").length === 2 && vals.includes("")) {
      const i = [a, b2, c].find((i) => b[i] === "");
      if (i !== undefined) return i;
    }
  }
  // Block — if X has 2 in a row and the 3rd is empty, block it
  for (const [a, b2, c] of WIN_COMBOS) {
    const vals = [b[a], b[b2], b[c]];
    if (vals.filter((v) => v === "X").length === 2 && vals.includes("")) {
      const i = [a, b2, c].find((i) => b[i] === "");
      if (i !== undefined) return i;
    }
  }
  // Center — strongest single cell, take it if free
  if (b[4] === "") return 4;
  // Corner — next best positions
  for (const i of [0, 2, 6, 8]) if (b[i] === "") return i;
  // Fallback — any remaining empty cell
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
}

// ── resetRound ───────────────────────────────────────────────────────────────
// Resets the 6 boards and match state for a new round, but intentionally
// keeps difficulty and totalXFaceWins so the AI stays at the earned level.
// Call this when the player clicks "Next Round" after a match win.
export function resetRound() {
  faceStates.forEach((f) => {
    f.board.fill("");
    f.turn = "X";
    f.winner = null;
    f.moves = 0;
  });
  score.X = 0;
  score.O = 0;
  matchOver = false;
  matchWinner = "";
  // difficulty and totalXFaceWins are kept — the AI remembers you
}

// ── resetAll ─────────────────────────────────────────────────────────────────
// Full reset including difficulty. Used by the Reset Game button.
export function resetAll() {
  resetRound();
  totalXFaceWins = 0;
  difficulty = 0;
}

/* vs-computer toggle — runs when this module is imported */
const cb = document.getElementById("vs-computer");
if (cb)
  cb.addEventListener("change", () => {
    vsComputer = cb.checked;
  });
