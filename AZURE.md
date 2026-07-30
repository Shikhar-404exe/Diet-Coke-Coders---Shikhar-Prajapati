# Azure deploy notes (after local E2E is stable)

Do **not** deploy until the local demo path in [DEMO.md](./DEMO.md) works end-to-end.

## Target shape

| Local | Azure |
|-------|--------|
| Express on `:8787` | App Service (Node) or Container Apps |
| SQLite `server/data/*.db` | Azure SQL Database (same tables) |
| `server/uploads/` | Azure Blob Storage |
| OpenRouter key in `.env` | App Settings / Key Vault |
| Vite static build | App Service static + API, or Static Web Apps + API |

## Suggested steps

1. **Build frontend**: `npm run build` → serve `dist/` from Express in production, or host on SWA.
2. **Containerize API** (optional):
   - Node 20+ image (needs `node:sqlite` or switch to `mssql` driver)
   - Copy `server/`, run `npm ci --omit=dev && npm start`
   - Env: `PORT`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=...:free`, `CORS_ORIGIN`, DB connection
3. **Swap DB driver**: keep table names; replace `node:sqlite` with `tedious`/`mssql`. FTS → Azure Cognitive Search or SQL Full-Text later; keyword retrieval works as interim.
4. **Secrets**: store OpenRouter key in Key Vault; never ship in the SPA.
5. **Auth**: keep session tokens; later upgrade to Entra ID for staff if required.
6. **PDF**: multer → Blob; store `file_path` as blob URL; extract text on upload (same as local).

## App Settings checklist

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (must contain `:free` until you deliberately change policy)
- `CORS_ORIGIN` = your frontend origin
- `DATABASE_URL` / Azure SQL credentials
- `BLOB_CONNECTION_STRING` (when uploads move)

## Health

Expose `GET /health` for App Service health checks.
