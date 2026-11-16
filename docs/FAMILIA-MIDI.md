# Karaoke Show — Biblioteca familiar privada e MIDI/KAR

## Versão familiar
- Site: https://moraesijui.github.io/karaoke-show/
- APK: baixar o artefato `karaoke-show-tvbox-debug` na última execução bem-sucedida de **Gerar APK de teste (Android e TV Box)**, no GitHub Actions.
- Projeto próprio para uso familiar; não é um serviço de streaming nem contém catálogo de músicas comerciais.
- As quatro músicas demonstrativas originais continuam acessíveis sem login.
- A biblioteca compartilhada `ks-media` é **privada** no Supabase, com políticas RLS.
- É necessário fazer login em **Biblioteca da família** em **cada** aparelho. O APK precisa de internet para acessar os arquivos compartilhados. Os arquivos locais permanecem apenas naquele aparelho.
- A conta inicial autorizada é o administrador já cadastrado no Supabase Auth. Não divulgue a senha; para membros adicionais, crie contas Auth individuais e autorize o `user_id` na tabela `ks_family` por um administrador do banco. O administrador atual está incluído automaticamente.
- Um membro autorizado pode ouvir as músicas, mas somente a conta administrativa pode publicar novos arquivos.
- URLs de mídia são temporárias (2 horas) e não são embutidas no código. Caso expirem durante uma sessão longa, clique em **Atualizar catálogo** para renová-las.
- A página web no GitHub Pages continua pública; apenas o *catálogo e seus arquivos* são privados. A tela do aplicativo não solicita login para músicas demonstrativas originais.

## MIDI e KAR
1. Em **Importar música**, escolha um arquivo `.mid`, `.midi` ou `.kar` (até 25 MB). Arquivos locais ficam no armazenamento do navegador.
2. Informe título e artista; letra `.lrc` é opcional para MIDI/KAR. Se o arquivo contiver eventos MIDI de letra, serão lidos automaticamente.
3. Para disponibilizar em todos os aparelhos, entre em **Biblioteca da família** como administrador e envie o arquivo em **Salvar na biblioteca privada**.
4. Para MP3 e outros formatos convencionais, a letra LRC continua necessária no modo de importação local e opcional no catálogo compartilhado.

### Limitações atuais
- O som MIDI utiliza síntese simples Web Audio, **não** um SoundFont profissional; timbres podem ser diferentes do instrumento original.
- Arquivos que não contêm letras permanecerão instrumentais, salvo quando acompanhados de um LRC.
- A pontuação exige referência da melodia vocal: adicione um **mapa de notas JSON** junto da letra; não é confiável deduzir automaticamente a voz a partir de todas as trilhas de MIDI.
- Aceita Standard MIDI File tipo 0/1, tempo em PPQ. Alguns arquivos RMID, formato 2, arquivos corrompidos ou recursos proprietários não são compatíveis.
- O uso familiar não autoriza redistribuir obras protegidas na internet; compartilhe apenas músicas sobre as quais você possua as permissões adequadas.

## Testes mínimos
- Com navegador anônimo, a biblioteca não deve revelar músicas nem permitir downloads.
- Faça login como administrador: a biblioteca aparece e o upload fica disponível.
- Importe um MIDI ou KAR autorizado e teste reprodução, pausa, controle de volume, letra, fila e encerramento.
- Confirme que a faixa enviada aparece em outro navegador ou no APK após login com uma conta autorizada.
- Se a TV Box não tocar MIDI, teste a versão do Android System WebView, saída de áudio e limite de RAM.
- Teste MP3 e as faixas originais para identificar regressões.

## Segurança
- O projeto compartilha a **instância Supabase** com outro aplicativo, mas possui tabelas `ks_*` e bucket `ks-media` separados.
- A chave publicada no navegador é uma chave **publishable**, não uma `service_role`.
- O envio usa RLS com uma lista fechada de administradores; não é possível se tornar administrador alterando o próprio perfil.
