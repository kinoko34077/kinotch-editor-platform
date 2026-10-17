/** Dependency-free bounded state for a proof-of-concept; not a production document schema. */
const finite = n => Number.isFinite(n);
const safeGeom = g => {
  if (!g || !['x', 'y', 'width', 'height'].every(k => finite(g[k]))) throw new TypeError('non-finite geometry');
  if (g.width < 1 || g.height < 1 || g.width > 20000 || g.height > 20000) throw new RangeError('size out of range');
  return { x: g.x, y: g.y, width: g.width, height: g.height };
};
export function createLayoutModel(initial) {
  if (!Array.isArray(initial) || !initial.length) throw new TypeError('no elements');
  const unique = new Set();
  const clone = list => list.map(e => ({ id: e.id, label: e.label, geometry: { ...e.geometry } }));
  let current = initial.map(e => {
    if (!/^[a-z][a-z0-9-]{0,60}$/.test(e.id) || unique.has(e.id)) throw new TypeError('invalid or duplicate stable id');
    unique.add(e.id);
    return { id: e.id, label: String(e.label), geometry: safeGeom(e.geometry) };
  });
  const undo = [], redo = [];
  let revision = 0;
  function update(id, geometry, expectedRevision = revision) {
    if (expectedRevision !== revision) throw new Error('stale state revision');
    const pos = current.findIndex(e => e.id === id);
    if (pos < 0) throw new TypeError('unknown element');
    const nextGeometry = safeGeom(geometry);
    if (JSON.stringify(nextGeometry) === JSON.stringify(current[pos].geometry)) return false;
    undo.push(clone(current));
    if (undo.length > 50) undo.shift();
    redo.length = 0;
    current = current.map((e, i) => i === pos ? { ...e, geometry: nextGeometry } : e);
    revision++;
    return true;
  }
  function step(from, to) {
    if (!from.length) return false;
    to.push(clone(current));
    current = from.pop();
    revision++;
    return true;
  }
  return {
    get revision() { return revision; },
    get elements() { return clone(current); },
    update, undo: () => step(undo, redo), redo: () => step(redo, undo),
    exportJSON() { return JSON.stringify({ schema: 'm0-layout-poc.v1', revision, elements: clone(current) }); },
    staticImport() { throw new Error('Import intentionally disabled until document validation and migration contract are defined'); }
  };
}