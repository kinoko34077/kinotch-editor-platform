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
  // Real Selecto marquee → Moveable group drag must update both targets
  // in ONE canonical revision and be undone in one action.
  const boxA=await frame.locator('[data-spike-id="block-a"]').boundingBox();
  const boxB=await frame.locator('[data-spike-id="block-b"]').boundingBox();
  assert(boxA&&boxB,'Group selection specimens missing');
  // User-visible accessible layer controls provide a second Selecto route;
  // iframe marquee is separately unverified and must not be claimed here.
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
  assert.equal(groupAfter.revision,groupBefore.revision+1,'Group drag must commit once');
  assert(aAfter.x!==aBefore.x||aAfter.y!==aBefore.y,'Group drag target A did not move');
  assert(bAfter.x!==bBefore.x||bAfter.y!==bBefore.y,'Group drag target B did not move');
  await page.getByRole('button',{name:'元に戻す'}).click();
  await page.getByRole('button',{name:'JSONを表示'}).click();
  const groupUndone=JSON.parse(await page.locator('#dump').textContent());
  assert.deepEqual(groupUndone.elements.find(e=>e.id==='block-a').geometry,aBefore,'Group Undo A');
  assert.deepEqual(groupUndone.elements.find(e=>e.id==='block-b').geometry,bBefore,'Group Undo B');
  // Real dnd-kit pointer reorder must update all three representations:
  // sidebar order, canonical JSON and GrapesJS' component collection DOM order.
  const layerButton=page.locator('#layers li[data-id="block-c"] button');
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
