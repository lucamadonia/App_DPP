-- Add AI classification metadata columns to documents table
-- Allows storing the AI's suggestion result (for transparency / re-review).

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_classification JSONB,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS ai_classified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS hints JSONB;

COMMENT ON COLUMN documents.ai_classification IS 'Full AI classification result JSON (title, category, productMatchReason, confidence per field, etc.)';
COMMENT ON COLUMN documents.ai_confidence IS 'Overall AI confidence 0.00-1.00';
COMMENT ON COLUMN documents.ai_classified_at IS 'Timestamp of AI classification';
COMMENT ON COLUMN documents.ai_model IS 'AI model used (e.g. anthropic/claude-sonnet-4)';
COMMENT ON COLUMN documents.description IS 'Short description of the document content (AI-generated or user-provided)';
COMMENT ON COLUMN documents.hints IS 'AI-generated hints/warnings as JSONB array: [{type: "expiry_soon"|"product_match_unsure"|"svhc_detected"|..., message: "..."}]';

CREATE INDEX IF NOT EXISTS idx_documents_ai_classified_at
  ON documents (ai_classified_at DESC)
  WHERE ai_classified_at IS NOT NULL;
