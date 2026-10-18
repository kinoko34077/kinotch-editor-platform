/** Dependency-free bounded state for a proof-of-concept; not a production document schema. */
const finite = n => Number.isFinite(n);
const safeGeom = g => {
  if (!g || !['x', 'y', 'width', 'height'].every(k => finite(g[k]))) throw new TypeError('non-finite geometry');
  if (Math.abs(g.x) > 100000 || Math.abs(g.y) > 100000) throw new RangeError('position out of range');
  if (g.width < 1 || g.height < 1 || g.width > 20000 || g.height > 20000) throw new RangeError('size out of range');
  return { x: g.x, y: g.y, width: g.width, height: g.height };
};
// Pure, read-only snapshot validation. This does NOT enable untrusted HTML imports
// or mutate a mounted GrapesJS/consumer document.
export function parseLayoutSnapshotJSON(source) {
  if (typeof source !== 'string' || source.length > 2_000_000) throw new TypeError('invalid snapshot size');
  const parsed = JSON.parse(source);
  const keys = obj => Object.keys(obj).sort().join(',');
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' ||
      keys(parsed) !== 'elements,revision,schema' ||
      parsed.schema !== 'm0-layout-poc.v1' ||
      !Number.isSafeInteger(parsed.revision) || parsed.revision < 0 ||
      !Array.isArray(parsed.elements) || parsed.elements.length < 1 || parsed.elements.length > 3000) {
    throw new TypeError('invalid snapshot structure');
  }
  const seen = new Set();
  const elements = parsed.elements.map(element => {
    if (!element || typeof element !== 'object' || Array.isArray(element) ||
        keys(element) !== 'geometry,id,label' ||
        typeof element.id !== 'string' || !/^[a-z][a-z0-9-]{0,60}$/.test(element.id) ||
        seen.has(element.id) || typeof element.label !== 'string' || element.label.length > 256 ||
        !element.geometry || typeof element.geometry !== 'object' ||
        keys(element.geometry) !== 'height,width,x,y') throw new TypeError('invalid snapshot element');
    seen.add(element.id);
    return {id:element.id,label:element.label,geometry:safeGeom(element.geometry)};
  });
  return {schema:parsed.schema,revision:parsed.revision,elements};
}

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
  // Atomic multi-target transform: validate *all* inputs before one snapshot/write.
  function updateMany(entries, expectedRevision = revision) {
    if (expectedRevision !== revision) throw new Error('stale state revision');
    if (!Array.isArray(entries) || !entries.length) throw new TypeError('no updates');
    const nextById = new Map();
    for (const item of entries) {
      if (!item || typeof item.id !== 'string' || nextById.has(item.id)) throw new TypeError('invalid or duplicate update target');
      if (!current.some(e => e.id === item.id)) throw new TypeError('unknown element');
      nextById.set(item.id, safeGeom(item.geometry));
    }
    if (![...nextById].some(([id, g]) => JSON.stringify(current.find(e => e.id === id).geometry) !== JSON.stringify(g))) return false;
    undo.push(clone(current));
    if (undo.length > 50) undo.shift();
    redo.length = 0;
    current = current.map(e => nextById.has(e.id) ? {...e, geometry: nextById.get(e.id)} : e);
    revision++;
    return true;
  }
  // Order is canonical and undoable; position geometry remains independent for free-layout specimens.
  function reorder(sourceId, beforeId, expectedRevision = revision) {
    if (expectedRevision !== revision) throw new Error('stale state revision');
    if (sourceId === beforeId) return false;
    const from = current.find(e => e.id === sourceId), to = current.find(e => e.id === beforeId);
    if (!from || !to) throw new TypeError('unknown element');
    const next = current.filter(e => e.id !== sourceId);
    next.splice(next.findIndex(e => e.id === beforeId), 0, from);
    if (next.every((e, i) => e.id === current[i].id)) return false;
    undo.push(clone(current));
    if (undo.length > 50) undo.shift();
    redo.length = 0;
    current = next;
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
    update, updateMany, reorder, undo: () => step(undo, redo), redo: () => step(redo, undo),
    exportJSON() { return JSON.stringify({ schema: 'm0-layout-poc.v1', revision, elements: clone(current) }); },
    staticImport() { throw new Error('Import intentionally disabled until document validation and migration contract are defined'); }
  };
}