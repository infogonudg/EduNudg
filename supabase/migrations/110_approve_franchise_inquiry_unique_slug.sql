-- Fix approve_franchise_inquiry slug collisions against soft-deleted centers
-- and unique (brand_id, slug). Also avoid colliding domain_mappings hostnames.

CREATE OR REPLACE FUNCTION public.approve_franchise_inquiry(
  p_inquiry_id uuid,
  p_center_slug text DEFAULT NULL,
  p_center_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inq public.franchise_inquiries%ROWTYPE;
  v_brand public.brands%ROWTYPE;
  v_base text;
  v_slug text;
  v_name text;
  v_center_id uuid;
  v_suffix int := 2;
  v_hostname text;
BEGIN
  SELECT * INTO v_inq FROM public.franchise_inquiries WHERE id = p_inquiry_id FOR UPDATE;
  IF v_inq.id IS NULL THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF NOT (public.has_brand_access(v_inq.brand_id) OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_inq.status = 'converted' AND v_inq.converted_center_id IS NOT NULL THEN
    RETURN v_inq.converted_center_id;
  END IF;

  IF v_inq.status = 'lost' THEN
    RAISE EXCEPTION 'Cannot approve a rejected inquiry';
  END IF;

  SELECT * INTO v_brand FROM public.brands WHERE id = v_inq.brand_id AND deleted_at IS NULL;
  IF v_brand.id IS NULL THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  v_name := coalesce(
    nullif(trim(p_center_name), ''),
    nullif(trim(v_inq.proposed_franchise_name), ''),
    nullif(trim(v_inq.full_name), '') || ' Center',
    'Franchise Center'
  );

  v_base := coalesce(
    nullif(public.slugify_text(p_center_slug), ''),
    nullif(public.slugify_text(v_inq.proposed_franchise_name), ''),
    nullif(public.slugify_text(v_inq.city), ''),
    nullif(public.slugify_text(v_inq.full_name), ''),
    'center'
  );
  v_slug := v_base;

  -- Unique (brand_id, slug) includes soft-deleted rows — must not ignore deleted_at.
  WHILE EXISTS (
    SELECT 1
    FROM public.franchise_centers fc
    WHERE fc.brand_id = v_inq.brand_id
      AND fc.slug = v_slug
  ) OR EXISTS (
    SELECT 1
    FROM public.domain_mappings dm
    WHERE dm.hostname = v_slug || '.' || v_brand.slug || '.localhost'
  ) LOOP
    v_slug := v_base || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
    IF v_suffix > 1000 THEN
      RAISE EXCEPTION 'Could not allocate a unique franchise slug';
    END IF;
  END LOOP;

  v_hostname := v_slug || '.' || v_brand.slug || '.localhost';

  INSERT INTO public.franchise_centers (
    brand_id, slug, name, status, city, address_line1, region, country, pincode, display_name, contact_phone
  )
  VALUES (
    v_inq.brand_id,
    v_slug,
    v_name,
    'active',
    v_inq.city,
    v_inq.address_line,
    v_inq.state,
    'IN',
    v_inq.pincode,
    v_name,
    v_inq.phone_e164
  )
  RETURNING id INTO v_center_id;

  INSERT INTO public.domain_mappings (hostname, brand_id, center_id, portal_type, is_primary)
  VALUES (v_hostname, v_inq.brand_id, v_center_id, 'center', true);

  INSERT INTO public.memberships (user_id, scope_type, brand_id, center_id, role_key, status, accepted_at)
  SELECT u.id, 'center', v_inq.brand_id, v_center_id, 'center_owner', 'invited', NULL
  FROM auth.users u
  WHERE lower(u.email) = lower(v_inq.email)
  ON CONFLICT DO NOTHING;

  UPDATE public.franchise_inquiries
  SET
    status = 'converted',
    converted_center_id = v_center_id,
    updated_at = now()
  WHERE id = p_inquiry_id;

  RETURN v_center_id;
END;
$$;

COMMENT ON FUNCTION public.approve_franchise_inquiry(uuid, text, text) IS
  'SECURITY DEFINER: brand staff approve inquiry → franchise_centers. Slug uniqueness includes soft-deleted rows (110).';
