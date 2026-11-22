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
editor.on('load',async()=>{
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
    // Two requestAnimationFrame boundaries plus a layout read separate the
    // old synchronous JS-only timings from browser-visible style/layout work.
    // This is headless Chrome frame/layout evidence, NOT exact paint or an SLA.
    const nextLayout=()=>new Promise(resolve=>
      requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const measure=()=>({
      x:parseFloat(getComputedStyle(element).left),
      width:parseFloat(getComputedStyle(element).width)
    });
    const assertComponentStyle=geometry=>{
      const style=component.getStyle();
      if(style.left!==geometry.x+'px'||style.width!==geometry.width+'px')
        throw new Error('GrapesJS canonical component style was not updated');
    };
    const t0=performance.now();
    if(!model.update(id,after))throw new Error('model update was no-op');
    component.addStyle({left:after.x+'px',width:after.width+'px'});
    assertComponentStyle(after);
    await nextLayout();
    const committed=measure();
    const writeAndLayoutMs=performance.now()-t0;
    if(committed.x!==after.x||committed.width!==after.width)
      throw new Error('commit GrapesJS CSS/model mismatch');
    const t1=performance.now();
    if(!model.undo())throw new Error('Undo unavailable');
    component.addStyle({left:before.x+'px',width:before.width+'px'});
    assertComponentStyle(before);
    await nextLayout();
    const restored=measure();
    const undoAndLayoutMs=performance.now()-t1;
    if(restored.x!==before.x||restored.width!==before.width)
      throw new Error('Undo GrapesJS CSS/model mismatch');
    if(model.elements.length!==N||model.revision!==2)throw new Error('incorrect model state');
    const metrics={environment:'Chrome/headless (machine-reported; not physical Safari)',
      domCount:all.length,modelCount:N,initialMs:Math.round(initialMs*100)/100,
      writeAndLayoutMs:Math.round(writeAndLayoutMs*100)/100,
      undoAndLayoutMs:Math.round(undoAndLayoutMs*100)/100,
      computedGeometryVerified:true,grapesModelStyleVerified:true,
      frameAndLayoutIncluded:true,revision:model.revision};
    document.querySelector('#bench').dataset.perfMetrics=JSON.stringify(metrics);
    document.querySelector('#status').textContent='PERF_DOM_PASS';
  }catch(error){document.querySelector('#status').textContent='PERF_DOM_FAIL: '+String(error.message);}
});
