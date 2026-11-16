# Plano de testes e estado da validação

**Versão:** Karaoke Show 0.1 — First Stage

## Execuções automatizadas realizadas

Comandos:

```bash
npm test
npm run check
npm run build
```

**Resultado:** 11 testes aprovados, zero falhas; sintaxe JavaScript válida; build estático gerado em `dist/`. As verificações cobrem:

1. Catálogo com quatro músicas, doze versos por faixa e notas temporizadas.
2. Conversão de frequências para MIDI e formatação da duração.
3. Detector YIN com sinal senoidal 82–700 Hz (erro abaixo de 15 cents nos sinais sintéticos testados).
4. Limiar de silêncio e rejeição de sinal fraco.
5. Pontuação por afinação e oitava, incluindo rejeição de silêncio e baixa clareza.
6. Sessão de pontuação, cobertura e combo.
7. Resultado zero quando o usuário não emite voz detectável.
8. Leitura de LRC com offsets, tags repetidas e timestamps.
9. Rejeição de mapas de notas inválidos ou sobrepostos.
10. Categorização de níveis de desempenho.
11. Renderização inicial e navegação simulada: início, biblioteca, preparação, fila, ranking, configurações e importação.

## Testes que faltam

A automação visual com Chromium/Playwright foi tentada, mas o ambiente de execução bloqueou a navegação do navegador. **Não houve screenshot confiável gerado do aplicativo.** Portanto, não confundir os testes acima com validação gráfica completa.

### Manual em computador

- [ ] Abrir `http://localhost:4173` em Chrome/Edge/Firefox atualizado.
- [ ] Conferir layout desktop 1920×1080, 1366×768 e tela 390×844.
- [ ] Autorizar um microfone real e confirmar leitura de nota e nível.
- [ ] Iniciar as quatro músicas, ouvir instrumental e comparar letra/guia.
- [ ] Cantar de propósito nota correta, incorreta e ficar em silêncio.
- [ ] Conferir pontuação 0–100.000, resultado e registro no ranking.
- [ ] Confirmar fila: adicionar, mover, iniciar, finalizar, próxima música.
- [ ] Pausar, retomar, sair, reiniciar e verificar liberação do microfone.
- [ ] Importar arquivo MP3 próprio + LRC e reproduzir sem rede.
- [ ] Importar nota JSON e validar pontuação em faixa importada.
- [ ] Instalar PWA (quando navegador suportar), fechar, desligar rede e reabrir.

### Manual em TV Box

- [ ] Navigação completa só com setas, OK e Back.
- [ ] TV não recorta controles na borda (overscan).
- [ ] Reconhecer microfone USB ao desconectar/reconectar.
- [ ] Medir diferença A/V com saída HDMI, USB e Bluetooth.
- [ ] Desempenho e memória em 720p e 1080p; 30+ minutos contínuos.
- [ ] Sem envio de voz a terceiros; apenas microfone quando permitido.

## Critérios de bloqueio para liberar APK

**Não distribuir APK** até testar captação real, reprodução de áudio, permissão Android, D-pad, persistência offline, travamentos e latência em pelo menos um dispositivo compatível. O plano completo está em `ANDROID-TV.md`.
