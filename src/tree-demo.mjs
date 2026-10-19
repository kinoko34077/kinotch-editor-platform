/** Research-only M2 visual bindings; no host page data or GrapesJS tree is mutated. */
import {createTreeModel} from './tree-model.mjs';
import {mountTreeWorkbench} from './tree-workbench.mjs';
const registry={
  rootTypes:['page'],allowMultipleRoots:false,
  types:{
    page:{allowedChildren:['section'],defaults:{}},
    section:{allowedChildren:['section','card'],defaults:{spacing:12}},
    card:{allowedChildren:[],defaults:{spacing:4}}
  },
  properties:{spacing:{type:'number',inheritable:true}},
  globalDefaults:{spacing:0}
};
const node=(id,typeId,parentId,layerName)=>({
  id,typeId,parentId,layerName,componentLabel:typeId,renderedText:layerName,local:{}
});
const model=createTreeModel([
  node('root','page',null,'ページ'),
  node('section-a','section','root','セクションA'),
  node('section-b','section','section-a','セクションB'),
  node('card-a','card','section-b','カードA'),
  node('card-b','card','section-a','カードB')
],registry);
const canNest=(selected,candidate,nodes)=>{
  if(candidate.id===selected.id)return false;
  if(!registry.types[candidate.typeId].allowedChildren.includes(selected.typeId))return false;
  let current=candidate;
  while(current){
    if(current.id===selected.id)return false;
    current=nodes.find(x=>x.id===current.parentId);
  }
  return true;
};
mountTreeWorkbench(document.querySelector('#tree-workbench-panel'),model,canNest);
