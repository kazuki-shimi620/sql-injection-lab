// Classic scripts keep this worker compatible with iPhone browsers.
importScripts('vendor/sql-wasm.js', 'lessons.worker.js?v=4');
let SQL;
initSqlJs({locateFile:f=>new URL('vendor/'+f,self.location.href).href})
  .then(engine=>{SQL=engine;postMessage({type:'ready'});})
  .catch(error=>postMessage({type:'init-error',error:error.message}));
onmessage=e=>{
 if(!SQL){postMessage({error:'SQLiteの準備が完了していません。'});return;}
 let db;
 try{
  const M=self.Lab;const {level,defense,context}=e.data;let input=e.data.input;
  db=new SQL.Database();db.run(M.seed);
  if(['second','modern-second','wp-stored'].includes(M.lessons[level].kind)){
   db.run('INSERT INTO profiles VALUES(1,?)',[input]);
   input=db.exec('SELECT nickname FROM profiles WHERE id=1')[0].values[0][0];
  }
  const p=M.plan(level,input,defense,context);
  if(p.blocked){postMessage(p);return;}
  const stmt=db.prepare(p.sql);if(p.params.length)stmt.bind(p.params);
  const columns=stmt.getColumnNames(),values=[];
  while(stmt.step()){if(values.length>=100)throw Error('表示上限100行に達しました');values.push(stmt.get());}
  stmt.free();const results=values.length?[{columns,values}]:[];
  postMessage({...p,results,success:M.achieved(level,input,results)});
 }catch(error){postMessage({error:error.message});}finally{db?.close();}
};
