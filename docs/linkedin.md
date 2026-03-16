# LinkedIn Post — Tic-Trap-Toe

> This file is the source of truth for the current LinkedIn post.
> It is updated by Claude before every commit when features change.
> Copy the post below and paste directly into LinkedIn.

---

## Current Post

Just shipped a major update to Tic-Trap-Toe.

Tic-tac-toe is a solved game, so I experimented with changing the format. The game runs on a rotating cube with six independent boards. As the cube spins, faces move toward you, become playable, then rotate away — the available boards are always changing. Win three faces to win the match.

A few things I added since the first version:

**Adaptive AI across rounds.** The computer starts at Rookie and gets smarter every time you win a face — and that difficulty carries across rounds. Win a match, hit Next Round, and the AI picks up where it left off. Five levels total, capping at Unbeatable: full minimax, provably optimal. You can't beat it, only draw. Reset Game is the only way back to Rookie.

**Adaptive cube steering.** As faces get claimed, the cube stops giving equal time to all six sides. When three or fewer faces remain, the rotation biases toward the unfinished ones — arriving at those angles faster, lingering there longer. The fewer faces left, the stronger the pull. It never stops spinning; it just stops being equally fair to boards that are already done.

**Multi-round progression.** Win a match, hit Next Round. Boards reset, difficulty doesn't. The game keeps escalating until you reset everything.

Built with Three.js and vanilla JavaScript. Audio synthesized with the Web Audio API — no audio files.

🎮 GitHub: https://lnkd.in/eBSCqf6G
🌐 Portfolio: https://pvblocordero.com

#threejs #javascript #webdev #gamedev #buildingpublic

---

## Changelog

| Date | What changed |
|---|---|
| 2026-03-15 | Adaptive AI (5 levels + minimax), multi-round progression, adaptive cube steering, round label, score 3D shadow, Next Round button |
| Prior | Initial launch — 6-face rotating cube, 3D title, confetti, holographic won-face, synthesized audio |
