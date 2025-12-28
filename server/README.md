# AssetTracking API

## Local run

```bash
cd server
npm install
cp .env.example .env
npm start
```

Apply schema:

```bash
psql "$DATABASE_URL" -f schema.sql
```

## Render

Use the `render.yaml` blueprint at the repo root.

After deploy, run the schema once in Render's shell:

```bash
psql "$DATABASE_URL" -f schema.sql
```

Bootstrap admin:

```bash
curl -X POST "$API_URL/api/bootstrap" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","username":"admin","password":"change-me"}'
```

Then log in via `/api/login`.
