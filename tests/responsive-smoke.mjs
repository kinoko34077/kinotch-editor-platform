// Simulated touch/viewport proof in desktop Chrome. NOT physical iPhone Safari.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const port=5176,origin='http://127.0.0.1:'+port+'/';
const server=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--port',String(port),'--strictPort'],
  {stdio:['ignore','pipe','pipe']});
let output='';
server.stdout.on('data',x=>output+=String(x).slice(0,1200));
server.stderr.on('data',x=>output+=String(x).slice(0,1200));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<50;i++){
    if(server.exitCode!==null)throw new Error('Vite failed: '+output);
    try{const r=await fetch(origin);if(r.ok){ready=true;break;}}catch{}
    await sleep(250);
  }
  assert(ready,'Vite did not start '+output);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const widths=[320,375,390,430,768];
  const measured=[];
  for(const width of widths){
    const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:2,
      hasTouch:true,isMobile:true});
    try{
      const page=await ctx.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('M0実験画面'),
        null,{timeout:25000});
      const rect=await page.evaluate(()=>{
        const canvas=document.querySelector('#canvas'),sidebar=document.querySelector('aside');
        const r=el=>{const x=el.getBoundingClientRect();return {width:x.width,height:x.height,left:x.left,right:x.right}};
        return {viewport:innerWidth,docScrollWidth:document.documentElement.scrollWidth,
          canvas:r(canvas),sidebar:r(sidebar),main:r(document.querySelector('main'))};
      });
      assert.equal(rect.viewport,width,'mobile simulated viewport width must be exact');
      assert(rect.docScrollWidth<=width+2,
        'Horizontal overflow at '+width+' px: '+JSON.stringify(rect));
      assert(rect.canvas.width>0&&rect.canvas.height>=300,'canvas unusable '+width+': '+JSON.stringify(rect));
      assert(rect.sidebar.width>0,'layer navigator collapsed at '+width);
      assert.equal(await page.locator('#layers [data-select-id]').count(),3);
      await page.locator('#layers [data-select-id="block-a"]').click();
      assert.equal(await page.locator('#canvas').getAttribute('data-selected-ids'),'block-a',
        'layer select inaccessible in narrow layout '+width);
      assert.deepEqual(errors,[],'runtime exceptions on simulated mobile '+width+': '+errors.join('; '));
      measured.push({width,scrollWidth:rect.docScrollWidth,canvasWidth:Math.round(rect.canvas.width),
        sidebarWidth:Math.round(rect.sidebar.width)});
    }finally{await ctx.close();}
  }
  console.log('M0_MOBILE_VIEWPORT_CHROME_SIMULATION_PASS '+JSON.stringify(measured));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
