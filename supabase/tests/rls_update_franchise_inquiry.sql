-- Brand staff may update pending franchise inquiries; decided rows blocked.
-- Run via: pnpm test:rls

DO $$
DECLARE
  v_brand_id uuid;
  v_inq_id uuid;
  v_row public.franchise_inquiries%ROWTYPE;
  v_err text;
BEGIN
  SELECT id INTO v_brand_id
  FROM public.brands
  WHERE deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE NOTICE 'RLS update franchise inquiry skipped (no brand)';
    RETURN;
  END IF;

  INSERT INTO public.franchise_inquiries (
    brand_id, full_name, email, phone_e164, city, status
  )
  VALUES (
    v_brand_id,
    'Website Applicant',
    'website-edit-test@example.com',
    '+919700002200',
    'Pune',
    'new'
  )
  RETURNING id INTO v_inq_id;

  v_row := public.update_franchise_inquiry(
    v_inq_id,
    'Priya Kakani',
    'priya-edit@example.com',
    '+919518966877',
    'Parli Vaijanath',
    'Smart Brain Abacus Parli',
    'Kakani Sadan',
    'Maharashtra',
    '431515',
    '5 years tutoring',
    'Spoke on call'
  );

  IF v_row.proposed_franchise_name IS DISTINCT FROM 'Smart Brain Abacus Parli' THEN
    RAISE EXCEPTION 'proposed name not saved';
  END IF;
  IF v_row.city IS DISTINCT FROM 'Parli Vaijanath' THEN
    RAISE EXCEPTION 'city not saved';
  END IF;

  UPDATE public.franchise_inquiries SET status = 'converted' WHERE id = v_inq_id;

  BEGIN
    PERFORM public.update_franchise_inquiry(
      v_inq_id,
      NULL, NULL, NULL, 'Hack City', NULL, NULL, NULL, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'converted inquiry must not be editable';
  EXCEPTION
    WHEN others THEN
      v_err := SQLERRM;
      IF v_err NOT ILIKE '%Only pending%' THEN
        RAISE EXCEPTION 'unexpected error editing converted inquiry: %', v_err;
      END IF;
  END;

  DELETE FROM public.franchise_inquiries WHERE id = v_inq_id;
  RAISE NOTICE 'RLS update franchise inquiry passed';
END;
$$;
