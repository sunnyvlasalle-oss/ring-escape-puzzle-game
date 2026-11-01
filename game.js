
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelText = document.getElementById("level");
const movesText = document.getElementById("moves");
const bestText = document.getElementById("best");
const coinsText = document.getElementById("coins");
const nextButton = document.getElementById("next");

let level = Number(localStorage.getItem("ringLevel")) || 1;
let coins = Number(localStorage.getItem("ringCoins")) || 100;
let moves = 0;
let rings = [];
let history = [];
let selected = -1;
let dragging = false;
let previousAngle = 0;
let completed = false;
let animationId;

const colors = ["#ff5c8a", "#43d9ff", "#ffd166", "#9b8cff", "#62e6a7"];

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function createLevel() {
  completed = false;
  nextButton.hidden = true;
  moves = 0;
  history = [];
  selected = -1;

  const count = Math.min(2 + Math.floor((level - 1) / 2), 5);
  rings = [];

  for (let i = 0; i < count; i++) {
    rings.push({
      radius: 45 + i * 27,
      angle: (Math.random() * 1.5 + 0.2) * (i % 2 ? -1 : 1),
      rotation: 0,
      color: colors[i],
      speed: 0
    });
  }

  updateStats();
  draw();
}

function updateStats() {
  levelText.textContent = level;
  movesText.textContent = moves;
  coinsText.textContent = coins;
  bestText.textContent = Number(localStorage.getItem("ringBest") || 0);
  localStorage.setItem("ringLevel", level);
  localStorage.setItem("ringCoins", coins);
}

function drawRing(ring, cx, cy, selectedRing) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ring.angle);

  const r = ring.radius;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 15;
  ctx.strokeStyle = ring.color;
  ctx.shadowColor = ring.color;
  ctx.shadowBlur = selectedRing ? 24 : 12;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff88";
  ctx.stroke();

  // Decorative ring marker
  ctx.rotate(ring.rotation);
  ctx.beginPath();
  ctx.arc(r, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  // Center glow
  const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 150);
  gradient.addColorStop(0, "#5969a355");
  gradient.addColorStop(1, "#20294b00");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  rings.forEach((ring, i) => {
    drawRing(ring, cx, cy, i === selected);
  });

  if (completed) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL COMPLETE!", cx, h - 20);
  }
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function findRing(x, y) {
  const cx = canvas.clientWidth / 2;
  const cy = canvas.clientHeight / 2;
  const distance = Math.hypot(x - cx, y - cy);

  let best = -1;
  let difference = Infinity;

  rings.forEach((ring, i) => {
    const d = Math.abs(distance - ring.radius);
    if (d < difference && d < 20) {
      difference = d;
      best = i;
    }
  });

  return best;
}

function angleAt(x, y) {
  return Math.atan2(
    y - canvas.clientHeight / 2,
    x - canvas.clientWidth / 2
  );
}

canvas.addEventListener("pointerdown", event => {
  if (completed) return;
  const p = pointerPosition(event);
  selected = findRing(p.x, p.y);
  if (selected < 0) return;

  history.push(rings.map(r => ({ ...r })));
  if (history.length > 30) history.shift();

  dragging = true;
  previousAngle = angleAt(p.x, p.y);
  canvas.setPointerCapture(event.pointerId);
  draw();
});

canvas.addEventListener("pointermove", event => {
  if (!dragging || selected < 0) return;

  const p = pointerPosition(event);
  const current = angleAt(p.x, p.y);
  let delta = current - previousAngle;

  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;

  rings[selected].angle += delta;
  rings[selected].rotation += delta;
  previousAngle = current;
  draw();
});

function finishDrag() {
  if (!dragging) return;
  dragging = false;
  if (selected >= 0) {
    moves++;
    updateStats();
    checkComplete();
  }
  selected = -1;
  draw();
}

canvas.addEventListener("pointerup", finishDrag);
canvas.addEventListener("pointercancel", finishDrag);

document.getElementById("undo").addEventListener("click", () => {
  if (!history.length || completed) return;
  rings = history.pop();
  moves = Math.max(0, moves - 1);
  updateStats();
  draw();
});

document.getElementById("reset").addEventListener("click", () => {
  createLevel();
});

document.getElementById("hint").addEventListener("click", () => {
  if (completed) return;
  alert("Try rotating each ring slowly. Look for a clear path between the rings!");
  if (coins >= 10) {
    coins -= 10;
    updateStats();
  }
});

function checkComplete() {
  // A level is cleared when the player has made enough rotations.
  // This starter version uses a simple move target, not geometric untangling.
  const target = 3 + level * 2;

  if (moves >= target) {
    completed = true;
    coins += 15 + level * 2;

    const best = Number(localStorage.getItem("ringBest") || 0);
    localStorage.setItem("ringBest", Math.max(best, level));

    updateStats();
    nextButton.hidden = false;
    draw();
  }
}

nextButton.addEventListener("click", () => {
  level++;
  createLevel();
});

window.addEventListener("resize", resize);

resize();
createLevel();
