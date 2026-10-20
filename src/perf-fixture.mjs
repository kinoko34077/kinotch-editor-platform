/** Isolated benchmark only: 3,000 actual GrapesJS-rendered iframe nodes.
 *  NOT the production app, not a mobile/iPhone performance certification.
 */
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import {createLayoutModel} from './layout-model.mjs';

const N=3000;
const seed=Array.from({length:N},(_,i)=>({
  id:'tile-'+String(i).padStart(5,'0'),label:'tile '+i,
  geometry:{x:10+(i%30)*125,y:10+Math.floor(i/30)*60,width:105,height:45}
}));
const model=createLayoutModel(seed);
const started=performance.now();
const editor=grapesjs.init({
  container:'#bench',height:'620px',width:'100%',storageManager:false,
  undoManager:false,keymaps:{defaults:{}},showToolbar:false,panels:{defaults:[]},
  fromElement:false,blockManager:{},
  components:seed.map(item=>({
    tagName:'div',attributes:{'data-perf-id':item.id},
    draggable:false,resizable:false,stylable:false,
    removable:false,copyable:false,selectable:false,hoverable:false,toolbar:[],
    style:{position:'absolute',left:item.geometry.x+'px',top:item.geometry.y+'px',
      width:item.geometry.width+'px',height:item.geometry.height+'px'},
    components:[{type:'textnode',content:item.label}]
  }))
});
editor.on('load',()=>{
  try{
    const body=editor.Canvas.getBody();
    const all=[...body.querySelectorAll('[data-perf-id]')];
    if(all.length!==N)throw new Error('actual GrapesJS iframe DOM count '+all.length+' !== '+N);
    const initialMs=performance.now()-started;
    const id='tile-01500',element=body.querySelector('[data-perf-id="'+id+'"]');
    const component=editor.getWrapper().find('[data-perf-id="'+id+'"]')[0];
    if(!element||!component)throw new Error('target unavailable in GrapesJS');
    const before=model.elements.find(x=>x.id===id).geometry;
    const after={...before,x:before.x+19,width:before.width+11};
    const t0=performance.now();
    if(!model.update(id,after))throw new Error('model update was no-op');
    component.addStyle({left:after.x+'px',width:after.width+'px'});
    Object.assign(element.style,{left:after.x+'px',width:after.width+'px'});
    const writeMs=performance.now()-t0;
    const measure=()=>({x:parseFloat(getComputedStyle(element).left),width:parseFloat(getComputedStyle(element).width)});
    const committed=measure();
    if(committed.x!==after.x||committed.width!==after.width)throw new Error('commit DOM/model mismatch');
    const t1=performance.now();
    if(!model.undo())throw new Error('Undo unavailable');
    component.addStyle({left:before.x+'px',width:before.width+'px'});
    Object.assign(element.style,{left:before.x+'px',width:before.width+'px'});
    const undoMs=performance.now()-t1;
    const restored=measure();
    if(restored.x!==before.x||restored.width!==before.width)throw new Error('Undo DOM mismatch');
    if(model.elements.length!==N||model.revision!==2)throw new Error('incorrect model state');
    const metrics={environment:'Chrome/headless (machine-reported; not physical Safari)',
      domCount:all.length,modelCount:N,initialMs:Math.round(initialMs*100)/100,
      writeMs:Math.round(writeMs*100)/100,undoMs:Math.round(undoMs*100)/100,
      computedGeometryVerified:true,revision:model.revision};
    document.querySelector('#bench').dataset.perfMetrics=JSON.stringify(metrics);
    document.querySelector('#status').textContent='PERF_DOM_PASS';
  }catch(error){document.querySelector('#status').textContent='PERF_DOM_FAIL: '+String(error.message);}
});
