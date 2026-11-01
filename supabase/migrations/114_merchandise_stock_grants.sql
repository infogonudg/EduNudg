-- Brand staff can grant on-hand merchandise stock to a franchise without a shop order.
-- Center Inventory aggregates these grants into on-hand / available counts.

CREATE TABLE IF NOT EXISTS public.merchandise_stock_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.franchise_centers(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.merchandise_catalog(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS merchandise_stock_grants_center_item_idx
  ON public.merchandise_stock_grants (center_id, catalog_item_id);

CREATE INDEX IF NOT EXISTS merchandise_stock_grants_brand_created_idx
  ON public.merchandise_stock_grants (brand_id, created_at DESC);

DROP TRIGGER IF EXISTS merchandise_stock_grants_audit ON public.merchandise_stock_grants;
CREATE TRIGGER merchandise_stock_grants_audit
  BEFORE INSERT OR UPDATE ON public.merchandise_stock_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_row_audit();

ALTER TABLE public.merchandise_stock_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchandise_stock_grants_select ON public.merchandise_stock_grants;
CREATE POLICY merchandise_stock_grants_select ON public.merchandise_stock_grants
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_brand_access(brand_id)
    OR public.has_center_access(center_id)
  );

DROP POLICY IF EXISTS merchandise_stock_grants_write ON public.merchandise_stock_grants;
CREATE POLICY merchandise_stock_grants_write ON public.merchandise_stock_grants
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_brand_access(brand_id)
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_brand_access(brand_id)
  );

COMMENT ON TABLE public.merchandise_stock_grants IS
  'Brand-assigned merchandise stock for a franchise; summed into center Inventory on-hand.';

CREATE OR REPLACE FUNCTION public.grant_center_merchandise_stock(
  p_brand_id uuid,
  p_center_id uuid,
  p_catalog_item_id uuid,
  p_quantity int,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_center_brand uuid;
  v_item_brand uuid;
  v_note text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'quantity must be at least 1';
  END IF;

  IF NOT public.is_platform_admin() AND NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.brand_feature_enabled(p_brand_id, 'merchandise') THEN
    RAISE EXCEPTION 'feature_disabled';
  END IF;

  SELECT fc.brand_id INTO v_center_brand
  FROM public.franchise_centers fc
  WHERE fc.id = p_center_id
    AND fc.deleted_at IS NULL;

  IF v_center_brand IS NULL OR v_center_brand <> p_brand_id THEN
    RAISE EXCEPTION 'Center not found for brand';
  END IF;

  SELECT mc.brand_id INTO v_item_brand
  FROM public.merchandise_catalog mc
  WHERE mc.id = p_catalog_item_id;

  IF v_item_brand IS NULL OR v_item_brand <> p_brand_id THEN
    RAISE EXCEPTION 'Catalog item not found for brand';
  END IF;

  v_note := nullif(trim(coalesce(p_note, '')), '');

  INSERT INTO public.merchandise_stock_grants (
    brand_id, center_id, catalog_item_id, quantity, note
  )
  VALUES (
    p_brand_id, p_center_id, p_catalog_item_id, p_quantity, v_note
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_center_merchandise_stock(uuid, uuid, uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_center_merchandise_stock(uuid, uuid, uuid, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_merchandise_stock_grant(
  p_grant_id uuid,
  p_center_id uuid,
  p_catalog_item_id uuid,
  p_quantity int,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id uuid;
  v_center_brand uuid;
  v_item_brand uuid;
  v_note text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'quantity must be at least 1';
  END IF;

  SELECT g.brand_id INTO v_brand_id
  FROM public.merchandise_stock_grants g
  WHERE g.id = p_grant_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Stock grant not found';
  END IF;

  IF NOT public.is_platform_admin() AND NOT public.has_brand_access(v_brand_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.brand_feature_enabled(v_brand_id, 'merchandise') THEN
    RAISE EXCEPTION 'feature_disabled';
  END IF;

  SELECT fc.brand_id INTO v_center_brand
  FROM public.franchise_centers fc
  WHERE fc.id = p_center_id
    AND fc.deleted_at IS NULL;

  IF v_center_brand IS NULL OR v_center_brand <> v_brand_id THEN
    RAISE EXCEPTION 'Center not found for brand';
  END IF;

  SELECT mc.brand_id INTO v_item_brand
  FROM public.merchandise_catalog mc
  WHERE mc.id = p_catalog_item_id;

  IF v_item_brand IS NULL OR v_item_brand <> v_brand_id THEN
    RAISE EXCEPTION 'Catalog item not found for brand';
  END IF;

  v_note := nullif(trim(coalesce(p_note, '')), '');

  UPDATE public.merchandise_stock_grants
  SET
    center_id = p_center_id,
    catalog_item_id = p_catalog_item_id,
    quantity = p_quantity,
    note = v_note
  WHERE id = p_grant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_merchandise_stock_grant(uuid, uuid, uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_merchandise_stock_grant(uuid, uuid, uuid, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_merchandise_stock_grant(p_grant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT g.brand_id INTO v_brand_id
  FROM public.merchandise_stock_grants g
  WHERE g.id = p_grant_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Stock grant not found';
  END IF;

  IF NOT public.is_platform_admin() AND NOT public.has_brand_access(v_brand_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.merchandise_stock_grants WHERE id = p_grant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_merchandise_stock_grant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_merchandise_stock_grant(uuid) TO authenticated;
