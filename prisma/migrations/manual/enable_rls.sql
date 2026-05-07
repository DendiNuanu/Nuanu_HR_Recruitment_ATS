-- Enable RLS on every table in public schema and allow only service_role.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t.tablename
        AND policyname = 'service_role_full_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY service_role_full_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
        t.tablename
      );
    END IF;
  END LOOP;
END
$$;
