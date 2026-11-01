-- Staff (center or brand) provision student learn-portal Auth login via Edge Function.
-- Links students.user_id + login_email after Auth create/update.

CREATE OR REPLACE FUNCTION public.sync_student_portal_credentials(
  p_student_id uuid,
  p_center_id uuid,
  p_brand_id uuid,
  p_user_id uuid,
  p_login_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_enrollment uuid;
BEGIN
  v_email := nullif(trim(lower(coalesce(p_login_email, ''))), '');
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'login_email is required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  SELECT e.id INTO v_enrollment
  FROM public.student_enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE e.student_id = p_student_id
    AND e.center_id = p_center_id
    AND e.brand_id = p_brand_id
    AND e.status = 'active'
    AND s.brand_id = p_brand_id
    AND s.deleted_at IS NULL
  ORDER BY e.enrolled_at DESC
  LIMIT 1;

  IF v_enrollment IS NULL THEN
    RAISE EXCEPTION 'Student not enrolled at this center';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.brand_id = p_brand_id
      AND s.user_id = p_user_id
      AND s.id <> p_student_id
      AND s.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Auth user already linked to another student';
  END IF;

  UPDATE public.students
  SET
    login_email = v_email,
    user_id = p_user_id,
    updated_at = now()
  WHERE id = p_student_id
    AND brand_id = p_brand_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_student_portal_credentials(uuid, uuid, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_student_portal_credentials(uuid, uuid, uuid, uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.sync_student_portal_credentials(uuid, uuid, uuid, uuid, text) IS
  'Links Auth user + login_email on a student after staff provision via student-portal-credentials.';
