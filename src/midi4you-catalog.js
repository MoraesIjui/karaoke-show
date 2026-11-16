/**
 * Seleção editorial de páginas públicas do MIDI4You, conferidas em 16/11/2026.
 * Não inclui os arquivos MIDI nem presume direitos de redistribuição.
 * O usuário escolhe e baixa a versão no serviço de origem, depois importa no aplicativo.
 */
export const midi4youSuggestions = Object.freeze([
  {id:53884,title:'1000 Corações',artist:'Gian & Giovani',genre:'Sertanejo',versions:1,lyrics:false},
  {id:38559,title:'10 Minutos Longe de Você',artist:'Victor & Leo',genre:'Sertanejo',versions:1,lyrics:null},
  {id:70785,title:'120... 150... 200 Km, por Hora',artist:'Leandro & Leonardo',genre:'Sertanejo',versions:1,lyrics:null},
  {id:74093,title:'60 Dias Apaixonado',artist:'Chitãozinho & Xororó',genre:'Sertanejo',versions:2,lyrics:null},
  {id:46871,title:'60 Segundos',artist:'Gusttavo Lima',genre:'Sertanejo',versions:1,lyrics:true},
  {id:59845,title:'A Culpa É Sua',artist:'Bruno & Marrone',genre:'Sertanejo',versions:2,lyrics:false},
  {id:79526,title:'A Culpa É Dele',artist:'Marília Mendonça, Maiara & Maraisa',genre:'Sertanejo',versions:1,lyrics:null},
  {id:72987,title:'A Casa Caiu',artist:'Fernando & Sorocaba',genre:'Sertanejo',versions:1,lyrics:null},
  {id:76059,title:'A Carta',artist:'Milionário & José Rico',genre:'Sertanejo',versions:1,lyrics:null},
  {id:76611,title:'A Bailarina',artist:'João Mineiro & Marciano',genre:'Sertanejo',versions:1,lyrics:null},
  {id:31176,title:'A Dança do Xote',artist:'Os Serranos',genre:'Gaúcha',versions:1,lyrics:null},
  {id:31085,title:'24 Horas de Amor',artist:'Exaltasamba',genre:'Pagode',versions:1,lyrics:null},
  {id:68005,title:'A Barata',artist:'Só Pra Contrariar',genre:'Pagode',versions:1,lyrics:null},
  {id:60542,title:'A Deus Eu Peço',artist:'Alexandre Pires',genre:'Pagode',versions:3,lyrics:null},
  {id:20507,title:'A Dança do Bumbum',artist:'É o Tchan',genre:'Festa',versions:1,lyrics:null},
  {id:71693,title:'1406',artist:'Mamonas Assassinas',genre:'Rock',versions:1,lyrics:null},
  {id:46070,title:'A Banda',artist:'Chico Buarque',genre:'MPB',versions:5,lyrics:null},
  {id:19050,title:'A Bela e a Fera',artist:'Infantil',genre:'Infantil',versions:1,lyrics:null}
]);

export const midi4youGenres = Object.freeze(['Todas', ...new Set(midi4youSuggestions.map(item=>item.genre))]);

export function midi4youSongUrl(item) {
  const id = Number(item?.id);
  if(!Number.isSafeInteger(id)||id<=0) throw new Error('Identificador MIDI inválido');
  return 'https://midi4you.com/song/'+id;
}

export function filterMidi4YouSongs({search='', genre='Todas'}={}) {
  const normalized = String(search).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  return midi4youSuggestions.filter(item => {
    if(genre!=='Todas' && item.genre!==genre) return false;
    if(!normalized) return true;
    const haystack = (item.title+' '+item.artist+' '+item.genre)
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
    return haystack.includes(normalized);
  });
}
