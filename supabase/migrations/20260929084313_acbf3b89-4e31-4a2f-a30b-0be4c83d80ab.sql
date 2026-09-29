CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.kyc_is_open(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=_uid AND verification_status IN ('not_submitted','rejected','changes_required'))
$$;
CREATE OR REPLACE FUNCTION private.is_account_active(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR EXISTS (SELECT 1 FROM public.profiles WHERE id=_uid AND status='active')
$$;
REVOKE EXECUTE ON FUNCTION private.kyc_is_open(uuid), private.is_account_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.kyc_is_open(uuid), private.is_account_active(uuid) TO authenticated;

DROP POLICY "kyc docs insert draft" ON public.kyc_documents;
CREATE POLICY "kyc docs insert draft" ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND submission_id IS NULL AND private.kyc_is_open(auth.uid())
    AND split_part(file_path,'/',1) = auth.uid()::text);
DROP POLICY "kyc owner upload" ON storage.objects;
CREATE POLICY "kyc owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text AND private.kyc_is_open(auth.uid()));
DROP POLICY "active accounts only" ON public.interests;
CREATE POLICY "active accounts only" ON public.interests AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (private.is_account_active(auth.uid()));
DROP POLICY "active accounts only" ON public.properties;
CREATE POLICY "active accounts only" ON public.properties AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (private.is_account_active(auth.uid()));

DROP FUNCTION public.kyc_is_open(uuid);
DROP FUNCTION public.is_account_active(uuid);