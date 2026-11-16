import test from 'node:test';
import assert from 'node:assert/strict';

// Smoke-test de renderização com DOM mínimo, sem emular áudio ou afirmar E2E em navegador.
test('navegação e telas renderizam sem lançar erros', async () => {
 const original = { setInterval:globalThis.setInterval, setTimeout:globalThis.setTimeout };
 const handlers = {};
 const app = { innerHTML:'', addEventListener(type,fn){handlers[type]=fn} };
 const fakeBody = {classList:{toggle(){}},append(){} };
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 globalThis.document = {
  body:fakeBody,
  activeElement:null,
  addEventListener(){},
  getElementById(id){if(id==='app')return app;return null;},
  createElement(){return {id:'',className:'',setAttribute(){},remove(){},textContent:''};},
  querySelectorAll(){return []}
 };
 globalThis.localStorage={getItem(){return null},setItem(){}};
 globalThis.window={scrollTo(){},addEventListener(){}};
 globalThis.location={protocol:'file:'};
 globalThis.setInterval=()=>1;
 globalThis.setTimeout=()=>1;
 try {
  await import('../src/app.js');
  // Permite que a promise IndexedDB rejeitada passe por boot().
  await new Promise(resolve => process.nextTick(resolve));
  assert.match(app.innerHTML,/O show começa/);
  function click(action,other={}){
   handlers.click({target:{closest(){return {dataset:{action,...other},disabled:false}}}});
  }
  click('navigate',{page:'songs'});
  assert.match(app.innerHTML,/Biblioteca de músicas/);
  assert.match(app.innerHTML,/Luzes da Cidade/);
  click('select-song',{id:'luzes-da-cidade'});
  assert.match(app.innerHTML,/PREPARE SUA APRESENTAÇÃO/);
  assert.match(app.innerHTML,/Adicionar à fila/);
  click('queue-add',{id:'luzes-da-cidade'});
  assert.match(app.innerHTML,/Fila do show/);
  assert.match(app.innerHTML,/Luzes da Cidade/);
  click('navigate',{page:'ranking'});
  assert.match(app.innerHTML,/Hall da fama/);
  click('navigate',{page:'settings'});
  assert.match(app.innerHTML,/Compensação de atraso/);
  click('navigate',{page:'import'});
  assert.match(app.innerHTML,/Nova música local/);
 } finally {
  globalThis.setInterval=original.setInterval;
  globalThis.setTimeout=original.setTimeout;
 }
});
