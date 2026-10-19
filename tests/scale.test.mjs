import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createLayoutModel,parseLayoutSnapshotJSON} from '../src/layout-model.mjs';

const count=3000;
const seed=Array.from({length:count},(_,i)=>({
  id:'node-'+String(i).padStart(4,'0'),
  label:'Element '+i,
  geometry:{x:i%100,y:Math.floor(i/100),width:60,height:30}
}));

test('3000-element model transactions, stable IDs, order and exact read-only snapshot roundtrip',()=>{
  const started=performance.now();
  const model=createLayoutModel(seed);
  assert.equal(model.elements.length,count);
  const afterBuild=performance.now();
  const updates=seed.map(node=>({id:node.id,geometry:{...node.geometry,x:node.geometry.x+1}}));
  assert.equal(model.updateMany(updates),true);
  assert.equal(model.revision,1,'3000-element update must be one undoable transaction');
  assert.equal(model.elements[2999].geometry.x,seed[2999].geometry.x+1);
  assert.equal(model.undo(),true);
  assert.deepEqual(model.elements,seed);
  assert.equal(model.redo(),true);
  assert.equal(model.reorder('node-2999','node-0000'),true);
  assert.equal(model.elements[0].id,'node-2999');
  const restored=parseLayoutSnapshotJSON(model.exportJSON());
  assert.equal(restored.elements.length,count);
  assert.deepEqual(restored.elements,model.elements);
  const elapsed=Math.round(performance.now()-started);
  console.log('M0_3000_MODEL_ONLY_METRIC '+JSON.stringify({
    totalMs:elapsed,buildMs:Math.round(afterBuild-started),count,
    rssMB:Math.round(process.memoryUsage().rss/1048576)
  }));
  // Real GrapesJS 3000-DOM paint/drag/scroll performance is NOT proven here.
});
