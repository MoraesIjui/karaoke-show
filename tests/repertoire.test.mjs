import test from 'node:test';
import assert from 'node:assert/strict';
import {safeRepertoirePreferences,filterRepertoire,repertoireIsInstalled,
  downloadableRepertoire,fetchRepertoireIndex,saveRepertoirePreferences,
  readRepertoirePreferences} from '../src/repertoire.js';
import {renderRepertoirePage} from '../src/repertoire-ui.js';

const items=[
 {id:'ultrastar:rock',source:'ultrastar',kind:'karaoke',title:'Teste Rock',artist:'Alguém',genre:'Rock',
  rhythm:'rock',country:'unknown',language:'en',ready:true,downloadAllowed:true,license:'CC BY-NC 3.0',
  originUrl:'https://github.com/UltraStar-Deluxe/songs/tree/master/Creative%20Commons/Teste'},
 {id:'jamendo:1',source:'jamendo',kind:'reference',title:'Canção Rock',artist:'Artista BR',genre:'Rock',
  rhythm:'rock',country:'BR',language:'pt',ready:false,downloadAllowed:false,
  originUrl:'https://www.jamendo.com/track/1'},
 {id:'ultrastar:pagode',source:'ultrastar',kind:'karaoke',title:'Pagode Exemplo',artist:'Grupo',
  genre:'Pagode',rhythm:'pagode',country:'unknown',language:'pt',ready:true,downloadAllowed:true}
];
const index={version:1,generatedAt:'2026-11-17T00:00:00Z',
  sourceStatus:{ultrastar:'ok',jamendo:'ok'},
  sourceCounts:{ultrastar:2,jamendo:1},items};
const p=()=>safeRepertoirePreferences({});

test('Filtragem de país não confunde idioma português com artista brasileiro',()=>{
  const prefs=safeRepertoirePreferences({country:'BR',language:'pt'});
  const result=filterRepertoire(index,prefs);
  assert.equal(result.total,1);
  assert.equal(result.items[0].source,'jamendo');
  assert.equal(result.ready,0);
});
test('Filtro por ritmo, país e quantidade pode expandir o catálogo',()=>{
  const filtered=filterRepertoire(index,{...p(),genres:['rock']});
  assert.equal(filtered.total,2);
  assert.equal(filtered.ready,1);
  const pagode=filterRepertoire(index,{...p(),genres:['pagode']});
  assert.equal(pagode.total,1);
  assert.equal(pagode.items[0].title,'Pagode Exemplo');
  assert.deepEqual(safeRepertoirePreferences({quantity:2000,genres:['rock','faker']}).genres,['rock']);
});
test('Download em lote não instala Jamendo como karaokê nem repete música existente',()=>{
  const imported=[{title:'Teste Rock',artist:'Alguém'}];
  assert.equal(repertoireIsInstalled(items[0],imported),true);
  assert.equal(repertoireIsInstalled(items[1],imported),false);
  const queue=downloadableRepertoire(index,p(),{installed:imported,max:5});
  assert.deepEqual(queue.map(x=>x.id),['ultrastar:pagode']);
});
test('Renderização apresenta licenças e não permite HTML de catálogo externo',()=>{
  const str=renderRepertoirePage({
    index:{...index,items:[{...items[0],title:'<script>alert("x")</script>'}]},
    prefs:p(),search:'',installed:[],header:()=>'<h1>Repertório automático</h1>',
    esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  });
  assert.match(str,/Repertório automático/);
  assert.match(str,/Instalação automática autorizada/);
  assert.doesNotMatch(str,/<script>/);
  assert.match(str,/&#39;|&lt;script&gt;/);
});
test('Índice remoto validado e fallback local, sem dados fictícios',async()=>{
  let calls=0;
  const network=async url=>{
    calls++;
    if(String(url).startsWith('https://raw.'))throw Error('Sem internet');
    return new Response(JSON.stringify(index),{status:200});
  };
  const orig=globalThis.localStorage;
  globalThis.localStorage={getItem(){return null;},setItem(){}};
  try{
    const data=await fetchRepertoireIndex({fetchFn:network});
    assert.equal(calls,2);
    assert.equal(data.items.length,3);
  }finally{globalThis.localStorage=orig;}
});
test('Preferências inválidas não habilitam download silenciosamente',()=>{
  const prefs=safeRepertoirePreferences({autoInstall:'true',country:'brasil',genres:['unknown'],quantity:9999});
  assert.equal(prefs.autoInstall,false);
  assert.equal(prefs.country,'all');
  assert.deepEqual(prefs.genres,[]);
  assert.equal(prefs.quantity,50);
});
