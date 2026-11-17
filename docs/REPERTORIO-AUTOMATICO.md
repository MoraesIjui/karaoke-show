# Karaoke Show — Repertório automático

## Como usar
Abra **Repertório automático** no menu do site/APK. Escolha **país**, **idioma**, **tipo de conteúdo**, **ritmos** e **quantidade de resultados**. Use **Atualizar catálogo** para consultar a última versão publicada do índice. Instale músicas liberadas individualmente ou por meio de **Instalar até 5 karaokês elegíveis**.

**Instalação automática autorizada** é uma opção desativada por padrão. Se o usuário a habilitar, ao abrir o aplicativo com internet ele instala até três karaokês compatíveis por dia, respeitando os filtros e um limite de 30 MB por sessão. O aplicativo não continua baixando com ele fechado.

As faixas importadas ficam no IndexedDB **deste aparelho** e aparecem em **Explorar músicas**; não são enviadas ao Supabase, GitHub ou a terceiros. Para evitar perda, preserve cópias dos arquivos de origem antes de limpar dados ou reinstalar o APK.

## Fonte 1: UltraStar Deluxe — karaokês prontos
Origem: https://github.com/UltraStar-Deluxe/songs

O indexador verifica o conjunto de arquivos song.txt, license.txt e os nomes/tamanhos do áudio. Não transfere gravações para o repositório do usuário. Marca uma faixa para instalação somente após verificar que há áudio, notas vocais e uma licença Creative Commons elegível, sem restrição ND. O instalador revalida os dados antes de baixar o áudio diretamente da origem oficial e preserva as atribuições e licenças no aparelho.

**País do artista não é inferido pelo idioma das letras.** Por isso, muitas faixas UltraStar aparecem como país não identificado.

## Fonte 2: Jamendo — descoberta
Documentação: https://developer.jamendo.com/v3.0/tracks

É preciso obter um Client ID no portal https://devportal.jamendo.com/ e criar o segredo de repositório do GitHub Actions chamado JAMENDO_CLIENT_ID. Não é necessário para as músicas UltraStar. Sem esse identificador, a fonte Jamendo permanece **não configurada**.

A indexação utiliza, quando disponíveis, paradas por país, incluindo BRA, e estilos de música. **Jamendo não garante letras e notas UltraStar**. Essas faixas são somente referências para descoberta e não são automaticamente baixadas como karaokês, ainda que o artista permita o download.

Para configurar, abra GitHub → repositório karaoke-show → Settings → Secrets and variables → Actions → New repository secret → JAMENDO_CLIENT_ID. Depois execute o workflow manualmente em Actions.

## Atualização diária
O workflow **Atualizar catálogo de repertório permitido** executa todos os dias às 10:17 UTC e também tem execução manual (Actions → Run workflow). O processo usa GitHub Actions e publica apenas data/repertoire.json, contendo referências, links de origem, metadados e situação da licença. Nenhum áudio é incluído nesse arquivo.

O aplicativo lê diretamente a versão pública atualizada no GitHub, depois tenta a cópia incluída no site/APK e finalmente o cache local. Portanto, atualizações de metadados não exigem recompilar a TV Box.

## Limitações importantes
- A quantidade escolhida define o **limite de exibição**, não um número garantido de músicas prontas.
- A fonte UltraStar oficial tem dezenas de faixas, não milhares de sucessos comerciais brasileiros.
- Selecionar Brasil + sertanejo + gaúcha + pagode pode retornar zero sem que haja erro: essas músicas precisam existir em fontes autorizadas.
- Não há downloads em massa de plataformas com termos incompatíveis, scraping de sites protegidos, nem cópia automática de YouTube, MIDI4You ou USDB.
- Arquivos MP3/OGG da fonte podem conter a voz original e não serem instrumentais.
- Licenças e permissões são verificadas por faixa, e o usuário deve respeitar atribuição e uso não comercial quando aplicáveis.
- Downloads com a aplicação fechada exigiriam um serviço nativo em segundo plano, que **não** foi implementado.
- Jamendo sem credencial é explicitamente marcado como não configurado.
- A instalação real em TV Box e o espaço livre ainda devem ser testados fisicamente.

## Arquivos de implementação
- tools/sync-repertoire.mjs — indexação automática da fonte UltraStar e Jamendo opcional
- .github/workflows/sync-repertoire.yml — agendamento diário
- data/repertoire.json — índice público, sem áudio
- src/repertoire.js — preferências, filtros, cache e deduplicação
- src/repertoire-ui.js — interface
- src/ultrastar-import.js — instalador de karaokês licenciados
- src/app.js — integração e início da sincronização
- tests/repertoire.test.mjs e tests/repertoire-sync.test.mjs — validação

Referências: [Guia de importação UltraStar](ULTRASTAR.md) e [roadmap](ROADMAP.md).
