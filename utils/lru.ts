/**
 * Fixed-capacity map with least-recently-used eviction. Backed by a `Map`,
 * which preserves insertion order, so the oldest live key is always
 * `keys().next()` and a `get`/`set` "touch" is a delete + re-insert.
 */
export class LruMap<K, V> {
  private readonly entries = new Map<K, V>();

  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    if (!this.entries.has(key)) return undefined;
    const value = this.entries.get(key)!;
    // re-insert to mark most-recently-used.
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
