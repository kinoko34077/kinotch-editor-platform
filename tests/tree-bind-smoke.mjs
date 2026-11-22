/** Chrome real GrapesJS iframe hierarchy + model single-owner test. */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const proc=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--port','5178','--strictPort'],
 {stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
let output='';for(const stream of [proc.stdout,proc.stderr])stream.on('data',x=>{output+=String(x).slice(0,1000);if(output.length>5000)output=output.slice(-5000);});
let browser;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let ready=false;
 for(let i=0;i<60;i++){
   if(proc.exitCode!==null)throw Error('Vite failed '+output);
   try{if((await fetch('http://127.0.0.1:5178/tree-bind.html')).ok){ready=true;break;}}catch{}
   await pause(250);
 }
 assert(ready,'Vite not ready: '+output);
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1200,height:850}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:5178/tree-bind.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#tree-bind-status')?.textContent?.startsWith('TREE_BOUND_')&&
   !document.querySelector('#tree-bind-status')?.textContent?.includes('initializing'),null,{timeout:60000});
 assert.match(await page.locator('#tree-bind-status').textContent(),/^TREE_BOUND_READY/);
 const candidates=await Promise.all(page.frames().filter(f=>f!==page.mainFrame())
   .map(async f=>({frame:f,url:f.url(),count:await f.locator('[data-tree-node-id]').count()})));
 const found=candidates.find(x=>x.count===5);
 assert(found,'Expected GrapesJS iframe with 5 nodes: '+JSON.stringify(candidates.map(x=>({url:x.url,count:x.count}))));
 const target=found.frame;
 await target.locator('[data-tree-node-id]').first().waitFor({state:'attached'});
 const item=id=>target.locator('[data-tree-node-id="'+id+'"]');
 assert.equal(await target.locator('[data-tree-node-id]').count(),5,'GrapesJS actual DOM node count');
 assert.equal(await item('card-a').locator('strong').count(),0,'Rendered text must not be parsed HTML');
 assert((await item('card-a').textContent()).includes('<strong>safe</strong>'),'literal text lost');
 // GrapesJS, not the transient iframe DOM, must own exportable text and metadata.
 const grapeshot=await page.evaluate(()=>{
   const editor=window.__treeBinding.editor;
   const cmp=editor.getWrapper().find('[data-tree-node-id="card-a"]')[0];
   return {
     text:cmp.components().at(0).components().at(0).get('content'),
     style:cmp.getStyle(),attributes:cmp.getAttributes(),
     projectJSON:JSON.stringify(editor.getProjectData()),html:editor.getHtml()
   };
 });
 assert.equal(grapeshot.text,'literal <strong>safe</strong>','text missing from GrapesJS model');
 assert.equal(grapeshot.style.padding,'4px','spacing missing from GrapesJS model');
 assert.equal(grapeshot.attributes['data-tree-origin'],'type','provenance missing from model');
 assert.equal(grapeshot.attributes['data-tree-source-id'],'card','source ID missing from model');
 assert(grapeshot.projectJSON.includes('literal <strong>safe</strong>'),'project save omits literal text');
 assert(!grapeshot.html.includes('<strong>safe</strong>'),'literal text exported as active markup');
 const nestedBefore=await item('card-a').evaluate(el=>el.parentElement?.dataset?.treeNodeId);
 assert.equal(nestedBefore,'section-b','Card A should physically nest inside Section B');
 const padding=id=>item(id).evaluate(el=>parseFloat(getComputedStyle(el).paddingLeft));
 assert.equal(await padding('card-a'),4,'type default projected');
 await page.locator('[data-tree-cmd="set-parent"]').click();
 assert.equal(await padding('card-a'),18,'nearest ancestor should propagate into CSS');
 await page.locator('[data-tree-cmd="set-child"]').click();
 assert.equal(await padding('card-a'),31,'local override projected into CSS');
 await page.locator('[data-tree-cmd="set-near"]').click();
 assert.equal(await padding('card-a'),31,'local override should survive ancestor change');
 await page.locator('[data-tree-cmd="reset-child"]').click();
 assert.equal(await padding('card-a'),77,'local reset should reveal closer parent');
 assert.equal(await item('card-a').getAttribute('data-tree-source-id'),'section-b','effective source must be visible');
 await page.locator('[data-tree-cmd="move"]').click();
 assert.equal(await item('card-a').evaluate(el=>el.parentElement?.dataset?.treeNodeId),'section-a',
   'GrapesJS actual DOM parent must move with canonical document');
 assert.equal(await padding('card-a'),18,'parent move must update inherited CSS');
 await page.locator('[data-tree-cmd="undo"]').click();
 assert.equal(await item('card-a').evaluate(el=>el.parentElement?.dataset?.treeNodeId),'section-b',
   'Undo must restore actual GrapesJS nested parent');
 assert.equal(await padding('card-a'),77,'Undo must restore computed ancestor value');
 const beforeFailure=await page.evaluate(()=>window.__treeBinding.model.exportJSON());
 await page.locator('[data-tree-cmd="out-of-range"]').click();
 assert.match(await page.locator('#tree-bind-status').textContent(),/^ROLLED_BACK:/);
 assert.equal(await page.evaluate(()=>window.__treeBinding.model.exportJSON()),beforeFailure,
   'projection failure left canonical state advanced');
 assert.equal(await padding('card-a'),77,'projection failure changed visible DOM');
 const modelPadding=await page.evaluate(()=>{
   const editor=window.__treeBinding.editor;
   return editor.getWrapper().find('[data-tree-node-id="card-a"]')[0].getStyle().padding;
 });
 assert.equal(modelPadding,'77px','GrapesJS style model did not retain inherited value');
 const before=await page.evaluate(()=>window.__treeBinding.model.revision);
 await page.locator('[data-tree-cmd="invalid"]').click();
 assert.match(await page.locator('#tree-bind-status').textContent(),/^REJECTED:/);
 assert.equal(await page.evaluate(()=>window.__treeBinding.model.revision),before,'invalid move wrote to canonical state');
 assert.equal(await item('card-a').evaluate(el=>el.parentElement?.dataset?.treeNodeId),'section-b',
   'invalid move changed DOM');
 // Simulate actual project serialization/reload, not only live DOM appearance.
 await page.evaluate(async()=>{
   const editor=window.__treeBinding.editor;
   const saved=JSON.parse(JSON.stringify(editor.getProjectData()));
   await editor.loadProjectData(saved);
 });
 assert.equal(await target.locator('[data-tree-node-id]').count(),5,'model reload lost elements');
 assert((await item('card-a').textContent()).includes('<strong>safe</strong>'),
   'model reload lost rendered text');
 assert.equal(await item('card-a').locator('strong').count(),0,
   'model reload executed literal markup');
 assert.equal(await padding('card-a'),77,'model reload lost projected spacing');
 assert.equal(await item('card-a').getAttribute('data-tree-source-id'),'section-b',
   'model reload lost provenance');

 assert.deepEqual(errors,[],'uncaught browser errors');
 console.log('TREE_GRAPES_BIND_PASS '+JSON.stringify({nodes:5,depth:4,physicalParentMove:true,
   dynamicCSSInheritance:true,undo:true,unsafeHTMLInert:true}));
}finally{
 if(browser)await browser.close();
 if(proc.pid){try{if(process.platform==='win32')proc.kill();else process.kill(-proc.pid,'SIGTERM');}catch{}}
 proc.stdout?.destroy();proc.stderr?.destroy();
}
