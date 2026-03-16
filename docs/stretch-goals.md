# Stretch Goals

## Local Multiplayer (Hot-Seat)
Two players, same screen, same perspective. The cube's rotation is a shared constraint — no camera angle advantage. Needs a global turn signal so only one player can act at a time: a clear "X's turn / O's turn" indicator before input is accepted. The per-face turn tracking stays; the global lock just prevents both players from moving simultaneously.

## Sound Design
Short audio hits on cell placement, a distinct sound on face win, something heavier on match win. The pulse on match-win is already visual — audio would seal it.

## Difficulty Levels (vs Computer)
Current AI is deterministic: win → block → center → corner → random. A harder mode could use minimax per face. An easier mode could skip the block step occasionally.

## Face Win Counter Visualization
Instead of (or alongside) the score bar, won faces could change color on the cube itself — a subtle tint visible from any angle so you can track the score spatially while playing.

## Mobile / Touch Support
Touch events mapped to the same raycasting logic. The cube could be draggable to manually rotate, with the auto-rotation pausing while held.
