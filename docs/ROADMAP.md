# Roadmap do Karaoke Show

> **Contexto consolidado em 17/11/2026:** referências de [11 repositórios de karaokê no GitHub](REFERENCIAS-GITHUB-KARAOKE.md) foram adicionadas ao planejamento. A lista abaixo é histórica e não reflete integralmente os recursos já entregues. O projeto passou a ter finalidade **pessoal/familiar**, sem distribuição comercial planejada.

## UltraStar e repertório para teste (17/11/2026)

- [x] Parser UltraStar TXT com BPM, GAP, notas de voz e letras por sílaba
- [x] Importação local de ZIP com `song.txt`, áudio e `license.txt`
- [x] Instalação opcional de 2 músicas Creative Commons diretamente do repositório oficial, com atribuição
- [ ] Validar os MP3/OGG reais, o microfone e as pontuações na TV Box física
- [ ] Suporte a duetos, `#RELATIVE:yes`, edição de notas e importação USDB

Ver [docs/ULTRASTAR.md](ULTRASTAR.md).

## Recursos implementados a partir da pesquisa (17/11/2026)

- [x] Novo parser de letras KAR com tempos de palavras/sílabas (`src/kar-lyrics.js`)
- [x] Timbragem MIDI leve inspirada em famílias General MIDI; modos econômico/equilibrado/rico, bateria e ambiência (`src/gm-timbres.js`)
- [x] Servidor local no APK Android para controle da fila pelo celular, com QR e chave por sessão (teste físico pendente)
- [x] Integração experimental com motor SoundFont WebAudioFonts 2.0.3 MIT, presets FluidR3 sob demanda e fallback offline
- [ ] Medir consumo de RAM, CPU, latência, cache de presets e qualidade do SoundFont em TV Box física
- [ ] Teste físico de microfone, QR, áudio e pareamento LAN em Android TV
- [ ] Modo avançado com ajuste de afinação por sílaba e duetos

Mais detalhes: [INTEGRACAO-COMUNIDADE-2026.md](INTEGRACAO-COMUNIDADE-2026.md).

## Próximas melhorias derivadas da pesquisa GitHub

- [x] **P1 — Instrumentos MIDI melhores:** integração experimental `WebAudioFonts/midi-audio-player` (MIT) e presets FluidR3 sob demanda; desempenho e cache ainda pendentes em TV Box
- [ ] **P1 — Letras KAR:** comparar a leitura de eventos MIDI/KAR com `fraigo/karaoke-player` (MIT), corrigir formatos de quebras e sílabas com testes reais
- [ ] **P2 — Biblioteca local em TV Box:** estudar importação por pasta/pendrive sem enviar músicas à nuvem; preservar acervo ao atualizar o APK
- [ ] **P2 — Controle pelo celular:** QR e fila local, inspirados em KaraokeNatin e vkara; sem depender de vídeos YouTube
- [ ] **P3 — Pontuação avançada:** notas vocais confiáveis e calibração física, tomando Nightingale, UltraStar Deluxe, Vocaluxe e Performous como referências arquiteturais
- [ ] **Pesquisa MK1:** estudar o formato proprietário Microke com arquivos reais, sem prometer compatibilidade ou conversão automática

**Já entregue em etapas posteriores ao roteiro inicial:** APK debug, leitura KAR/MID, importação em lote ZIP, biblioteca familiar autenticada e seção Descobrir MIDI. A execução física na TV Box, a validação do SoundFont experimental e a compatibilidade MK1 seguem pendentes.


## Versão 0.1 — First Stage (base atual)

- [x] Site offline-first e PWA instalável (em navegadores que suportem)
- [x] Biblioteca com quatro faixas originais (melodias e letras demonstrativas)
- [x] Acompanhamento sintetizado em tempo real
- [x] Sincronização de letra por palavra nas faixas originais
- [x] Detector de pitch, som ambiente, pontuação 0–100.000
- [x] Feedback de afinação, combo e medalhas S–D
- [x] Fila de apresentações e ranking persistente local
- [x] Importação MP3/OGG/WAV/M4A + LRC + mapa de notas JSON
- [x] Navegação por D-pad, pausa, volume, configurações e tela cheia
- [x] Testes unitários sem bibliotecas externas
- [ ] Teste E2E real em navegador (ambiente de execução desta entrega restringiu automação gráfica)
- [ ] Teste físico de microfone, som e apresentação completa

## Versão 0.2 — TV Edition

- [ ] Definir hardware mínimo e coletar especificações das TV Boxes
- [ ] Modo TV específico com fontes grandes, safe-area e foco otimizado
- [ ] Android TV APK debug (Capacitor para Android 7+)
- [ ] `RECORD_AUDIO` e concessão restrita no WebChromeClient
- [ ] Permissões e microfone UAC USB testados
- [ ] Bateria de testes por Android/WebView/RAM
- [ ] Calibrador de latência com sinal-sonoro de teste
- [ ] Testes automatizados com controladores D-pad

## Versão 0.3 — Karaoke Engine Pro

- [ ] Modelo de notas independente das palavras/sílabas, com rests e durações
- [ ] Pontuação detalhada de afinação, início da sílaba, ritmo e estabilidade
- [ ] Processamento de pitch em AudioWorklet ou ponte nativa conforme CPU
- [ ] Guia de afinação por linha, harmonização e modos iniciante/avançado
- [ ] MediaPlayer para instrumental premium, clipes, vídeo de fundo
- [ ] Mixer/controle de microfone de baixa latência onde houver suporte
- [ ] Editor de letra e notas sincronizadas para arquivos próprios
- [ ] Exportação/importação dos dados de ranking

## Versão 0.4 — Festa & Social

- [ ] Fila multiusuário pelo celular via QR code na mesma rede
- [ ] Cantores com perfis, rankings por período, pontuação por equipe
- [ ] Torneio, dueto, batalha de vozes, desafios cooperativos
- [ ] Apresentador e atalhos para usar sem mouse
- [ ] Controle por celular e perfis/skins para cada TV

## Versão 1.0 — Distribuição

- [ ] Identidade visual e logos finais
- [ ] Conteúdo musical licenciado / parceiros de catálogo
- [ ] APK release assinado e auditado, distribuição compatível
- [ ] Termos, privacidade, conformidade legal e suporte
- [ ] Plano de monetização (venda do app/kit TV Box, licença etc.)

**Princípio:** não prometer “karaokê profissional” sem avaliação física, disponibilidade de repertório e licenças musicais. O diferencial real é transformar hardware já existente em dispositivo de festa com custo e complexidade baixos.
