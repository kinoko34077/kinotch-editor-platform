// Simulated touch/viewport proof in desktop Chrome. NOT physical iPhone Safari.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const port=5176,origin='http://127.0.0.1:'+port+'/';
const server=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--port',String(port),'--strictPort'],
  {stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
let output='';
server.stdout.on('data',x=>output+=String(x).slice(0,1200));
server.stderr.on('data',x=>output+=String(x).slice(0,1200));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function within(promise,ms,phase){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Mobile viewport timeout: '+phase)),ms);})])
    .finally(()=>clearTimeout(timer));
}

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
    console.log('M0_MOBILE_WIDTH_START '+width);
    const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:2,
      hasTouch:true,isMobile:true});
    try{
      const page=await ctx.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.setDefaultTimeout(10000);
      await within(page.goto(origin,{waitUntil:'domcontentloaded',timeout:15000}),18000,'navigate '+width);
      await within(page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('M0実験画面'),
        null,{timeout:12000}),15000,'editor-load '+width);
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
      for(const key of ['main','canvas','sidebar']){
        assert(rect[key].left>=-1&&rect[key].right<=width+1,
          key+' extends outside simulated viewport at '+width+': '+JSON.stringify(rect));
      }
      assert.equal(await page.locator('#layers [data-select-id]').count(),3);
      // Playwright tap dispatches actual Chrome touch input, unlike click() in
      // a hasTouch-enabled context. Record pointerType to distinguish them.
      await page.evaluate(()=>{
        document.querySelector('#layers').addEventListener('pointerdown',ev=>{
          document.querySelector('#layers').dataset.lastInputType=ev.pointerType;
        },{capture:true});
      });
      await within(page.locator('#layers [data-select-id="block-a"]').tap(),10000,'touch-tap '+width);
      assert.equal(await page.locator('#layers').getAttribute('data-last-input-type'),'touch',
        'Chrome tap did not produce touch pointer type at '+width);
      assert.equal(await page.locator('#canvas').getAttribute('data-selected-ids'),'block-a',
        'real Chrome touch tap failed selection at '+width);
      if(width===390){
        // Chrome CDP touch swipe over layer text must not accidentally edit the
        // document, while a dnd-kit drag HANDLE remains a separate gesture.
        await page.getByRole('button',{name:'JSONを表示'}).click();
        const beforeTouch=JSON.parse(await page.locator('#dump').textContent());
        const box=await page.locator('#layers [data-select-id="block-a"]').boundingBox();
        assert(box,'layer tap target has no box');
        const x=box.x+box.width/2,y=box.y+box.height/2;
        const cdp=await ctx.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for(let i=1;i<=6;i++){
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]});
        }
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await cdp.detach();
        await page.getByRole('button',{name:'JSONを表示'}).click();
        const afterTouch=JSON.parse(await page.locator('#dump').textContent());
        assert.deepEqual(afterTouch.elements,beforeTouch.elements,
          'Touch swipe over layer label changed model data');
        assert.equal(afterTouch.revision,beforeTouch.revision,
          'Touch swipe accidentally committed an edit revision');
      }
      assert.deepEqual(errors,[],'runtime exceptions on simulated mobile '+width+': '+errors.join('; '));
      measured.push({width,scrollWidth:rect.docScrollWidth,canvasWidth:Math.round(rect.canvas.width),
        sidebarWidth:Math.round(rect.sidebar.width)});
      console.log('M0_MOBILE_WIDTH_PASS '+width+' '+JSON.stringify(rect));
    }finally{await within(ctx.close(),15000,'context-close '+width);}
  }
  console.log('M0_MOBILE_VIEWPORT_CHROME_SIMULATION_PASS '+JSON.stringify(measured));
}finally{
  if(browser)await within(browser.close(),15000,'browser-close');
  if(process.platform!=='win32'){
    try{process.kill(-server.pid,'SIGTERM');}catch{server.kill('SIGTERM');}
  }else server.kill('SIGTERM');
  server.stdout.destroy();server.stderr.destroy();
}
