import {lessons,plan,incidents} from './lessons.mjs?v=4';
const $=id=>document.getElementById(id);let level=0,defense=false,busy=false,worker,timer,engineTimer,engineReady=false,handleResult,safeTrials=new Set();let completed=new Set();try{completed=new Set(JSON.parse(localStorage.getItem('sql-lab-progress-v1')||'[]'));}catch{}
function save(){try{localStorage.setItem('sql-lab-progress-v1',JSON.stringify([...completed]));}catch{}}
function table(columns,values){const el=document.createElement('table'),head=el.createTHead().insertRow();columns.forEach(c=>{const th=document.createElement('th');th.textContent=c;head.append(th);});const body=el.createTBody();values.forEach(row=>{const tr=body.insertRow();row.forEach(v=>{tr.insertCell().textContent=v===null?'NULL':String(v);});});return el;}
const groups=[
 {id:0,start:0,end:6,label:'基礎'}, {id:1,start:6,end:12,label:'中級'},
 {id:2,start:12,end:18,label:'実例・応用'}, {id:3,start:18,end:26,label:'React + Python'},
 {id:4,start:26,end:32,label:'WordPress'}, {id:5,start:32,end:lessons.length,label:'版・修正の比較'}
];
let navCategory=0,pickerCategory=0,pickerReturnFocus;
function groupFor(index){return groups.find(g=>index>=g.start&&index<g.end);}
function categoryButtons(container,active,onSelect){
 container.replaceChildren();groups.forEach(g=>{
  const b=document.createElement('button');b.className='category-button'+(active===g.id?' active':'');
  b.dataset.category=g.id;b.setAttribute('aria-pressed',String(active===g.id));
  const name=document.createElement('span');name.textContent=g.label;
  const count=document.createElement('small');count.textContent=Array.from(completed).filter(i=>i>=g.start&&i<g.end).length+' / '+(g.end-g.start);
  b.append(name,count);b.onclick=()=>onSelect(g.id);container.append(b);
 });
}
function lessonButton(index){
 const l=lessons[index],b=document.createElement('button');b.className='lesson-button'+(index===level?' selected':'');
 b.dataset.lesson=index;b.setAttribute('aria-current',index===level?'step':'false');
 const n=document.createElement('span');n.className='num';n.textContent=String(index+1).padStart(2,'0');
 const name=document.createElement('span');name.className='lesson-name';name.textContent=l.title.replace(/^応用[①-㉑] /,'');
 const status=document.createElement('span');status.className=completed.has(index)?'done':'lesson-state';status.textContent=completed.has(index)?'✓':'›';
 if(completed.has(index))b.setAttribute('aria-label','問題'+(index+1)+' '+name.textContent+' クリア済み');
 b.append(n,name,status);b.onclick=()=>choose(index);return b;
}
function renderCategory(){
 categoryButtons($('categories'),navCategory,id=>{navCategory=id;renderCategory();});
 const group=groups[navCategory];$('category-summary').textContent=group.label+' · '+(group.end-group.start)+'問';
 const nav=$('nav');nav.replaceChildren();for(let i=group.start;i<group.end;i++)nav.append(lessonButton(i));
}
function navigation(){
 const g=groupFor(level);navCategory=g.id;renderCategory();
 $('count').textContent=completed.size+' / '+lessons.length;$('bar').style.width=completed.size/lessons.length*100+'%';
 $('status').textContent=completed.has(level)?'✓ クリア済み':'未クリア';
 $('current-meta').textContent=g.label+' · '+(level-g.start+1)+' / '+(g.end-g.start);
 $('current-title').textContent=String(level+1).padStart(2,'0')+'  '+lessons[level].title.replace(/^応用[①-㉑] /,'');
 $('open-picker').setAttribute('aria-label','問題を選ぶ。現在: '+lessons[level].title);
 $('next-undone').disabled=completed.size===lessons.length;
 if(!$('lesson-picker').hidden)renderPicker();
}
function renderPicker(){
 const query=$('lesson-search').value.trim().toLowerCase(),filter=$('lesson-filter').value;
 categoryButtons($('picker-categories'),query?null:pickerCategory,id=>{pickerCategory=id;$('lesson-search').value='';renderPicker();});
 const group=groups[pickerCategory];const list=$('picker-list');list.replaceChildren();let count=0;
 lessons.forEach((l,i)=>{
  if(query){const hay=[l.title,l.stack,l.hint,l.why,String(i+1),String(i+1).padStart(2,'0')].join(' ').toLowerCase();if(!hay.includes(query))return;}
  else if(i<group.start||i>=group.end)return;
  if(filter==='undone'&&completed.has(i)||filter==='done'&&!completed.has(i))return;
  list.append(lessonButton(i));count++;
 });
 $('picker-summary').textContent=(query?'全カテゴリを検索':group.label)+' · '+count+'問';
 if(!count){const p=document.createElement('p');p.className='picker-empty';p.textContent='該当する問題がありません。検索語やクリア状況を変えてみてください。';list.append(p);}
}
function openPicker(){
 pickerReturnFocus=document.activeElement;pickerCategory=groupFor(level).id;$('lesson-search').value='';$('lesson-filter').value='all';
 $('lesson-picker').hidden=false;document.body.classList.add('picker-open');renderPicker();$('close-picker').focus();
}
function closePicker(){
 if($('lesson-picker').hidden)return;$('lesson-picker').hidden=true;document.body.classList.remove('picker-open');pickerReturnFocus?.focus();
}
function choose(index){closePicker();select(index);$('mission').scrollIntoView?.({behavior:'smooth',block:'start'});$('title').focus({preventScroll:true});}
$('open-picker').onclick=openPicker;$('close-picker').onclick=closePicker;
$('lesson-search').oninput=renderPicker;$('lesson-filter').onchange=renderPicker;
$('lesson-picker').onclick=e=>{if(e.target===$('lesson-picker'))closePicker();};
$('next-undone').onclick=()=>{for(let offset=1;offset<=lessons.length;offset++){const i=(level+offset)%lessons.length;if(!completed.has(i)){choose(i);return;}}};
document.addEventListener('keydown',e=>{
 if($('lesson-picker').hidden)return;
 if(e.key==='Escape'){e.preventDefault();closePicker();return;}
 if(e.key==='Tab'){
  const items=Array.from($('lesson-picker').querySelectorAll('button,input,select')).filter(el=>!el.disabled&&!el.closest('[hidden]'));
  const first=items[0],last=items[items.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }
});

function preview(){const p=plan(level,$('input').value,defense,getContext());$('sql').textContent=p.sql||'// '+p.reason;$('params').textContent=(p.stage?p.stage+'\n':'')+(p.safe?'パラメータ: '+JSON.stringify(p.params||[])+' · 保護された処理':'教材の未修正処理');}
function select(i){if(busy){worker?.terminate();clearTimeout(timer);busy=false;startEngine();}$('run').disabled=!engineReady;level=i;defense=false;const l=lessons[i];configureScenario(l);$('level').textContent=(i<12?'LEVEL '+String(i+1).padStart(2,'0'):'ADVANCED '+(i-11))+' / '+lessons.length;$('title').textContent=l.title;$('goal').textContent='MISSION / '+l.goal;$('input').value=normalInput(l);$('inputlabel').textContent=l.kind==='json-tenant'?'疑似リクエストのJSON':l.kind==='django-alias'?'教材の列別名断片':l.kind==='api-id'?'疑似APIのid':l.kind==='numeric'?'ユーザーID':l.kind==='order'?'並べ替え列・式':l.kind==='second'?'保存するニックネーム':'ユーザー名を検索';$('filter').textContent=l.block==='upper'?'現在の対策：大文字 OR を含む入力だけブロック':l.block==='or'?'現在の対策：OR を大文字・小文字問わずブロック':l.block==='both'?'現在の対策：OR / UNION をブロック':['safe','auth'].includes(l.kind)?'現在の対策：パラメータ化クエリ':'現在の対策：入力を文字列連結';if(l.group)$('filter').textContent='';$('hint').hidden=true;$('answer').hidden=true;$('hint').textContent=l.hint;$('answer').replaceChildren();$('fix').textContent='設計メモ / '+l.why;$('feedback').className='';$('feedback').textContent=l.kind==='safe'?'alice と解答例を両方実行して、安全な境界を確認しよう。':'通常入力と、SQLの構造を変える入力を比べてみよう。';$('result').replaceChildren();$('result').textContent='実行結果を待っています。';$('vuln').className='active';$('defense').className='';$('prev').disabled=i===0;$('next').disabled=i===lessons.length-1;const inc=$('incident');inc.replaceChildren();if(l.incident!==undefined){const c=incidents[l.incident],box=document.createElement('div');box.className='incident';const h=document.createElement('b');h.textContent=c.title;const p=document.createElement('p');p.textContent=c.text;const a=document.createElement('a');a.href=c.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='出典：'+c.source+' ↗';box.append(h,p,a);inc.append(box);}navigation();preview();renderCode();}
function finish(message,cls=''){busy=false;$('run').disabled=!engineReady;$('feedback').className=cls;$('feedback').textContent=message;}
$('form').onsubmit=e=>{e.preventDefault();if(busy||!engineReady)return;const input=$('input').value;if(input.length>2000){finish('入力は2,000文字までです。','error');return;}preview();busy=true;$('run').disabled=true;timer=setTimeout(()=>{worker.terminate();engineReady=false;finish('実行時間の上限を超えたため停止しました。短いクエリで試してください。','error');startEngine();},3000);handleResult=r=>{clearTimeout(timer);if(r.blocked){$('result').textContent='SQLは実行されませんでした。';finish(r.reason,defense||getContext().version==='patched'?'':'error');return;}if(r.error){$('result').textContent=r.error;finish('SQLエラー。列数・引用符・構文を確認してみよう。','error');return;}const l=lessons[level],area=$('result');area.replaceChildren();if(l.kind==='blind'){area.textContent=r.results.length?'検索結果：あり':'検索結果：なし';}else if(r.results.length){r.results.forEach(t=>area.append(table(t.columns,t.values)));}else{area.textContent='0 行 — 一致するデータがありません。';}if(r.sql)$('sql').textContent=r.sql;if(r.stage)$('params').textContent=r.stage+'\nパラメータ: '+JSON.stringify(r.params||[]);let ok=!defense&&getContext().version!=='patched'&&r.success;if(l.kind==='safe'&&!defense){if(input==='alice'&&r.results.length)safeTrials.add('normal');if(input===l.answer&&!r.results.length)safeTrials.add('attack');ok=safeTrials.size===2;}if(ok){completed.add(level);save();navigation();finish(l.kind==='safe'?'✓ 検証完了。通常検索は動き、攻撃入力は構文に変わりません。':'✓ ミッションクリア！ 解説を読み、修正後でも同じ入力を試してみよう。','success');}else if(defense||getContext().version==='patched'){finish('保護された処理で実行しました。バインド・権限検査・許可リストなど、問題に対応する修正を適用しています。');}else finish(l.kind==='safe'?'比較中：通常入力と解答例を両方実行してください。':'実行完了。結果とSQLを見比べて、次の入力を考えよう。');};worker.postMessage({level,input,defense,context:getContext()});};
$('input').oninput=preview;$('input').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('form').requestSubmit();};$('normal').onclick=()=>{$('input').value=normalInput(lessons[level]);preview();};$('hintbutton').onclick=()=>{$('hint').hidden=!$('hint').hidden;};$('answerbutton').onclick=()=>{const a=$('answer');if(a.childNodes.length){a.hidden=!a.hidden;return;}const l=lessons[level],label=document.createElement('b');label.textContent='解答例（SQLite）';const code=document.createElement('div');code.className='example';code.textContent=l.answer;const use=document.createElement('button');use.className='secondary';use.textContent='この入力をセット';use.onclick=()=>{$('input').value=l.answer;applyAnswerContext(l);preview();renderCode();};const p=document.createElement('p');p.textContent=l.why;const fix=document.createElement('p');fix.textContent=l.group?(l.codeFixed||l.why):l.kind==='order'?'修正：id / username / role の許可リストで列を選択。':l.kind==='auth'?'修正：パラメータ化に加え tenant = blue の認可条件を付ける。':'修正：値は ? にバインド。非公開・テナント条件は固定し、保存後の値も再バインドする。';a.append(label,code,use,p,fix);a.hidden=false;};
$('vuln').onclick=()=>{defense=false;$('vuln').className='active';$('defense').className='';preview();renderCode();};$('defense').onclick=()=>{defense=true;$('vuln').className='';$('defense').className='active';preview();renderCode();};$('prev').onclick=()=>choose(level-1);$('next').onclick=()=>choose(level+1);$('reset').onclick=()=>{if(confirm('保存したクリア状況をリセットしますか？')){completed.clear();safeTrials.clear();save();navigation();}};$('databutton').onclick=()=>{$('tables').hidden=!$('tables').hidden;};
const scenarioDescriptions={
 'front-api':'Reactの入力制限と、FastAPI側で必要な防御を比較します。',
 'api-id':'Reactの数値入力欄と、FastAPIの引数の型が食い違うケースです。',
 'orm-raw':'SQLAlchemyのtext()に、Pythonのf-stringで作ったSQLを渡すケースです。',
 'orm-order':'SQLAlchemyの並べ替え処理に、外部入力から作ったSQL式を渡すケースです。',
 'decode':'Python側の独自デコードによって、検査後に入力の意味が変わるケースです。',
 'export-route':'FastAPIの通常検索とCSV出力で、安全性が異なるケースです。',
 'modern-second':'ORMで保存した値を、Pythonの帳票処理でSQLへ連結するケースです。',
 'json-tenant':'Reactから届くJSONを型検査しても、テナントの権限確認が欠けるケースです。',
 'wp-public':'WordPressプラグインの公開AJAX検索で、下書きが漏れるケースです。',
 'wp-nonce':'WordPressのnonce確認と、利用者の閲覧権限の違いを扱います。',
 'wp-sanitize':'WordPressのテキスト整形と、SQL用の値の保護の違いを扱います。',
 'wp-prepare':'WordPressのprepare()で、外部入力の一部しか保護していないケースです。',
 'wp-old-rest':'WordPress本体を更新しても、プラグインの修正が必要なケースです。',
 'wp-stored':'公開側で集めたログが、WordPressの管理帳票のSQLに混ざるケースです。',
 'wp-core':'WordPressの同じ系列で、セキュリティ修正の有無を比較します。',
 'django-alias':'Djangoの列別名に関する修正事例から、値と識別子の扱いの違いを学びます。'
};
const tables=$('tables');[['users',['id','username','role','tenant','hidden'],[[1,'alice','user','blue',0],[2,'bob','user','blue',0],[3,'admin','admin','red',1],[4,'carol','user','red',0]]],['secrets',['id','label','value'],[[1,'launch_code','LAB-ORBIT-42']]],['legacy_customers',['id','name','email'],[[1,'Demo Customer','demo@example.test']]],['payment_demo',['id','token'],[[1,'DEMO-CARD-TOKEN']]]].forEach(([name,cols,rows])=>{const h=document.createElement('h4');h.textContent=name;tables.append(h,table(cols,rows));});const cmsHeading=document.createElement('h4');cmsHeading.textContent='cms_posts（架空のWordPress教材）';tables.append(cmsHeading,table(['id','title','status'],[[1,'hello','publish'],[2,'DRAFT-LAB-2026','draft']]));const note=document.createElement('p');note.className='muted';note.textContent='profiles(id, nickname) は二次SQLi問題で使う保存用テーブルです。攻撃文字列は実行ごとに安全に保存します。';tables.append(note);select(0);startEngine();

