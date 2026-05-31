-- ============================================================
--  Schema Supabase — Fuochi di San Giovanni
--  Incolla questo nella SQL Editor del tuo progetto Supabase
-- ============================================================

-- Tabella elementi da portare
CREATE TABLE IF NOT EXISTS items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella iscrizioni ospiti
CREATE TABLE IF NOT EXISTS selections (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  guest_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, guest_name)
);

-- Row Level Security: accesso pubblico (il sito è ad invito, la sicurezza è il link)
ALTER TABLE items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_public_read"   ON items      FOR SELECT USING (TRUE);
CREATE POLICY "items_public_write"  ON items      FOR ALL    USING (TRUE);
CREATE POLICY "sel_public_all"      ON selections FOR ALL    USING (TRUE);

-- Realtime: abilita aggiornamenti in tempo reale
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE selections;
