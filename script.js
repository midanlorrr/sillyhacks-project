const sprite = document.getElementById("sprite");

// Sheet is 256x320 with 32x32 cells.
const frameWidth = 32;
const frameHeight = 32;

// User-provided row data (rows shown here are 1-indexed).
// 1-4,7 => 4 frames | 5,6,10 => 8 frames | 8 => 6 frames | 9 => 7 frames
const rowFrameCounts = [4, 4, 4, 4, 8, 8, 4, 6, 7, 8];

let activeRowIndex = 0; // Row 1 by default (0-based index).
let speedMs = 180;
let frame = 0;
let timerId;

function paintFrame() {
  const framesInRow = rowFrameCounts[activeRowIndex];
  const x = -(frame * frameWidth);
  const y = -(activeRowIndex * frameHeight);
  sprite.style.backgroundPosition = `${x}px ${y}px`;
}

function restartLoop() {
  const framesInRow = rowFrameCounts[activeRowIndex];
  clearInterval(timerId);
  timerId = setInterval(() => {
    frame = (frame + 1) % framesInRow;
    paintFrame();
  }, speedMs);
}

// Optional quick row switching while testing.
// ArrowUp / ArrowDown moves through rows 1..10.
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    activeRowIndex = (activeRowIndex + 1) % rowFrameCounts.length;
  } else if (event.key === "ArrowUp") {
    activeRowIndex = (activeRowIndex - 1 + rowFrameCounts.length) % rowFrameCounts.length;
  } else {
    return;
  }

  frame = 0;
  paintFrame();
  restartLoop();
});

paintFrame();
restartLoop();