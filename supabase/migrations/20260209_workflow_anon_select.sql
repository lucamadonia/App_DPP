-- Allow anonymous read access to workflow rules
-- Required for public portal return creation to trigger workflows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rh_workflow_rules'
      AND policyname = 'Anon read workflow rules'
  ) THEN
    CREATE POLICY "Anon read workflow rules" ON rh_workflow_rules
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
