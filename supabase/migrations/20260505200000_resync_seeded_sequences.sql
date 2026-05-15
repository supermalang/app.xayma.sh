-- Resync auto-increment sequences for tables that were populated with
-- explicit id values via seed.sql. Postgres doesn't advance a SERIAL/IDENTITY
-- sequence when an explicit id is supplied, so without a setval at the end
-- of the seed the sequence stays at 1 and the *next* auto-assigned insert
-- collides with the existing seed rows on the primary key.
--
-- This came up after the handle_new_user trigger started auto-inserting
-- xayma_app.partners rows on self-registration: a fresh signup tried to
-- claim id=1, which already belongs to the first seeded partner.
--
-- setval(seq, MAX(id)) sets the sequence so the *next* nextval returns
-- MAX(id) + 1. Safe to re-run; idempotent.

DO $$
DECLARE
  r RECORD;
  v_max BIGINT;
  v_seq TEXT;
BEGIN
  FOR r IN
    SELECT t.table_name, c.column_name
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'xayma_app'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'id'
      AND c.data_type IN ('integer', 'bigint', 'smallint')
  LOOP
    v_seq := pg_get_serial_sequence('xayma_app.' || quote_ident(r.table_name), r.column_name);
    CONTINUE WHEN v_seq IS NULL;

    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM xayma_app.%I', r.column_name, r.table_name)
      INTO v_max;

    IF v_max > 0 THEN
      PERFORM setval(v_seq, v_max);
    END IF;
  END LOOP;
END $$;