function startEngine(){
 engineReady=false;$('run').disabled=true;$('engine').textContent='SQLiteを読み込み中…';
 worker?.terminate();clearTimeout(engineTimer);
 const current=new Worker('worker.js?v=4');worker=current;
 engineTimer=setTimeout(()=>{if(worker!==current)return;current.terminate();$('engine').textContent='読み込みが時間切れになりました';$('retry').hidden=false;finish('SQLiteの初回読み込みに時間がかかっています。「再読み込み」で試してください。','error');},45000);
 current.onmessage=e=>{
  if(worker!==current)return;const r=e.data;
  if(r.type==='ready'){clearTimeout(engineTimer);engineReady=true;$('run').disabled=busy;$('engine').textContent='✓ SQLite の準備完了';$('retry').hidden=true;return;}
  if(r.type==='init-error'){clearTimeout(engineTimer);$('engine').textContent='SQLite の読み込み失敗';$('retry').hidden=false;finish('SQLite: '+r.error,'error');return;}
  handleResult?.(r);
 };
 current.onerror=e=>{clearTimeout(engineTimer);clearTimeout(timer);engineReady=false;current.terminate();$('engine').textContent='実行エンジンを読み込めませんでした';$('retry').hidden=false;finish('実行エンジン: '+(e.message||'スクリプト読み込みエラー'),'error');};
}
$('retry').onclick=startEngine;

