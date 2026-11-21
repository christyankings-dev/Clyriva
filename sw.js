/* Clyriva PWA: nenhum registro financeiro ou sessão armazenado no cache. */
importScripts('/push-test.js');
const CACHE='clyriva-shell-v3';
const STATIC=['/offline.html','/icons/clyriva-192.png','/icons/clyriva-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('clyriva-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
async function openPage(request){
 let upstream;
 try{
  upstream=await fetch(request);
  if(![502,503,504].includes(upstream.status))return upstream;
 }catch{
  // O navegador pode perder a conexão antes de receber qualquer status.
 }
 return await caches.match('/offline.html')||upstream||new Response('Sem conexão. Reconecte o aparelho e atualize a página.',{status:503});
}
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method==='GET'&&request.mode==='navigate')event.respondWith(openPage(request));
});
async function displayPush(d){
 const title='Clyriva · '+(typeof d.title==='string'?d.title:'Lembrete');
 const body=typeof d.body==='string'?d.body:'Abra o Clyriva para verificar suas pendências.';
 const url=d.url==='/cliente.html'?'/cliente.html':'/';
 const testId=url==='/cliente.html'&&d.tag==='teste-cliente'&&ClyrivaPushTest.validId(d.testId)?d.testId:null;
 const tag=testId?'clyriva-teste-'+testId:'clyriva-'+(d.tag||'gestao');
 await self.registration.showNotification(title,{body,icon:'/icons/clyriva-192.png',badge:'/icons/clyriva-192.png',tag,renotify:false,data:testId?{url,testId}:{url}});
 if(!testId)return;
 const shownAt=Date.now();
 // Gravar mesmo com o app fechado. Uma falha de armazenamento não impede o retorno à tela aberta.
 await ClyrivaPushTest.mark(testId,'shown',shownAt).catch(()=>{});
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of windows){
  const page=new URL(client.url);
  if(page.origin===self.location.origin&&page.pathname==='/cliente.html'){
   client.postMessage({type:'clyriva-test-shown',testId,shownAt});
  }
 }
}
self.addEventListener('push',event=>{
 let payload;try{payload=event.data?.json();}catch{}
 event.waitUntil(displayPush(payload||{}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const href=event.notification.data?.url==='/cliente.html'?'/cliente.html':'/';const url=new URL(href,self.location.origin);for(const client of clients){if(new URL(client.url).origin===url.origin&&new URL(client.url).pathname===href){await client.focus();return;}}await self.clients.openWindow(url.href);}));});
