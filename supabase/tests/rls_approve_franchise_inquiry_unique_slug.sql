-- regression: approve_franchise_inquiry must not collide with soft-deleted center slugs
-- Run via: pnpm test:rls

DO $$
DECLARE
  v_brand_id uuid;
  v_inq_id uuid;
  v_center_id uuid;
  v_slug text;
  v_deleted_id uuid;
BEGIN
  SELECT id INTO v_brand_id
  FROM public.brands
  WHERE deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE NOTICE 'RLS approve franchise unique slug skipped (no brand)';
    RETURN;
  END IF;

  -- Soft-deleted center occupying slug "pune"
  INSERT INTO public.franchise_centers (
    brand_id, slug, name, status, city, country, deleted_at
  )
  VALUES (
    v_brand_id, 'pune', 'Old Pune Center', 'inactive', 'Pune', 'IN', now()
  )
  RETURNING id INTO v_deleted_id;

  INSERT INTO public.franchise_inquiries (
    brand_id, full_name, email, phone_e164, city, proposed_franchise_name, status
  )
  VALUES (
    v_brand_id,
    'Nilesh Test',
    'nilesh-approve-slug-test@example.com',
    '+919700001100',
    'pune',
    NULL,
    'new'
  )
  RETURNING id INTO v_inq_id;

  v_center_id := public.approve_franchise_inquiry(v_inq_id, NULL, NULL);

  SELECT slug INTO v_slug
  FROM public.franchise_centers
  WHERE id = v_center_id;

  IF v_slug IS DISTINCT FROM 'pune-2' THEN
    RAISE EXCEPTION 'Expected slug pune-2 after soft-deleted pune collision, got %', v_slug;
  END IF;

  -- Cleanup
  DELETE FROM public.domain_mappings WHERE center_id = v_center_id;
  DELETE FROM public.memberships WHERE center_id = v_center_id;
  DELETE FROM public.franchise_inquiries WHERE id = v_inq_id;
  DELETE FROM public.franchise_centers WHERE id IN (v_center_id, v_deleted_id);

  RAISE NOTICE 'RLS approve franchise unique slug passed (slug=%)', v_slug;
END;
$$;
