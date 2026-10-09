# Pathfinding Arena

An interactive, single-page **pathfinding algorithm visualizer**: draw a maze,
then race **A\***, **Dijkstra**, **BFS**, and **Greedy Best-First** against each
other on the same grid, with per-algorithm colored search fronts and animated
final paths. Includes live stats (nodes visited, path length, time) and two
maze generators (random density and recursive backtracker with extra loops).

## Run

No build step, no dependencies, no network. Just open `index.html` directly in
any modern browser.

## How to use

1. Pick a tool (Wall / Erase / Start / End) and drag on the grid to draw.
2. Toggle which algorithms to race.
3. Press **Visualize** — all selected algorithms search simultaneously.
4. Adjust speed, or generate a Random / Recursive maze.

## Algorithms

All four share one heap-based step-generator core, differing only in priority:

| Algorithm | Priority |
|-----------|----------|
| A* | `g + manhattan` (optimal, fast in practice) |
| Dijkstra | `g` (optimal, explores uniformly) |
| BFS | `g` with insertion-order ties (optimal on unweighted grids) |
| Greedy | `manhattan` (fast, not optimal) |

## Sharing

**Share link** writes the current maze (walls, start, and end) into the URL as
a compact run-length-encoded hash and copies the link. Anyone who opens it
sees exactly your maze — no server, no storage, everything lives in the URL.
