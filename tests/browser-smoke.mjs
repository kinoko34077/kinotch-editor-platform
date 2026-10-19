// Isolated M0 smoke test. Only checks local Vite + real Chrome, not physical iPhone acceptance.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const server=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';
server.stdout.on('data',x=>output+=String(x).slice(0,1500));
server.stderr.on('data',x=>output+=String(x).slice(0,1500));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<40;i++){
    if(server.exitCode!==null) throw new Error('Vite exited unexpectedly: '+output);
    try{const r=await fetch('http://127.0.0.1:5173/');if(r.ok){ready=true;break;}}catch{}
    await sleep(250);
  }
  assert(ready,'Vite did not become ready: '+output);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('M0実験画面'),null,{timeout:25000});
  const candidates=await Promise.all(page.frames().filter(f=>f!==page.mainFrame()).map(async f=>({frame:f,url:f.url(),specimens:await f.locator('[data-spike-id]').count()})));
  const match=candidates.find(x=>x.specimens===3);
  assert(match, 'GrapesJS iframe with 3 target specimens not found: '+JSON.stringify(candidates.map(x=>({url:x.url,specimens:x.specimens}))));
  const frame=match.frame;
  await frame.waitForSelector('[data-spike-id="block-a"]',{timeout:5000});
  const specimens=await frame.locator('[data-spike-id]').count();
  assert.equal(specimens,3,'Three specimen elements must be visible in iframe');
  // The string label must be inert literal text even if it resembles markup.
  assert.equal(await frame.locator('[data-spike-id="block-c"] strong').count(),0,'Editor parsed a user label as HTML');
  assert((await frame.locator('[data-spike-id="block-c"]').textContent()).includes('<strong>literal</strong>'),
    'Label was not rendered as literal text');
  const controls=await frame.locator('.moveable-control-box').count();
  assert(controls>0,'Moveable controls not attached inside GrapesJS iframe');
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const json=JSON.parse(await page.locator('#dump').textContent());
  assert.equal(json.elements.length,3);
  assert.equal(json.schema,'m0-layout-poc.v1');
  // An actual pointer interaction is needed; frame boot alone does not prove editing.
  const original=json.elements.find(e=>e.id==='block-a').geometry;
  const rect=await frame.locator('[data-spike-id="block-a"]').boundingBox();
  assert(rect && rect.width>10 && rect.height>10,'Cannot locate draggable specimen');
  const startX=rect.x+rect.width/2;
  const startY=rect.y+rect.height/2;
  await page.mouse.move(startX,startY);
  await page.mouse.down();
  await page.mouse.move(startX+38,startY+23,{steps:9});
  await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const dragged=JSON.parse(await page.locator('#dump').textContent());
  const next=dragged.elements.find(e=>e.id==='block-a').geometry;
  assert(dragged.revision>json.revision,'Pointer drag did not commit to canonical model. Original='+JSON.stringify(original)+' Current='+JSON.stringify(next)+' Status='+await page.locator('#status').textContent());
  assert(next.x!==original.x||next.y!==original.y,'Pointer drag changed revision but not position');
  await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const undone=JSON.parse(await page.locator('#dump').textContent());
  assert.deepEqual(undone.elements.find(e=>e.id==='block-a').geometry,original,'Undo fails after actual pointer drag');
  const restoredDom=await frame.locator('[data-spike-id="block-a"]').evaluate(el=>({
    left:parseFloat(getComputedStyle(el).left),top:parseFloat(getComputedStyle(el).top)
  }));
  assert(Math.abs(restoredDom.left-original.x)<1&&Math.abs(restoredDom.top-original.y)<1,
    'DOM geometry diverges from model after Undo: '+JSON.stringify({restoredDom,original}));
  // Keyboard Ctrl+Z must use the canonical model history, not GrapesJS' UndoManager.
  await frame.locator('body').press('Control+z');
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const keyboardState=JSON.parse(await page.locator('#dump').textContent());
  assert.deepEqual(keyboardState.elements.find(e=>e.id==='block-a').geometry,original,
    'Ctrl+Z must not desynchronize model and canvas');
  await frame.locator('body').press('Delete');
  assert.equal(await frame.locator('[data-spike-id]').count(),3,'GrapesJS native Delete removed model-owned element');

  // This time Ctrl+Z is issued against a *committed* pointer move, proving
  // GrapesJS keymaps cannot silently consume its own second history stack.
  const keyboardStart=await frame.locator('[data-spike-id="block-a"]').boundingBox();
  const kx=keyboardStart.x+keyboardStart.width/2, ky=keyboardStart.y+keyboardStart.height/2;
  await page.mouse.move(kx,ky);await page.mouse.down();
  await page.mouse.move(kx+21,ky+16,{steps:8});await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const movedForKeys=JSON.parse(await page.locator('#dump').textContent()).elements.find(e=>e.id==='block-a').geometry;
  assert(movedForKeys.x!==original.x||movedForKeys.y!==original.y,'Keyboard Undo proof requires a committed move first');
  await frame.locator('body').press('Control+z');
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const restoredByKeys=JSON.parse(await page.locator('#dump').textContent()).elements.find(e=>e.id==='block-a').geometry;
  assert.deepEqual(restoredByKeys,original,'Ctrl+Z during canvas focus must undo the canonical model');
  const renderAfterKeys=await frame.locator('[data-spike-id="block-a"]').evaluate(el=>({x:parseFloat(getComputedStyle(el).left),y:parseFloat(getComputedStyle(el).top)}));
  assert(Math.abs(renderAfterKeys.x-original.x)<1&&Math.abs(renderAfterKeys.y-original.y)<1,'Ctrl+Z left stale DOM geometry '+JSON.stringify(renderAfterKeys));

  // Live pointer cancellation is a separate path from committed Undo. Escape
  // must abandon preview without modifying the canonical model or leaving CSS.
  const escapeStart=await frame.locator('[data-spike-id="block-a"]').boundingBox();
  const ex=escapeStart.x+escapeStart.width/2,ey=escapeStart.y+escapeStart.height/2;
  await page.mouse.move(ex,ey);await page.mouse.down();
  await page.mouse.move(ex+26,ey+17,{steps:6});
  await frame.locator('body').press('Escape');
  await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const afterEscape=JSON.parse(await page.locator('#dump').textContent()).elements.find(e=>e.id==='block-a').geometry;
  assert.deepEqual(afterEscape,original,'Escape should discard preview without touching canonical state');
  const renderAfterEscape=await frame.locator('[data-spike-id="block-a"]').evaluate(el=>({x:parseFloat(getComputedStyle(el).left),y:parseFloat(getComputedStyle(el).top)}));
  assert(Math.abs(renderAfterEscape.x-original.x)<1&&Math.abs(renderAfterEscape.y-original.y)<1,'Escape left stale CSS geometry '+JSON.stringify(renderAfterEscape));
  // A canceled Moveable gesture must leave handles on the restored element
  // and permit another gesture immediately; geometry-only tests miss this bug.
  await page.waitForTimeout(60);
  const escapeControl=await frame.locator('.moveable-control[data-direction="se"]').first().boundingBox();
  const escapeElement=await frame.locator('[data-spike-id="block-a"]').boundingBox();
  assert(escapeControl&&escapeElement,'Moveable controls not visible after Escape');
  assert(Math.abs(escapeControl.x+escapeControl.width/2-(escapeElement.x+escapeElement.width))<7 &&
    Math.abs(escapeControl.y+escapeControl.height/2-(escapeElement.y+escapeElement.height))<7,
    'Moveable handle remained at stale preview geometry '+JSON.stringify({escapeControl,escapeElement}));
  const beforeRetry=JSON.parse(await page.locator('#dump').textContent()).revision;
  const retryX=escapeElement.x+escapeElement.width/2,retryY=escapeElement.y+escapeElement.height/2;
  await page.mouse.move(retryX,retryY);await page.mouse.down();
  await page.mouse.move(retryX+18,retryY+12,{steps:8});await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const afterRetry=JSON.parse(await page.locator('#dump').textContent());
  assert.equal(afterRetry.revision,beforeRetry+1,'New gesture after Escape was blocked');
  await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  assert.deepEqual(JSON.parse(await page.locator('#dump').textContent()).elements.find(e=>e.id==='block-a').geometry,original,
    'Undo after retry failed');

    // Verify direct resize handle, not just keyboard-free model API updates.
  const resizeHandle=frame.locator('.moveable-control[data-direction="se"]');
  assert((await resizeHandle.count())>0,'Southeast Moveable resize handle missing');
  const handleBox=await resizeHandle.first().boundingBox();
  assert(handleBox,'Cannot locate resize handle');
  const hx=handleBox.x+handleBox.width/2, hy=handleBox.y+handleBox.height/2;
  await page.mouse.move(hx,hy);
  await page.mouse.down();
  await page.mouse.move(hx+42,hy+19,{steps:10});
  await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const resized=JSON.parse(await page.locator('#dump').textContent());
  const newSize=resized.elements.find(e=>e.id==='block-a').geometry;
  assert(newSize.width!==original.width||newSize.height!==original.height,'Actual pointer resize did not persist geometry: '+JSON.stringify(newSize));
  await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  assert.deepEqual(JSON.parse(await page.locator('#dump').textContent()).elements.find(e=>e.id==='block-a').geometry,original,'Undo fails after actual resize');
  const afterResizeDom=await frame.locator('[data-spike-id="block-a"]').evaluate(el=>({
    left:parseFloat(getComputedStyle(el).left),top:parseFloat(getComputedStyle(el).top),
    width:parseFloat(getComputedStyle(el).width),height:parseFloat(getComputedStyle(el).height)
  }));
  assert(Math.abs(afterResizeDom.left-original.x)<1&&Math.abs(afterResizeDom.top-original.y)<1,
    'DOM position does not restore after resize Undo '+JSON.stringify(afterResizeDom));
  assert(Math.abs(afterResizeDom.width-original.width)<1&&Math.abs(afterResizeDom.height-original.height)<1,
    'DOM size does not restore after resize Undo '+JSON.stringify({afterResizeDom,original}));

  // A blank-canvas pointer marquee delegates hit-testing to Selecto public API;
  // no bespoke geometry intersection algorithm is permitted in the adapter.
  const selectionFrame=await frame.frameElement(), selectionBounds=await selectionFrame.boundingBox();
  assert(selectionBounds,'iframe bounding box absent for marquee test');
  await page.mouse.move(selectionBounds.x+15,selectionBounds.y+15);
  await page.mouse.down();
  await page.mouse.move(selectionBounds.x+409,selectionBounds.y+196,{steps:16});
  await page.mouse.up();
  const directSelected=(await page.locator('#canvas').getAttribute('data-selected-ids')||'').split(',').filter(Boolean).sort();
  assert.deepEqual(directSelected,['block-a','block-b'],'Blank-canvas marquee must select both elements via Selecto public API: '+JSON.stringify({
    source:await page.locator('#canvas').getAttribute('data-m0-pointer-source'),
    started:await page.locator('#canvas').getAttribute('data-m0-marquee-started'),
    moved:await page.locator('#canvas').getAttribute('data-m0-marquee-move'),
    ended:await page.locator('#canvas').getAttribute('data-m0-marquee-end'),
    result:await page.locator('#canvas').getAttribute('data-m0-marquee-result')
  }));
  // Additive blank-canvas marquee must preserve the previous selection.
  // New rectangle lies beneath B and contains C only.
  await page.keyboard.down('Shift');
  await page.mouse.move(selectionBounds.x+15,selectionBounds.y+195);
  await page.mouse.down();
  await page.mouse.move(selectionBounds.x+310,selectionBounds.y+288,{steps:12});
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const unionIds=(await page.locator('#canvas').getAttribute('data-selected-ids')||'').split(',').filter(Boolean).sort();
  assert.deepEqual(unionIds,['block-a','block-b','block-c'],
    'Shift marquee must union prior selection with third target');
    // Real Selecto marquee → Moveable group drag must update both targets
  // in ONE canonical revision and be undone in one action.
  const boxA=await frame.locator('[data-spike-id="block-a"]').boundingBox();
  const boxB=await frame.locator('[data-spike-id="block-b"]').boundingBox();
  assert(boxA&&boxB,'Group selection specimens missing');
  // User-visible accessible layer controls provide a second Selecto route;
  // iframe marquee is verified separately above; layer controls remain a keyboard route.
  await page.locator('#layers [data-select-id="block-a"]').click();
  await page.locator('#layers [data-select-id="block-b"]').click({modifiers:['Shift']});
  // Selection is synchronized through Selecto's public API, not an undocumented
  // Moveable CSS class. Verify the selected stable targets before group pointer drag.
  const selected=(await page.locator('#canvas').getAttribute('data-selected-ids')||'').split(',').filter(Boolean);
  assert.deepEqual(selected.sort(),['block-a','block-b'],'Layer selection did not select A and B exclusively');
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const groupBefore=JSON.parse(await page.locator('#dump').textContent());
  const aBefore=groupBefore.elements.find(e=>e.id==='block-a').geometry;
  const bBefore=groupBefore.elements.find(e=>e.id==='block-b').geometry;
  const midX=boxA.x+boxA.width/2,midY=boxA.y+boxA.height/2;
  await page.mouse.move(midX,midY);
  await page.mouse.down();
  await page.mouse.move(midX+25,midY+18,{steps:10});
  await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const groupAfter=JSON.parse(await page.locator('#dump').textContent());
  const aAfter=groupAfter.elements.find(e=>e.id==='block-a').geometry;
  const bAfter=groupAfter.elements.find(e=>e.id==='block-b').geometry;
  assert.equal(groupAfter.revision,groupBefore.revision+1,'Group drag must commit once: '+JSON.stringify({
    lastGroupEvent:await page.locator('#canvas').getAttribute('data-last-group-event'),
    selected:await page.locator('#canvas').getAttribute('data-selected-ids'),
    status:await page.locator('#status').textContent(),
    moveable:await frame.locator('.moveable-control-box').evaluateAll(els=>els.map(x=>({className:x.className,style:x.getAttribute('style'),rect:[x.getBoundingClientRect().width,x.getBoundingClientRect().height]}))),
    before:{a:aBefore,b:bBefore},after:{a:aAfter,b:bAfter}
  }));
  assert(aAfter.x!==aBefore.x||aAfter.y!==aBefore.y,'Group drag target A did not move');
  assert(bAfter.x!==bBefore.x||bAfter.y!==bBefore.y,'Group drag target B did not move');
  await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const groupUndone=JSON.parse(await page.locator('#dump').textContent());
  assert.deepEqual(groupUndone.elements.find(e=>e.id==='block-a').geometry,aBefore,'Group Undo A');
  assert.deepEqual(groupUndone.elements.find(e=>e.id==='block-b').geometry,bBefore,'Group Undo B');
  // Real Moveable group resize, not just a unit-level updateMany call.
  // Selection remains in the editor, but reselect using public UI for a deterministic start.
  await page.locator('#layers [data-select-id="block-a"]').click();
  await page.locator('#layers [data-select-id="block-b"]').click({modifiers:['Shift']});
  assert.deepEqual((await page.locator('#canvas').getAttribute('data-selected-ids')||'').split(',').sort(),
    ['block-a','block-b'],'Group resize requires both targets selected');
  const groupHandle=frame.locator('.moveable-control[data-direction="se"]').last();
  await page.waitForTimeout(200); // Allow Moveable target-array re-render, not a fixed test assertion.
  const groupHandleBox=await groupHandle.boundingBox();
  assert(groupHandleBox,'Moveable group resize southeast handle missing: '+JSON.stringify(
    await frame.locator('.moveable-control-box').evaluateAll(boxes=>boxes.map(box=>({
      css:box.className,controls:[...box.querySelectorAll('.moveable-control')].map(c=>({
        direction:c.getAttribute('data-direction'),className:c.className,visible:c.getBoundingClientRect().width
      }))
    })))));
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const beforeResize=JSON.parse(await page.locator('#dump').textContent());
  const gx=groupHandleBox.x+groupHandleBox.width/2, gy=groupHandleBox.y+groupHandleBox.height/2;
  await page.mouse.move(gx,gy);
  await page.mouse.down();
  await page.mouse.move(gx+45,gy+27,{steps:10});
  await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const afterResize=JSON.parse(await page.locator('#dump').textContent());
  assert.equal(afterResize.revision,beforeResize.revision+1,
    'Moveable group resize must commit exactly one model revision: '+await page.locator('#canvas').getAttribute('data-last-group-event'));
  for(const id of ['block-a','block-b']){
    const initial=beforeResize.elements.find(e=>e.id===id).geometry;
    const updated=afterResize.elements.find(e=>e.id===id).geometry;
    assert(updated.width!==initial.width||updated.height!==initial.height,
      'Group resize did not change size for '+id+': '+JSON.stringify({initial,updated}));
  }
  // A group resize must preserve the group's affine relationships, not merely
  // change each item's size. This catches wrong beforeDist or inconsistent scaling.
  const originalA=beforeResize.elements.find(e=>e.id==='block-a').geometry;
  const originalB=beforeResize.elements.find(e=>e.id==='block-b').geometry;
  const scaledA=afterResize.elements.find(e=>e.id==='block-a').geometry;
  const scaledB=afterResize.elements.find(e=>e.id==='block-b').geometry;
  const scaleAX=scaledA.width/originalA.width,scaleBX=scaledB.width/originalB.width;
  const scaleAY=scaledA.height/originalA.height,scaleBY=scaledB.height/originalB.height;
  assert(Math.abs(scaleAX-scaleBX)<0.05&&Math.abs(scaleAY-scaleBY)<0.05,
    'Group scale not consistent between unequal-size elements '+JSON.stringify({scaleAX,scaleBX,scaleAY,scaleBY,originalA,originalB,scaledA,scaledB}));
  assert(Math.abs((scaledB.x-scaledA.x)-(originalB.x-originalA.x)*scaleAX)<2,
    'Group x-offset fails affine resize '+JSON.stringify({originalA,originalB,scaledA,scaledB}));
  assert(Math.abs((scaledB.y-scaledA.y)-(originalB.y-originalA.y)*scaleAY)<2,
    'Group y-offset fails affine resize '+JSON.stringify({originalA,originalB,scaledA,scaledB}));
  for(const id of ['block-a','block-b']){
    const modelGeom=afterResize.elements.find(e=>e.id===id).geometry;
    const dom=await frame.locator('[data-spike-id="'+id+'"]').evaluate(el=>({x:parseFloat(getComputedStyle(el).left),y:parseFloat(getComputedStyle(el).top),width:parseFloat(getComputedStyle(el).width),height:parseFloat(getComputedStyle(el).height)}));
    for(const key of ['x','y','width','height'])assert(Math.abs(dom[key]-modelGeom[key])<1,
      'Group resize CSS/model divergence '+id+': '+key+' '+JSON.stringify({dom,modelGeom}));
  }
    await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const restoredResize=JSON.parse(await page.locator('#dump').textContent());
  for(const id of ['block-a','block-b']){
    const actual=await frame.locator('[data-spike-id="'+id+'"]').evaluate(el=>({x:parseFloat(getComputedStyle(el).left),y:parseFloat(getComputedStyle(el).top),width:parseFloat(getComputedStyle(el).width),height:parseFloat(getComputedStyle(el).height)}));
    const wanted=beforeResize.elements.find(e=>e.id===id).geometry;
    for(const key of ['x','y','width','height'])assert(Math.abs(actual[key]-wanted[key])<1,'Group Undo pixels diverge '+id+' '+key+' '+JSON.stringify({actual,wanted}));
    assert.deepEqual(restoredResize.elements.find(e=>e.id===id).geometry,
      beforeResize.elements.find(e=>e.id===id).geometry,'Group resize Undo '+id);
  }
  // Real dnd-kit pointer reorder must update all three representations:
  // sidebar order, canonical JSON and GrapesJS' component collection DOM order.
  const layerButton=page.locator('#layers li[data-id="block-c"] button:first-child');
  const targetRow=page.locator('#layers li[data-id="block-a"]');
  const fromBox=await layerButton.boundingBox(), toBox=await targetRow.boundingBox();
  assert(fromBox&&toBox,'DnD source or destination not visible');
  await page.mouse.move(fromBox.x+fromBox.width/2,fromBox.y+fromBox.height/2);
  await page.mouse.down();
  await page.mouse.move(toBox.x+toBox.width/2,toBox.y+toBox.height/2,{steps:15});
  await page.mouse.up();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const reordered=JSON.parse(await page.locator('#dump').textContent());
  const expectedIds=['block-c','block-a','block-b'];
  assert.deepEqual(reordered.elements.map(e=>e.id),expectedIds,
    'dnd-kit reorder did not commit to canonical model; '+await page.locator('#status').textContent());
  // dnd-kit adds a temporary drag representation until its drop animation settles.
  // A persistent duplicate is a genuine UI bug: wait for settlement, then assert exact rows.
  await page.waitForFunction(expected=>{
    const rows=[...document.querySelectorAll('#layers li')].map(e=>e.dataset.id);
    return rows.length===expected.length&&rows.every((id,i)=>id===expected[i]);
  },expectedIds,{timeout:4000});
  assert.deepEqual(await page.locator('#layers li').evaluateAll(els=>els.map(e=>e.dataset.id)),expectedIds,'sidebar differs from canonical order after settling');
  assert.deepEqual(await frame.locator('[data-spike-id]').evaluateAll(els=>els.map(e=>e.dataset.spikeId)),expectedIds,'GrapesJS document differs from canonical order');
  await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const resetOrder=['block-a','block-b','block-c'];
  assert.deepEqual(JSON.parse(await page.locator('#dump').textContent()).elements.map(e=>e.id),resetOrder,'reorder undo fails');
  assert.deepEqual(await frame.locator('[data-spike-id]').evaluateAll(els=>els.map(e=>e.dataset.spikeId)),resetOrder,'document reorder undo fails');
  // Host's own input Undo must not be captured by editor shortcuts.
  await page.evaluate(()=>{
    const x=document.createElement('input');x.id='host-entry';x.value='original';document.body.append(x);
  });
  const hostStatus=await page.locator('#status').textContent();
  await page.locator('#host-entry').focus();
  await page.locator('#host-entry').press('Control+z');
  assert.equal(await page.locator('#status').textContent(),hostStatus,'Editor hijacked host text input Undo');
  // M2 standalone visual adapter: tree view and provenance are actionable,
  // while the production GrapesJS model remains unmodified.
  await page.locator('#tree-workbench summary').click();
  assert.equal(await page.locator('#tree-navigator [data-tree-select]').count(),5,
    'M2 visual tree must show all nested nodes');
  await page.locator('[data-tree-select="section-a"]').click();
  await page.locator('[data-tree-field="spacing"]').fill('20');
  await page.locator('[data-tree-field="spacing"]').press('Tab');
  await page.locator('[data-tree-select="card-a"]').click();
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-origin'),'ancestor');
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-source-id'),'section-a');
  assert.equal(await page.locator('[data-tree-field="spacing"]').inputValue(),'20');
  await page.locator('[data-tree-field="spacing"]').fill('31');
  await page.locator('[data-tree-field="spacing"]').press('Tab');
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-origin'),'local');
  await page.locator('[data-tree-select="section-a"]').click();
  await page.locator('[data-tree-field="spacing"]').fill('44');
  await page.locator('[data-tree-field="spacing"]').press('Tab');
  await page.locator('[data-tree-select="card-a"]').click();
  assert.equal(await page.locator('[data-tree-field="spacing"]').inputValue(),'31',
    'Child override must survive ancestor modification');
  await page.locator('[data-tree-reset]').click();
  assert.equal(await page.locator('[data-tree-field="spacing"]').inputValue(),'44');
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-source-id'),'section-a');
  await page.locator('[data-tree-field="layerName"]').fill('新名称');
  await page.locator('[data-tree-field="layerName"]').press('Tab');
  assert.equal(await page.locator('[data-tree-select="card-a"]').textContent(),'新名称');
  assert.equal(await page.locator('[data-tree-field="renderedText"]').inputValue(),'カードA',
    'Renaming layer must not overwrite visible rendered text');
  await page.locator('[data-tree-undo]').click();
  assert.equal(await page.locator('[data-tree-select="card-a"]').textContent(),'カードA',
    'Rename Undo must restore layer label');
  // Parent change affects inherited values at once, and Undo restores source.
  await page.locator('[data-tree-select="section-b"]').click();
  await page.locator('[data-tree-field="spacing"]').fill('77');
  await page.locator('[data-tree-field="spacing"]').press('Tab');
  await page.locator('[data-tree-select="card-a"]').click();
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-source-id'),'section-b');
  assert.equal(await page.locator('[data-tree-field="spacing"]').inputValue(),'77');
  assert.equal(await page.locator('[data-tree-parent] option[value="card-a"]').count(),0,
    'Tree must not offer illegal self-parent drop');
  await page.locator('[data-tree-parent]').selectOption('section-a');
  assert.equal(await page.locator('[data-tree-select="section-a"] + ul [data-tree-select="card-a"]').count(),1,
    'Child should be nested directly under new legal parent');
  assert.equal(await page.locator('[data-tree-field="spacing"]').inputValue(),'44');
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-source-id'),'section-a');
  await page.locator('[data-tree-undo]').click();
  assert.equal(await page.locator('[data-tree-field="spacing"]').inputValue(),'77',
    'Undo parent move must restore nearest inherited ancestor');
  assert.equal(await page.locator('[data-tree-source]').getAttribute('data-tree-source-id'),'section-b');

      assert.deepEqual(errors,[],'Browser uncaught exceptions: '+errors.join('; '));
  console.log(JSON.stringify({status:'BROWSER_BOOT_SMOKE_PASS',specimens,moveableControls:controls},null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
  server.stdout?.destroy();
  server.stderr?.destroy();
}
// The Vite npm wrapper can leave descendant stdout pipes open after successful assertions.
// This isolated CI smoke process must terminate deterministically after all checks pass.
process.exit(0);
