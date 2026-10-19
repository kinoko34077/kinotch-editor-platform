import test from 'node:test';
import assert from 'node:assert/strict';
import {createTreeModel,parseTreeSnapshotJSON} from '../src/tree-model.mjs';
const registry={
  types:{
    page:{allowedChildren:['section'],defaults:{}},
    section:{allowedChildren:['section','card'],defaults:{spacing:12}},
    card:{allowedChildren:[],defaults:{spacing:4}}
  },
  properties:{
    spacing:{type:'number',inheritable:true},
    emphasis:{type:'boolean',inheritable:false}
  },
  globalDefaults:{spacing:0,emphasis:false}
};
const node=(id,typeId,parentId,layerName=id)=>({
  id,typeId,parentId,componentLabel:typeId,layerName,renderedText:layerName,local:{}
});
const fixture=[
  node('root','page',null),
  node('section-a','section','root','duplicate'),
  node('section-b','section','section-a','duplicate'),
  node('card-a','card','section-b','duplicate'),
  node('card-b','card','section-a','duplicate')
];
test('stable ID and component alias, layer name, rendered text remain separate',()=>{
  const m=createTreeModel(fixture,registry);
  m.rename('card-a','layerName','new layer');
  m.rename('card-a','componentLabel','unique alias');
  m.rename('card-a','renderedText','visible literal <strong>tag</strong>');
  assert.equal(m.getNode('card-a').id,'card-a');
  assert.equal(m.getNode('card-b').layerName,'duplicate');
  assert.equal(m.getNode('card-a').componentLabel,'unique alias');
  assert.equal(m.getNode('card-a').renderedText,'visible literal <strong>tag</strong>');
  m.undo();assert.equal(m.getNode('card-a').renderedText,'duplicate');
  m.redo();assert.equal(m.getNode('card-a').renderedText,'visible literal <strong>tag</strong>');
});
test('nearest inherited ancestor, override and reset track provenance at 4 levels',()=>{
  const m=createTreeModel(fixture,registry);
  assert.deepEqual(m.effective('card-a','spacing'),{value:4,origin:'type',sourceId:'card'});
  m.setOverride('section-a','spacing',18);
  assert.deepEqual(m.effective('card-a','spacing'),{value:18,origin:'ancestor',sourceId:'section-a'});
  m.setOverride('section-b','spacing',24);
  assert.equal(m.effective('card-a','spacing').sourceId,'section-b');
  m.setOverride('card-a','spacing',32);
  m.setOverride('section-b','spacing',40);
  assert.deepEqual(m.effective('card-a','spacing'),{value:32,origin:'local',sourceId:'card-a'});
  m.resetOverride('card-a','spacing');
  assert.deepEqual(m.effective('card-a','spacing'),{value:40,origin:'ancestor',sourceId:'section-b'});
  m.undo();assert.equal(m.effective('card-a','spacing').value,32);
  m.redo();assert.equal(m.effective('card-a','spacing').value,40);
  assert.deepEqual(m.effective('card-a','emphasis'),{value:false,origin:'global',sourceId:null});
});
test('valid container move changes inheritance dynamically, invalid cycles/parent reject without revision',()=>{
  const m=createTreeModel(fixture,registry);
  m.setOverride('section-a','spacing',18);
  m.setOverride('section-b','spacing',25);
  m.move('card-a','section-a','card-b');
  assert.equal(m.getNode('card-a').parentId,'section-a');
  assert.deepEqual(m.children('section-a').map(n=>n.id),['section-b','card-a','card-b']);
  assert.deepEqual(m.effective('card-a','spacing'),{value:18,origin:'ancestor',sourceId:'section-a'});
  const last=m.revision,save=m.nodes;
  assert.throws(()=>m.move('section-a','section-b'),/tree cycle/);
  assert.throws(()=>m.move('section-a','card-a'),/invalid drop container/);
  assert.throws(()=>m.move('card-a','section-b','card-b'),/invalid insertion sibling/);
  assert.equal(m.revision,last);
  assert.deepEqual(m.nodes,save);
  m.undo();assert.equal(m.getNode('card-a').parentId,'section-b');
});
test('strict snapshot roundtrip and reject duplicate, script-field or corrupt hierarchy',()=>{
  const m=createTreeModel(fixture,registry);
  m.setOverride('section-a','spacing',18);
  m.move('card-a','section-a','card-b');
  const doc=parseTreeSnapshotJSON(m.exportJSON(),registry);
  const restored=createTreeModel(doc.nodes,registry);
  assert.deepEqual(restored.nodes,m.nodes);
  assert.deepEqual(restored.effective('card-a','spacing'),m.effective('card-a','spacing'));
  const bad=JSON.parse(m.exportJSON());
  bad.html='<img src=x onerror=alert(1)>';
  assert.throws(()=>parseTreeSnapshotJSON(JSON.stringify(bad),registry),/snapshot/);
  delete bad.html;
  bad.nodes[0].local.spacing=Infinity;
  assert.throws(()=>parseTreeSnapshotJSON(JSON.stringify(bad),registry),/incompatible/);
  bad.nodes[0].local={};
  bad.nodes[4].id=bad.nodes[3].id;
  assert.throws(()=>parseTreeSnapshotJSON(JSON.stringify(bad),registry),/invalid tree node/);
  const invalid=structuredClone(fixture);
  invalid[1].parentId='section-b';
  assert.throws(()=>createTreeModel(invalid,registry),/tree cycle/);
});
