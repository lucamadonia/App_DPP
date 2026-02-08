-- Allow anonymous users to cancel returns (update status to CANCELLED)
CREATE POLICY "Public cancel returns"
ON rh_returns FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
