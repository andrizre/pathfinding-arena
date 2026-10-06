// Maze generation on a (cols x rows) boolean grid. true = wall.

function randomMaze(cols, rows, density = 0.28) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g[y][x] = Math.random() < density;
    }
  }
  return g;
}

// Recursive backtracker maze: odd dimensions look best, carve on odd coords.
function recursiveMaze(cols, rows) {
  // Snap to odd dims so corridors line up.
  const C = cols % 2 === 0 ? cols - 1 : cols;
  const R = rows % 2 === 0 ? rows - 1 : rows;
  const g = Array.from({ length: rows }, () => new Array(cols).fill(true));
  const inBounds = (x, y) => x > 0 && y > 0 && x < C && y < R;

  const stack = [[1, 1]];
  g[1][1] = false;
  const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const options = dirs
      .map(([dx, dy]) => [x + dx, y + dy, x + dx / 2, y + dy / 2])
      .filter(([nx, ny]) => inBounds(nx, ny) && g[ny][nx]);
    if (options.length === 0) { stack.pop(); continue; }
    const [nx, ny, wx, wy] = options[Math.floor(Math.random() * options.length)];
    g[wy][wx] = false;
    g[ny][nx] = false;
    stack.push([nx, ny]);
  }

  // Knock out some walls to add loops (makes the race more interesting).
  const extra = Math.floor(C * R * 0.03);
  for (let i = 0; i < extra; i++) {
    const x = 1 + Math.floor(Math.random() * (C - 2));
    const y = 1 + Math.floor(Math.random() * (R - 2));
    g[y][x] = false;
  }
  return g;
}
