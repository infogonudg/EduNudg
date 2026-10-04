-- Public hostname → tenant resolution for custom domains (anon cannot SELECT brands.slug via RLS).
-- Used so smartbraineducations.com loads brand slug smart-brain-abacus, not a hostname label.

CREATE OR REPLACE FUNCTION public.resolve_hostname_tenant(p_hostname text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text := lower(trim(coalesce(p_hostname, '')));
  v_hostname text;
  v_portal_type public.portal_type;
  v_brand_id uuid;
  v_center_id uuid;
  v_is_primary boolean;
  v_brand_slug text;
  v_center_slug text;
BEGIN
  IF v_host = '' THEN
    RETURN NULL;
  END IF;

  SELECT
    dm.hostname,
    dm.portal_type,
    dm.brand_id,
    dm.center_id,
    dm.is_primary,
    b.slug,
    fc.slug
  INTO
    v_hostname,
    v_portal_type,
    v_brand_id,
    v_center_id,
    v_is_primary,
    v_brand_slug,
    v_center_slug
  FROM public.domain_mappings dm
  LEFT JOIN public.brands b ON b.id = dm.brand_id
  LEFT JOIN public.franchise_centers fc
    ON fc.id = dm.center_id
   AND fc.deleted_at IS NULL
  WHERE lower(dm.hostname) = v_host
  LIMIT 1;

  IF v_hostname IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'hostname', v_hostname,
    'portal_type', v_portal_type,
    'brand_id', v_brand_id,
    'center_id', v_center_id,
    'is_primary', v_is_primary,
    'brand_slug', v_brand_slug,
    'center_slug', CASE
      WHEN v_portal_type = 'brand' THEN NULL
      ELSE v_center_slug
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_hostname_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_hostname_tenant(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_hostname_tenant(text) IS
  'SECURITY DEFINER: resolve domain_mappings hostname to portal + brand/center slugs for public SPA tenant bootstrap.';
