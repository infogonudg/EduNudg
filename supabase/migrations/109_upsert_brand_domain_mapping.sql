-- Platform admin: upsert/delete purchased brand hostnames in domain_mappings (UI replaces SQL Editor).

CREATE OR REPLACE FUNCTION public.normalize_brand_domain_hostname(p_hostname text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text := lower(trim(coalesce(p_hostname, '')));
BEGIN
  v := regexp_replace(v, '^https?://', '', 'i');
  v := split_part(v, '/', 1);
  v := split_part(v, '?', 1);
  v := split_part(v, '#', 1);
  v := regexp_replace(v, ':\d+$', '');
  v := regexp_replace(v, '\.$', '');
  v := trim(v);
  IF v = '' OR v !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Invalid hostname';
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_brand_domain_mapping(
  p_brand_id uuid,
  p_hostname text,
  p_is_primary boolean DEFAULT false
)
RETURNS public.domain_mappings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text;
  v_row public.domain_mappings;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can manage brand domains';
  END IF;

  IF p_brand_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = p_brand_id AND b.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  v_host := public.normalize_brand_domain_hostname(p_hostname);

  IF EXISTS (
    SELECT 1
    FROM public.domain_mappings dm
    WHERE lower(dm.hostname) = v_host
      AND (dm.brand_id IS DISTINCT FROM p_brand_id OR dm.portal_type IS DISTINCT FROM 'brand'::public.portal_type)
  ) THEN
    RAISE EXCEPTION 'Hostname already mapped to another portal or brand';
  END IF;

  IF coalesce(p_is_primary, false) THEN
    UPDATE public.domain_mappings
    SET is_primary = false,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE brand_id = p_brand_id
      AND portal_type = 'brand'
      AND center_id IS NULL
      AND is_primary = true
      AND lower(hostname) IS DISTINCT FROM v_host;
  END IF;

  INSERT INTO public.domain_mappings (hostname, brand_id, center_id, portal_type, is_primary)
  VALUES (v_host, p_brand_id, NULL, 'brand', coalesce(p_is_primary, false))
  ON CONFLICT (hostname) DO UPDATE SET
    brand_id = EXCLUDED.brand_id,
    center_id = NULL,
    portal_type = 'brand',
    is_primary = EXCLUDED.is_primary,
    updated_at = now(),
    updated_by = auth.uid()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_brand_domain_mapping(
  p_brand_id uuid,
  p_hostname text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can manage brand domains';
  END IF;

  v_host := public.normalize_brand_domain_hostname(p_hostname);

  DELETE FROM public.domain_mappings
  WHERE brand_id = p_brand_id
    AND portal_type = 'brand'
    AND center_id IS NULL
    AND lower(hostname) = v_host;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand domain mapping not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_brand_domain_hostname(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_brand_domain_hostname(text) TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_brand_domain_mapping(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_brand_domain_mapping(uuid, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_brand_domain_mapping(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_brand_domain_mapping(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.upsert_brand_domain_mapping(uuid, text, boolean) IS
  'SECURITY DEFINER: platform admin upserts brand portal domain_mappings for purchased hostnames.';
COMMENT ON FUNCTION public.delete_brand_domain_mapping(uuid, text) IS
  'SECURITY DEFINER: platform admin deletes brand portal domain_mappings only.';
