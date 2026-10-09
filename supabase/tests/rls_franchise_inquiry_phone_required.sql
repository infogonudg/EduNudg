-- regression: franchise apply / staff create reject empty phone
-- Run via: pnpm test:rls

DO $$
DECLARE
  v_brand_id uuid;
  v_brand_slug text;
  v_err text;
BEGIN
  SELECT id, slug INTO v_brand_id, v_brand_slug
  FROM public.brands
  WHERE deleted_at IS NULL AND status = 'active'
  ORDER BY created_at
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE NOTICE 'RLS franchise phone required skipped (no brand)';
    RETURN;
  END IF;

  BEGIN
    PERFORM public.submit_franchise_inquiry_v2(
      v_brand_slug,
      'No Phone Applicant',
      'nophone@example.com',
      NULL,
      'Pune'
    );
    RAISE EXCEPTION 'submit_franchise_inquiry_v2 must reject null phone';
  EXCEPTION
    WHEN others THEN
      v_err := SQLERRM;
      IF v_err NOT ILIKE '%phone is required%' AND v_err NOT ILIKE '%feature_disabled%' THEN
        RAISE EXCEPTION 'unexpected submit empty phone error: %', v_err;
      END IF;
  END;

  BEGIN
    PERFORM public.create_franchise_inquiry_staff(
      v_brand_id,
      'Staff No Phone',
      'staff-nophone@example.com',
      NULL,
      'Pune'
    );
    RAISE EXCEPTION 'create_franchise_inquiry_staff must reject null phone';
  EXCEPTION
    WHEN others THEN
      v_err := SQLERRM;
      IF v_err NOT ILIKE '%phone is required%' AND v_err NOT ILIKE '%Not authorized%' THEN
        RAISE EXCEPTION 'unexpected staff empty phone error: %', v_err;
      END IF;
  END;

  RAISE NOTICE 'RLS franchise inquiry phone required passed';
END;
$$;
