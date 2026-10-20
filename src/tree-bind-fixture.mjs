/** Executable, bounded M2 tree/GrapesJS interoperability fixture. */
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import {createTreeModel} from './tree-model.mjs';
import {createGrapesTreeProjection} from './grapes-tree-projection.mjs';
const registry={
  rootTypes:['page'],allowMultipleRoots:false,
  types:{
    page:{allowedChildren:['section'],defaults:{}},
    section:{allowedChildren:['section','card'],defaults:{spacing:12}},
    card:{allowedChildren:[],defaults:{spacing:4}}
  },properties:{spacing:{type:'number',inheritable:true}},
  globalDefaults:{spacing:0}
};
const node=(id,typeId,parentId,text)=>({id,typeId,parentId,componentLabel:typeId,
  layerName:id,renderedText:text,local:{}});
const seed=[
  node('root','page',null,'Page'),
  node('section-a','section','root','Section A'),
  node('section-b','section','section-a','Section B'),
  node('card-a','card','section-b','literal <strong>safe</strong>'),
  node('card-b','card','section-a','Card B')
];
const model=createTreeModel(seed,registry);
const editor=grapesjs.init({
  container:'#tree-bind-canvas',height:'600px',width:'100%',components:[],
  storageManager:false,undoManager:false,keymaps:{defaults:{}},panels:{defaults:[]},
  showToolbar:false,fromElement:false,blockManager:{}
});
const output=document.querySelector('#tree-bind-status');
editor.on('load',()=>{
  try{
    const projection=createGrapesTreeProjection(editor);
    const render=()=>{const info=projection.render(model);output.textContent='TREE_BOUND_READY rev='+info.revision;};
    render();
    for(const btn of document.querySelectorAll('[data-tree-cmd]')){
      btn.addEventListener('click',()=>{
        const cmd=btn.dataset.treeCmd;
        try{
          if(cmd==='set-parent')model.setOverride('section-a','spacing',18);
          else if(cmd==='set-child')model.setOverride('card-a','spacing',31);
          else if(cmd==='reset-child')model.resetOverride('card-a','spacing');
          else if(cmd==='set-near')model.setOverride('section-b','spacing',77);
          else if(cmd==='move')model.move('card-a','section-a','card-b');
          else if(cmd==='undo')model.undo();
          else if(cmd==='invalid')model.move('section-a','card-a');
          render();
        }catch(error){output.textContent='REJECTED: '+error.message;}
      });
    }
    window.__treeBinding={model,projection}; // test-only; not consumer or SDK API
  }catch(error){output.textContent='TREE_BOUND_FAIL: '+String(error.message);}
});
