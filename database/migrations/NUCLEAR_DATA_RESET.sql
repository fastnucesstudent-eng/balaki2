-- NUCLEAR_DATA_RESET.sql
-- ====================================================================
-- TARZIFY FRESH START: TRUNCATE ALL DATA (STRICTLY DATA ONLY)
-- RUN THIS ENTIRE SCRIPT ONE TIME IN SUPABASE SQL EDITOR
-- ====================================================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    RAISE NOTICE 'Starting full data truncation...';

    -- 1. Truncate all tables in public schema with CASCADE to handle foreign keys
    -- This keeps the schema (tables/columns) intact but empties every row
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;

    RAISE NOTICE 'All tables truncated. Sequences reset.';
END $$;

-- 2. DIAGNOSTIC PROOF
SELECT 
    'SUCCESS' as status,
    'Database is now EMPTY and clean' as message,
    (SELECT count(*) FROM public.profiles) as profiles_count,
    (SELECT count(*) FROM public.orders) as orders_count;
