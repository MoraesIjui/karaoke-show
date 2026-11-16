# Karaoke Show — Pesquisa técnica e decisões do produto

**Data de referência:** 15 de novembro de 2026. Esta pesquisa reúne requisitos para um karaokê doméstico, pontuação por voz e a futura instalação em Android TV/TV Box. As fontes oficiais citadas podem sofrer atualização.

## 1. Benchmark funcional

Produtos e categorias de referência (para estudar UX, sem copiar código, marca ou conteúdo):

- **SingStar (PlayStation)**: experiência de festa, avaliação visual de afinação, notas-alvo e progressão de pontuação. Inspiração: apresentação com jogo musical.
- **Let's Sing (consoles)**: repertório, turnos/duetos, sessões de festa, rankings e uso de dispositivos variados para microfone. Inspiração: fluxo fácil para grupos.
- **KaraFun**: experiência de catálogo, fila e letras em exibição legível. Inspiração: modo festa e organização de músicas.
- **UltraStar Deluxe / Vocaluxe / Performous (projetos open source)**: abordagem de notas de referência sincronizadas e comparativo de afinação. Inspiração: formato de notas e mecanismos de jogo; verificar licenças de cada projeto antes de aproveitar código.

Este benchmark é conceitual. As marcas não são parceiras e não há integração com seus catálogos nesta versão.

## 2. Stack web-first e por que não usar bibliotecas pesadas

Escolha: **JavaScript ES Modules + CSS + Web Audio API + IndexedDB + PWA**. O objetivo é reutilizar a mesma engine de interface, músicas e pontuação num futuro Android WebView ou integrá-la a uma camada nativa.

Vantagens: nenhuma dependência npm em tempo de execução, menos consumo de memória, build estático simples e suporte offline. Desvantagens: módulos ES e Web Audio requerem navegador/WebView suficientemente modernos; aparelhos Android 4.x e alguns 5.x podem não atender.

**Android TV — navegação e legibilidade:**

- https://developer.android.com/training/tv/get-started/navigation
- https://developer.android.com/docs/quality-guidelines/tv-app-quality
- https://developer.android.com/develop/adaptive-apps/guides/tv/build-adaptive-apps-for-tv

Exigências fundamentais: foco visível, setas do D-pad, Select, Back, texto visível a distância e layout paisagem 16:9. Código atual implementa navegação espacial de teclado; deve ser validado em controles físicos.

**Capacitor 8 — empacotamento Android:**

- https://capacitorjs.com/docs/android

Documentação oficial consultada: **Android API 24+ (Android 7+)** e **Android WebView Chrome 60+**. Isso exclui alguns aparelhos que queremos reaproveitar. A fase Android avaliará tanto Capacitor para Android 7+ quanto um wrapper nativo simplificado voltado a Android 5/6, condicionado ao WebView e ao hardware real. Não prometer suporte só pelo número da versão do Android.

**Requisitos para launcher de TV:**

- https://developer.android.com/training/tv/get-started/create

Manifest exigirá categoria `android.intent.category.LEANBACK_LAUNCHER`, banner TV apropriado, `android.hardware.touchscreen` não obrigatório e configuração do app em modo paisagem.

## 3. Captura de microfone e pontuação

**Captura de áudio:**

- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

`getUserMedia` pede autorização explícita e exige contexto seguro (HTTPS ou localhost). Em TV Box, ter entrada USB não significa que toda WebView exponha a entrada corretamente.

**WebView nativa Android:**

- https://developer.android.com/reference/android/webkit/WebChromeClient
- https://developer.android.com/reference/android/webkit/PermissionRequest
- https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/wrap-webview-in-compose?hl=pt-BR

O APK terá de declarar `RECORD_AUDIO`, pedir permissão runtime e autorizar apenas `RESOURCE_AUDIO_CAPTURE` no WebChromeClient. Nunca dar `grant(request.getResources())` indiscriminadamente; autorizar estritamente os recursos necessários e origem confiável.

**Algoritmo atual:** método YIN (função de diferença cumulativa normalizada) adaptado para navegador e custo computacional contido. Microfone monofônico, janela 4096 samples, redução por subamostragem, frequência típica de 80–880 Hz, sensibilidade ajustável.

**Limitações acústicas relevantes:**

