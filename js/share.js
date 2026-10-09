// ---- Share / restore maze via URL hash -------------------------------------
// Format: #m=<base64url(RLE payload)> where payload JSON is
// { c, r, s:[x,y], e:[x,y], w:"<run-length encoded rows>" }.
// RLE: rows joined by "\n"; each row is comma-separated runs where each run is
// <0|1><count-base36> (value first, so the count never leaks into the value).

function encodeMaze() {
  const rowStrs = [];
  for (let y = 0; y < ROWS; y++) {
    let count = 0, cur = grid[y][0];
    const runs = [];
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === cur) { count++; continue; }
      runs.push((cur ? '1' : '0') + count.toString(36));
      cur = grid[y][x]; count = 1;
    }
    runs.push((cur ? '1' : '0') + count.toString(36));
    rowStrs.push(runs.join(','));
  }
  const payload = {
    c: COLS, r: ROWS,
    s: [start.x, start.y], e: [end.x, end.y],
    w: rowStrs.join('\n'),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

function decodeMaze(b64) {
  let json;
  try {
    json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  } catch { return null; }
  let p;
  try { p = JSON.parse(json); } catch { return null; }
  if (typeof p.c !== 'number' || typeof p.r !== 'number' ||
      !Array.isArray(p.s) || !Array.isArray(p.e) || typeof p.w !== 'string') return null;
  if (p.c < 2 || p.r < 2 || p.c > 500 || p.r > 500) return null;

  const g = Array.from({ length: p.r }, () => new Array(p.c).fill(false));
  const rows = p.w.split('\n');
  if (rows.length !== p.r) return null;
  for (let y = 0; y < p.r; y++) {
    let x = 0;
    // parse tokens: base36 count followed by 0/1
    const tokens = rows[y].split(',');
    if (!tokens.length) return null;
    for (const t of tokens) {
      if (!t || !/^[01][0-9a-z]+$/.test(t)) return null;
      const cnt = parseInt(t.slice(1), 36);
      const val = t[0] === '1';
      if (!Number.isInteger(cnt) || cnt <= 0) return null;
      for (let i = 0; i < cnt; i++) { if (x >= p.c) return null; g[y][x++] = val; }
    }
    if (x !== p.c) return null;
  }
  const sx = p.s[0], sy = p.s[1], ex = p.e[0], ey = p.e[1];
  if (![sx, sy, ex, ey].every(n => Number.isInteger(n))) return null;
  if (sx < 0 || sy < 0 || sx >= p.c || sy >= p.r) return null;
  if (ex < 0 || ey < 0 || ex >= p.c || ey >= p.r) return null;
  if (g[sy][sx] || g[ey][ex]) return null;
  return { grid: g, start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}

function tryRestoreFromHash() {
  const m = location.hash.match(/^#m=([A-Za-z0-9_-]+)$/);
  if (!m) return false;
  const decoded = decodeMaze(m[1]);
  if (!decoded) { history.replaceState(null, '', location.pathname + location.search); return false; }
  grid = decoded.grid;
  start = decoded.start;
  end = decoded.end;
  return true;
}

document.getElementById('btnShare').addEventListener('click', () => {
  const hash = '#m=' + encodeMaze();
  history.replaceState(null, '', location.pathname + location.search + hash);
  navigator.clipboard?.writeText(location.href).then(() => {
    const btn = document.getElementById('btnShare');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '🔗 Share link'; }, 1500);
  }).catch(() => {});
});

// Load after app.js: if the URL carries a shared maze, replace the default one.
if (tryRestoreFromHash()) {
  renderBase();
  statsEl.innerHTML = '<span class="muted">Loaded a shared maze from the link.</span>';
}
