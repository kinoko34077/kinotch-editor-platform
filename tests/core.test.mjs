import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureGate } from '../src/gesture-gate.mjs';
import { createLayoutModel } from '../src/layout-model.mjs';
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