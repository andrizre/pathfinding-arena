// ---- Grid state -----------------------------------------------------------
const COLS = 60, ROWS = 34;
let grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
let start = { x: 4, y: Math.floor(ROWS / 2) };
let end = { x: COLS - 5, y: Math.floor(ROWS / 2) };

const gridEl = document.getElementById('grid');
const statsEl = document.getElementById('stats');
gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

const cells = [];
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.x = x;
    c.dataset.y = y;
    gridEl.appendChild(c);
    cells.push(c);
  }
}
const cellAt = (x, y) => cells[y * COLS + x];

// ---- Rendering ------------------------------------------------------------
const ALGO_TINTS = {
  astar: '#f97316', dijkstra: '#38bdf8', bfs: '#a78bfa', greedy: '#facc15',
};
const ALPHA = { visited: 0.28, frontier: 0.18, path: 0.95 };

function tint(el, algo, kind) {
  const [r, g, b] = hexToRgb(ALGO_TINTS[algo]);
  el.style.backgroundColor = `rgba(${r},${g},${b},${ALPHA[kind]})`;
  el.classList.add('tint');
  el.classList.toggle('visited', kind === 'visited');
  el.classList.toggle('path', kind === 'path');
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function renderBase() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const el = cellAt(x, y);
      el.style.backgroundColor = '';
      el.className = 'cell' + (grid[y][x] ? ' wall' : '');
    }
  }
  cellAt(start.x, start.y).classList.add('start');
  cellAt(end.x, end.y).classList.add('end');
}

// ---- Editing --------------------------------------------------------------
let tool = 'wall';
let dragging = false;
let eraseMode = false;

function applyTool(x, y) {
  if ((x === start.x && y === start.y) || (x === end.x && y === end.y)) return;
  const painting = tool === 'erase' || eraseMode ? false : true;
  if (tool === 'start') {
    if (grid[y][x]) return;
    start = { x, y };
  } else if (tool === 'end') {
    if (grid[y][x]) return;
    end = { x, y };
  } else {
    if (grid[y][x] === painting) return;
    grid[y][x] = painting;
  }
  renderBase();
}

function applyPointer(e) {
  // With pointer capture on #grid, e.target is always #grid, so locate the
  // cell from pointer coordinates instead of e.target.
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const c = el && el.closest('.cell');
  if (c) applyTool(+c.dataset.x, +c.dataset.y);
}

gridEl.addEventListener('pointerdown', (e) => {
  dragging = true;
  gridEl.setPointerCapture(e.pointerId);
  applyPointer(e);
});
gridEl.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  applyPointer(e);
});
gridEl.addEventListener('pointerup', () => { dragging = false; });

document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tool = btn.dataset.tool;
  });
});
window.addEventListener('keydown', e => {
  if (e.key === 'Shift') eraseMode = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'Shift') eraseMode = false;
});

// ---- Runner ----------------------------------------------------------------
let running = false;
let paused = false;
let runners = []; // { algo, gen, done, visitedCount, pathLen }

const PAUSE_PER_STEP = { 5: 0, 4: 4, 3: 12, 2: 28, 1: 60 }; // ms between frames of stepping

function stepDelay() {
  return PAUSE_PER_STEP[+document.getElementById('speed').value] ?? 4;
}

function selectedAlgos() {
  return [...document.querySelectorAll('.algo-row input:checked')].map(i => i.value);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  if (running) return;
  const algos = selectedAlgos();
  if (algos.length === 0) { statsEl.innerHTML = '<span class="muted">Pick at least one algorithm.</span>'; return; }
  renderBase();
  running = true; paused = false;
  document.getElementById('btnRun').disabled = true;
  document.getElementById('btnPause').disabled = false;

  runners = algos.map(algo => ({
    algo,
    gen: ALGORITHMS[algo].run(grid, start, end),
    done: false,
    visited: 0,
    pathLen: null,
    t0: performance.now(),
  }));

  const delay = stepDelay();
  const batch = delay === 0 ? 60 : 1;

  while (runners.some(r => !r.done)) {
    if (paused) { await sleep(120); continue; }
    for (let b = 0; b < batch; b++) {
      for (const r of runners) {
          if (r.done) continue;
          const { value, done } = r.gen.next();
          if (done || value.type === 'done') {
            r.done = true;
            r.pathLen = value && value.path ? value.path.length - 1 : null;
            if (value && value.path) {
              for (const p of value.path) tint(cellAt(p.x, p.y), r.algo, 'path');
            }
          } else if (value.type === 'visit') {
            r.visited++;
            const el = cellAt(value.x, value.y);
            if (!el.classList.contains('start') && !el.classList.contains('end')) {
              tint(el, r.algo, 'visited');
            }
          } else if (value.type === 'frontier') {
            const el = cellAt(value.x, value.y);
            if (el.classList.contains('visited') || el.classList.contains('path')) continue;
            tint(el, r.algo, 'frontier');
          }
        }
        if (!runners.some(r => !r.done)) break;
    }
    updateStats(false);
    await sleep(delay);
  }

  updateStats(true);
  running = false;
  document.getElementById('btnRun').disabled = false;
  document.getElementById('btnPause').disabled = true;
}

function updateStats(final) {
  const parts = runners.map(r => {
    const color = ALGO_TINTS[r.algo];
    const time = ((performance.now() - r.t0) / 1000).toFixed(2);
    let result;
    if (!r.done) result = 'searching…';
    else if (r.pathLen === null) result = 'no path ✗';
    else result = `path <b>${r.pathLen}</b>`;
    return `<span class="legend"><span class="dot" style="background:${color}"></span>` +
      `${ALGORITHMS[r.algo].name}: visited <b>${r.visited}</b>, ${result}, <b>${time}s</b></span>`;
  });
  if (final) parts.push('<span class="muted">— draw again and hit Visualize to re-race</span>');
  statsEl.innerHTML = parts.join('');
}

document.getElementById('btnRun').addEventListener('click', run);
document.getElementById('btnPause').addEventListener('click', (e) => {
  paused = !paused;
  e.target.textContent = paused ? '▶ Resume' : '⏸ Pause';
});
document.getElementById('speed').addEventListener('input', (e) => {
  document.getElementById('speedVal').textContent =
    ['', 'slow', 'medium', 'med-fast', 'fast', 'instant'][+e.target.value];
});

// ---- Maze buttons -----------------------------------------------------------
document.getElementById('btnRandom').addEventListener('click', () => {
  grid = randomMaze(COLS, ROWS, 0.28);
  renderBase();
});
document.getElementById('btnRecursive').addEventListener('click', () => {
  grid = recursiveMaze(COLS, ROWS);
  renderBase();
});
document.getElementById('btnClearWalls').addEventListener('click', () => {
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  renderBase();
});
document.getElementById('btnClearAll').addEventListener('click', () => {
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  start = { x: 4, y: Math.floor(ROWS / 2) };
  end = { x: COLS - 5, y: Math.floor(ROWS / 2) };
  renderBase();
  statsEl.innerHTML = '';
});

// ---- Restore shared maze from URL hash --------------------------------------
// share.js (loaded after app.js) defines tryRestoreFromHash, which reads the
// grid/start/end globals and returns true if a valid #m= hash was applied.

renderBase();
