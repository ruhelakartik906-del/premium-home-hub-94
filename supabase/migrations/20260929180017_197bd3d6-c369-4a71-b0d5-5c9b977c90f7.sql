CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_mobile_unique ON public.profiles ((right(regexp_replace(mobile, '\D', '', 'g'), 10)))
  WHERE mobile IS NOT NULL AND mobile <> '' AND id <> '0079b88e-233c-437d-8003-50a2cf8caa63'::uuid;