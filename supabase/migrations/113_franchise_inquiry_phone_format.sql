-- Reject non-India / invalid mobiles on franchise apply (e.g. 1234abc → +1234 after digit strip).

CREATE OR REPLACE FUNCTION public.is_valid_india_mobile(p_raw text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits text;
BEGIN
  IF p_raw IS NULL OR trim(p_raw) = '' THEN
    RETURN false;
  END IF;
  -- Letters are never valid in a mobile field (spaces / + / - / () ok).
  IF p_raw ~* '[a-z]' THEN
    RETURN false;
  END IF;

  v_digits := regexp_replace(p_raw, '\D', '', 'g');
  IF v_digits ~ '^[6-9][0-9]{9}$' THEN
    RETURN true;
  END IF;
  IF v_digits ~ '^0[6-9][0-9]{9}$' THEN
    RETURN true;
  END IF;
  IF v_digits ~ '^91[6-9][0-9]{9}$' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_franchise_inquiry_v2(
  p_brand_slug text,
  p_full_name text,
  p_email text,
  p_phone_e164 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_proposed_franchise_name text DEFAULT NULL,
  p_address_line text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_pincode text DEFAULT NULL,
  p_prior_experience text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id uuid;
  v_id uuid;
  v_phone text;
BEGIN
  SELECT b.id INTO v_brand_id FROM public.brands b
  WHERE b.slug = p_brand_slug AND b.deleted_at IS NULL AND b.status = 'active';

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  IF NOT public.brand_feature_enabled(v_brand_id, 'franchise_applications') THEN
    RAISE EXCEPTION 'feature_disabled';
  END IF;

  IF trim(coalesce(p_full_name, '')) = '' OR trim(coalesce(p_email, '')) = '' THEN
    RAISE EXCEPTION 'full_name and email are required';
  END IF;

  IF NOT public.is_valid_india_mobile(p_phone_e164) THEN
    RAISE EXCEPTION 'phone is invalid';
  END IF;

  v_phone := public.normalize_phone_e164(p_phone_e164);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  INSERT INTO public.franchise_inquiries (
    brand_id, full_name, email, phone_e164, city, message,
    proposed_franchise_name, address_line, state, pincode, prior_experience, status
  )
  VALUES (
    v_brand_id, trim(p_full_name), trim(lower(p_email)),
    v_phone,
    nullif(trim(p_city), ''), nullif(trim(p_message), ''),
    nullif(trim(p_proposed_franchise_name), ''),
    nullif(trim(p_address_line), ''),
    nullif(trim(p_state), ''),
    nullif(trim(p_pincode), ''),
    nullif(trim(p_prior_experience), ''),
    'new'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_franchise_inquiry_staff(
  p_brand_id uuid,
  p_full_name text,
  p_email text,
  p_phone_e164 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_proposed_franchise_name text DEFAULT NULL,
  p_address_line text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_pincode text DEFAULT NULL,
  p_prior_experience text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_phone text;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF trim(coalesce(p_full_name, '')) = '' OR trim(coalesce(p_email, '')) = '' THEN
    RAISE EXCEPTION 'full_name and email are required';
  END IF;

  IF NOT public.is_valid_india_mobile(p_phone_e164) THEN
    RAISE EXCEPTION 'phone is invalid';
  END IF;

  v_phone := public.normalize_phone_e164(p_phone_e164);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  INSERT INTO public.franchise_inquiries (
    brand_id, full_name, email, phone_e164, city, message,
    proposed_franchise_name, address_line, state, pincode, prior_experience, status
  )
  VALUES (
    p_brand_id,
    trim(p_full_name),
    trim(lower(p_email)),
    v_phone,
    nullif(trim(p_city), ''),
    nullif(trim(p_message), ''),
    nullif(trim(p_proposed_franchise_name), ''),
    nullif(trim(p_address_line), ''),
    nullif(trim(p_state), ''),
    nullif(trim(p_pincode), ''),
    nullif(trim(p_prior_experience), ''),
    'new'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_franchise_inquiry(
  p_inquiry_id uuid,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone_e164 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_proposed_franchise_name text DEFAULT NULL,
  p_address_line text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_pincode text DEFAULT NULL,
  p_prior_experience text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS public.franchise_inquiries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inq public.franchise_inquiries%ROWTYPE;
  v_phone text;
BEGIN
  SELECT * INTO v_inq
  FROM public.franchise_inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

  IF v_inq.id IS NULL THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF NOT (public.has_brand_access(v_inq.brand_id) OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_inq.status NOT IN ('new', 'contacted', 'qualified') THEN
    RAISE EXCEPTION 'Only pending applications can be edited';
  END IF;

  IF p_full_name IS NOT NULL AND trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'full_name is required';
  END IF;
  IF p_email IS NOT NULL AND trim(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;

  IF p_phone_e164 IS NOT NULL THEN
    IF NOT public.is_valid_india_mobile(p_phone_e164) THEN
      RAISE EXCEPTION 'phone is invalid';
    END IF;
    v_phone := public.normalize_phone_e164(p_phone_e164);
    IF v_phone IS NULL THEN
      RAISE EXCEPTION 'phone is required';
    END IF;
  END IF;

  UPDATE public.franchise_inquiries
  SET
    full_name = CASE
      WHEN p_full_name IS NULL THEN full_name
      ELSE trim(p_full_name)
    END,
    email = CASE
      WHEN p_email IS NULL THEN email
      ELSE trim(lower(p_email))
    END,
    phone_e164 = CASE
      WHEN p_phone_e164 IS NULL THEN phone_e164
      ELSE v_phone
    END,
    city = CASE
      WHEN p_city IS NULL THEN city
      ELSE nullif(trim(p_city), '')
    END,
    proposed_franchise_name = CASE
      WHEN p_proposed_franchise_name IS NULL THEN proposed_franchise_name
      ELSE nullif(trim(p_proposed_franchise_name), '')
    END,
    address_line = CASE
      WHEN p_address_line IS NULL THEN address_line
      ELSE nullif(trim(p_address_line), '')
    END,
    state = CASE
      WHEN p_state IS NULL THEN state
      ELSE nullif(trim(p_state), '')
    END,
    pincode = CASE
      WHEN p_pincode IS NULL THEN pincode
      ELSE nullif(trim(p_pincode), '')
    END,
    prior_experience = CASE
      WHEN p_prior_experience IS NULL THEN prior_experience
      ELSE nullif(trim(p_prior_experience), '')
    END,
    message = CASE
      WHEN p_message IS NULL THEN message
      ELSE nullif(trim(p_message), '')
    END,
    updated_at = now()
  WHERE id = p_inquiry_id
  RETURNING * INTO v_inq;

  RETURN v_inq;
END;
$$;

REVOKE ALL ON FUNCTION public.update_franchise_inquiry(
  uuid, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_franchise_inquiry(
  uuid, text, text, text, text, text, text, text, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.is_valid_india_mobile(text) IS
  'India mobile: 10 digits starting 6-9, optional 0 / 91 / +91; letters rejected (113).';
