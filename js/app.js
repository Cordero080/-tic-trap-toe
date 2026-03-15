/* ── 6-Face Cube Tic-Tac-Toe — Game Logic ── */

export const WIN_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const faceStates = Array.from({ length: 6 }, () => ({
  board: Array(9).fill(""),
  turn: "X",
  winner: null,
  moves: 0,
}));

export const score = { X: 0, O: 0 };
export let matchOver = false;
export let matchWinner = "";
export let vsComputer = false;

const TARGET = 3;

function checkWin(board) {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return null;
}

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

export function getComputerMove(faceIdx) {
  const face = faceStates[faceIdx];
  if (face.winner || face.turn !== "O") return -1;
  const b = face.board;

  // Win
  for (const [a, b2, c] of WIN_COMBOS) {
    const vals = [b[a], b[b2], b[c]];
    if (vals.filter((v) => v === "O").length === 2 && vals.includes("")) {
      const i = [a, b2, c].find((i) => b[i] === "");
      if (i !== undefined) return i;
    }
  }
  // Block
  for (const [a, b2, c] of WIN_COMBOS) {
    const vals = [b[a], b[b2], b[c]];
    if (vals.filter((v) => v === "X").length === 2 && vals.includes("")) {
      const i = [a, b2, c].find((i) => b[i] === "");
      if (i !== undefined) return i;
    }
  }
  // Center
  if (b[4] === "") return 4;
  // Corner
  for (const i of [0, 2, 6, 8]) if (b[i] === "") return i;
  // Any
  const empty = b.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
}

export function resetAll() {
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
}

/* vs-computer toggle — runs when this module is imported */
const cb = document.getElementById("vs-computer");
if (cb)
  cb.addEventListener("change", () => {
    vsComputer = cb.checked;
  });
