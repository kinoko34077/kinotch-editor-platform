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