function normalInput(l){return l.normal||(l.kind==='numeric'?'1':l.kind==='order'?'id':'alice');}
function getContext(){return {channel:$('channel').value,route:$('route').value,version:$('version').value||'old'};}
function configureScenario(l){
 $('scenario').hidden=!l.group;$('stack').textContent=l.stack||'';$('scenario-description').textContent=scenarioDescriptions[l.kind]||'';
 $('channelwrap').hidden=!l.requiresAPI;$('routewrap').hidden=l.kind!=='export-route';$('versionwrap').hidden=!l.versions;
 $('channel').value='screen';$('route').value='search';$('version').replaceChildren();
 if(l.versions)l.versions.forEach((name,i)=>{const o=document.createElement('option');o.value=i?'patched':'old';o.textContent=name;$('version').append(o);});
 $('implementation').hidden=!l.group;
}
function applyAnswerContext(l){if(l.answerContext)Object.entries(l.answerContext).forEach(([key,value])=>{$(key).value=value;});}
function renderCode(){const l=lessons[level];$('sourcecode').textContent=(defense||getContext().version==='patched')?l.codeFixed||'':l.kind==='export-route'&&getContext().route==='search'?l.codeFixed:l.codeVuln||'';}
['channel','route','version'].forEach(id=>{$(id).onchange=()=>{preview();renderCode();};});
