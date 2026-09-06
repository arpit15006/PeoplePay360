/**
 * A small in-process cache with a time limit.
 *
 * Deliberately not Redis: this is one process, and the thing being cached is a
 * dashboard that is expensive to build and stale within a minute anyway. If
 * the API is ever run as several processes each will keep its own copy, which
 * is correct for something this short-lived — the worst case is two users
 * seeing figures a few seconds apart.
 *
 * Requests that arrive while a value is being computed share that one
 * computation rather than each starting their own, which is the difference
 * between twenty-five people costing one dashboard build and twenty-five.
 */
interface Entry<T> {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
}

export class TtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(private readonly ttlMs: number) {}

  async get(key: string, build: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key);

    if (hit && hit.expiresAt > now) {
      if (hit.value !== undefined) return hit.value;
      if (hit.pending) return hit.pending;
    }

    const pending = build()
      .then((value) => {
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
      })
      .catch((err) => {
        // A failure must not be cached, or one blip would be served for the
        // whole window.
        this.store.delete(key);
        throw err;
      });

    this.store.set(key, { pending, expiresAt: now + this.ttlMs });
    return pending;
  }

  /** Drops everything, for when the underlying data has certainly changed. */
  clear(): void {
    this.store.clear();
  }
}
