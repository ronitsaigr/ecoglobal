-- EcoGlobal Cloudflare D1 / SQLite migration 0001.
-- This is the replacement for the old Supabase/PostgreSQL migration.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('buyer','supplier','admin')),
 password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions(
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS login_attempts(
 key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0,
 reset_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS suppliers(
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL, country TEXT NOT NULL,
 website TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 contact_name TEXT NOT NULL DEFAULT '', contact_email TEXT NOT NULL DEFAULT '',
 contact_phone TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 review_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products(
 id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
 name TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN (
 'Paper & board','Fiber alternatives','Flexible formats','Circular systems','Packaging components')),
 description TEXT NOT NULL DEFAULT '',
 min_order_quantity REAL CHECK(min_order_quantity IS NULL OR min_order_quantity>0),
 unit TEXT NOT NULL DEFAULT 'units',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 review_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS products_approved_cat ON products(category,status);
CREATE TABLE IF NOT EXISTS rfqs(
 id TEXT PRIMARY KEY, buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN (
 'Paper & board','Fiber alternatives','Flexible formats','Circular systems','Packaging components')),
 details TEXT NOT NULL, quantity REAL NOT NULL CHECK(quantity>0),
 unit TEXT NOT NULL, destination_country TEXT NOT NULL,
 needed_by TEXT, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS rfqs_buyer ON rfqs(buyer_id);
CREATE TABLE IF NOT EXISTS matches(
 rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
 supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(rfq_id,supplier_id)
);
CREATE INDEX IF NOT EXISTS matches_supplier ON matches(supplier_id);
CREATE TABLE IF NOT EXISTS quotes(
 id TEXT PRIMARY KEY, rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
 supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
 unit_price REAL NOT NULL CHECK(unit_price>0),
 currency TEXT NOT NULL CHECK(length(currency)=3),
 lead_time_days INTEGER NOT NULL CHECK(lead_time_days BETWEEN 1 AND 365),
 message TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','accepted','declined')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(rfq_id,supplier_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_accepted_quote ON quotes(rfq_id) WHERE status='accepted';
CREATE TABLE IF NOT EXISTS documents(
 id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
 object_key TEXT NOT NULL UNIQUE, document_type TEXT NOT NULL,
 content_type TEXT NOT NULL, original_name TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications(
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 message TEXT NOT NULL, related_id TEXT, is_read INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id,created_at);
CREATE TABLE IF NOT EXISTS audit_log(
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, target_id TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
