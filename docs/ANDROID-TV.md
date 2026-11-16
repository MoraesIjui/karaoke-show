# Android TV / TV Box — Plano técnico de empacotamento

> **Não há APK incluído na primeira entrega.** O navegador/PWA foi a primeira camada. Esta especificação define os cuidados para a versão Android, evitando um APK que abre mas não captura microfone.

## Metas

- **Nome:** Karaoke Show
- **Application ID sugerido:** `br.com.karaokeshow.app` (confirmar antes de publicar na Play Store)
- **Orientação:** landscape; UI 16:9 com margens seguras de 5% para overscan.
- **Launcher:** Android TV `LEANBACK_LAUNCHER` + ícone/banner de TV 320x180.
- **Controle:** D-pad/teclas, Enter, Back, play/pausa; sem toque necessário.
- **Offline:** assets do app embutidos localmente no APK; importações em armazenamento persistente.
- **Privacidade:** `RECORD_AUDIO` somente durante apresentação/teste de microfone, nenhuma transmissão de voz.

## Caminho A — Android 7+, recomendado inicialmente

1. Usar Capacitor 8 sobre o build estático da web, com Android Studio e WebView compatível.
2. Adicionar plataforma Android, configurar pacote e `webDir` (diretório `dist`).
3. Editar `AndroidManifest.xml`: `uses-permission android.permission.RECORD_AUDIO`, `android.hardware.microphone` não obrigatório, `android.hardware.touchscreen` não obrigatório, `android.software.leanback` com `required=false` e filtro `LEANBACK_LAUNCHER`.
4. Implementar classe/ponte nativa que solicita `Manifest.permission.RECORD_AUDIO` em runtime e atende à permissão `PermissionRequest.RESOURCE_AUDIO_CAPTURE` para a origem do conteúdo local do app. **Não conceder acesso indiscriminado a todos os recursos web.**
5. Verificar se os microfones USB/Bluetooth são expostos corretamente à WebView. Tratar `NotFoundError`, `NotAllowedError` e dispositivos sem entrada.
6. Fixar modo paisagem, tela cheia e política de keep-awake somente durante a música.
7. Gerar build **debug** para bancada via Android Studio/Gradle; só criar release APK assinado após testes.

Fontes: https://capacitorjs.com/docs/android ; https://developer.android.com/training/tv/get-started/create ; https://developer.android.com/reference/android/webkit/WebChromeClient

## Caminho B — TV Boxes Android 5/6

Compatibilidade **não garantida**: Capacitor 8 não suporta Android anterior ao 7. A opção é desenvolver wrapper Android nativo mínimo e avaliar a WebView do dispositivo. Isso não resolve por si só Web Audio/getUserMedia indisponível. Se não suportar, será necessária camada de áudio nativa `AudioRecord` com ponte segura à engine de pontuação e sintetizador alternativo para acompanhamento.

Em dispositivos muito antigos, uma versão "Lite" com letras + áudio sem pontuação poderá ser mais realista do que prometer karaoke completo.

## Equipamentos de teste sugeridos

- TV Box com Android TV 9/11, 2 GB RAM, microfone USB UAC 1.0.
- TV Box Android 7/8, 1 GB RAM, microfone USB.
- Um aparelho Android 5/6 com WebView conhecida para experimentar modo Lite/compatibilidade.
- Soundbar/TV via HDMI; segunda rodada com caixa Bluetooth para medir atraso.
- Controle D-pad e controle USB tipo teclado.

## Matriz de aceitação (preencher com medidas)

| Teste | Equipamento 1 | Equipamento 2 | Equipamento 3 |
| --- | --- | --- | --- |
| Versão Android / WebView | a medir | a medir | a medir |
| Microfone USB reconhecido | a medir | a medir | a medir |
| Frequência 220/440 Hz detectada | a medir | a medir | a medir |
| Latência (ms) e compensação | a medir | a medir | a medir |
| D-pad integral | a medir | a medir | a medir |
| 1 hora sem travar | a medir | a medir | a medir |
| Arquivos importados após reboot | a medir | a medir | a medir |
| CPU/RAM em reprodução | a medir | a medir | a medir |

## Acompanhamento da voz (monitoramento)

O PWA **não roteia o microfone para os alto-falantes**, pois isso pode gerar microfonia e atraso perceptível. Para a festa funcionar com cantor amplificado, usar microfone com receptor/mixer e saída para caixa de som, ou desenvolver no APK uma rota nativa de baixa latência com controle de ganho e eco (validar hardware). Não confundir captura para pontuação com amplificação da voz.

## Limites da primeira fase

- Sem liberação de APK ou promessa de compatibilidade universal.
- O projeto-fonte foi deixado independente de framework para permitir dois caminhos Android.
- Engenharia nativa e testes acústicos precedem distribuição.
