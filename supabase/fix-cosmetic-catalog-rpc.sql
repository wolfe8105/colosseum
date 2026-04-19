-- Fix get_cosmetic_catalog to read from 'cosmetics' table (FK-authoritative)
-- Applied: April 19, 2026
--
-- Root cause: get_cosmetic_catalog RPC was joining against 'cosmetic_items' table,
-- but user_cosmetics.cosmetic_id FK references 'cosmetics' table.
-- The two tables have different IDs and column names, so the JOIN never matched,
-- causing all items to show as unowned (0/29 earned despite 14+ in DB).
--
-- Fix: Rewrite RPC to read from 'cosmetics' table with column mapping.

CREATE OR REPLACE FUNCTION public.get_cosmetic_catalog()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, owned boolean, equipped boolean, acquired_via text, metadata jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.name,
    c.type AS category,
    CASE c.rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
      ELSE 1
    END AS tier,
    'auto_unlock'::text AS unlock_type,
    COALESCE(c.price_tokens, 0) AS token_cost,
    0::numeric AS depth_threshold,
    ''::text AS unlock_condition,
    c.css_class AS asset_url,
    0 AS sort_order,
    (uc.user_id IS NOT NULL)     AS owned,
    COALESCE(uc.equipped, false) AS equipped,
    uc.acquired_via,
    uc.metadata
  FROM cosmetics c
  LEFT JOIN user_cosmetics uc
    ON uc.cosmetic_id = c.id
   AND uc.user_id = auth.uid()
  WHERE c.is_active = true
  ORDER BY c.type, c.name;
$function$;
