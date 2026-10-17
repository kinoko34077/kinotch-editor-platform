/** A small *exclusive* coordination boundary; does not replace upstream gesture engines. */
export class GestureGate {
  #active = null;
  #last = null;
  begin(kind, id, start) {
    if (this.#active) return false;
    if (!['resize', 'free-drag', 'group-resize', 'group-drag', 'reorder', 'select'].includes(kind)) throw new TypeError('unsupported gesture');
    if (!id || !start || typeof start !== 'object') throw new TypeError('invalid target');
    this.#active = { kind, id, start: structuredClone(start), preview: structuredClone(start) };
    return true;
  }
  preview(next) {
    if (!this.#active) return false;
    const valid = Object.values(next).every(x => typeof x !== 'number' || Number.isFinite(x));
    if (!valid) return false;
    this.#active.preview = structuredClone(next);
    return true;
  }
  get active() { return this.#active && { ...this.#active, start: structuredClone(this.#active.start), preview: structuredClone(this.#active.preview) }; }
  commit(effect) {
    if (!this.#active) return false;
    const current = this.#active;
    // Keep ownership on failure; caller can cancel/restore without duplicate writes.
    effect(current.id, structuredClone(current.preview), current.kind);
    this.#last = { kind: current.kind, id: current.id };
    this.#active = null;
    return true;
  }
  cancel() {
    if (!this.#active) return null;
    const prior = structuredClone(this.#active.start);
    this.#active = null;
    return prior;
  }
  get last() { return this.#last && { ...this.#last }; }
}