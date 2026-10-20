/** Measures actual 3000-node GrapesJS iframe; headless Chrome only.
 *  Do not turn raw timings into product SLA without device/UX acceptance.
 */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--port','5177','--strictPort'],
  {stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output+=String(b).slice(0,1200);if(output.length>5000)output=output.slice(-5000);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){
    if(child.exitCode!==null)throw new Error('Vite failed: '+output);
    try{const r=await fetch('http://127.0.0.1:5177/performance.html');if(r.ok){ready=true;break;}}catch{}
    await sleep(300);
  }
  assert(ready,'Vite not ready: '+output);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1250,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5177/performance.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.startsWith('PERF_DOM_'),null,{timeout:150000});
  const status=await page.locator('#status').textContent();
  assert.equal(status,'PERF_DOM_PASS','GrapesJS 3000 DOM fixture failed: '+status+' / '+errors.join('; '));
  const metrics=JSON.parse(await page.locator('#bench').getAttribute('data-perf-metrics'));
  assert.equal(metrics.domCount,3000);
  assert.equal(metrics.modelCount,3000);
  assert.equal(metrics.revision,2);
  assert.equal(metrics.computedGeometryVerified,true);
  assert(metrics.initialMs>=0&&metrics.writeMs>=0&&metrics.undoMs>=0,'negative timer result');
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  console.log('GRAPESJS_3000_DOM_PASS '+JSON.stringify(metrics));
}finally{
  if(browser)await browser.close();
  if(child.pid){try{if(process.platform==='win32')child.kill();else process.kill(-child.pid,'SIGTERM');}catch{}}
  child.stdout?.destroy();child.stderr?.destroy();
}
