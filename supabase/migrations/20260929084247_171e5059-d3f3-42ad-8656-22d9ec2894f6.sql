CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid REFERENCES public.kyc_submissions(id) ON DELETE SET NULL,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX kyc_documents_user_idx ON public.kyc_documents(user_id, submission_id);

CREATE OR REPLACE FUNCTION public.kyc_is_open(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=_uid AND verification_status IN ('not_submitted','rejected','changes_required'))
$$;
REVOKE EXECUTE ON FUNCTION public.kyc_is_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kyc_is_open(uuid) TO authenticated;

CREATE POLICY "kyc docs read" ON public.kyc_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kyc docs insert draft" ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND submission_id IS NULL AND public.kyc_is_open(auth.uid())
    AND split_part(file_path,'/',1) = auth.uid()::text);
CREATE POLICY "kyc docs delete draft" ON public.kyc_documents FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND submission_id IS NULL);

-- Validate type / size / path
CREATE OR REPLACE FUNCTION public.kyc_documents_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.doc_type NOT IN ('pan_card','identity','address_proof','photo','gst_certificate','other') THEN RAISE EXCEPTION 'Invalid document type'; END IF;
  IF NEW.mime_type NOT IN ('image/jpeg','image/png','image/webp','application/pdf') THEN RAISE EXCEPTION 'Only JPG, PNG, WEBP or PDF files are allowed'; END IF;
  IF NEW.size_bytes <= 0 OR NEW.size_bytes > 10485760 THEN RAISE EXCEPTION 'File must be under 10 MB'; END IF;
  IF NEW.file_path ~ '^https?://' THEN RAISE EXCEPTION 'Store the storage path, not a URL'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kyc_documents_validate BEFORE INSERT ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.kyc_documents_validate();

-- On submission: attach draft documents; carry forward unchanged ones from the previous submission; require the core set
CREATE OR REPLACE FUNCTION public.kyc_attach_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev uuid; missing text;
BEGIN
  -- keep only the newest draft per type
  DELETE FROM public.kyc_documents d WHERE d.user_id = NEW.user_id AND d.submission_id IS NULL
    AND EXISTS (SELECT 1 FROM public.kyc_documents n WHERE n.user_id=d.user_id AND n.submission_id IS NULL AND n.doc_type=d.doc_type AND n.created_at > d.created_at);
  UPDATE public.kyc_documents SET submission_id = NEW.id WHERE user_id = NEW.user_id AND submission_id IS NULL;
  SELECT id INTO prev FROM public.kyc_submissions WHERE user_id = NEW.user_id AND id <> NEW.id ORDER BY created_at DESC LIMIT 1;
  IF prev IS NOT NULL THEN
    INSERT INTO public.kyc_documents(user_id, submission_id, doc_type, file_path, file_name, mime_type, size_bytes)
    SELECT user_id, NEW.id, doc_type, file_path, file_name, mime_type, size_bytes FROM public.kyc_documents p
    WHERE p.submission_id = prev AND NOT EXISTS (SELECT 1 FROM public.kyc_documents c WHERE c.submission_id = NEW.id AND c.doc_type = p.doc_type);
  END IF;
  SELECT string_agg(t, ', ') INTO missing FROM unnest(ARRAY['pan_card','identity','address_proof','photo']) t
    WHERE NOT EXISTS (SELECT 1 FROM public.kyc_documents WHERE submission_id = NEW.id AND doc_type = t);
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Missing required documents: %', missing; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER kyc_attach_documents AFTER INSERT ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.kyc_attach_documents();
REVOKE EXECUTE ON FUNCTION public.kyc_attach_documents(), public.kyc_documents_validate() FROM PUBLIC, anon, authenticated;

-- Storage: owner folder only; admins read; files attached to a submission cannot be deleted
CREATE POLICY "kyc owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text AND public.kyc_is_open(auth.uid()));
CREATE POLICY "kyc owner or admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "kyc owner delete draft" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (SELECT 1 FROM public.kyc_documents d WHERE d.file_path = objects.name AND d.submission_id IS NOT NULL));