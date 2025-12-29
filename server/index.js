require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  credentials: true,
}));
app.use(express.json());

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const logAudit = async (user, action, details) => {
  try {
    await pool.query(
      "INSERT INTO audit_logs (user_id, role, action, details) VALUES ($1, $2, $3, $4)",
      [user?.id || null, user?.role || null, action, details]
    );
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
};

const parseLocations = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getUserLocations = async (userId) => {
  const result = await pool.query(
    "SELECT location FROM users WHERE id = $1",
    [userId]
  );
  return parseLocations(result.rows[0]?.location || "");
};

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true });
});

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "AssetTracking API", health: "/api/health" });
});

const isValidEmail = (value) =>
  typeof value === "string" && /\S+@\S+\.\S+/.test(value);

app.post("/api/bootstrap", async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password || !isValidEmail(username)) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existing = await pool.query("SELECT COUNT(*) FROM users");
  if (Number(existing.rows[0].count) > 0) {
    return res.status(403).json({ error: "Users already exist" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (name, username, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, username, "Admin", passwordHash]
  );

  const user = result.rows[0];
  await logAudit(user, "bootstrap_admin", `Created admin ${user.username}`);
  res.json({ token: signToken(user), user });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || !isValidEmail(username)) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const result = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: "User inactive" });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await logAudit(user, "login", `Login ${user.username}`);
  res.json({ token: signToken(user), user });
});

app.get("/api/me", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, username, role, location, is_active FROM users WHERE id = $1",
    [req.user.id]
  );
  res.json({ user: result.rows[0] });
});

app.get("/api/users", auth, async (_req, res) => {
  const result = await pool.query(
    "SELECT id, name, username, role, location, is_active, created_at FROM users ORDER BY id DESC"
  );
  res.json({ users: result.rows });
});

app.post("/api/users", auth, async (req, res) => {
  const { name, username, role, location, password } = req.body;
  if (!name || !username || !role || !password || !isValidEmail(username)) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (name, username, role, location, is_active, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, username, role, location, is_active",
    [name, username, role, location || null, true, passwordHash]
  );

  await logAudit(req.user, "create_user", `Created ${username}`);
  res.json({ user: result.rows[0] });
});

app.delete("/api/users/:id", auth, async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  await logAudit(req.user, "remove_user", `Removed user ${id}`);
  res.json({ ok: true });
});

app.patch("/api/users/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const result = await pool.query(
    "UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, role, is_active",
    [Boolean(isActive), id]
  );
  await logAudit(
    req.user,
    "update_user_status",
    `User ${id} ${Boolean(isActive) ? "Active" : "Inactive"}`
  );
  res.json({ user: result.rows[0] });
});

app.get("/api/role-permissions", auth, async (_req, res) => {
  const result = await pool.query("SELECT role, permissions FROM role_permissions");
  res.json({ roles: result.rows });
});

app.put("/api/role-permissions/:role", auth, async (req, res) => {
  const { role } = req.params;
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: "Permissions must be an array" });
  }

  await pool.query(
    "INSERT INTO role_permissions (role, permissions) VALUES ($1, $2) ON CONFLICT (role) DO UPDATE SET permissions = $2",
    [role, permissions]
  );
  await logAudit(req.user, "update_role_permissions", `${role}: ${permissions.join(", ")}`);
  res.json({ ok: true });
});

app.get("/api/devices", auth, async (_req, res) => {
  const result = await pool.query("SELECT * FROM devices ORDER BY created_at DESC");
  res.json({ devices: result.rows });
});

