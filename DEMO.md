# Campus Triage — Demo Script (Hackathon)

## Before you start

1. Rotate your OpenRouter key if it was pasted in chat. Put the new key only in `server/.env` (never commit, never `VITE_*`).
2. Terminal A: `cd server && npm run dev` → API on http://localhost:8787
3. Terminal B: `npm run dev` → UI on http://localhost:5173
4. Confirm `GET /health` shows `"freeOnly": true` (default model `google/gemma-4-31b-it:free`; server rotates to other `:free` models on 429).

## Judge path (5–7 minutes)

### 1. Student Help — Wi‑Fi grounded answer
1. Open Student Help → `22BCE1002` / PIN `vitb2026`
2. Confirm calm themed shell + **API live** badge + theme toggle
3. Tap **Campus Wi‑Fi setup** (or ask “How do I connect to VITB-Secure?”)
4. Expect: short answer + `[Source: IT Services Handbook …]` — Wi‑Fi doc only

### 2. Hard refusal
1. Ask: “Write my Java homework / solve this leetcode”
2. Expect: campus-only refusal (no code)

### 3. Ticket ownership (phone-ready)
1. Ask: “My hostel fan is broken in Block B room 205”
2. Expect: **Confirm handoff** (controllable) — agent plan visible
3. Tap **Confirm file ticket** → ticket with `ownerRegNo=22BCE1002` + handoff summary
4. Open **My Requests** — status / SLA / in-progress after claim

### 4. Academic Ops resolve loop
1. Sign out → Academic Ops → `ops.admin` / `campusops`
2. Open ticket → **Claim** → optional note → **Mark Resolved** (student notified)
3. Sign back in as Priya → notification / My Requests updated

### 5. PDF RAG (staff)
1. Ops → Knowledge Base → upload a short admissions PDF
2. Student asks an admissions question covered by that PDF → answer cites that doc

### 6. Offline resilience
1. Stop the API (`Ctrl+C` in server terminal)
2. Student asks a Wi‑Fi question → UI shows offline fallback (local rules), no white screen

## Talking points
- Dual portals (login-gated; no in-app role flip)
- Grounded RAG from SQLite FTS + citation binding
- Free LLM only via OpenRouter (`*:free` enforced server-side)
- Azure-ready schema (swap SQLite → Azure SQL later)
- Mobile-first Student Help / PWA manifest

## Demo accounts
| Portal | ID | Secret |
|--------|-----|--------|
| Student | `22BCE1002` | `vitb2026` |
| Ops | `ops.admin` | `campusops` |
| IT desk | `it.desk` | `ithelp` |
