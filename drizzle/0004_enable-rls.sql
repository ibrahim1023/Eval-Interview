-- Enable RLS on every application table. The app connects directly to
-- Postgres as the table owner (bypasses RLS); Supabase's PostgREST Data API
-- exposes the public schema by default, so without RLS the public anon key
-- could read and write these tables. No policies are created: anon and
-- authenticated roles are denied all access.
ALTER TABLE "interviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "source_chunks" ENABLE ROW LEVEL SECURITY;
