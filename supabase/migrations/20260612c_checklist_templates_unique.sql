-- ============================================================
-- Checklist Templates: dedupe + unique constraint + lookup index
--
-- Prepares checklist_templates for idempotent UPSERT seeding
-- (PostgREST on_conflict=country_code,category_key,title).
-- Keeping existing row UUIDs intact preserves the references in
-- checklist_progress.checklist_item_id (tenant progress check marks).
-- ============================================================

-- 1) Remove duplicate rows on (country_code, category_key, title).
--    Keep the OLDEST row per group (created_at ASC, id ASC as tiebreak)
--    so that existing checklist_progress references survive where possible
--    (progress rows usually point at the row that existed first).
DELETE FROM public.checklist_templates ct
USING (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY country_code, category_key, title
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.checklist_templates
) ranked
WHERE ct.id = ranked.id
  AND ranked.rn > 1;

-- 2) Unique constraint on the seed conflict key (idempotent).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'checklist_templates_country_category_title_key'
          AND conrelid = 'public.checklist_templates'::regclass
    ) THEN
        ALTER TABLE public.checklist_templates
            ADD CONSTRAINT checklist_templates_country_category_title_key
            UNIQUE (country_code, category_key, title);
    END IF;
END $$;

-- 3) Lookup index for getChecklistTemplates(countryCode, categoryKey).
--    (The unique index above covers this prefix too, but an explicit
--    two-column index keeps the hot filter path independent of the
--    wider unique index with the TEXT title column.)
CREATE INDEX IF NOT EXISTS idx_checklist_templates_country_category
    ON public.checklist_templates (country_code, category_key);
