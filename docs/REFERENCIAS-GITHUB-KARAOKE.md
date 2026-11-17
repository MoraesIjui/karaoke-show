# Karaoke Show — Contexto da pesquisa de repositórios de karaokê no GitHub

**Atualizado em:** 17/11/2026
**Objetivo:** preservar a pesquisa de soluções abertas e transformá-la em decisões técnicas para o projeto familiar [Karaoke Show](https://github.com/MoraesIjui/karaoke-show).

> **Status:** documento de pesquisa e arquitetura. Nenhuma dependência ou código dos repositórios abaixo foi incorporado automaticamente. Recursos descritos como referências não estão necessariamente implementados no Karaoke Show.

## 1. Situação atual do Karaoke Show

- Site/PWA no GitHub Pages e APK debug Android TV pelo GitHub Actions; APK físico e microfone USB ainda exigem validação.
- Biblioteca familiar privada com Supabase Auth, RLS e bucket não público; áudio local separado da biblioteca privada online.
- Leitura de MIDI/KAR e letra embutida; síntese MIDI atual básica via Web Audio (sem SoundFont profissional).
- Importação individual e ZIP local, deduplicação e relatório para KAR/MID/MIDI; arquivo ZIP do usuário apresentou 69 KAR MIDI compatíveis, 54 MK1 Microke não suportados e 1 ALB de índice.
- Fila local, resultado/ranking, pontuação YIN quando existe mapa de notas vocais adequado; letras LRC e ajuste de latência.
- Seção `Descobrir MIDI` exibe somente links externos de pesquisa no MIDI4You, sem redistribuir arquivos.
- Objetivo atual **exclusivamente pessoal e familiar**; não há plano de comercializar, usar Play Store ou compartilhar repertório de terceiros.

## 2. Repositórios verificados e aplicação

As licenças abaixo foram verificadas nos metadados GitHub em 17/11/2026; a compatibilidade efetiva e licenças das dependências exigem revisão antes de integrar código.

| Repositório | Ideia principal | Aplicação para o Karaoke Show | Licença indicada no GitHub |
| --- | --- | --- | --- |
| [WebAudioFonts/midi-audio-player](https://github.com/WebAudioFonts/midi-audio-player) | Player MIDI/KAR Web Audio com presets instrumentais, reverb, EQ, canais e eventos de karaoke | **P1:** avaliar substituição do sintetizador simples de `src/midi-audio.js`, mantendo baixo consumo nas TV Boxes | MIT |
| [fraigo/karaoke-player](https://github.com/fraigo/karaoke-player) | Player web de KAR/MID com leitura de letras, andamento e SoundFonts | **P1:** estudar interpretação e exibição de letras KAR e compatibilidade | MIT |
| [nojukuramu/KaraokeNatin](https://github.com/nojukuramu/KaraokeNatin) | TV/projetor como tela principal; smartphone como controle e seleção de músicas; vídeos YouTube | **P2:** estudar experiência QR, fila e comandos por celular, adaptando para arquivos locais (não copiar downloads de YouTube) | MIT |
| [lehuygiang28/vkara](https://github.com/lehuygiang28/vkara) | Controle colaborativo por telefone, busca e fila para TV | **P2:** referenciar filas/sessões e experiência de convidados na rede local | MIT |
| [sempogi/Android-Karaoke](https://github.com/sempogi/Android-Karaoke) | Projeto experimental para Android MIDI/KAR, SoundFont e controle remoto | **P1:** estudar soluções Android/TV e reparos de letras | Licença não identificada nos metadados |
| [JohnPatrickSangalangManalo/gising-android](https://github.com/JohnPatrickSangalangManalo/gising-android) | Aplicativo Android offline de karaokê MIDI, letras e vídeo | **P2:** benchmark de interface/aparelhos antigos | MIT, segundo metadados |
| [DavidWatkins/midi-karaoke](https://github.com/DavidWatkins/midi-karaoke) | App Electron para karaoke com .kar, piano MIDI e letras | **P2:** comparativo de sincronização MIDI | Licença não identificada nos metadados |
| [rzru/nightingale](https://github.com/rzru/nightingale) | Análise de voz, nota, tom/tempo, letras sincronizadas e preparação de faixas com IA | **P3:** ideias para pontuação e geração de dados *fora* da TV Box | GPL-3.0 |
| [UltraStar-Deluxe/USDX](https://github.com/UltraStar-Deluxe/USDX) | Jogo de karaokê por notas-alvo, letras e avaliação vocal | **P2:** formato de notas e experiência de competição | GPL-2.0 |
| [Vocaluxe/Vocaluxe](https://github.com/Vocaluxe/Vocaluxe) | Jogo de canto inspirado em SingStar/UltraStar | **P3:** modos de festa, perfis e competição | GPL-3.0 |
| [performous/performous](https://github.com/performous/performous) | Jogos musicais, canto, instrumentos e avaliação de performance | **P3:** pontuação e modos multiusuário | Metadados GitHub: NOASSERTION; revisar licença do código |

**Atenção:** um repositório público sem licença indicada **não** significa que seu código possa ser copiado. Projetos GPL podem impor obrigações ao projeto derivado caso incorporemos código; para o Karaoke Show, preferir estudo arquitetural até avaliar compatibilidade e condições. Não copiar músicas, sample banks, vídeos ou outros recursos protegidos só porque aparecem no GitHub.

## 3. Decisões técnicas importadas da pesquisa

### P1 — Motor MIDI e letras

**Problema:** `src/midi-audio.js` usa osciladores básicos; os instrumentos soam artificiais e alguns KAR apresentam segmentação de letra diferente.

**Investigar:**
1. Fazer prova de conceito com `midi-audio-player` usando **arquivos MIDI/KAR próprios ou autorizados**.
2. Medir RAM, CPU, latência de início, qualidade dos instrumentos e tamanho de SoundFonts em TV Boxes de 1 GB de RAM.
3. Comparar `fraigo/karaoke-player` para interpretar eventos de letra, quebras e temporização de sílabas; **não substituir o parser sem testes de regressão**.
4. Manter fallback para síntese atual quando não houver memória para presets instrumentais.

**Critério de aceite:** importar 69 KAR do pacote de testes sem regressões, verificar 10 músicas com letras diversificadas, reproduzir 30 minutos sem travamentos no dispositivo-alvo.

### P2 — Telefone como controle da festa

**Problema:** atualmente a fila do Karaoke Show é local, manejada na própria tela, sem controle colaborativo por smartphone.

**Inspiração:** KaraokeNatin e vkara.

**Plano:** TV mostra QR code e código de sessão; telefones na mesma rede entram na sala como convidados para pesquisar **apenas músicas já disponíveis no aparelho**, adicionar à fila e escolher cantor. TV mantém autoridade sobre reprodução; autenticação local e limite de comandos contra abuso. Evitar dependência obrigatória de YouTube e Internet.

**Critério de aceite:** 3 telefones participam da fila de uma TV, sem expor o catálogo ou a conta Supabase.

### P2/P3 — Pontuação e letras avançadas

**Inspiração:** UltraStar Deluxe, Vocaluxe, Performous e Nightingale.

**Plano:** separar no modelo de dados (a) letras sincronizadas (b) sequência vocal de notas-alvo e pausas (c) notas dos instrumentos. Notas MIDI dos instrumentos **não equivalem automaticamente** à linha melódica do cantor. Criar editor de notas e ajuste manual de sincronização; preservar ranking somente para músicas com referência vocal confiável. Processamento de IA pesado, quando usado, deve ocorrer fora da TV Box antiga.

**Critério de aceite:** microfone USB, letra, afinação e compensação de atraso avaliados em hardware real; não gerar pontuação artificial para arquivos sem notas vocais.

### P3 — Compatibilidade Android TV / Microke

- Validar comportamento de Android System WebView em TVs de 1 GB de RAM, suporte a MIDI/SoundFont, `DecompressionStream`, IndexedDB e D-pad.
- `.mk1` Microke **não** tem suporte confirmado em nenhum dos repositórios acima; não renomear arquivos nem prometer conversão.
- Estudar separadamente estrutura proprietária MK1 e papel do arquivo ALB, sem afirmar compatibilidade até um leitor e testes reais existirem.

## 4. Próxima ordem sugerida para o projeto familiar

1. **Qualidade MIDI e letra KAR:** protótipo SoundFont, corretor de letras, controles de volume por canal, desempenho em Android TV.
2. **Biblioteca local melhorada:** verificar mídia externa/pasta no Android e preservação após atualizar o APK; ZIP importado continua local.
3. **Modo festa com smartphone:** QR code, fila na rede local e controle remoto.
4. **Pontuação/edição avançada:** notas vocais confiáveis, dueto e ranking familiar.
5. **Compatibilidade MK1:** pesquisa específica, sem compromisso de suporte até converter arquivos reais.

## 5. Fora do escopo nesta fase

- Distribuir obras musicais de terceiros dentro do GitHub, site público ou APK.
- Prometer que o conteúdo de outros projetos seja livre de direitos autorais.
- Integrar conversão/download de músicas do YouTube como base do acervo.
- Publicar na Play Store, monetizar ou oferecer catálogo comercial.
- Copiar funcionalidades ou código de GPL sem revisão da licença e do uso derivado.

## 6. Referências complementares

- [Pesquisa técnica inicial](PESQUISA.md)
- [Roadmap](ROADMAP.md)
- [Plano Android TV](ANDROID-TV.md)
- [Importação ZIP](IMPORTACAO-ZIP.md)

**Regra de atualização:** sempre separar recursos que *já funcionam* de ideias *identificadas em outros repositórios*, registrar licença e verificar impacto em Android TV de baixa memória.
