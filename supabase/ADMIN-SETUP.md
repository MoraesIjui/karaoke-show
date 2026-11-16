# Catálogo compartilhado — Karaoke Show
Foi criada uma infraestrutura de teste isolada no projeto Supabase já conectado `anuncios-ml`: tabelas `ks_admins`, `ks_tracks` e bucket `ks-media`.
**A migração para um projeto dedicado é recomendada antes de distribuir publicamente.**
## Dar acesso ao administrador
1. Abra Supabase > projeto anuncios-ml > Authentication > Users.
2. Utilize uma conta criada por você ou crie um usuário que controlará o catálogo.
3. Em SQL Editor, execute a consulta abaixo, trocando o e-mail pelo da sua conta:
```sql
INSERT INTO public.ks_admins(user_id)
SELECT id FROM auth.users WHERE lower(email) = lower('SEU_EMAIL_ADMIN_AQUI')
ON CONFLICT DO NOTHING;
```
4. No site, abra **Catálogo online**, entre com e-mail/senha e publique arquivos autorizados.
O catálogo inicia vazio. Só você decide quais músicas publicar.
## Limitações
- Arquivos MP3, OGG, WAV, M4A e MP4 até 25 MB. LRC/JSON de notas são opcionais; sem mapa de notas não há pontuação competitiva.
- MIDI/KAR não estão implementados nesta versão e serão adicionados posteriormente.
- O microfone nunca envia áudio ao servidor.
- O bucket permite download público; não publicar dados privados nem músicas comerciais sem licenciamento apropriado.
- O APK da seção Actions é para testes e requer Android 6+, WebView compatível e eventualmente microfone USB.
- O projeto de anúncios compartilha cota de Storage. Antes de escalar, crie um Supabase específico para o Karaoke Show.
