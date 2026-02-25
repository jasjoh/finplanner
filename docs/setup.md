# Running the app

Local development setup for FinPlanner. MVP is local-only; no production or Docker instructions here.

The server and client both use **ESM** (ECMAScript modules). The server runs as Node ESM (`"type": "module"`); the client is built with Vite and outputs ESM.

## Prerequisites

- **Node.js** — version from [.nvmrc](../.nvmrc) (e.g. Node 24). Use `nvm use` if you use nvm.
- **pnpm** — package manager (`npm install -g pnpm`).
- **PostgreSQL** — running locally (e.g. on port 5432).

## Database

1. Create the database (if it doesn’t exist):

   ```bash
   createdb finplanner
   ```

2. Optional: set `DATABASE_URL` if your connection differs from the default:

   - Default: `postgresql://localhost:5432/finplanner`
   - Example: `export DATABASE_URL=postgresql://user:pass@localhost:5432/finplanner`

## Order of commands

1. **Install dependencies** (from repo root):

   ```bash
   pnpm install
   ```

2. **Run migrations** (from repo root or from `server/`):

   ```bash
   pnpm --filter server run migration:run
   ```

   Or from `server/`: `pnpm run migration:run`

3. **Start the server** (from repo root or from `server/`):

   ```bash
   pnpm run dev:server
   ```

   Or from `server/`: `pnpm run dev`

   Server listens on **port 5001** by default. Set `PORT` to override.

4. **Start the client** (in a second terminal, from repo root or from `client/`):

   ```bash
   pnpm run dev:client
   ```

   Or from `client/`: `pnpm run dev`

   Client dev server runs on **port 5000**. Open [http://localhost:5000](http://localhost:5000) in Chrome.

To run both server and client with one command from root:

```bash
pnpm run dev
```

## Quick smoke test

- **UI:** Open [http://localhost:5000](http://localhost:5000). You should see the FinPlanner heading.
- **API (no auth):**  
  `curl -s http://localhost:5001/api/health`  
  → should return `{"status":"ok"}`.
- **API (with Basic auth):** All other API routes require HTTP Basic. MVP credentials are hardcoded (see server source). Example:

  ```bash
  curl -s -u finplanner:finplanner-mvp http://localhost:5001/api/project
  ```

  Without valid credentials, `GET /api/project` (or any protected route) returns `401` with `{"error":"Unauthorized"}`.

## Client environment

- **VITE_API_URL** — API base URL for the client. Default in development: `http://localhost:5001/api`. Set in `.env` or at build time if your API is elsewhere.
