CREATE POLICY "Staff view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_users'));
CREATE POLICY "Staff view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_users'));
CREATE POLICY "Staff view transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_transactions') OR public.has_permission(auth.uid(), 'manage_payments'));
CREATE POLICY "Staff view properties" ON public.properties FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_properties'));
CREATE POLICY "Staff view kyc" ON public.kyc_submissions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_documents'));
CREATE POLICY "Staff view kyc docs" ON public.kyc_documents FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_documents'));
CREATE POLICY "Staff view interests" ON public.interests FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_users'));
CREATE POLICY "Staff view tickets" ON public.support_tickets FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'view_users'));

CREATE OR REPLACE FUNCTION public.admin_list_members()
 RETURNS TABLE(id uuid, payment_status text, last_sign_in_at timestamp with time zone, lifecycle text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'view_users') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, lp.status, u.last_sign_in_at,
    public.account_state(p.status, p.verification_status, p.verification_due_at, lp.status)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN LATERAL (SELECT t.status FROM public.transactions t WHERE t.user_id=p.id AND t.purpose='activation' ORDER BY t.created_at DESC LIMIT 1) lp ON true;
END $function$;