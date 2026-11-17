# Karaoke Show — SoundFont real (modo experimental)

**Implementado em 17/11/2026.**

## O que foi entregue

- Novo motor de áudio MIDI amostrado em `src/soundfont-audio.js`.
- Player aberto [WebAudioFonts/midi-audio-player](https://github.com/WebAudioFonts/midi-audio-player) **v2.0.3**, empacotado em `src/vendor/midi-audio-player.min.js`; biblioteca sob **licença MIT** e licença preservada em `src/vendor/MIDI-AUDIO-PLAYER-LICENSE.txt`.
- Quando selecionado, o player carrega **presets SoundFont da família FluidR3**, distribuídos sob licença MIT, com as atribuições devidas. Consulte [registro do SoundFont FluidR3 em Debian](https://sources.debian.org/src/musescore-general-soundfont-small/0.2-2/MuseScore_General_License.md/) e o [catálogo WebAudioFonts](https://webaudiofonts.com/catalog/).
- Banco de amostras **não embutido no APK nem no GitHub**. Os presets são obtidos do serviço `https://webaudiofonts.com/presets/` quando o modo é usado pela primeira vez; a biblioteca tenta armazenar o catálogo e os instrumentos no cache local de navegador, conforme suporte do dispositivo.
- A engine sintética anterior **permanece padrão** e é ativada automaticamente se o modo amostrado falhar.
- A reprodução de voz e o sistema de pontuação não são enviados ao provedor de presets; o player recebe o conteúdo MIDI localmente.

## Como experimentar

1. Abra Karaoke Show no site ou no APK Android.
2. Vá em **Configurações → Som e acompanhamento → Motor de instrumentos MIDI**.
3. Selecione **SoundFont real (experimental)**.
4. Mantenha a TV Box conectada à internet na primeira reprodução: a biblioteca irá consultar seu catálogo e baixar as amostras dos instrumentos usados na música.
5. Importe e escolha uma música `.kar`, `.mid` ou `.midi`; inicie a apresentação.
6. Se a biblioteca não puder carregar as amostras, a mesma música será reproduzida pelo sintetizador leve, com aviso. Para voltar ao modo offline estável, selecione **Sintetizador leve (offline)** nas configurações.

## Proteções para TV Boxes de 1 GB

- Limite adaptativo de instrumentos MIDI simultâneos por faixa: **8 programas em aparelhos que informam até 1 GB de RAM**, **12 até 2 GB**, **18 acima de 2 GB** e **12 quando o WebView não informa a memória**. Faixas que excederem o limite voltam ao sintetizador leve.
- Limite de **20 segundos** para a preparação dos presets, para evitar que o aplicativo permaneça bloqueado esperando downloads por muito tempo.
- Presets preferidos/requeridos: `FluidR3_GM`, `FluidR3Mono` e `FluidR3`. Quando a família FluidR3 não é encontrada para todos os programas utilizados, o modo amostrado não faz download silencioso de outro SoundFont: utiliza o motor leve.
- O motor não prepara bancos amostrados quando o usuário não selecionou o modo SoundFont.
- Fallback evita travamento funcional se o navegador não suportar os codecs, APIs ou memória necessária.
- Não existe garantia de funcionamento offline após o primeiro uso: o catálogo pode exigir acesso à rede, a limpeza do WebView pode eliminar o cache e o provedor pode mudar a disponibilidade de presets.

## Licenciamento

**Biblioteca de reprodução e bancos de instrumentos são coisas diferentes.** O player `midi-audio-player` usa MIT; os presets vêm de diferentes bancos com licenças próprias. Esta implementação seleciona a família **FluidR3**, atribuída a Frank Wen e colaboradores conforme as condições da família FluidR3. Nenhuma música do usuário é distribuída. O uso de MID/KAR de terceiros continua sujeito aos direitos das composições e letras.

## Resultados de validação

- `npm test`, `npm run check` e `npm run build`: aprovados via GitHub Actions.
- Compilação Android TV debug: aprovada via GitHub Actions.
- A leitura dos 69 KAR do pacote do usuário foi verificada no parser MIDI da versão anterior. Uma análise adicional dos eventos indica **68 faixas com até 18 programas MIDI** e **1 com 22**. O limite dinâmico em aparelhos de 1 GB é de 8 programas, portanto várias das 69 faixas usarão automaticamente o sintetizador leve.
- **Pendente:** teste acústico real com presets FluidR3 no navegador e na TV Box, medição de RAM/CPU, verificação do endpoint, teste de decodificação dos formatos de amostra no WebView, persistência do cache e latência sonora.

## Arquivos

- `src/soundfont-audio.js` — adaptador amostrado e limite de recursos.
- `src/vendor/midi-audio-player.min.js` — biblioteca distribuída com licença MIT.
- `src/vendor/MIDI-AUDIO-PLAYER-LICENSE.txt` — atribuição de código.
- `src/midi-audio.js` — motor sintetizado offline original (fallback).
- `src/app.js` e `src/storage.js` — seleção de motor e persistência.
- `tests/soundfont.test.mjs` — validação de banco, identificação de programas e controles por objetos simulados.

O recurso é **experimental** até ser testado com amostras reais, numa TV Box física, por período prolongado.
