import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureGate } from '../src/gesture-gate.mjs';
import { createLayoutModel, parseLayoutSnapshotJSON } from '../src/layout-model.mjs';
const seed = [{ id:'block-a', label:'A', geometry:{x:12,y:14,width:140,height:70} }];
test('one gesture owner at a time; commit fires only once', () => {
  const gate=new GestureGate(), writes=[];
  assert.equal(gate.begin('resize','block-a', seed[0].geometry),true);
  assert.equal(gate.begin('free-drag','block-a', seed[0].geometry),false);
  assert.equal(gate.preview({x:12,y:14,width:155,height:70}),true);
  assert.equal(gate.commit((id,p,k)=>writes.push({id,p,k})),true);
  assert.equal(gate.commit(()=>writes.push('duplicate')),false);
  assert.equal(writes.length,1);
  assert.equal(writes[0].p.width,155);
});
test('invalid preview rejected and cancel preserves original', () => {
  const gate=new GestureGate();
  gate.begin('free-drag','block-a',seed[0].geometry);
  assert.equal(gate.preview({x:NaN,y:1,width:2,height:3}),false);
  assert.deepEqual(gate.cancel(),seed[0].geometry);
  assert.equal(gate.active,null);
});
test('layout model blocks duplicate IDs and out-of-range geometry', () => {
  assert.throws(()=>createLayoutModel([...seed,...seed]),/duplicate/);
  const model=createLayoutModel(seed);
  assert.throws(()=>model.update('block-a',{x:1,y:1,width:Infinity,height:2}),/non-finite/);
  assert.throws(()=>model.update('block-a',{x:1,y:1,width:0,height:2}),/size out of range/);
  assert.equal(model.revision,0);
});
test('committed edit, undo, redo, serialized state agree', () => {
  const model=createLayoutModel(seed);
  const geometry={x:25,y:55,width:200,height:100};
  assert.equal(model.update('block-a',geometry,0),true);
  assert.equal(JSON.parse(model.exportJSON()).elements[0].geometry.width,200);
  assert.throws(()=>model.update('block-a',seed[0].geometry,0),/stale/);
  assert.equal(model.undo(),true);
  assert.deepEqual(model.elements[0].geometry,seed[0].geometry);
  assert.equal(model.redo(),true);
  assert.deepEqual(model.elements[0].geometry,geometry);
});
test('read state is independent of internal state', () => {
  const model=createLayoutModel(seed);
  const x=model.elements;x[0].geometry.width=10000;
  assert.equal(model.elements[0].geometry.width,140);
});
test('atomic multi-target geometry, invalid batch leaves all targets unchanged', () => {
  const a = seed[0], b = { id: 'block-b', label: 'B', geometry: {x:20,y:50,width:100,height:40}};
  const model = createLayoutModel([a,b]);
  const original = model.elements;
  assert.throws(() => model.updateMany([
    {id:a.id,geometry:{...a.geometry,x:88}},
    {id:b.id,geometry:{...b.geometry,width:0}}
  ]),/size out of range/);
  assert.equal(model.revision,0);
  assert.deepEqual(model.elements,original);
  assert.equal(model.updateMany([{id:a.id,geometry:{...a.geometry,x:88}},{id:b.id,geometry:{...b.geometry,y:70}}]),true);
  assert.equal(model.revision,1);
  assert.equal(model.elements[1].geometry.y,70);
  assert.equal(model.undo(),true);
  assert.deepEqual(model.elements,original);
  assert.equal(model.redo(),true);
  assert.equal(model.elements[0].geometry.x,88);
  assert.throws(()=>model.updateMany([{id:a.id,geometry:a.geometry},{id:a.id,geometry:a.geometry}]),/duplicate/);
});
test('reorder is canonical, revision-guarded, undoable and serialized', () => {
  const b = {id:'block-b',label:'B',geometry:{x:2,y:2,width:10,height:10}};
  const c = {id:'block-c',label:'C',geometry:{x:3,y:3,width:10,height:10}};
  const model=createLayoutModel([...seed,b,c]);
  assert.equal(model.reorder('block-c','block-a',0),true);
  assert.deepEqual(model.elements.map(e=>e.id),['block-c','block-a','block-b']);
  assert.deepEqual(JSON.parse(model.exportJSON()).elements.map(e=>e.id),['block-c','block-a','block-b']);
  assert.throws(()=>model.reorder('block-a','block-b',0),/stale/);
  assert.equal(model.undo(),true);
  assert.deepEqual(model.elements.map(e=>e.id),['block-a','block-b','block-c']);
  assert.equal(model.redo(),true);
  assert.deepEqual(model.elements.map(e=>e.id),['block-c','block-a','block-b']);
  assert.equal(model.reorder('block-c','block-a'),false);
  assert.throws(()=>model.reorder('missing','block-b'),/unknown/);
});

test('reject huge finite CSS positions without touching committed state',()=>{
  const m=createLayoutModel(seed);
  assert.throws(()=>m.update('block-a',{...seed[0].geometry,x:1e300}),/position out of range/);
  assert.equal(m.revision,0);
  assert.deepEqual(m.elements[0].geometry,seed[0].geometry);
});

test('strict model snapshot roundtrip preserves stable IDs, order and geometry',()=>{
  const m=createLayoutModel([...seed,{id:'block-b',label:'B',geometry:{x:20,y:30,width:12,height:18}}]);
  m.reorder('block-b','block-a');
  m.update('block-a',{x:40,y:14,width:140,height:70});
  const parsed=parseLayoutSnapshotJSON(m.exportJSON());
  assert.equal(parsed.revision,m.revision);
  const restored=createLayoutModel(parsed.elements);
  assert.deepEqual(restored.elements,m.elements);
});
test('snapshot rejects unknown schema, injected script, duplicates and invalid geometry without execution',()=>{
  const m=createLayoutModel(seed);const data=JSON.parse(m.exportJSON());
  assert.throws(()=>parseLayoutSnapshotJSON('x'),SyntaxError);
  assert.throws(()=>parseLayoutSnapshotJSON(JSON.stringify({...data,schema:'untrusted.v2'})),/structure/);
  assert.throws(()=>parseLayoutSnapshotJSON(JSON.stringify({...data,html:'<script>alert(1)<\\/script>'})),/structure/);
  assert.throws(()=>parseLayoutSnapshotJSON(JSON.stringify({...data,elements:[data.elements[0],data.elements[0]]})),/element/);
  assert.throws(()=>parseLayoutSnapshotJSON(JSON.stringify({...data,elements:[{...data.elements[0],geometry:{...data.elements[0].geometry,x:1e100}}]})),/position/);
  assert.throws(()=>parseLayoutSnapshotJSON(JSON.stringify({...data,elements:[{...data.elements[0],label:{html:'<img onerror=x>'}}]})),/element/);
  assert.deepEqual(m.elements,seed);
});
