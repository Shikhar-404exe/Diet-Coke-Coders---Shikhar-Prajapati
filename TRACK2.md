# Track 2 — Campus Helpdesk Triage Agent

**Hackathon track:** Generative AI | LLMs | Autonomous Systems | NLP  

**Problem we solve:** Campus staff burn time on repeat questions about forms, approvals, schedules, and procedures. This agent answers from **approved sources**, gathers missing details, and **routes unresolved work** to the right human team.

## How we meet the judging bar

| Judge look-for | How we deliver it |
|----------------|-------------------|
| **Grounded responses** | SQLite FTS RAG over seeded policy docs + staff PDF uploads. Answers require retrieved citations; category filter keeps Wi‑Fi Q from citing admissions PDFs. |
| **Safe refusal when uncertain** | Rule safety (code/homework/abuse) + confidence gate: weak/no retrieval → `CLARIFY` or `ESCALATE`, never invent policy. |
| **Escalation discipline** | Structured actions: `ANSWER \| CLARIFY \| ESCALATE \| REFUSAL`. Escalate proposes first; student **confirms** before a ticket is created (controllable agent). |
| **Useful handoff for ops** | Ticket carries slots, department, priority, SLA, **handoff summary**, agent plan JSON. Staff can **claim**, add **internal notes**, resolve with **student-visible message** + notification. |
| **Transparent agent** | UI shows classify → retrieve → decide → handoff steps with retrieval confidence. |
| **Not a generic chatbot** | Campus-only system prompt, free OpenRouter models (`:free` only), dual portals (Student Help / Academic Ops), offline local-rules fallback. |

## Agent pipeline

```text
Student message
  → Safety classify (rules)
  → Retrieve trusted docs (FTS + category prefer)
  → LLM plan (OpenRouter free) OR local grounded fallback
  → Action:
       ANSWER (+ citation)
       CLARIFY (slots)
       ESCALATE_PROPOSE → student Confirm → ticket + ops queue
       REFUSAL
```

## Demo path for judges (≈6 min)

1. Student `22BCE1002` / `vitb2026` — tap **Judge demo** (or ask Wi‑Fi) → **Grounded Answer** + source + agent plan.
2. Ask “write my Python homework” → **Safe Refusal**.
3. “Fan broken in my room” → propose handoff → **Confirm** → ticket with owner + handoff summary.
4. **My Requests** → attach a photo of the issue; see status / Staff update.
5. Ops `ops.admin` / `campusops` — claim → note → resolve (student notified).
6. Optional: upload admissions PDF → ask admissions Q → cites that doc only.

Duplicate spike (≥3 similar open tickets / 30 min) auto-surfaces as an incident banner.

Full script: [DEMO.md](./DEMO.md) · Azure later: [AZURE.md](./AZURE.md)

## Run locally

```bash
cd server && npm run dev   # :8787
npm run dev                # :5173 (proxied API)
```

Key only in `server/.env` (`OPENROUTER_API_KEY`). Rotate if ever pasted in chat.
