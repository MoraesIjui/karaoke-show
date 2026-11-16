import test from 'node:test';
import assert from 'node:assert/strict';
import { midi4youSuggestions, midi4youGenres, midi4youSongUrl, filterMidi4YouSongs } from '../src/midi4you-catalog.js';

test('seleção MIDI4You contém somente referências sem arquivos de áudio', () => {
 assert.equal(midi4youSuggestions.length,18);
 assert.ok(midi4youGenres.includes('Sertanejo'));
 const ids = new Set();
 for(const item of midi4youSuggestions) {
  assert.ok(!ids.has(item.id)); ids.add(item.id);
  assert.match(midi4youSongUrl(item), /^https:\/\/midi4you\.com\/song\/\d+$/);
  assert.ok(item.title && item.artist && item.genre);
  assert.equal(Object.hasOwn(item,'audioUrl'), false);
 }
});

test('pesquisa encontra nomes com acentos e permite filtrar por gênero', () => {
 assert.equal(filterMidi4YouSongs({search:'marilia'}).length,1);
 assert.equal(filterMidi4YouSongs({search:'coracoes'}).length,1);
 assert.equal(filterMidi4YouSongs({genre:'Gaúcha'}).length,1);
 assert.ok(filterMidi4YouSongs({genre:'Sertanejo'}).length>=8);
 assert.equal(filterMidi4YouSongs({search:'nenhuma canção encontrada'}).length,0);
});

test('link MIDI4You não aceita ids estranhos', () => {
 assert.throws(()=>midi4youSongUrl({id:'javascript:alert(1)'}));
 assert.throws(()=>midi4youSongUrl({id:-3}));
});
