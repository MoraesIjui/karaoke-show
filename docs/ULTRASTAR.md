# Karaoke Show — suporte UltraStar (TXT + áudio) e demos Creative Commons

Implementado em novembro de 2026. **Objetivo:** importar legalmente faixas para testes reais de letras, notas de referência e pontuação por microfone no site e no APK.

## O que foi implementado

- Leitor `src/ultrastar.js` para arquivos UltraStar sem versão e subconjunto do formato v2:
  - `#TITLE`, `#ARTIST`, `#GENRE`, `#BPM`, `#GAP`, `#MP3` e `#AUDIO`.
  - Notas `:` e `*` convertidas em MIDI 60 + pitch, com temporização `gap/1000 + beat×60/(BPM×4)`.
  - Marcadores `-` para versos, `F`/`R`/`G` sem referência de afinação, sílabas e notas de ouro.
  - Letras e notas são armazenadas dentro da música importada e usadas pelo avaliador de voz existente.
- Importador de ZIP `src/ultrastar-import.js`: busca `song.txt` e áudio MP3/OGG/WAV/M4A na **mesma pasta dentro do ZIP**, lê `license.txt`, valida integridade CRC e evita duplicações.
- A tela **Importar música** exibe a seção **UltraStar**; uma vez importadas, as músicas aparecem em **Explorar músicas**.
- Músicas com atribuição têm seus créditos e licença acessíveis em **Preparar apresentação → Créditos e licença desta faixa**.
- O processo é local: não publica músicas no GitHub nem no Supabase.

## Duas demonstrações Creative Commons disponíveis

| Música | Artista | Licença indicada pelo repositório de origem |
| --- | --- | --- |
| **Monkey Shines** | Jonathan Coulton | Música e conversão UltraStar: **CC BY-NC 3.0** |
| **In My Hand** | Shearer | **CC BY-NC-SA 3.0** |

Fonte: [UltraStar-Deluxe/songs](https://github.com/UltraStar-Deluxe/songs) — [Monkey Shines](https://github.com/UltraStar-Deluxe/songs/tree/master/Creative%20Commons/Jonathan%20Coulton%20-%20Monkey%20Shines) e [In My Hand](https://github.com/UltraStar-Deluxe/songs/tree/master/Creative%20Commons/Shearer%20-%20In%20My%20Hand).

**Importante:** as gravações originais podem conter vozes (não necessariamente instrumentais). As licenças exigem atribuição e uso não comercial, e a segunda também exige compartilhar adaptações sob licença compatível. Não inclua essas faixas em um produto comercial sem verificar a autorização.

O APK e o repositório **não incluem áudio de terceiros**. Os pacotes são baixados diretamente do repositório original, mediante clique em **Instalar teste** ou **Instalar as 2 músicas de teste**. Em seguida, são armazenados no dispositivo usando IndexedDB. Para acesso posterior não é necessário baixar novamente, salvo limpeza dos dados ou reinstalação.

## Como testar

1. Abra o [Karaoke Show](https://moraesijui.github.io/karaoke-show/) ou o APK atualizado.
2. Selecione **Importar música**.
3. Localize **UltraStar — músicas com áudio e notas para pontuar**.
4. Use **Instalar as 2 músicas de teste** com internet, ou importe seu próprio ZIP UltraStar.
5. Vá em **Explorar músicas** e escolha a faixa. O botão **Começar com pontuação** aparecerá se houver cobertura adequada de notas e o microfone estiver conectado.
6. Confira letra sincronizada, pontuação e créditos dentro da página de preparação.

## Compatibilidade e limitações

- O formato `P2` e duetos estão **explicitamente bloqueados** nesta versão; evitar tocar letras com o cantor errado. O modo `#RELATIVE:yes` também não está implementado.
- Cada pacote ZIP pode ter até 100 MB; limite de 25 MB por faixa de áudio, 1 MB por TXT e 90 MB de áudio acumulado por importação.
- MP3/OGG precisam ser reproduzíveis pelo navegador ou Android WebView; nem todos os codecs são aceitos em todos os aparelhos.
- Os dados são armazenados localmente. Reinstalar o APK ou limpar os dados do navegador pode apagar as músicas. Mantenha uma cópia de segurança.
- O parser converte notas de voz e palavras para o sistema atual de pontuação. Notas de ouro não recebem um bônus especial nesta fase.
- Não há busca automática no USDB nem download de conteúdos restritos. Para outras músicas, obtenha arquivos com permissões adequadas e importe seus próprios pacotes.
- A compilação automatizada testa código, interface e dados de exemplo **sintéticos**. Ainda é necessário validar as gravações reais em hardware, incluindo precisão temporal, áudio, microfone e memória.

## Referências técnicas

- [Especificação UltraStar](https://github.com/UltraStar-Deluxe/format) — BPM, GAP, notas e texto.
- [Repositório de músicas abertas UltraStar](https://github.com/UltraStar-Deluxe/songs) — conteúdo e arquivos de licença por faixa.
- [Nightingale — formato UltraStar](https://nightingale.cafe/docs/usdx/) — visão geral do padrão e importação.
- [Performous Free Songs](https://performous.org/songs) — referência de pacotes e respectivos arquivos de licença.

A implementação não adicionou códigos sob GPL ao Karaoke Show; foi escrita para o projeto, com inspiração na especificação do formato e na organização do acervo público.
