# Karaoke Show — Web, TV Box, biblioteca familiar privada e importação ZIP

**Status:** site online; APK de teste compilado pelo GitHub Actions. Biblioteca compartilhada privada no Supabase (RLS e armazenamento não público), acesso somente para membros da família autorizados. Há quatro músicas originais. Arquivos comerciais não são distribuídos pelo projeto.

## Site e APK

- **Web:** https://moraesijui.github.io/karaoke-show/
- **APK Android (debug):** GitHub > Actions > **Gerar APK de teste (Android e TV Box)** > execução concluída > **Artifacts** > `karaoke-show-tvbox-debug-apk`. Dentro do ZIP está `app-debug.apk`.
- Compilação no GitHub Actions em Ubuntu, JDK 17, Gradle 8.9, Android SDK API 35, minSdk 23. **Android TV e microfone USB precisam de testes físicos**; o APK debug não se destina à Play Store.
- O aplicativo inclui o site em um WebViewAssetLoader servido em origem HTTPS local, permitindo testar mesmo sem internet com as músicas originais. Músicas do catálogo online exigem conexão.

## Biblioteca particular de músicas na web e no APK

1. O app consulta `public.ks_tracks` no Supabase somente após o login de um membro autorizado, com links temporários para o bucket privado `ks-media`.
2. O upload fica na tela **Biblioteca da família**, mediante login administrativo do Supabase Auth; habilite o administrador conforme `supabase/ADMIN-SETUP.md`.
3. São aceitos **MP3, WAV, OGG, M4A, MP4, MID, MIDI e KAR**, limite de 25 MB no catálogo privado. Letras **LRC** e mapa de notas **JSON** são opcionais; arquivos KAR podem conter letras incorporadas.
4. Compartilhe no catálogo privado apenas arquivos cujo uso e compartilhamento sejam permitidos. A distribuição de músicas de terceiros continua sujeita a direitos autorais.
5. Arquivos MIDI/KAR têm dois motores: síntese leve offline por Web Audio (padrão) ou reprodução com SoundFont FluidR3 amostrado (experimental e sob demanda). A pontuação exige notas vocais de referência.

## Importação de ZIP em lote (somente local)

Use **Importar música → Importar um ZIP de músicas em lote** para abrir um arquivo `.zip` com `.kar`, `.mid` ou `.midi`. O aplicativo verifica CRC, detecta duplicatas, identifica títulos/artistas pelo nome do arquivo e lista `.mk1` e `.alb` como não suportados. As músicas ficam no IndexedDB do aparelho, sem upload ao Supabase. Veja [docs/IMPORTACAO-ZIP.md](docs/IMPORTACAO-ZIP.md).

## Recursos inspirados na comunidade (2026)

- **Instrumentos MIDI melhorados:** perfis de timbres GM em `src/gm-timbres.js`, modos Econômico/Equilibrado/Rico, ambiência e chave de bateria MIDI.
- **Letras KAR detalhadas:** parser `src/kar-lyrics.js` preserva tempos de palavras e sílabas.
- **Controle familiar pelo celular (APK Android):** nova tela **Controle pelo celular**, QR code e servidor local protegido por token. Celular e TV Box devem estar na mesma rede. Adiciona músicas à fila, sem enviar arquivos ou senhas ao telefone.
- **SoundFont real experimental:** motor MIDI amostrado WebAudioFonts/FluidR3 (código MIT, amostras FluidR3 com atribuição), baixado apenas quando selecionado nas configurações. Os presets ficam em cache quando o navegador permite, com retorno automático à síntese leve em caso de indisponibilidade.
- **Limitações:** sem MK1 Microke e sem validação física concluída de RAM, microfone, SoundFont ou controle LAN em TV Box.
- Consulte [docs/INTEGRACAO-COMUNIDADE-2026.md](docs/INTEGRACAO-COMUNIDADE-2026.md) para funcionamento, segurança, atribuição de licença e roteiro de testes.

## Som com SoundFont amostrado (opcional)

