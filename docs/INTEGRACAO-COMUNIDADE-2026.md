# Integração de recursos da comunidade — Karaoke Show

**Versão:** novembro de 2026 · projeto de uso familiar  
**Principais fontes estudadas:** [midi-audio-player](https://github.com/WebAudioFonts/midi-audio-player), [karaoke-player](https://github.com/fraigo/karaoke-player), [KaraokeNatin](https://github.com/nojukuramu/KaraokeNatin), [vkara](https://github.com/lehuygiang28/vkara), [UltraStar Deluxe](https://github.com/UltraStar-Deluxe/USDX).

## Implementado

### 1. Som MIDI mais elaborado sem perder o modo offline

Arquivos: `src/midi-audio.js`, `src/gm-timbres.js`, `src/storage.js`, `src/app.js`.

- **Econômico:** sintetizador simples de oscilador único, indicado para TV Boxes antigas com 1 GB de RAM.
- **Equilibrado:** timbres por família GM, harmônicos moderados e ambiência opcional.
- **Rico:** mais harmônicos (custo maior de CPU/RAM).
- Chave para ativar/desativar percussão MIDI; controle de reverberação leve.
- Controle em **Configurações → Som e acompanhamento → Qualidade dos instrumentos MIDI**.

**Limite técnico:** não foi integrado um SoundFont real nesta etapa. O `midi-audio-player` da comunidade usa bibliotecas e presets amostrados; amostras maiores demandam memória e licenças próprias. Antes de integrar um banco SoundFont, medir uso em TV Box real e verificar a licença dos samples. A melhoria entregue nesta versão é **síntese GM mais expressiva, totalmente offline**, não reprodução instrumental profissional.

### 2. Letras KAR com timestamps

Arquivos: `src/kar-lyrics.js`, `src/midi.js`.

- Interpreta eventos MIDI de texto/letra, separadores `\\`/`/` e CR/LF.
- Reconstrói palavras a partir de fragmentos ou sílabas e conserva o tempo dos eventos.
- Mantém LRC como alternativa para música sem letra embutida.
- Os dados são tratados como texto; não são inseridos como HTML não confiável.

**Limite:** alguns editores KAR guardam informações em convenções proprietárias; a sincronização precisa ser conferida com o ZIP real e com diferentes modelos de arquivo.

### 3. Controle da fila pelo celular (Android TV)

Arquivos: `android/app/src/main/java/br/com/karaokeshow/app/FamilyRemoteServer.java`, `MainActivity.java`, `android/app/src/main/assets/family-remote.html`, `src/app.js`.

A implementação foi inspirada no fluxo da comunidade (TV como apresentador; celular como controle), mas usa um **pequeno servidor HTTP local** no próprio Android, sem Supabase, sem servidor em nuvem e sem copiar código dos projetos.

1. Instale o APK e conecte TV Box e celular à **mesma rede Wi-Fi/LAN**.
2. Abra **Controle pelo celular** no menu do Karaoke Show na TV.
3. A TV mostra o QR code e um link local `http://IP:PORTA/?key=...`.
4. Abra pelo navegador do celular.
5. Pesquise as faixas **já disponíveis na TV**, informe o nome e selecione **Entrar na fila**.
6. A TV recebe o comando e adiciona a apresentação à fila; a reprodução continua sob controle da TV.

**Privacidade e segurança:**
- Somente IDs, títulos e artistas (até 350 músicas por catálogo) são transmitidos à página da LAN. Áudio, letras, JWTs e senhas **não** são publicados pelo servidor.
- Link de pareamento contém um token criptograficamente aleatório de sessão. Reiniciar o APK gera outro.
- O servidor valida o token e o ID da música; limita tamanho de requisições e conexões.
- A ponte JavaScript é usada somente na WebView do APK; a navegação externa abre o navegador do aparelho para não expor a ponte a páginas externas.
- A conexão na LAN usa **HTTP sem criptografia TLS**; use somente redes familiares confiáveis. Pessoas com o link temporário podem adicionar músicas à fila.
- O servidor fica disponível enquanto o APK estiver aberto; não é recurso do site público GitHub Pages.
- Dependendo das configurações da rede (isolamento AP, VPN, Wi-Fi de convidados, firewall), o celular pode não alcançar a TV.
- O QR code usa [QRCode.js](https://github.com/davidshimjs/qrcodejs) (MIT) com a licença em `src/vendor/QRCODE-LICENSE.txt`.

## O que não foi implementado

- Motor completo com amostras SoundFont externas (primeiro medir RAM, CPU, licenças, tamanho e cache).
- Reconhecimento e conversão dos arquivos proprietários `.mk1` do Microke.
- Download automático de músicas do YouTube ou distribuição de áudios comerciais no GitHub/APK.
- Pontuação automática da voz baseada apenas nas trilhas instrumentais do arquivo MIDI.
- Configuração ou testes físicos concluídos da TV Box específica; a compilação automatizada não comprova áudio, Wi-Fi ou microfone em hardware real.

## Verificação recomendada

1. Compare o som da mesma faixa KAR nos modos econômico/equilibrado/rico e confira se a TV Box não trava.
2. Reproduza ao menos dez KAR do seu ZIP (inclusive com eventos de letra separados em sílabas).
3. Importe o ZIP de 69 KAR **localmente** e verifique que não há upload para a biblioteca Supabase.
4. Instale o APK atualizado na TV Box, abra **Controle pelo celular**, acesse o QR com o smartphone e adicione uma música.
5. Confirme que a TV mostra a nova entrada na fila e mantém a sessão de canto local.
6. Teste o controle remoto físico, o microfone e o ranking. Interrompa a sessão se houver latência excessiva, consumo alto de memória ou queda do áudio.

**Importante:** ferramentas de análise e testes automatizados verificam sintaxe, casos unitários e build; somente o teste no dispositivo físico poderá confirmar a qualidade sonora, a sincronização percebida e a conexão LAN.

## Validação complementar com o ZIP do usuário (17/11/2026)

O APK compilado foi aberto localmente e os arquivos JavaScript **incluídos no próprio APK** (`midi.js` e `kar-lyrics.js`) foram executados diretamente contra os 69 KAR do ZIP fornecido pelo usuário, sem publicar ou enviar músicas ao GitHub:

- **69 KAR analisados, 69 válidos, 0 erros** de parser;
- **69 arquivos com eventos de letra reconstruídos**;
- Total de **2.950 linhas** de letra identificadas;
- Total de **393.284 eventos de notas** nas 69 faixas.

Isso confirma compatibilidade técnica da leitura MIDI/legendas no código distribuído. **Não comprova fidelidade acústica, legibilidade perfeita, sincronização perceptiva nem desempenho em hardware real**, que precisam do teste na TV Box.
