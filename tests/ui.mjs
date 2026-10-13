// DOM integration checks: real app handlers + actual classic worker scripts + SQLite WASM.
// This uses a DOM harness, not a graphical browser or a replacement SQL evaluator.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM} from 'jsdom';import {lessons} from '../dist/lessons.mjs';
const root=new URL('../dist/',import.meta.url);let workerCount=0;let firstLoad=true;
class TestWorker{
 constructor(){workerCount++;this.dead=false;const owner=this;const startupDelay=firstLoad?3300:0;firstLoad=false;
 const self={location:{href:'https://lab.test/worker.js'}};
 const ctx=vm.createContext({console,WebAssembly,URL,TextDecoder,TextEncoder,setTimeout,clearTimeout,self,location:self.location,
 fetch:async url=>{await delay(startupDelay);return new Response(fs.readFileSync(new URL(new URL(url).pathname.slice(1),root)),{headers:{'Content-Type':'application/wasm'}});},
 postMessage:r=>{setTimeout(()=>{if(!owner.dead)owner.onmessage?.({data:r});},0);}});
 ctx.importScripts=(...paths)=>paths.forEach(p=>new vm.Script(fs.readFileSync(new URL(p,root),'utf8'),{filename:p}).runInContext(ctx));
 this.ctx=ctx;
 try{new vm.Script(fs.readFileSync(new URL('worker.js',root),'utf8'),{filename:'worker.js'}).runInContext(ctx);}catch(error){setTimeout(()=>owner.onerror?.({message:error.message}),0);}
 }
 postMessage(data){setTimeout(()=>{if(!this.dead)this.ctx.onmessage({data});},0);}
 terminate(){this.dead=true;}
}
const dom=new JSDOM(fs.readFileSync(new URL('index.html',root),'utf8'),{url:'https://lab.test/',runScripts:'outside-only'});
const context=dom.getInternalVMContext();context.Worker=TestWorker;context.confirm=()=>true;
const module=new vm.SourceTextModule(fs.readFileSync(new URL('app.mjs',root),'utf8'),{context,identifier:new URL('app.mjs',root).href});
await module.link(()=>new vm.SourceTextModule(fs.readFileSync(new URL('lessons.mjs',root),'utf8'),{context}));await module.evaluate();
const doc=dom.window.document,$=id=>doc.getElementById(id);
function pickLesson(index){
 $('open-picker').click();$('lesson-search').value=lessons[index].title;$('lesson-search').dispatchEvent(new dom.window.Event('input'));
 const button=doc.querySelector('#picker-list button[data-lesson="'+index+'"]');assert.ok(button,'lesson must be searchable: '+index);button.click();
 assert.equal($('lesson-picker').hidden,true,'selection closes picker');
 assert.ok(doc.querySelectorAll('#nav button').length<=8,'sidebar is bounded to a category');
}
async function waitFor(fn,label){const start=Date.now();while(!fn()){if(Date.now()-start>10000)throw Error('Timeout: '+label+'; '+$('feedback').textContent);await delay(10);}}
assert.equal($('run').disabled,true,'execution waits for initial engine loading');
await delay(3100);assert.equal($('run').disabled,true,'slow loading is not killed by the query timeout');
await waitFor(()=>$('engine').textContent.includes('準備完了'),'engine ready');
async function execute(input){$('input').value=input;$('input').dispatchEvent(new dom.window.Event('input'));$('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await waitFor(()=>!$('run').disabled,'query completion');}
for(let i=0;i<lessons.length;i++){
 pickLesson(i);const l=lessons[i];
 await execute(l.normal||(l.kind==='numeric'?'1':l.kind==='order'?'id':'alice'));
 assert.ok(!$('feedback').classList.contains('error'),'normal input fails: '+l.title);
 $('answerbutton').click();assert.equal($('answer').hidden,false);$('answer').querySelector('button').click();
 assert.equal($('input').value,l.answer,'answer button fails: '+l.title);
 await execute($('input').value);
 assert.ok($('feedback').classList.contains('success'),'answer UI fails: '+l.title+' / '+$('feedback').textContent);
 assert.match($('status').textContent,/クリア済み/);
 $('defense').click();await execute(l.answer);
 assert.ok(!$('feedback').classList.contains('error'),'defense query fails: '+l.title);
 assert.ok(!$('feedback').classList.contains('success'),'defense falsely clears: '+l.title);
 if(l.target==='admin-first'){assert.notEqual($('result').querySelector('tbody tr')?.cells[1]?.textContent,'admin');}else if(l.target){assert.ok(!$('result').textContent.includes(l.target),'defense leaks target: '+l.title);}else if(l.kind!=='order')assert.ok(!$('result').textContent.includes(l.kind==='auth'?'carol':l.kind==='legacy'?'demo@example.test':l.kind==='payment'?'DEMO-CARD-TOKEN':l.kind==='union'?'LAB-ORBIT-42':'admin'),'defense leaks target: '+l.title);
 if(l.versions){$('vuln').click();$('version').value='patched';$('version').dispatchEvent(new dom.window.Event('change'));await execute(l.answer);assert.ok(!$('feedback').classList.contains('success'),'patched version clears objective: '+l.title);assert.ok(!$('result').textContent.includes(l.target),'patched version leaks data: '+l.title);}
 if(l.group){assert.equal($('scenario').hidden,false);assert.ok($('sourcecode').textContent.length>0,'implementation snippet missing');}
 console.log('UI PASS',i+1,l.title);
}
assert.equal($('count').textContent,lessons.length+' / '+lessons.length);assert.equal(workerCount,1,'reuse initialized SQLite across all levels and modes');
// Real syntax errors and filter rejection recover without reloading the engine.
pickLesson(1);await execute("'");assert.ok($('feedback').classList.contains('error'));await execute('alice');assert.ok(!$('feedback').classList.contains('error'));
pickLesson(0);await execute("' OR 1=1 --");assert.match($('feedback').textContent,/拒否/);await execute(lessons[0].answer);assert.ok($('feedback').classList.contains('success'));
// The category picker exposes every lesson without a 34-item navigation strip.
$('open-picker').focus();$('open-picker').click();assert.equal(doc.activeElement,$('close-picker'));
const sizes=[6,6,6,8,6,2];let total=0;
for(let category=0;category<6;category++){
 doc.querySelector('#picker-categories button[data-category="'+category+'"]').click();
 const buttons=doc.querySelectorAll('#picker-list button');assert.equal(buttons.length,sizes[category]);total+=buttons.length;
}
assert.equal(total,lessons.length);
$('lesson-search').value='Django';$('lesson-search').dispatchEvent(new dom.window.Event('input'));
assert.equal(doc.querySelectorAll('#picker-list button').length,1);assert.equal(doc.querySelector('#picker-list button').dataset.lesson,'33');
$('lesson-filter').value='undone';$('lesson-filter').dispatchEvent(new dom.window.Event('change'));assert.equal(doc.querySelectorAll('#picker-list button').length,0);assert.match($('picker-list').textContent,/該当する問題がありません/);
$('lesson-filter').value='all';$('lesson-filter').dispatchEvent(new dom.window.Event('change'));
doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal($('lesson-picker').hidden,true);assert.equal(doc.activeElement,$('open-picker'));
assert.equal($('next-undone').disabled,true,'disabled when all completed');
$('reset').click();assert.equal($('count').textContent,'0 / '+lessons.length);assert.equal(dom.window.localStorage.getItem('sql-lab-progress-v1'),'[]');
$('next-undone').click();assert.equal($('current-title').textContent.startsWith('02'),true,'jump to the next unfinished lesson');
console.log('Category sizes, all lesson access, cross-category search, progress filter, keyboard close and next unfinished lesson passed');
console.log('All UI flows, normal/answer/defense, slow initialization, SQL error recovery, filter recovery and progress reset passed.');
dom.window.close();
