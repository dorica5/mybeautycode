-- Allow professionals with an active client_professional_links row to read that client's
-- service_records and service_record_media (same access model as the API + signed URLs).
-- Policies are PERMISSIVE; other existing SELECT policies still apply.

CREATE POLICY "sr_select_linked_professional"
  ON public.service_records FOR SELECT
  TO authenticated
  USING (
    client_user_id IN (
      SELECT cpl.client_user_id
      FROM public.client_professional_links cpl
      INNER JOIN public.professional_profiles pp ON pp.id = cpl.professional_profile_id
      WHERE pp.profile_id = auth.uid() AND cpl.status = 'active'
    )
  );

CREATE POLICY "srm_select_via_linked_professional"
  ON public.service_record_media FOR SELECT
  TO authenticated
  USING (
    service_record_id IN (
      SELECT sr.id
      FROM public.service_records sr
      INNER JOIN public.client_professional_links cpl
        ON cpl.client_user_id = sr.client_user_id
        AND cpl.status = 'active'
      INNER JOIN public.professional_profiles pp ON pp.id = cpl.professional_profile_id
      WHERE pp.profile_id = auth.uid()
    )
  );
