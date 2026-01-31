-- Migration: Add visibility column to documents table
-- Run this in the Supabase SQL Editor

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'internal'
CHECK (visibility IN ('internal', 'customs', 'consumer'));
