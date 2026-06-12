-- ============================================================
-- News Items: extend category set + source/image columns +
-- dedupe + unique title index for idempotent UPSERT seeding
--
-- Context:
--   * UI/TS (NewsPage.tsx, types/database.ts) already support 8
--     categories, but the original CHECK only allowed 4 -> the
--     filters 'recall', 'standard', 'guidance', 'consultation'
--     could never match ("dead filters").
--   * NewsPage renders item.source and item.imageUrl, but the
--     columns never existed in the table.
--   * scripts/seed-news.mjs switches from DELETE-all+INSERT to
--     UPSERT via PostgREST (on_conflict=title), which requires a
--     unique index on title.
-- ============================================================

-- 1) Widen the category CHECK constraint to all 8 categories.
--    (DROP IF EXISTS + ADD keeps this re-runnable.)
ALTER TABLE public.news_items
    DROP CONSTRAINT IF EXISTS news_items_category_check;

ALTER TABLE public.news_items
    ADD CONSTRAINT news_items_category_check
    CHECK (category IN (
        'regulation', 'deadline', 'update', 'warning',
        'recall', 'standard', 'guidance', 'consultation'
    ));

-- 2) Columns rendered by NewsPage but missing in the schema.
ALTER TABLE public.news_items
    ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.news_items
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3) Dedupe on title: keep the OLDEST row per title
--    (created_at ASC, id ASC as tiebreak), then enforce
--    uniqueness so PostgREST UPSERT (on_conflict=title) works.
DELETE FROM public.news_items n
USING (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY title
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.news_items
) ranked
WHERE n.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_news_items_title
    ON public.news_items (title);
