DROP POLICY IF EXISTS "settings read" ON public.platform_settings;
CREATE POLICY "settings admin read" ON public.platform_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;