DROP POLICY IF EXISTS "pay settings read" ON public.payment_settings;
CREATE POLICY "pay settings read enabled" ON public.payment_settings FOR SELECT TO anon, authenticated USING (enabled = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories active read" ON public.categories FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "media read all" ON storage.objects;
CREATE POLICY "media read scoped" ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'property-media' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.status = 'approved'
        AND (p.cover_url LIKE '%' || objects.name
             OR EXISTS (SELECT 1 FROM unnest(p.gallery) g WHERE g LIKE '%' || objects.name))
    )
  )
);