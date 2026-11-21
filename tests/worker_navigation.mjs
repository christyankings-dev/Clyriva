import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercita o manipulador de navegação publicado com rede e Cache Storage controlados.
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const offline=await readFile(new URL('../offline.html',import.meta.url),'utf8');
const events=new Map();
let result, cached;
vm.runInNewContext(source,{
  self:{addEventListener:(kind,handler)=>events.set(kind,handler)},
  fetch:async()=>{
    if(result instanceof Error)throw result;
    return result;
  },
  caches:{match:async path=>{
    assert.equal(path,'/offline.html');
    return cached;
  }},
  Response
});
function navigate(method='GET',mode='navigate'){
  let answer;
  events.get('fetch')({request:{method,mode},respondWith:promise=>{answer=promise;}});
  return answer;
}
for(const status of [200,401,403,404]){
  result=new Response('Resposta de origem',{status});
  assert.equal(await navigate(),result);
}
for(const failure of [new Error('Sem rede'),502,503,504]){
  result=typeof failure==='number'?new Response(null,{status:failure}):failure;
  cached=new Response(offline,{headers:{'Content-Type':'text/html'}});
  const fallback=await navigate();
  assert.equal(fallback,cached);
  assert.match(await fallback.text(),/href="\/cliente\.html"/);
}
cached=undefined;
result=new Error('Sem rede');
assert.equal((await navigate()).status,503);
assert.equal(navigate('POST'),undefined);
assert.equal(navigate('GET','cors'),undefined);
console.log('PASS navegação online, permissões, desconexão, indisponibilidade temporária e reabertura do app');