1. O som do acompanhamento saindo pela TV pode voltar ao microfone e confundir a detecção.
2. A entrada de microfone e a saída HDMI podem ter latências diferentes; TVs via Bluetooth costumam acrescentar atraso.
3. Coros, instrumentos, reverberação e múltiplos cantores simultâneos confundem análise monofônica.
4. A voz é analisada, **não enviada aos alto-falantes**. Para amplificar o cantor, um mixer independente ou módulo nativo de monitoramento de baixa latência será investigado.
5. Resultados da versão inicial são preliminares, não certificados nem equiparáveis a pontuação de jogos comerciais sem testes.

## 4. Licenciamento musical e YouTube

**Política oficial do YouTube:**

- https://developers.google.com/youtube/terms/developer-policies

Proíbe, sem aprovação, baixar/cópias offline de áudio/vídeo do YouTube, isolar faixas e tratar player embutido como fonte de áudio alterável. A extração do YouTube não é uma base sustentável para o produto.

**ECAD (Brasil):**

- https://www4.ecad.org.br/faq/

Execução pública de músicas em estabelecimentos/eventos pode envolver licenciamento e arrecadação de direitos de execução. **Separadamente**, reproduzir e disponibilizar gravações, instrumentais, letras e vídeos exige direitos ou contratos correspondentes. Uma assinatura doméstica de streaming ou um vídeo acessível publicamente não equivale automaticamente a licença comercial de karaokê.

**Estratégia segura de produto:**

1. Fase inicial: quatro músicas e melodias demonstrativas **originais**, geradas pela aplicação em áudio instrumental sintetizado.
2. Importação pessoal: arquivos fornecidos pelo próprio usuário com declaração de responsabilidade de uso; o programa não verifica licenças.
3. Crescimento comercial: contratar licenças de fonogramas instrumentais, obras, letras sincronizadas e eventuais direitos de exibição; avaliar catálogos B2B antes de anunciar grande repertório.
4. Não armazenar nem redistribuir material comercial não licenciado no repositório GitHub.

## 5. Requisitos práticos para resgatar TV Boxes

Para cada dispositivo, coletar: Android API level, versão WebView/Chrome, RAM disponível, CPU/ABI, codec de áudio, USB host, suporte a microfone USB, Bluetooth, saída HDMI/P2, controle remoto, renderização em 720p/1080p e persistência de IndexedDB.

Matriz por orientação (não é garantia de compatibilidade):

| Aparelho | Caminho sugerido | Risco |
| --- | --- | --- |
| Android TV/Google TV 9+ | PWA para teste, depois APK com launcher TV | Relativamente baixo; áudio depende do dispositivo |
| Android 7–8 TV Box | APK via Capacitor com WebView compatível | Médio; WebView/codec/permissões |
| Android 5–6 TV Box | Avaliar wrapper nativo e WebView atualizável | Alto; várias APIs podem faltar |
| Android 4.4 ou anterior | Teste exploratório/cliente nativo específico | Muito alto; stack Web Audio moderna pode falhar |
| Mini PC Linux | Navegador com HTTPS/localhost | Baixo para demo; drivers de áudio importam |

## 6. Critérios de aceite antes do primeiro APK público

- Navegação integral usando apenas controle remoto D-pad, sem mouse.
- Acionar música, pedir microfone, pausar e concluir sem travamento.
- Microfone USB reconhecido após reiniciar e reconectar.
- Teste acústico de frequências conhecidas (110, 220, 440 Hz) e voz real em ruído.
- Mede latência total por equipamento; compensação manual funcional.
- Teste de 30–60 minutos de uso contínuo sem congelar e sem vazamento de memória.
- App visível na launcher Android TV, orientação horizontal e sem cortes de overscan.
- IndexedDB persistente após reiniciar e offline real.
- APK assinado, nome/ícone exclusivos, política de privacidade e auditoria de permissões.

## 7. Priorização

**P0 (entregue nesta base):** show original offline, pontuação inicial, ranking, fila, microfone, importações, PWA.

**P1 (próxima entrega):** APK Android TV + bancada real de teste com 2–3 TV Boxes de versões diferentes + calibração A/V.

**P2:** catálogo licenciado, notas por sílaba, experiência de dueto, perfis, reprodução multimídia e melhor engine de análise.

**P3:** suporte remoto por celular, multiplayer, torneios, painel de administração e modelos de receita.
