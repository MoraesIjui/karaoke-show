import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLicense,sourceAudio,crawlUltraStar,crawlJamendo,summarizeRepertoire} from '../tools/sync-repertoire.mjs';

test('Fonte: licencia áudio CC sem confundir capas ND e sem conceder uso por ausência de licença',()=>{
 const l='MP3 File:\nAudio by Author\nLicense: https://creativecommons.org/licenses/by-nc/3.0/\nCover File:\nLicense: https://creativecommons.org/licenses/by-nc-nd/2.0/\nUltraStar txt-Song File:\nLicense: https://creativecommons.org/licenses/by-nc/3.0/';
 assert.equal(extractLicense(l).allowed,true);
 assert.equal(extractLicense(l).label,'CC BY-NC 3.0');
 assert.equal(extractLicense('Audio file: https://creativecommons.org/licenses/by-nc-nd/3.0/').allowed,false);
 assert.equal(extractLicense('Sem licenciamento').allowed,false);
 assert.equal(extractLicense('Cover File:\nLicense: https://creativecommons.org/licenses/by/4.0/').allowed,false);
});
test('Fonte: não indexa caminhos de áudio externos',()=>{
 assert.equal(sourceAudio('audio.mp3'),'audio.mp3');
 assert.equal(sourceAudio('../../secrets.mp3'),null);
 assert.equal(sourceAudio('http://site.com/a.mp3'),null);
});
test('Fonte UltraStar: constrói índice sem buscar áudio nem inferir país do idioma',async()=>{
 const song=['#TITLE:Teste de Rock','#ARTIST:Grupo Exemplo','#GENRE:Rock',
 '#LANGUAGE:Portuguese','#MP3:audio.ogg','#BPM:180','#GAP:0',': 0 4 0 oi','E'].join('\n');
 const license='Song by Group\nLicense: https://creativecommons.org/licenses/by-nc-sa/3.0/';
 const tree={truncated:false,tree:[
   {path:'Creative Commons/Grupo - Teste/song.txt',size:song.length},
   {path:'Creative Commons/Grupo - Teste/license.txt',size:license.length},
   {path:'Creative Commons/Grupo - Teste/audio.ogg',size:180000}
 ]};
 const called=[];
 const stub=async url=>{
   called.push(String(url));
   let value;
   if(url.includes('git/trees/master'))value=JSON.stringify(tree);
   else if(url.endsWith('/song.txt'))value=song;
   else if(url.endsWith('/license.txt'))value=license;
   else throw Error('Áudio não deveria ser baixado');
   return new Response(value,{status:200,headers:{'Content-Length':String(value.length)}});
 };
 const songs=await crawlUltraStar({fetchFn:stub});
 assert.equal(songs.length,1);
 assert.equal(songs[0].title,'Teste de Rock');
 assert.equal(songs[0].ready,true);
 assert.equal(songs[0].rhythm,'rock');
 assert.equal(songs[0].language,'pt');
 assert.equal(songs[0].country,'unknown');
 assert.equal(songs[0].audioBytes,180000);
 assert.equal(called.length,3);
});
test('Jamendo: sem credencial retorna status claro e nenhum item inventado',async()=>{
 const result=await crawlJamendo({clientId:''});
 assert.equal(result.status,'not_configured');
 assert.equal(result.items.length,0);
});
test('Jamendo: faixas sem letra sincronizada são apenas referências, ainda que download seja autorizado',async()=>{
 const fetchFn=async url=>new Response(JSON.stringify({
   headers:{status:'success'},
   results:[{id:'52',name:'Música de exemplo',artist_name:'Pessoa',
     license_ccurl:'https://creativecommons.org/licenses/by/4.0/',
     audiodownload_allowed:true,shareurl:'https://www.jamendo.com/track/52'}]
 }),{status:200});
 const result=await crawlJamendo({clientId:'teste-publico',fetchFn});
 assert.equal(result.status,'ok');
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].kind,'reference');
 assert.equal(result.items[0].ready,false);
 assert.equal(result.items[0].downloadAllowed,false);
 assert.equal(result.items[0].sourceDownloadAllowed,true);
 const merged=summarizeRepertoire([] ,result,new Date('2026-11-17T00:00:00Z'));
 assert.equal(merged.items.length,1);
});
