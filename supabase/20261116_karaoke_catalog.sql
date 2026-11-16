-- Catálogo isolado do Karaoke Show. Executado inicialmente no Supabase anuncios-ml.
CREATE TABLE IF NOT EXISTS public.ks_admins (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
ALTER TABLE public.ks_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ks_admins TO authenticated;
CREATE POLICY ks_admin_self_read ON public.ks_admins FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE TABLE IF NOT EXISTS public.ks_tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title varchar(100) NOT NULL, artist varchar(100) NOT NULL,
 genre varchar(60) NOT NULL DEFAULT 'Outros',
 duration double precision NOT NULL CHECK (duration > 0 AND duration <= 1800),
 storage_path text NOT NULL UNIQUE CHECK (storage_path ~ '^[a-f0-9-]+\.(mp3|ogg|wav|m4a|mp4)$'),
 lyrics_lrc text NOT NULL DEFAULT '' CHECK (octet_length(lyrics_lrc) <= 256000),
 notes_map jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(notes_map) = 'array'),
 status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','unlisted')),
 publisher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ks_tracks ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ks_tracks TO anon, authenticated;
GRANT INSERT, DELETE ON public.ks_tracks TO authenticated;
CREATE POLICY ks_published_read ON public.ks_tracks FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY ks_admin_read ON public.ks_tracks FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.ks_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY ks_admin_insert ON public.ks_tracks FOR INSERT TO authenticated
 WITH CHECK (publisher_id = (SELECT auth.uid()) AND EXISTS
 (SELECT 1 FROM public.ks_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY ks_admin_delete ON public.ks_tracks FOR DELETE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.ks_admins a WHERE a.user_id = (SELECT auth.uid())));
INSERT INTO storage.buckets (id,name,public,file_size_limit)
VALUES ('ks-media','ks-media',true,26214400)
ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit;
CREATE POLICY ks_storage_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='ks-media' AND storage.extension(name) IN ('mp3','ogg','wav','m4a','mp4')
 AND EXISTS (SELECT 1 FROM public.ks_admins a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY ks_storage_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='ks-media' AND EXISTS (SELECT 1 FROM public.ks_admins a WHERE a.user_id=(SELECT auth.uid())));
