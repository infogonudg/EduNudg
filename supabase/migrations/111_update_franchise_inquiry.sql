-- Brand staff: edit pending franchise inquiry details before approve (website apply is partial).

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
      WHEN trim(p_phone_e164) = '' THEN NULL
      ELSE public.normalize_phone_e164(p_phone_e164)
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

COMMENT ON FUNCTION public.update_franchise_inquiry(
  uuid, text, text, text, text, text, text, text, text, text, text
) IS
  'SECURITY DEFINER: brand staff update pending franchise_inquiries before approve (111).';
