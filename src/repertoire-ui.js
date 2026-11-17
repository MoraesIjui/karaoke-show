import { RHYTHMS,filterRepertoire,repertoireIsInstalled,
  repertoireStatus,safeRepertoireUrl } from './repertoire.js';

/** Renderização textual da central, sem construir HTML de metadados sem escape. */
export function renderRepertoirePage({index,prefs,search='',installed=[],busy=false,progress='',header,esc}){
  const selection=filterRepertoire(index,prefs,{search,installed});
  const info=repertoireStatus(index);
  const source=info.sources||{};
  const countries=[['all','Todos os países'],['BR','Brasil (país do artista)'],['unknown','País não identificado']];
  const languages=[['all','Todos os idiomas'],['pt','Português'],['en','Inglês'],['es','Espanhol'],['de','Alemão'],['fr','Francês'],['unknown','Idioma não identificado']];
  const types=[['all','Todas as fontes'],['karaoke','Karaokês completos'],['reference','Referências musicais']];
  const select=(name,label,opts,value)=>'<label class="rep-field">'+label+
    '<select data-repertoire-pref="'+name+'" aria-label="'+label+'">'+opts.map(([id,name])=>
      '<option value="'+esc(id)+'" '+(value===id?'selected':'')+'>'+esc(name)+'</option>').join('')+
    '</select></label>';
  const countryOptions=[...countries];
  const availableCountries=[...new Set((index?.items||[]).map(x=>x.country))]
    .filter(x=>x && /^[A-Z]{2}$/.test(x)&&x!=='BR');
  for(const country of availableCountries)countryOptions.push([country,country]);
  const rhythmChoices=RHYTHMS.map(([id,label])=>'<label class="rep-chip"><input type="checkbox" data-repertoire-genre="'+esc(id)+'" '+(prefs.genres.includes(id)?'checked':'')+'/><span>'+esc(label)+'</span></label>').join('');
  const stateText=(!index?.generatedAt?'Catálogo ainda não sincronizado':('Último índice: '+new Date(index.generatedAt).toLocaleDateString('pt-BR')))+
    (info.cached?' · versão offline em cache':'');
  const ready=(index?.items||[]).filter(x=>x.ready===true).length;
  const refs=(index?.items||[]).filter(x=>x.kind==='reference').length;
  const cards=selection.items.map(item=>{
    const added=repertoireIsInstalled(item,installed);
    const canInstall=item.ready===true&&item.downloadAllowed===true&&item.kind==='karaoke';
    const link=safeRepertoireUrl(item);
    const badge=added?'✓ Instalada':canInstall?'Karaokê completo':'Apenas referência';
    return '<article class="rep-song">'+
      '<div class="rep-song-info"><span class="rep-kind">'+esc(badge)+' · '+esc(item.source==='ultrastar'?'UltraStar':'Jamendo')+'</span>'+
      '<h3>'+esc(item.title)+'</h3><p>'+esc(item.artist)+'</p>'+
      '<div class="rep-tags"><span>'+esc(item.genre||'Ritmo não informado')+'</span>'+
      '<span>'+esc(item.country==='BR'?'Brasil':item.country==='unknown'?'País não identificado':item.country)+'</span>'+
      '<span>'+esc(item.language==='pt'?'Português':item.language==='en'?'Inglês':item.language||'Idioma não informado')+'</span></div>'+
      '<small>'+esc(item.license||'Licença a verificar')+'</small></div>'+
      '<div class="rep-song-actions">'+(link?'<a href="'+esc(link)+'" rel="noopener noreferrer" target="_blank">Ver fonte ↗</a>':'')+
      (canInstall?'<button type="button" class="btn btn-outline" data-action="repertoire-install" data-song="'+esc(item.id)+'" '+(added||busy?'disabled':'')+'>'+(added?'Instalada':'Instalar')+'</button>':
        '<span class="rep-muted">Sem download como karaokê</span>')+'</div>'+
    '</article>';
  }).join('');
  return header('Central de repertório automático','Escolha países, ritmos e idioma. O catálogo se atualiza automaticamente; o áudio só é instalado quando autorizado.')+
    '<section class="panel rep-panel">'+
    '<div class="rep-head"><div><h2>Preferências do repertório</h2><p class="muted">As preferências são salvas neste aparelho. País e idioma são filtros diferentes.</p></div>'+
    '<button class="btn btn-outline" type="button" data-action="repertoire-refresh" '+(busy?'disabled':'')+'>Atualizar catálogo</button></div>'+
    '<div class="rep-selects">'+
    select('country','País',countryOptions,prefs.country)+
    select('language','Idioma',languages,prefs.language)+
    select('type','Tipo de fonte',types,prefs.type)+
    select('quantity','Limite de resultados',[[20,'20'],[50,'50'],[100,'100'],[500,'500']],prefs.quantity)+
    '</div><p class="rep-label">Ritmos (nenhum selecionado = todos)</p><div class="rep-genres">'+rhythmChoices+'</div>'+
    '<div class="rep-auto"><label><input type="checkbox" data-repertoire-pref="autoInstall" '+(prefs.autoInstall?'checked':'')+'/>'+
    '<span><strong>Instalação automática autorizada</strong><small>Ao abrir com internet, instalar até 3 karaokês licenciados por dia que coincidam com os filtros, somente neste aparelho. O limite de tráfego por sessão é de 30 MB. Sem resultados elegíveis, não baixa nada.</small></span></label></div>'+
    '</section>'+
    '<section class="panel rep-panel"><div class="rep-head"><div><h2>Catálogo sincronizado</h2>'+
    '<p class="muted">'+esc(stateText)+'</p></div><div class="rep-counts">'+
    '<strong>'+ready+' karaokês elegíveis</strong><span>'+refs+' referências sem karaokê pronto</span></div></div>'+
    '<p class="small-muted">UltraStar: '+esc(String(index?.sourceCounts?.ultrastar||0))+' referências no índice · Jamendo: '+esc(String(index?.sourceCounts?.jamendo||0))+' referências</p>'+
    (source.jamendo==='not_configured'?'<p class="rep-message">Jamendo ainda não configurado. É necessário adicionar <code>JAMENDO_CLIENT_ID</code> aos Secrets do GitHub Actions; sem isso, mostramos somente o catálogo UltraStar.</p>':'')+
    '<div class="rep-actions"><label class="rep-search">Pesquisar nesta seleção <input id="repertoire-search" type="search" class="text-input" value="'+esc(search)+'" placeholder="Título, artista ou estilo…"/></label>'+
    '<button type="button" class="btn btn-primary" data-action="repertoire-install-batch" '+(busy?'disabled':'')+'>Instalar até 5 karaokês elegíveis</button></div>'+
    '<p id="repertoire-status" class="small-muted" role="status">'+esc(progress||('Encontradas '+selection.total+' músicas no filtro; '+selection.ready+' delas com karaokê pronto.'))+'</p>'+
    (selection.total?'<div class="rep-song-list">'+cards+'</div>'+
      (selection.total>selection.items.length?'<p class="small-muted">Exibindo '+selection.items.length+' de '+selection.total+'. Aumente o limite de resultados para ver mais.</p>':''):
      '<div class="empty"><h3>Nenhuma música encontrada neste filtro</h3><p>Escolha “Todos os países” e limpe os ritmos para ampliar. O catálogo não possui automaticamente todos os estilos brasileiros.</p></div>')+
    '<p class="small-muted">Referências Jamendo não possuem notas/legendas de karaokê e nunca são instaladas automaticamente. Os downloads liberados dependem do arquivo original e da licença vigente. O indexador não baixa áudios nem publica músicas no GitHub.</p></section>';
}
