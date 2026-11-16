# Roadmap do Karaoke Show

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
