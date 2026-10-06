// All algorithms run as step-generators so the visualizer can interleave them.
// Each yields { type: 'visit' | 'frontier' | 'done', x, y, path? }.
// Grid: array of rows, true = wall. Start/end are {x, y}.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function* genericSearch(grid, start, end, mode, h) {
  const rows = grid.length, cols = grid[0].length;
  const key = (x, y) => y * cols + x;
  const dist = new Map();
  const prev = new Map();
  const closed = new Set();
  const heap = new MinHeap();
  const h0 = h ? h(start.x, start.y) : 0;
  dist.set(key(start.x, start.y), 0);
  heap.push({ x: start.x, y: start.y, g: 0 }, h0);

  while (heap.size > 0) {
    const cur = heap.pop();
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    yield { type: 'visit', x: cur.x, y: cur.y };

    if (cur.x === end.x && cur.y === end.y) {
      const path = [];
      let k = ck;
      while (k !== undefined) {
        path.push({ x: k % cols, y: Math.floor(k / cols) });
        k = prev.get(k);
      }
      path.reverse();
      yield { type: 'done', path };
      return;
    }

    const g = dist.get(ck);
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (grid[ny][nx]) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = g + 1;
      if (dist.has(nk) && dist.get(nk) <= ng) continue;
      dist.set(nk, ng);
      prev.set(nk, ck);
      yield { type: 'frontier', x: nx, y: ny };
      const f = mode === 'astar' ? ng + h(nx, ny)
              : mode === 'greedy' ? h(nx, ny)
              : ng;
      heap.push({ x: nx, y: ny, g: ng }, f);
    }
  }
  yield { type: 'done', path: null };
}

function manhattan(end) {
  return (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);
}

// BFS implemented as unweighted Dijkstra (heap with pure g) for uniform style.
const ALGORITHMS = {
  astar:    { name: 'A*',       run: (g, s, e) => genericSearch(g, s, e, 'astar',   manhattan(e)) },
  dijkstra: { name: 'Dijkstra', run: (g, s, e) => genericSearch(g, s, e, 'dijkstra', null) },
  bfs:      { name: 'BFS',      run: (g, s, e) => genericSearch(g, s, e, 'bfs',     null) },
  greedy:   { name: 'Greedy',   run: (g, s, e) => genericSearch(g, s, e, 'greedy',  manhattan(e)) },
};
