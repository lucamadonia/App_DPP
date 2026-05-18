-- Seed Returns Hub reason categories for MYFAMBLISS GmbH.
-- The public returns wizard was showing only "Sonstiges" because
-- rh_return_reasons was empty for this tenant — the operator hadn't
-- defined any. We pick a clean default set tailored to child / family
-- products: damaged-on-arrival, wrong item, doesn't fit our needs, etc.
--
-- Idempotent: skipped entirely when the tenant already has any reason
-- (so re-running this migration after the operator customised won't
-- clobber their setup).

DO $$
DECLARE
  v_tenant UUID := '522f6254-f73c-4a26-b1e9-662035194bc5';
BEGIN
  IF EXISTS (SELECT 1 FROM rh_return_reasons WHERE tenant_id = v_tenant) THEN
    RAISE NOTICE 'Tenant already has return reasons, skipping seed.';
    RETURN;
  END IF;

  INSERT INTO rh_return_reasons (tenant_id, category, subcategories, follow_up_questions, requires_photos, sort_order, active) VALUES
    (v_tenant, 'damaged',
     ARRAY['Beim Transport beschädigt', 'Kratzer / Macken', 'Magnete halten nicht', 'Bauteil fehlt'],
     '[{"id":"when","label":"Wann hast du den Schaden bemerkt?","type":"text","required":false}]'::jsonb,
     true, 10, true),

    (v_tenant, 'defective',
     ARRAY['Funktioniert nicht', 'Geht nicht mehr an', 'Akku lädt nicht', 'Knopf reagiert nicht'],
     '[{"id":"steps","label":"Was hast du probiert?","type":"text","required":false}]'::jsonb,
     true, 20, true),

    (v_tenant, 'wrong_item',
     ARRAY['Falsches Produkt erhalten', 'Falsche Farbe / Variante', 'Falsche Menge'],
     '[]'::jsonb,
     false, 30, true),

    (v_tenant, 'not_as_described',
     ARRAY['Sieht anders aus als im Shop', 'Größe passt nicht', 'Material anders erwartet'],
     '[]'::jsonb,
     false, 40, true),

    (v_tenant, 'not_needed',
     ARRAY['Gefällt mir doch nicht', 'Kind nutzt es nicht', 'Doppelt bestellt', 'Falsche Größe / Alter'],
     '[]'::jsonb,
     false, 50, true),

    (v_tenant, 'arrived_late',
     ARRAY['Zu spät für den Anlass', 'Bereits anderswo gekauft'],
     '[]'::jsonb,
     false, 60, true),

    (v_tenant, 'other',
     ARRAY[]::TEXT[],
     '[]'::jsonb,
     false, 99, true);
END $$;