Em **Configurações → Som e acompanhamento → Motor de instrumentos MIDI**, selecione **SoundFont real (experimental)**. O aplicativo usa a biblioteca [midi-audio-player](https://github.com/WebAudioFonts/midi-audio-player) versão 2.0.3 (MIT) e procura instrumentos do banco FluidR3, distribuído sob licença MIT com atribuição. Os bancos de instrumentos **não** são distribuídos com o APK: exigem internet no primeiro uso e podem ser mantidos em cache no armazenamento do aparelho. Se faltar banco, memória, suporte do WebView ou rede, a música toca no sintetizador leve, com aviso.

Esse recurso não baixa, publica nem envia as músicas pessoais para servidores de instrumentos. A qualidade final depende da TV Box e dos presets disponíveis. Consulte [docs/SOUNDFONT.md](docs/SOUNDFONT.md).

## Pesquisa de repositórios GitHub

O estudo comparativo de karaokês abertos (WebAudioFonts, KaraokeNatin, Nightingale, UltraStar Deluxe, Vocaluxe, Performous e outros) foi incorporado em [**docs/REFERENCIAS-GITHUB-KARAOKE.md**](docs/REFERENCIAS-GITHUB-KARAOKE.md). O documento separa ideias de código já implementado, orienta evolução de som MIDI, letras KAR, controle pelo celular e pontuação, e registra cuidados com licenças.

## Organização

- `src/`: interface, motor de áudio, pontuação, armazenamento local e `cloud.js` (cliente Supabase).
- `android/`: app Android WebView e permissões de microfone e seletor de arquivos.
- `supabase/`: migration SQL e instruções para administrar a biblioteca.
- `.github/workflows/deploy.yml`: GitHub Pages; `android-apk.yml`: APK de teste.

## Validação

```bash
npm test && npm run check && npm run build
```

A distribuição na Play Store exige versão de produção, assinatura, análise de direitos autorais, testes físicos e cumprimento de políticas do Google.

---

# 🎤 Karaoke Show

**Sua voz, seu palco.** Karaokê offline-first com afinação medida pelo microfone, letras sincronizadas, acompanhamento instrumental, fila de apresentações e ranking. Projeto elaborado pensando na futura transformação de TV Boxes em aparelhos de karaokê.

**Status:** versão inicial funcional para navegador e PWA (v0.1). **APK Android TV ainda não produzido ou testado em hardware físico.** Não inclui catálogo de músicas comerciais ou microfone embutido.

## Como executar (nenhuma dependência npm)

Requisitos: **Node.js 18 ou superior**, navegador atual e, para pontuação, microfone e permissão de captura.

```bash
# entrar na pasta do projeto
cd karaoke-show
npm run dev
```

Abra **http://localhost:4173** no navegador do computador. `localhost` permite autorização do microfone; para acessar de outro aparelho pela rede, hospede o site em **HTTPS**.

```bash
npm test         # testes unitários
npm run check    # validação sintática de todos os módulos JS
npm run build    # gera dist/ pronto para hospedagem estática
```

Para servir o build: `KS_ROOT=dist PORT=4174 npm start`.

### Primeiro show

1. Abra **Explorar músicas**.
2. Escolha uma das quatro músicas originais e clique no botão de reprodução.
3. Informe o nome de quem vai cantar. Use **Ativar microfone** para permitir pontuação.
4. Clique em **Começar com pontuação**. Há contagem regressiva de 3 segundos antes das músicas originais.
5. Cante a letra no tempo, seguindo o guia visual de notas; observe os pontos, o combo e o resultado.
6. No **Hall da fama**, consulte as pontuações salvas localmente. Para festas, use **Adicionar à fila** na preparação da música.

Sem microfone, o aplicativo executa as músicas em **modo apresentação**, sem inventar pontuação. O sistema não reproduz eletronicamente a voz captada nos alto-falantes (para evitar microfonia); ele **analisa** a voz. Um mixer/amplificador de microfone externo pode ser necessário para o público ouvir o cantor.

## Recursos já implementados

| Recurso | Estado |
| --- | --- |
| Interface responsiva 16:9, desktop e celular | ✅ Implementado; validação visual em hardware pendente |
| Navegação por setas/D-pad, Enter e Voltar/Escape | ✅ Implementado; validação por controle físico pendente |
| 4 músicas/12 versos por música, letras e mapas de notas originais | ✅ |
| Acompanhamento instrumental Web Audio (baixo, acordes, ritmo, melodia-guia) | ✅ Sintetizado, não gravação profissional |
| Letras sincronizadas palavra por palavra | ✅ Nas músicas originais; LRC importado usa divisão temporal aproximada das palavras |
| Microfone com permissão, análise de volume e frequência via YIN | ✅ Implementado; precisão depende do ambiente e microfone |
| Escala 0–100.000 com base na comparação nota captada/esperada | ✅ |
| Acertos, afinação média, cobertura de voz, combos, classificação S–D | ✅ |
| Pausa/retomada, música atual, progresso, tela cheia e reinício | ✅ |
| Fila local de cantores/músicas com ordenação | ✅ |
| Ranking local e resultados históricos | ✅ |
| Importação de áudio + letra LRC + mapa JSON opcional | ✅ Local via IndexedDB |
| Armazenamento offline de arquivos importados | ✅ Dependente da quota de armazenamento do navegador |
| Instalação como PWA / Service Worker | ✅ Código implementado; depende do navegador e HTTPS |
| Ajuste de volume, sensibilidade, oitavas, atraso e animações | ✅ |
| APK Android TV, launcher, permissões nativas, microfone USB testado | 🕒 Próxima fase |
| Biblioteca de músicas comerciais licenciadas | 🕒 Depende de direitos e contratos |
| Música/voz de estúdio, pontuação competitiva profissional calibrada | 🕒 Requer evolução e validação acústica |

## Importar música local

Em **Explorar músicas → Importar música**, selecione:

- Um áudio instrumental `.mp3`, `.ogg`, `.wav` ou `.m4a` aceito pelo navegador (até 150 MB, 30 min).
- Um arquivo de letra `.lrc` com timestamps `minutos:segundos` (obrigatório).
- Um mapa de notas `.json` opcional; sem ele o arquivo tem **modo apresentação**, não ranking.

Exemplo LRC:

```lrc
[00:04.00]A primeira frase da música
[00:08.00]A segunda frase da música
```

Exemplo de mapa JSON:

```json
[
  { "start": 4.0, "end": 5.0, "midi": 60 },
  { "start": 5.0, "end": 6.0, "midi": 62 }
]
```

Timestamps são segundos desde o começo do áudio; MIDI 60 = Dó central. O algoritmo associa a nota ao ponto médio da palavra estimada no LRC. Para pontuar, pelo menos 80% das palavras precisam ter uma nota-alvo. Para precisão profissional, o próximo formato de catálogo deverá usar notas e sílabas temporizadas independentemente.

**Direitos:** importar um arquivo não garante o direito de executá-lo publicamente. Use conteúdo próprio, domínio público devidamente verificado, ou músicas/letras com licenças adequadas. O app não extrai vídeos nem músicas de plataformas de streaming.

## Como funciona a pontuação

- O navegador pede permissão para o microfone via `getUserMedia`.
- Um analisador lê PCM localmente, com limiar de silêncio e detector **YIN** (aproximação monofônica).
- A cada ~85 ms de apresentação ativa, a altura captada é comparada à **nota MIDI esperada para a palavra naquele instante**.
- A diferença em cents, a clareza da detecção e a presença/ausência de voz compõem o valor do instante (0–1).
- O placar 0–100.000 é a média das amostras avaliadas × 100.000. **Silêncio nos períodos avaliados vale zero.** Intervalos instrumentais não contam.
- A cada palavra encerrada, uma média ≥ 0,62 e cobertura de voz ≥ 50% aumentam o combo.
- Oitava flexível é ativada inicialmente, porque vozes diferentes cantam em regiões diferentes; pode ser desativada em Configurações.
- A latência pode ser compensada em ±300 ms. O valor ideal depende de teste com equipamento real.

**Limitações:** sons de fundo podem ser captados pelo microfone; o algoritmo não identifica timbre, ritmo de sílabas ou letra cantada; não há avaliação de pronúncia. O resultado mede **correspondência de altura no tempo**, não competência vocal total. A pontuação de canto comercial deve ser calibrada em estudos/ensaios antes de ser anunciada como equivalente a um jogo profissional.

## Estrutura do projeto

```text
karaoke-show/
├── index.html                  # página principal
├── styles.css                  # interface responsiva/TV
├── manifest.webmanifest       # PWA
├── sw.js                      # cache offline
├── assets/icon.svg            # marca original
├── src/
│   ├── app.js                 # interface, navegação e sessões
│   ├── songs.js               # catálogo e mapas de notas originais
│   ├── audio.js               # síntese instrumental + MP3 local
│   ├── pitch.js               # leitura microfone + detector YIN
│   ├── scoring.js             # pontuação e resultado
│   ├── importer.js            # leitura LRC / nota JSON
│   ├── storage.js             # localStorage + IndexedDB
│   └── remote.js              # navegação pelo controle remoto
├── tests/core.test.mjs        # testes automatizados
├── tools/                     # desenvolvimento, build, check
├── docs/                      # pesquisa e roteiro Android TV
└── .github/workflows/         # publicação GitHub Pages
```

## Publicar no GitHub Pages (repositório `karaoke-show`)

Esta cópia está **pronta para ser enviada ao GitHub**, mas ainda não foi publicada automaticamente.

```bash
git init
git add .
git commit -m "feat: primeira versao karaoke-show offline com pontuacao"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/karaoke-show.git
git push -u origin main
```

Após criar o repositório, em **Settings → Pages**, escolha **GitHub Actions**. O workflow já incluso publica `dist/` a cada push em `main`. Troque `SEU_USUARIO` pelo nome da sua conta.

## Android TV / TV Box

O site é apenas a primeira etapa. Consulte **[docs/ANDROID-TV.md](docs/ANDROID-TV.md)** para definição do APK, compatibilidade com hardware antigo, permissões do microfone, controle remoto e testes de latência.

## Fontes e decisões

Referências técnicas e de direitos autorais constam em **[docs/PESQUISA.md](docs/PESQUISA.md)**. O roadmap está em **[docs/ROADMAP.md](docs/ROADMAP.md)**.

## Licença

**Código-fonte e composições demonstrativas:** projeto inicial criado para o Karaoke Show, disponibilizado neste pacote para evolução pelo responsável pelo projeto. `LICENSE` aplica-se ao **código-fonte**, não concede direitos sobre obras ou áudios de terceiros importados pelo usuário.