app.post("/api/devices", auth, async (req, res) => {
  const d = req.body;
  const result = await pool.query(
    `INSERT INTO devices
      (device_id, imei, model, device_type, device_status, device_location, telco, telco_contract_number, phone, contract_start, contract_end, mdm, mdm_expiry)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      d.deviceId,
      d.imei || null,
      d.model || null,
      d.deviceType || null,
      d.deviceStatus || null,
      d.deviceLocation || null,
      d.telco || null,
      d.telcoContractNumber || null,
      d.phone || null,
      d.contractStart || null,
      d.contractEnd || null,
      d.mdm || null,
      d.mdmExpiry || null,
    ]
  );
  await logAudit(req.user, "register_device", `Device ID ${d.deviceId}`);
  res.json({ device: result.rows[0] });
});

app.put("/api/devices/:id", auth, async (req, res) => {
  const { id } = req.params;
  const d = req.body;
  const result = await pool.query(
    `UPDATE devices SET
      device_id = $1,
      imei = $2,
      model = $3,
      device_type = $4,
      device_status = $5,
      device_location = $6,
      telco = $7,
      telco_contract_number = $8,
      phone = $9,
      contract_start = $10,
      contract_end = $11,
      mdm = $12,
      mdm_expiry = $13,
      updated_at = NOW()
     WHERE id = $14
     RETURNING *`,
    [
      d.deviceId,
      d.imei || null,
      d.model || null,
      d.deviceType || null,
      d.deviceStatus || null,
      d.deviceLocation || null,
      d.telco || null,
      d.telcoContractNumber || null,
      d.phone || null,
      d.contractStart || null,
      d.contractEnd || null,
      d.mdm || null,
      d.mdmExpiry || null,
      id,
    ]
  );
  await logAudit(req.user, "update_device", `Device ID ${d.deviceId}`);
  res.json({ device: result.rows[0] });
});

app.patch("/api/devices/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await pool.query(
    "UPDATE devices SET device_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id]
  );
  await logAudit(req.user, "toggle_device_status", `Device ${id}: ${status}`);
  res.json({ device: result.rows[0] });
});

app.get("/api/issues", auth, async (req, res) => {
  const result = await pool.query(
    `SELECT issues.*, devices.device_id AS device_identifier
     FROM issues
     JOIN devices ON devices.id = issues.device_id
     WHERE issues.returned_at IS NULL
     ORDER BY issues.issued_at DESC`
  );
  res.json({ issues: result.rows });
});

app.post("/api/issues", auth, async (req, res) => {
  const { deviceId, issuedTo, issueType, location } = req.body;
  const device = await pool.query("SELECT id FROM devices WHERE device_id = $1", [
    deviceId,
  ]);
  if (!device.rows[0]) {
    return res.status(404).json({ error: "Device not found" });
  }

  const existingIssue = await pool.query(
    "SELECT id FROM issues WHERE device_id = $1 AND returned_at IS NULL",
    [device.rows[0].id]
  );
  if (existingIssue.rows[0]) {
    return res.status(409).json({ error: "Device already issued" });
  }

  const result = await pool.query(
    `INSERT INTO issues (device_id, issued_to, issue_type, location, issued_by_user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [device.rows[0].id, issuedTo || null, issueType, location || null, req.user.id]
  );
  await logAudit(req.user, "issue_device", `Device ID ${deviceId}`);
  res.json({ issue: result.rows[0] });
});

app.post("/api/returns", auth, async (req, res) => {
  const { deviceId } = req.body;
  const device = await pool.query("SELECT id FROM devices WHERE device_id = $1", [
    deviceId,
  ]);
  if (!device.rows[0]) {
    return res.status(404).json({ error: "Device not found" });
  }

  const result = await pool.query(
    "UPDATE issues SET returned_at = NOW() WHERE device_id = $1 AND returned_at IS NULL RETURNING *",
    [device.rows[0].id]
  );

  if (!result.rows[0]) {
    return res.status(400).json({ error: "Device not issued" });
  }

  await logAudit(req.user, "return_device", `Device ID ${deviceId}`);
  res.json({ ok: true });
});

app.get("/api/ops-holdings", auth, async (req, res) => {
  const requestedLocation = req.query.location || null;
  const userLocations = requestedLocation
    ? [requestedLocation]
    : await getUserLocations(req.user.id);
  const locationFilter = userLocations.length ? userLocations : null;
  const result = await pool.query(
    `SELECT ops_holdings.*, devices.device_id AS device_identifier, users.username
     FROM ops_holdings
     JOIN devices ON devices.id = ops_holdings.device_id
     LEFT JOIN users ON users.id = ops_holdings.user_id
     WHERE ($1::text[] IS NULL OR ops_holdings.location = ANY($1))
     ORDER BY ops_holdings.scanned_at DESC`,
    [locationFilter]
  );
  res.json({ holdings: result.rows, location: locationFilter });
});

app.post("/api/ops-holdings", auth, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "Missing deviceId" });
  }

  const userLocations = await getUserLocations(req.user.id);
  if (!userLocations.length) {
    return res.status(400).json({ error: "User has no location assigned" });
  }

  const deviceResult = await pool.query(
    "SELECT id, device_location FROM devices WHERE device_id = $1",
    [deviceId]
  );
  const device = deviceResult.rows[0];
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  if (!userLocations.includes(device.device_location)) {
    return res.status(403).json({ error: "Device not in your location" });
  }

  const existing = await pool.query(
    "SELECT id FROM ops_holdings WHERE device_id = $1",
    [device.id]
  );
  if (existing.rows[0]) {
    return res.status(409).json({ error: "Device already scanned" });
  }

  const result = await pool.query(
    "INSERT INTO ops_holdings (device_id, location, user_id) VALUES ($1, $2, $3) RETURNING *",
    [device.id, device.device_location, req.user.id]
  );
  await logAudit(
    req.user,
    "ops_scan",
    `Device ID ${deviceId} @ ${device.device_location}`
  );
  res.json({ holding: result.rows[0] });
});

app.get("/api/audit", auth, async (_req, res) => {
  const result = await pool.query(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200"
  );
  res.json({ logs: result.rows });
});

app.delete("/api/audit", auth, async (_req, res) => {
  await pool.query("DELETE FROM audit_logs");
  res.json({ ok: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
