/** M0 integration SPIKE. Never attach this to production pages. */
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import Moveable from 'moveable';
import Selecto from 'selecto';
import { DragDropManager, Draggable, Droppable } from '@dnd-kit/dom';
import { GestureGate } from './gesture-gate.mjs';
import { createLayoutModel } from './layout-model.mjs';
import './spike.css';

const seed=[
  { id:'block-a',label:'見出し',geometry:{x:30,y:30,width:180,height:76} },
  { id:'block-b',label:'カード',geometry:{x:246,y:80,width:150,height:110} },
  { id:'block-c',label:'設定欄 <strong>literal</strong>',geometry:{x:70,y:204,width:230,height:78} }
];
const model=createLayoutModel(seed);
const gate=new GestureGate();
let moveableInstance=null;
const status=document.querySelector('#status');
const show=s=>{status.textContent=s;};
const styleFor=g=>({position:'absolute',left:g.x+'px',top:g.y+'px',width:g.width+'px',height:g.height+'px','box-sizing':'border-box','background-color':'#e0eee9',border:'1px solid #89b4a5',padding:'10px'});
// GrapesJS owns the element tree, and its default editing gestures are disabled on these specimens.
const editor=grapesjs.init({
  container:'#canvas',height:'100%',width:'100%',storageManager:false,
  // M0: host model is the only history/keyboard authority, never GrapesJS.
  undoManager:false,keymaps:{defaults:{}},showToolbar:false,panels:{defaults:[]},
  fromElement:false,blockManager:{},
  components:seed.map(e=>({tagName:'div',attributes:{'data-spike-id':e.id},name:e.label,draggable:false,resizable:false,stylable:false,removable:false,copyable:false,selectable:false,hoverable:false,toolbar:[],style:styleFor(e.geometry),components:[]}))
});
const components=()=>editor.getWrapper().find('[data-spike-id]');
function sync() {
  // A single bounded model owns the canonical order and geometry.
  // Mirror *model* order to GrapesJS' real component collection; sidebar is only a view.
  const wrapper=editor.getWrapper(), elements=model.elements;
  for(const [index, e] of elements.entries()){
    const cmp=components().find(c=>c.getAttributes()['data-spike-id']===e.id);
    if(!cmp)throw new Error('missing GrapesJS component: '+e.id);
    cmp.addStyle(styleFor(e.geometry));
    // Moveable previews touch DOM inline styles; force the canonical geometry
    // after every commit/Undo/cancel so pixels cannot diverge from the model.
    const node=cmp.getEl();
    if(node){const g=e.geometry;Object.assign(node.style,{left:g.x+'px',top:g.y+'px',width:g.width+'px',height:g.height+'px'});node.textContent=e.label;}
    if(wrapper.components().indexOf(cmp)!==index)cmp.move(wrapper,{at:index});
  }
  const list=document.querySelector('#layers');
  if(list){
    for(const e of elements){
      const node=[...list.children].find(n=>n.dataset.id===e.id);
      if(node)list.append(node);
    }
  }
  moveableInstance?.updateRect();
}
function locate(id){return editor.Canvas.getBody()?.querySelector(`[data-spike-id="${id}"]`);}
const moveableReady=()=>editor.Canvas.getBody()&&locate('block-a');
editor.on('load',()=>{
  if(!moveableReady()){show('キャンバス未確認');return;}
  sync(); // Render labels as inert textContent, never parse model labels as HTML.
  const frameBody=editor.Canvas.getBody();
  const frameDoc=frameBody.ownerDocument;
  const moveable=new Moveable(frameBody,{target:locate('block-a'),container:frameBody,draggable:true,resizable:true,origin:false,snappable:true});
  moveableInstance=moveable;
  // Follow upstream Selecto iframe fixture: drag/key listener belongs to the iframe window,
  // not the body. This avoids lost marquee gestures across GrapesJS' iframe boundary.
  const frameWindow=frameDoc.defaultView;
  const selecto=new Selecto({container:frameBody,dragContainer:frameWindow,keyContainer:frameWindow,hitRate:0,selectableTargets:[...components()].map(c=>c.getEl()),selectByClick:true,selectFromInside:false,toggleContinueSelect:'shift',dragCondition:()=>false});
  function initial(target){const id=target?.getAttribute('data-spike-id');return id&&model.elements.find(e=>e.id===id);}
  function chosen(els){const targets=els.filter(el=>el?.matches?.('[data-spike-id]'));
    moveable.target=targets.length===1?targets[0]:(targets.length?targets:[]);
    document.querySelector('#canvas').dataset.selectedIds=targets.map(el=>el.dataset.spikeId).join(','); // M0 test fixture diagnostic
    for(const btn of document.querySelectorAll('#layers [data-select-id]')){
      btn.setAttribute('aria-pressed',String(targets.some(el=>el.dataset.spikeId===btn.dataset.selectId)));
    }
  }
  // Do not let Selecto retarget Moveable midway through an active transform.
  selecto.on('select',e=>{if(!gate.active)chosen(e.selected);});
  // GrapesJS iframe/Gesto does not reliably deliver native area-drag.
  // Only a thin pointer/visual adapter lives here; ALL actual rectangle hit
  // tests and selected-target bookkeeping remain in Selecto's public API.
  const selectionBox=frameDoc.createElement('div');
  selectionBox.setAttribute('aria-hidden','true');
  Object.assign(selectionBox.style,{position:'fixed',pointerEvents:'none',zIndex:'100000',
    border:'1px dashed #317960',background:'rgba(69,152,126,.15)',display:'none'});
  frameBody.append(selectionBox);
  let marquee=null;
  const hideMarquee=()=>{
    selectionBox.style.display='none';
    marquee=null;
  };
  // GrapesJS paints a full-canvas wrapper (often class gjs-hovered) above
  // the body; pointer.target is that wrapper, not the body on blank canvas.
  // Only actual model-owned components / manipulators / inputs block marquee.
  const isBlankTarget=e=>{
    const target=e.target;
    return !!target&&!target.closest?.('[data-spike-id],.moveable-control-box,input,textarea,button,select,[contenteditable]');
  };
  frameDoc.addEventListener('pointerdown',e=>{
    document.querySelector('#canvas').dataset.m0PointerSource=(e.target?.tagName||'unknown')+':'+(e.target?.className||'')+' blank='+isBlankTarget(e)+' gate='+!!gate.active;
    if(e.button!==0||!e.isPrimary||gate.active||!isBlankTarget(e))return;
    marquee={pointerId:e.pointerId,start:[e.clientX,e.clientY],end:[e.clientX,e.clientY],extend:e.shiftKey,prior:selecto.getSelectedTargets()};
    document.querySelector('#canvas').dataset.m0MarqueeStarted='yes';
    try{frameBody.setPointerCapture(e.pointerId);}catch{ /* Pointer capture unavailable: document listener remains */ }
  },true);
  frameDoc.addEventListener('pointermove',e=>{
    if(!marquee||e.pointerId!==marquee.pointerId)return;
    marquee.end=[e.clientX,e.clientY];
    document.querySelector('#canvas').dataset.m0MarqueeMove=JSON.stringify(marquee.end);
    const [x,y]=marquee.start;
    const left=Math.min(x,e.clientX),top=Math.min(y,e.clientY);
    Object.assign(selectionBox.style,{left:left+'px',top:top+'px',
      width:Math.abs(e.clientX-x)+'px',height:Math.abs(e.clientY-y)+'px',display:'block'});
  },true);
  frameDoc.addEventListener('pointerup',e=>{
    if(!marquee||e.pointerId!==marquee.pointerId)return;
    const state=marquee;hideMarquee();
    document.querySelector('#canvas').dataset.m0MarqueeEnd=JSON.stringify({start:state.start,end:[e.clientX,e.clientY]});
    try{if(frameBody.hasPointerCapture(e.pointerId))frameBody.releasePointerCapture(e.pointerId);}catch{}
    const [x,y]=state.start;
    let next=[];
    if(Math.hypot(e.clientX-x,e.clientY-y)>4){
      next=selecto.setSelectedTargetsByPoints(state.start,[e.clientX,e.clientY]).selected;
    }
    if(state.extend){
      next=[...new Set([...state.prior,...next])];
    }
    selecto.setSelectedTargets(next);
    chosen(next);
    document.querySelector('#canvas').dataset.m0MarqueeResult=next.map(el=>el.dataset.spikeId).join(',');
    show('範囲選択: '+next.map(el=>el.dataset.spikeId).join(', '));
  },true);
  frameDoc.addEventListener('pointercancel',()=>hideMarquee(),true);
  frameWindow.addEventListener('blur',hideMarquee);

  let ongoingId=null;
  let groupTargets=[];
  // Moveable's official group events give per-target coordinates. A group is
  // previewed freely but written atomically once through one canonical revision.
  function groupStart(kind,e){
    const targets=(e.targets||[]).filter(el=>initial(el));
    if(targets.length<2){e.stop?.();return;}
    const baseline=Object.fromEntries(targets.map(el=>{
      const item=initial(el);return [item.id,item.geometry];
    }));
    if(!gate.begin(kind,'group',baseline)){e.stop?.();return;}
    ongoingId='group';
    groupTargets=targets;
    document.querySelector('#canvas').dataset.lastGroupEvent=kind+':start:'+targets.length;
  }
  function groupPreview(kind,e){
    if(gate.active?.kind!==kind||ongoingId!=='group')return;
    const baseline=gate.active.start, next={};
    for(const ev of e.events||[]){
      const id=ev.target?.getAttribute('data-spike-id'), g=baseline[id];
      if(!g)return;
      const d=kind==='group-drag'?(ev.dist||[0,0]):(ev.drag?.beforeDist||[0,0]);
      next[id]=kind==='group-drag'
        ?{...g,x:g.x+d[0],y:g.y+d[1]}
        :{x:g.x+d[0],y:g.y+d[1],width:ev.width,height:ev.height};
    }
    if(Object.keys(next).length!==Object.keys(baseline).length)return;
    if(!Object.values(next).every(g=>Object.values(g).every(Number.isFinite)&&g.width>=1&&g.height>=1))return;
    if(!gate.preview(next))return;
    document.querySelector('#canvas').dataset.lastGroupEvent=kind+':preview:'+Object.keys(next).length;
    for(const ev of e.events||[]){
      const id=ev.target?.getAttribute('data-spike-id'),g=next[id];
      if(g)Object.assign(ev.target.style,{left:g.x+'px',top:g.y+'px',width:g.width+'px',height:g.height+'px'});
    }
  }
  function groupEnd(kind){
    if(gate.active?.kind!==kind)return;
    try{
      gate.commit((_id,next)=>model.updateMany(Object.entries(next).map(([id,geometry])=>({id,geometry}))));
      sync();show(kind+': group committed at revision '+model.revision);
    }catch(error){gate.cancel();sync();show('複数選択の操作保留: '+error.message);}
    ongoingId=null;
    if(groupTargets.length){
      const alive=groupTargets.filter(el=>el.isConnected);
      selecto.setSelectedTargets(alive);
      chosen(alive);
    }
    groupTargets=[];
    document.querySelector('#canvas').dataset.lastGroupEvent=kind+':end';
  }
  moveable.on('dragGroupStart',e=>groupStart('group-drag',e));
  moveable.on('dragGroup',e=>groupPreview('group-drag',e));
  moveable.on('dragGroupEnd',()=>groupEnd('group-drag'));
  moveable.on('resizeGroupStart',e=>groupStart('group-resize',e));
  moveable.on('resizeGroup',e=>groupPreview('group-resize',e));
  moveable.on('resizeGroupEnd',()=>groupEnd('group-resize'));
  function start(kind,e){const found=initial(e.target);if(!found||!gate.begin(kind,found.id,found.geometry)){e.stop?.();return;}
    ongoingId=found.id;
  }
  function preview(kind,e){if(gate.active?.kind!==kind||!ongoingId)return;
    const g=gate.active.start;
    const n=kind==='resize'?{...g,width:e.width,height:e.height}: {...g,x:g.x+e.dist[0],y:g.y+e.dist[1]};
    if(!gate.preview(n))return;
    Object.assign(e.target.style,{left:n.x+'px',top:n.y+'px',width:n.width+'px',height:n.height+'px'});
  }
  function end(kind){if(gate.active?.kind!==kind)return;
    try{gate.commit((id,next)=>model.update(id,next));sync();show(`${kind}: committed at model revision ${model.revision}`);}
    catch(error){gate.cancel();sync();show(`操作保留: ${error.message}`);}
    ongoingId=null;
  }
  moveable.on('dragStart',e=>start('free-drag',e));
  moveable.on('drag',e=>preview('free-drag',e));
  moveable.on('dragEnd',()=>end('free-drag'));
  moveable.on('resizeStart',e=>start('resize',e));
  moveable.on('resize',e=>preview('resize',e));
  moveable.on('resizeEnd',()=>end('resize'));
  const cancelActive=(cause)=>{
    if(!gate.active)return;
    gate.cancel();ongoingId=null;groupTargets=[];
    sync();show('操作取消: '+cause);
  };
  const keyRoute=(e)=>{
    if(e.key==='Escape'&&gate.active){e.preventDefault();e.stopPropagation();cancelActive('Escape');return;}
    // Do not steal text-entry history from host input/textarea or rich-text editors.
    if(e.target?.closest?.('input,textarea,select,[contenteditable]')||e.target?.isContentEditable)return;
    const isUndo=(e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z';
    const isRedoY=(e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='y';
    if(isUndo||isRedoY){
      e.preventDefault();e.stopPropagation();
      if(gate.active){show('操作中はUndoできません');return;}
      if(e.shiftKey||isRedoY){model.redo();sync();show('Redo');}
      else {model.undo();sync();show('Undo');}
    }
  };
  frameDoc.addEventListener('keydown',keyRoute,true);
  document.addEventListener('keydown',keyRoute,true);
  frameWindow.addEventListener('blur',()=>cancelActive('iframe blur'));
  frameWindow.addEventListener('pointercancel',()=>cancelActive('pointercancel'),true);
  frameWindow.addEventListener('touchcancel',()=>cancelActive('touchcancel'),true);
  frameDoc.addEventListener('visibilitychange',()=>{if(frameDoc.hidden)cancelActive('hidden');});

  // Layer-list dnd-kit remains separate from free-drag on the canvas.
  // A successful drop now changes the same canonical document and component order.
  const list=document.querySelector('#layers');
  const manager=new DragDropManager();const registers=[];
  for(const element of seed){const li=document.createElement('li');li.dataset.id=element.id;
    const handle=document.createElement('button');handle.type='button';handle.textContent='↕';handle.setAttribute('aria-label',`${element.label} を並べ替え`);
    // Keyboard-available, explicit multi-select route. Selecto's documented
    // setSelectedTargets API does not itself emit a selection event, so sync both views.
    const label=document.createElement('button');
    label.type='button';label.dataset.selectId=element.id;label.textContent=element.label;
    label.setAttribute('aria-pressed','false');
    label.addEventListener('click',ev=>{
      if(gate.active)return;
      const target=locate(element.id);
      if(!target)return;
      const previous=selecto.getSelectedTargets().filter(el=>el?.isConnected);
      const additive=ev.shiftKey||ev.ctrlKey||ev.metaKey;
      const next=!additive?[target]:previous.includes(target)
        ?previous.filter(el=>el!==target):[...previous,target];
      selecto.setSelectedTargets(next);
      chosen(next);
      show('選択: '+next.map(el=>el.dataset.spikeId).join(', '));
    });
    li.append(handle,label);list.append(li);
    registers.push(new Draggable({id:'layer:'+element.id,element:li,handle},manager));
    registers.push(new Droppable({id:'target:'+element.id,element:li},manager));
  }
  manager.monitor.addEventListener('dragend',e=>{
    if(e.operation.canceled||!e.operation.target)return;
    const from=String(e.operation.source?.id||'').replace(/^layer:/,'');
    const to=String(e.operation.target?.id||'').replace(/^target:/,'');
    if(!model.elements.some(x=>x.id===from)||!model.elements.some(x=>x.id===to)||from===to)return;
    try{
      if(model.reorder(from,to)){
        sync();
        show('dnd-kit: レイヤー・GrapesJS文書順序を同期 / revision '+model.revision);
      }
    }catch(error){sync();show('並べ替え保留: '+error.message);}
  });
  show('M0実験画面: Chrome証拠以外の実機受入は未検証');
});
document.querySelector('#undo').onclick=()=>{if(gate.active){show('ドラッグ確定後にUndo');return;}model.undo();sync();show('Undo');};
document.querySelector('#redo').onclick=()=>{if(gate.active){show('ドラッグ確定後にRedo');return;}model.redo();sync();show('Redo');};
document.querySelector('#export').onclick=()=>{document.querySelector('#dump').textContent=model.exportJSON();show('出力を表示しました');};