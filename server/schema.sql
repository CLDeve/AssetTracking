CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  location TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT PRIMARY KEY,
  permissions TEXT[] NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  imei TEXT,
  model TEXT,
  device_type TEXT,
  device_status TEXT,
  device_location TEXT,
  telco TEXT,
  telco_contract_number TEXT,
  phone TEXT,
  contract_start DATE,
  contract_end DATE,
  mdm TEXT,
  mdm_expiry DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  issued_to TEXT,
  issue_type TEXT NOT NULL,
  location TEXT,
  issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  role TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO role_permissions (role, permissions)
VALUES
  ('Admin', ARRAY['register_device','issuing_personal','issuing_shared','bulk_issuing','returning','location_list','user_management']),
  ('Supervisor', ARRAY['register_device','issuing_personal','issuing_shared','bulk_issuing','returning','location_list']),
  ('Operator', ARRAY['issuing_personal','issuing_shared','returning','location_list']),
  ('Viewer', ARRAY[]::TEXT[])
ON CONFLICT (role) DO NOTHING;
