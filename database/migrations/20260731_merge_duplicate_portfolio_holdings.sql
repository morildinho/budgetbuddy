-- Normalize and merge duplicate stock/crypto holdings, then enforce one holding per ticker.
-- Cash rows are intentionally excluded because users may keep separate NOK balances.

BEGIN;

UPDATE public.portfolio_assets
SET
  symbol = UPPER(BTRIM(symbol)),
  currency = UPPER(BTRIM(COALESCE(currency, 'USD')))
WHERE symbol <> UPPER(BTRIM(symbol))
   OR currency IS NULL
   OR currency <> UPPER(BTRIM(currency));

-- Refuse to guess cost basis if duplicate rows use different currencies.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.portfolio_assets
    WHERE asset_type IN ('stock', 'crypto')
    GROUP BY user_id, asset_type, UPPER(BTRIM(symbol))
    HAVING COUNT(*) > 1
       AND COUNT(DISTINCT UPPER(BTRIM(COALESCE(currency, 'USD')))) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot merge portfolio duplicates with different currencies';
  END IF;
END;
$$;

CREATE TEMP TABLE portfolio_asset_merge_plan ON COMMIT DROP AS
SELECT
  user_id,
  asset_type,
  UPPER(BTRIM(symbol)) AS normalized_symbol,
  (ARRAY_AGG(id ORDER BY created_at ASC, id ASC))[1] AS keep_id,
  SUM(quantity) AS total_quantity,
  CASE
    WHEN BOOL_AND(purchase_price IS NOT NULL) AND SUM(quantity) <> 0
      THEN SUM(quantity * purchase_price) / SUM(quantity)
    ELSE NULL
  END AS weighted_purchase_price,
  (ARRAY_AGG(name ORDER BY updated_at DESC, created_at DESC, id DESC))[1] AS latest_name,
  MAX(UPPER(BTRIM(COALESCE(currency, 'USD')))) AS normalized_currency,
  STRING_AGG(DISTINCT NULLIF(BTRIM(notes), ''), E'\n\n') AS merged_notes
FROM public.portfolio_assets
WHERE asset_type IN ('stock', 'crypto')
GROUP BY user_id, asset_type, UPPER(BTRIM(symbol))
HAVING COUNT(*) > 1;

UPDATE public.portfolio_assets AS asset
SET
  symbol = plan.normalized_symbol,
  name = plan.latest_name,
  quantity = plan.total_quantity,
  purchase_price = plan.weighted_purchase_price,
  currency = plan.normalized_currency,
  notes = plan.merged_notes,
  updated_at = NOW()
FROM portfolio_asset_merge_plan AS plan
WHERE asset.id = plan.keep_id;

DELETE FROM public.portfolio_assets AS asset
USING portfolio_asset_merge_plan AS plan
WHERE asset.user_id = plan.user_id
  AND asset.asset_type = plan.asset_type
  AND UPPER(BTRIM(asset.symbol)) = plan.normalized_symbol
  AND asset.id <> plan.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_assets_user_type_symbol
  ON public.portfolio_assets (user_id, asset_type, UPPER(BTRIM(symbol)))
  WHERE asset_type IN ('stock', 'crypto');

CREATE OR REPLACE FUNCTION public.add_or_merge_portfolio_asset(
  p_symbol TEXT,
  p_name TEXT,
  p_asset_type TEXT,
  p_quantity NUMERIC,
  p_purchase_price NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  normalized_symbol TEXT := UPPER(BTRIM(p_symbol));
  normalized_name TEXT := BTRIM(p_name);
  normalized_type TEXT := LOWER(BTRIM(p_asset_type));
  normalized_currency TEXT := UPPER(BTRIM(COALESCE(p_currency, 'USD')));
  normalized_notes TEXT := NULLIF(BTRIM(p_notes), '');
  existing_asset public.portfolio_assets%ROWTYPE;
  result_asset public.portfolio_assets%ROWTYPE;
  combined_quantity NUMERIC;
  combined_purchase_price NUMERIC;
  did_merge BOOLEAN := FALSE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF normalized_symbol = '' OR normalized_name = '' THEN
    RAISE EXCEPTION 'Symbol and name are required' USING ERRCODE = '22023';
  END IF;

  IF normalized_type NOT IN ('stock', 'crypto', 'cash') THEN
    RAISE EXCEPTION 'Invalid asset type' USING ERRCODE = '22023';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  IF p_purchase_price IS NOT NULL AND p_purchase_price < 0 THEN
    RAISE EXCEPTION 'Purchase price cannot be negative' USING ERRCODE = '22023';
  END IF;

  -- Cash rows represent named balances and should remain independent.
  IF normalized_type = 'cash' THEN
    INSERT INTO public.portfolio_assets (
      user_id, symbol, name, asset_type, quantity, purchase_price, currency, notes
    ) VALUES (
      current_user_id, normalized_symbol, normalized_name, normalized_type,
      p_quantity, NULL, 'NOK', normalized_notes
    )
    RETURNING * INTO result_asset;

    RETURN JSONB_BUILD_OBJECT('asset', TO_JSONB(result_asset), 'merged', FALSE);
  END IF;

  -- Serialize purchases for the same user/type/ticker to prevent race duplicates.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(current_user_id::TEXT || ':' || normalized_type || ':' || normalized_symbol, 0)
  );

  SELECT *
  INTO existing_asset
  FROM public.portfolio_assets
  WHERE user_id = current_user_id
    AND asset_type = normalized_type
    AND UPPER(BTRIM(symbol)) = normalized_symbol
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF UPPER(BTRIM(COALESCE(existing_asset.currency, 'USD'))) <> normalized_currency THEN
      RAISE EXCEPTION 'Existing holding uses a different currency' USING ERRCODE = '22023';
    END IF;

    combined_quantity := existing_asset.quantity + p_quantity;
    combined_purchase_price := CASE
      WHEN existing_asset.purchase_price IS NOT NULL AND p_purchase_price IS NOT NULL
        THEN (
          existing_asset.quantity * existing_asset.purchase_price
          + p_quantity * p_purchase_price
        ) / combined_quantity
      ELSE NULL
    END;

    UPDATE public.portfolio_assets
    SET
      symbol = normalized_symbol,
      name = normalized_name,
      quantity = combined_quantity,
      purchase_price = combined_purchase_price,
      notes = CASE
        WHEN normalized_notes IS NULL THEN existing_asset.notes
        WHEN NULLIF(BTRIM(existing_asset.notes), '') IS NULL THEN normalized_notes
        WHEN BTRIM(existing_asset.notes) = normalized_notes THEN existing_asset.notes
        ELSE BTRIM(existing_asset.notes) || E'\n\n' || normalized_notes
      END,
      updated_at = NOW()
    WHERE id = existing_asset.id
    RETURNING * INTO result_asset;

    did_merge := TRUE;
  ELSE
    INSERT INTO public.portfolio_assets (
      user_id, symbol, name, asset_type, quantity, purchase_price, currency, notes
    ) VALUES (
      current_user_id, normalized_symbol, normalized_name, normalized_type,
      p_quantity, p_purchase_price, normalized_currency, normalized_notes
    )
    RETURNING * INTO result_asset;
  END IF;

  RETURN JSONB_BUILD_OBJECT('asset', TO_JSONB(result_asset), 'merged', did_merge);
END;
$$;

REVOKE ALL ON FUNCTION public.add_or_merge_portfolio_asset(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_or_merge_portfolio_asset(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

COMMIT;
