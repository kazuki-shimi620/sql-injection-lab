import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {seed,lessons,plan,achieved} from '../dist/lessons.mjs';
const require=createRequire(import.meta.url);const init=require('../dist/vendor/sql-wasm.js');const SQL=await init({locateFile:()=>new URL('../dist/vendor/sql-wasm.wasm',import.meta.url).pathname});
function run(i,input,defense=false,context=lessons[i].answerContext||{}){const p=plan(i,input,defense,context);if(p.blocked)return [];const db=new SQL.Database();db.run(seed);const results=db.exec(p.sql,p.params);db.close();return results;}
for(let i=0;i<lessons.length;i++){const l=lessons[i];const result=run(i,l.answer);if(l.kind==='safe'){assert.equal(result.length,0);assert.equal(run(i,'alice').length,1);}else{assert.ok(achieved(i,l.answer,result),'answer fails: '+l.title);const fixed=run(i,l.answer,true);if(l.kind!=='order')assert.ok(!achieved(i,l.answer,fixed),'defense fails: '+l.title);}console.log('PASS',i+1,l.title);}
assert.equal(plan(0,"' OR 1=1 --").blocked,true);assert.equal(plan(4,"' Or 1=1 --").blocked,true);assert.equal(plan(12,"' UNION SELECT 0,1,2 --").blocked,true);assert.equal(run(2,'3',true).length,0);assert.equal(run(3,'carol',true).length,0);assert.equal(plan(11,'(SELECT value FROM secrets)',true).sql.includes('ORDER BY id'),true);console.log(lessons.length+' answers + defense and filter checks passed');

for(let i=18;i<lessons.length;i++){
 const l=lessons[i];
 if(l.requiresAPI){assert.ok(plan(i,l.answer,false,{channel:'screen'}).blocked,'screen must block answer: '+l.title);}
 if(l.kind==='export-route')assert.ok(!achieved(i,l.answer,run(i,l.answer,false,{route:'search'})),'safe search route must not leak');
 if(l.versions)assert.ok(!achieved(i,l.answer,run(i,l.answer,false,{version:'patched'})),'patched version must prevent objective: '+l.title);
}
const j=lessons.findIndex(l=>l.kind==='json-tenant');assert.ok(plan(j,'{"username":1,"tenant":"red"}').blocked);assert.ok(plan(j,'not-json').blocked);
const n=lessons.findIndex(l=>l.kind==='wp-nonce');assert.ok(plan(n,'hello',true).blocked,'subscriber must be denied after fix');
console.log('API channels, route-specific fixes, historical patch states, JSON schema and capability checks passed');
