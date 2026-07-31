# Campus Helpdesk Triage Agent

**Team:** Diet Coke Coders · **Lead:** Shikhar Prajapati
**Event:** [Summer of Codefest 2.0](https://github.com/Shikhar-404exe/Diet-Coke-Coders---Shikhar-Prajapati) — VIT Bhopal (Office of Students' Welfare · GDSC / Innovators · iNSIGHTS · IIC)
**Track:** **Track 2 — AI Agent** (Generative AI · LLMs · Autonomous Systems · NLP)
**Problem statement:** Campus Helpdesk Triage Agent

> Campus staff spend time answering the same questions about forms, approvals, schedules, and procedures. Build an agent that answers routine questions from **approved sources**, gathers the **missing details**, and routes unresolved issues to the **right human team** — with retrieval, safe refusal, and a clean handoff. Strong solutions are **transparent, controllable, and grounded**, not a generic chatbot.

---

## Live demo

| | |
|---|---|
| **URL** | [https://campus-triage-agent.vercel.app](https://campus-triage-agent.vercel.app) |
| **Hosting** | Vercel (static build, frontend-only) |
| **Agent mode** | Runs on the built-in offline rules engine — works standalone, no API key needed |

Demo credentials: Student `22BCE1002` / PIN `vitb2026` · Ops `ops.admin` / `campusops`

---

## What this project is

**Campus Triage** is a dual-portal campus helpdesk agent:

| Portal | Who | What they do |
|--------|-----|----------------|
| **Student Help** | Students (e.g. `22BCE1002`) | Ask campus questions, get cited answers, confirm before a ticket is filed, track requests + QR + photos |
| **Academic Ops** | Staff (e.g. `ops.admin`) | Claim escalations, hit SLAs, leave notes, resolve tickets, manage RAG / policy chunks, inspect agent pipeline |

One triage brain — role is fixed at login (no in-app student↔admin flip).

---

## Hackathon fit (Track 2)

| Judge look-for | How we deliver it |
|----------------|-------------------|
| **Grounded answers** | RAG over approved policy chunks (SQLite FTS + seeded docs / staff uploads). Answers carry citations. |
| **Safe refusal** | Rule safety (homework / code / abuse / off-topic) + weak-retrieval gate → refuse or clarify, **never invent policy**. |
| **Controllable handoff** | Escalate is **proposed** first; student must **Confirm** before a ticket is created. |
| **Transparent agent** | Pipeline UI: classify → retrieve → decide → answer / refuse / propose handoff (confidence + steps). |
| **Useful ops handoff** | Ticket has department, priority, ETA, owner contact, handoff summary, optional photo; staff claim / note / resolve. |
| **Not a toy chatbot** | Campus-only system prompt, free OpenRouter models (`:free`), dual portals, offline local-rules fallback. |

### Agent pipeline

```text
Student message
  → Safety classify (rules)
  → Retrieve trusted docs (FTS + category prefer)
  → LLM plan (OpenRouter free) OR local grounded fallback
  → Action:
       ANSWER (+ citation)
       CLARIFY (missing slots)
       ESCALATE_PROPOSE → student Confirm → ticket → Ops queue
       REFUSAL
```

---

## What's done (shipped)

### Agent & backend
- [x] Express API + SQLite (`server/`) — auth, tickets, documents, agent chat
- [x] OpenRouter free-model chain with retries / fallbacks
- [x] Local grounded fallback when LLM is down (Wi‑Fi, portal, hostel, fees, etc.)
- [x] Controllable escalate (`ESCALATE_PROPOSE` → confirm → ticket)
- [x] Priority grades + ETA + department owner contact on handoffs
- [x] RAG desk: index text / PDF chunks, promote/reject candidates, multi-word filter
- [x] Rate limiting on agent chat; sessions + role checks

### Student Help UI
- [x] Login gate (Student Help / Academic Ops doors)
- [x] My Requests dashboard — open/resolved, status rail, QR, photo attach
- [x] Ask help chat — presets, voice, citations, confirm/cancel handoff
- [x] Judge demo path (grounded → refuse → handoff)
- [x] Theme toggle (light student / dark ops defaults)
- [x] Live / Offline / Reconnect badge + silent demo re-login when API returns

### Academic Ops UI
- [x] Ops queue — NL filter, claim, notes, resolve/reopen, SLA timers, charts
- [x] RAG desk — pending promote strip + indexed chunks
- [x] Pipeline — simulate student asks + reasoning trace + evaluator

### Stability / polish
- [x] Page split (`StudentDashboard`, `AdminOpsPage`, `AdminKbPage`, `PlaygroundPage`)
- [x] Error boundary (no full white screen on one view crash)
- [x] Auto-scroll that doesn't yank the whole page
- [x] Mobile-friendly dash layouts + bottom nav

---

## What's left / next (not blockers for demo)

| Item | Status |
|------|--------|
| Real campus SSO / production auth | Not in scope for hackathon demo (demo PIN/staff passwords) |
| Production backend hosting (Express + SQLite on a persistent host) | Current live demo runs frontend-only on the offline rules fallback |
| Stronger multilingual NLU beyond bilingual prompts | Partial (Hinglish works; deep i18n UI not done) |
| Full unit/e2e CI suite | Light API harness (`scripts/deep-test-api.mjs`); expand later |
| Semantic / GraphRAG extras | Present for Trace/demo depth; core path is FTS + LLM |
| Production OpenRouter paid models | Intentionally `:free` only for Track 2 cost/safety |

---

## Quick start

### Prerequisites
- Node.js 18+ (20/22 recommended)
- OpenRouter API key (free models) — **only** in `server/.env`, never `VITE_*`

### 1) API

```bash
cd server
cp .env.example .env   # if present; else create .env
# OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=google/gemma-2-9b-it:free
npm install
npm run dev            # http://localhost:8787
```

### 2) Frontend

```bash
# from repo root
npm install
npm run dev            # http://localhost:5173  (proxies /auth /agent /tickets /documents /health)
```

### 3) Deploy to Vercel (frontend only)

```bash
npm run build          # → dist/
vercel --prod          # static deploy; app falls back to offline rules engine
```

---

## Demo logins

| Portal | ID | Secret |
|--------|----|--------|
| Student Help | `22BCE1002` | `vitb2026` |
| Academic Ops | `ops.admin` | `campusops` |

### Judge path (~6 min)

1. Student → **Judge demo** (or Wi‑Fi ask) → **Grounded Answer** + View Source
2. "Write my Python homework" → **Safe Refusal**
3. Hostel fan/light broken → **Confirm file ticket** → My Requests + QR/photo
4. Ops → claim → note → resolve

---

## Code map (how the repo is organized)

```text
campus_triage_agent/
├── src/                      # Vite + React UI
│   ├── App.jsx               # Shell: session, tickets poll, agent send, Live/Reconnect
│   ├── LoginGate.jsx         # Portal doors + auth
│   ├── api.js / auth.js      # HTTP client + session/token helpers
│   ├── agentEngine.js        # Client-side local rules / processQuery fallback
│   ├── advancedEngine.js     # Debate, SLA predict, NL filter helpers (ops/trace)
│   ├── knowledgeBase.js      # Seeded policy chunks (client mirror)
│   ├── pages/
│   │   ├── StudentDashboard.jsx
│   │   ├── AdminOpsPage.jsx
│   │   ├── AdminKbPage.jsx
│   │   └── PlaygroundPage.jsx   # Ask help (student) / Pipeline (ops)
│   ├── components/           # ErrorBoundary, TicketBits (SLA, owner card)
│   └── deptDirectory.js      # Dept → owner phone/email + ETA by priority
├── server/                   # Express API
│   ├── src/index.js
│   ├── src/routes/
│   │   ├── auth.js           # student / staff login, /me
│   │   ├── agent.js          # /agent/chat — retrieve → plan → propose/file
│   │   ├── tickets.js        # CRUD-ish, photos, audit, outages
│   │   └── documents.js      # RAG chunks + PDF upload
│   ├── src/agent/
│   │   ├── openrouter.js     # free model calls + ruleSafety
│   │   ├── retrieve.js       # FTS retrieval
│   │   └── directory.js      # intent → department
│   └── src/db/               # SQLite schema + seed
├── scripts/deep-test-api.mjs # Smoke: auth, ANSWER/REFUSAL/handoff, RBAC
└── vite.config.js            # Dev proxy to :8787
```

### Important flows in code

1. **Chat** — `App.jsx` `handleSendMessage` → `agentChat` (`/agent/chat`) → `finishWithResult`. On API failure, local `processQuery` / `processQueryAsync` fallback; health poll restores **Live**.
2. **Handoff** — server turns model `ESCALATE` into `ESCALATE_PROPOSE` + `pendingEscalate`; UI Confirm → `confirmEscalate: true` creates the ticket.
3. **Ops** — `AdminOpsPage` claims/resolves via `patchTicket`; students see updates on My Requests.
4. **RAG** — Ops indexes in `AdminKbPage`; retrieval used by `server/src/agent/retrieve.js` before the LLM answers.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, Vite 8, Tailwind, Lucide, ECharts |
| API | Node Express, SQLite (`node:sqlite`) |
| LLM | OpenRouter **free** models only (`:free`) |
| Embeddings (optional depth) | Transformers.js / Voy in client for semantic extras |
| Deployment | Vercel (static frontend) |

---

## Security notes (demo)

- API keys live **only** in `server/.env` (gitignored). Never commit keys.
- Demo passwords are for the hackathon judges only — not production SSO.
- Rotate any key that was ever pasted into chat.

---

## License / submission

Hackathon submission repository:  
https://github.com/Shikhar-404exe/Diet-Coke-Coders---Shikhar-Prajapati

Built for VIT Bhopal · Summer of Codefest 2.0 · Prize pool context: event flyer (₹40,000).
