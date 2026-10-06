// Min-heap keyed by numeric priority (ties broken by insertion order).
class MinHeap {
  constructor() {
    this.items = [];
    this.seq = 0;
  }

  get size() { return this.items.length; }

  push(item, priority) {
    this.items.push({ item, priority, seq: this.seq++ });
    this._up(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._down(0);
    }
    return top.item;
  }

  _up(i) {
    const a = this.items;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; }
      else break;
    }
  }

  _down(i) {
    const a = this.items;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && this._less(a[l], a[m])) m = l;
      if (r < a.length && this._less(a[r], a[m])) m = r;
      if (m === i) break;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
    }
  }

  _less(x, y) {
    return x.priority < y.priority || (x.priority === y.priority && x.seq < y.seq);
  }
}
