# Campus Triage — Plan & Login Guide

## How to login

1. Run the app: `npm run dev` → open the Local URL (e.g. http://localhost:5174/).
2. You will see the **dual portal gate** (not a role toggle).
3. Pick a door and sign in:

### Student Help (light shell)

| Field | Value |
|-------|--------|
| Registration number | `22BCE1001`, `22BCE1002`, `22BME2001`, `22BIT1023`, or `22BCE2005` |
| PIN | `vitb2026` |

What you get: Ask Campus Help chat + My Requests. No ops tools.

**Try first:** `22BCE1002` / `vitb2026` — seeded open + resolved tickets already appear under My Requests.

### Academic Ops (dark shell)

| Staff ID | Password |
|----------|----------|
| `ops.admin` | `campusops` |
| `it.desk` | `ithelp` |

What you get: triage queue, resolve/webhook, guardrails, knowledge base, agent trace/evaluator.

**To switch portals:** Sign out → choose the other door. Roles never flip inside the app.

---

## Roadmap

### Phase A — Bugs (done in this pass)

| # | Item | Status |
|---|------|--------|
| A1 | Stamp `ownerRegNo` / `ownerEmail` on every escalated ticket | Done |
| A2 | Student My Requests matches owner + slots; seed demo tickets | Done |
| A3 | Inject hostel/ID/CGPA **after** intent is known (first message) | Done |
| A4 | Single session source (`auth.js`); studentPortal binds from session | Done |
| A5 | Align `processQuery` with `processQueryAsync` (RAG / escalate rules) | Done |
| A6 | README + this plan document login steps | Done |

### Phase B — Structure (next)

| # | Item |
|---|------|
| B1 | Split `App.jsx` → `StudentShell` / `AdminShell` / shared hooks |
| B2 | Unit tests: intent, slots, scholarship policy, auth gate |
| B3 | Impeccable `critique` → `polish` on gate + both shells |

### Phase C — Product depth (later)

| # | Item |
|---|------|
| C1 | Better intent routing (classifier / LLM) instead of keywords only |
| C2 | Real handoff API (replace webhook simulator) |
| C3 | Server-side auth (demo passwords leave the client) |
| C4 | Accessibility pass (contrast, keyboard, reduced motion) |

---

## Demo flow (smoke test)

1. **Student:** login `22BCE1002` / `vitb2026` → My Requests shows Priya’s tickets → Chat: “My hostel light is broken” → auto-uses Block B / 205 → escalate → new ticket under My Requests.
2. **Sign out** → **Academic Ops:** `ops.admin` / `campusops` → queue → Mark Resolved.
3. Sign out → student again → ticket under My Resolved Requests.
