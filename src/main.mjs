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
  { id:'block-c',label:'設定欄',geometry:{x:70,y:204,width:230,height:78} }
];
const model=createLayoutModel(seed);
const gate=new GestureGate();
const status=document.querySelector('#status');
const show=s=>{status.textContent=s;};
const styleFor=g=>({position:'absolute',left:g.x+'px',top:g.y+'px',width:g.width+'px',height:g.height+'px','box-sizing':'border-box','background-color':'#e0eee9',border:'1px solid #89b4a5',padding:'10px'});
// GrapesJS owns the element tree, and its default editing gestures are disabled on these specimens.
const editor=grapesjs.init({
  container:'#canvas',height:'100%',width:'100%',storageManager:false,
  fromElement:false,blockManager:{},
  components:seed.map(e=>({tagName:'div',attributes:{'data-spike-id':e.id},name:e.label,draggable:false,resizable:false,stylable:false,style:styleFor(e.geometry),components:e.label}))
});
const components=()=>editor.getWrapper().find('[data-spike-id]');
function sync() {
  for(const e of model.elements){
    const cmp=components().find(c=>c.getAttributes()['data-spike-id']===e.id);
    if(cmp)cmp.addStyle(styleFor(e.geometry));
  }
}
function locate(id){return editor.Canvas.getBody()?.querySelector(`[data-spike-id="${id}"]`);}
const moveableReady=()=>editor.Canvas.getBody()&&locate('block-a');
editor.on('load',()=>{
  if(!moveableReady()){show('キャンバス未確認');return;}
  const frameBody=editor.Canvas.getBody();
  const frameDoc=frameBody.ownerDocument;
  const moveable=new Moveable(frameBody,{target:locate('block-a'),container:frameBody,draggable:true,resizable:true,origin:false,snappable:true});
  const selecto=new Selecto({container:frameBody,dragContainer:frameBody,selectableTargets:[...components()].map(c=>c.getEl()),selectByClick:true,selectFromInside:false});
  function initial(target){const id=target?.getAttribute('data-spike-id');return id&&model.elements.find(e=>e.id===id);}
  function chosen(els){const targets=els.filter(el=>el?.matches?.('[data-spike-id]'));
    moveable.target=targets.length===1?targets[0]:(targets.length?targets:[]);
  }
  selecto.on('select',e=>chosen(e.selected));
  let ongoingId=null;
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
  frameDoc.addEventListener('keydown',e=>{if(e.key==='Escape'&&gate.active){gate.cancel();sync();ongoingId=null;show('操作取消');}});
  // Layer-list reorder is deliberately isolated from iframe free-drag.
  const list=document.querySelector('#layers');
  const manager=new DragDropManager();const registers=[];const order=seed.map(e=>e.id);
  for(const element of seed){const li=document.createElement('li');li.dataset.id=element.id;
    const handle=document.createElement('button');handle.type='button';handle.textContent='↕';handle.setAttribute('aria-label',`${element.label} を並べ替え`);
    const label=document.createElement('span');label.textContent=element.label;
    li.append(handle,label);list.append(li);
    registers.push(new Draggable({id:'layer:'+element.id,element:li,handle},manager));
    registers.push(new Droppable({id:'target:'+element.id,element:li},manager));
  }
  manager.monitor.addEventListener('dragend',e=>{
    if(e.operation.canceled||!e.operation.target)return;
    const from=String(e.operation.source?.id||'').replace(/^layer:/,'');
    const to=String(e.operation.target?.id||'').replace(/^target:/,'');
    if(!order.includes(from)||!order.includes(to)||from===to)return;
    const at=order.indexOf(from);order.splice(at,1);order.splice(order.indexOf(to),0,from);
    for(const id of order){const node=[...list.children].find(n=>n.dataset.id===id);if(node)list.append(node);}
    show('レイヤーUIの順序のみ変更: Canvas/Documentとの同期は未実装（M2）');
  });
  show('M0実験画面: 実機/統合動作は未検証');
});
document.querySelector('#undo').onclick=()=>{if(gate.active){show('ドラッグ確定後にUndo');return;}model.undo();sync();show('Undo');};
document.querySelector('#redo').onclick=()=>{if(gate.active){show('ドラッグ確定後にRedo');return;}model.redo();sync();show('Redo');};
document.querySelector('#export').onclick=()=>{document.querySelector('#dump').textContent=model.exportJSON();show('出力を表示しました');};