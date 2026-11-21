import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercita o manipulador de navegação publicado com rede e Cache Storage controlados.
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const receiptSource=await readFile(new URL('../push-test.js',import.meta.url),'utf8');
const offline=await readFile(new URL('../offline.html',import.meta.url),'utf8');
const events=new Map();
let result, cached;
const origin='https://example.test';
const context=vm.createContext({
  importScripts:path=>{
    assert.equal(path,'/push-test.js');
    vm.runInContext(receiptSource,context);
  },
  self:{addEventListener:(kind,handler)=>events.set(kind,handler)},
  fetch:async()=>{
    if(result instanceof Error)throw result;
    return result;
  },
  caches:{match:async path=>{
    assert.equal(path,'/offline.html');
    return cached;
  }},
  Response,URL
});
vm.runInContext(source,context);
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

const recorded=[],received=[];
const testId='80b188c7-bb3c-4d11-81d7-8d04e828927d';
context.ClyrivaPushTest.mark=async id=>{recorded.push(id);};
context.self.location={origin};
context.self.clients={matchAll:async()=>[origin+'/cliente.html?app=1',origin+'/','https://outro.test/cliente.html']
  .map(url=>({url,postMessage:message=>received.push({url,message})}))};
let displayError=false;
context.self.registration={showNotification:async()=>{if(displayError)throw Error('Sem permissão');}};
function deliver(payload){
  let done;
  events.get('push')({data:{json:()=>payload},waitUntil:promise=>{done=promise;}});
  return done;
}
const payload={tag:'teste-cliente',url:'/cliente.html',testId};
displayError=true;
await assert.rejects(deliver(payload),/Sem permissão/);
displayError=false;
for(const other of [{...payload,testId:'inválido'},{...payload,tag:'cobranca'},{...payload,url:'/'}])await deliver(other);
assert.equal(recorded.length,0);assert.equal(received.length,0);
await deliver(payload);
assert.deepEqual(recorded,[testId]);
assert.equal(received.length,1);
assert.equal(received[0].url,origin+'/cliente.html?app=1');
assert.equal(received[0].message.testId,testId);
console.log('PASS confirmação somente após exibição de um teste válido no portal do cliente');
