CREATE POLICY "stc_planos_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'stc-planos');