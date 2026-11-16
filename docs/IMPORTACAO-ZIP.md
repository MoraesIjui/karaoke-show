# Importação de ZIP em lote — Karaoke Show

Esta função foi adicionada ao site e ao APK (versão familiar, novembro de 2026).

## Como usar
1. Abra o Karaoke Show e vá a **Importar música**.
2. Procure **Importar um ZIP de músicas em lote**.
3. Escolha um arquivo `.zip` de até **100 MB**.
4. Clique em **Importar músicas do ZIP**.
5. Acompanhe o progresso e abra o **Relatório da importação em lote**, que separa: importados, duplicados, MK1, ALB, outros arquivos e falhas.
6. As novas músicas ficam em **Explorar músicas**. Podem ser reproduzidas e incluídas na fila.

## Formatos
- Aceitos dentro do ZIP: `.kar`, `.mid`, `.midi` com conteúdo MIDI válido, até 25 MB por música.
- `.mk1`: identificado como formato Microke não suportado; não há conversão automática.
- `.alb`: índice Microke; ignorado como música.
- Outros arquivos: ignorados e listados no relatório.

## Como funciona
- A descompactação usa recursos nativos do navegador/Android WebView. O ZIP é **lido localmente**, nunca enviado ao Supabase, GitHub ou outros servidores.
- A importação verifica o diretório do arquivo, limites de tamanho e CRC32 dos conteúdos. Arquivos corrompidos são ignorados individualmente.
- Artista e título são inferidos a partir de nomes como `Artista_-_Nome_da_Musica.kar`. Revise títulos cuja origem tiver nomes diferentes.
- Evita importar novamente músicas de mesmo artista/título ou com a mesma assinatura CRC32 e tamanho.
- Os arquivos importados são gravados no armazenamento IndexedDB **somente do dispositivo atual**. Não sincronizam com outros aparelhos.
- Não use o modo de publicação na **Biblioteca da família** para copiar automaticamente esses arquivos.

## Limitações e cuidados
- Alguns arquivos KAR possuem eventos de letras sem segmentação adequada. O aplicativo pode tocar o MIDI mesmo que a letra apareça incompleta.
- A qualidade do timbre MIDI é uma síntese básica Web Audio; não equivale a um sintetizador profissional com SoundFont.
- Ao limpar o armazenamento do site ou os dados do APK, os arquivos locais poderão ser perdidos.
- APK de teste/debug pode precisar ser desinstalado antes de instalar uma nova versão, apagando esses dados. Guarde o ZIP original como cópia de segurança.
- O suporte a ZIP requer os recursos `DecompressionStream` do navegador/WebView. Androids muito antigos podem precisar de atualização do System WebView ou de arquivos KAR extraídos.
- Arquivos de terceiros continuam sujeitos a direitos autorais. O aplicativo não inclui nem distribui músicas comerciais.

## Testes
A suíte automatizada cobre ZIP sem compactação, ZIP Deflate, CRC32 inválido, limites de tamanho, MK1/ALB, duplicatas e importação local.

Em 16/11/2026, o arquivo fornecido `244 Musicas variadas` foi examinado com o mesmo código do APK e produziu: **69 KAR importados, 54 MK1 separados, 1 ALB separado, 0 falhas e 0 duplicatas no primeiro processamento**. Isso é uma validação técnica de importação; a reprodução física na TV Box ainda precisa ser testada.
