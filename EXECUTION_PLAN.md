# Execution Plan — Student Help UI + Fixes

## Shape brief (locked)

**Problem (from screenshots):** Student Help felt empty/generic. My Requests showed 0/0 for Priya. “Quick Scenarios” looked like a hackathon demo.

**Goal:** Student lands → sees name + open requests → asks one campus question → value in &lt;60s.

**Visual lane:** Product · light shell · restrained crimson · denser boards · empty states with one CTA.

## How we did / will do it

| Step | Impeccable | Work | Status |
|------|------------|------|--------|
| 1 | Harden | Ticket reseed v3 + owner match for My Requests | Done |
| 2 | Onboard + clarify | Personal greeting + campus chips (not evaluator demos) | Done |
| 3 | Layout + polish | Compact identity strip, list requests, profile shortcuts | Done |
| 4 | Delight | Scholarship CGPA hint, room-aware hostel preset | Done |
| 5 | Next | Split App.jsx, polish Academic Ops, tests, critique | Planned |

## Features added

- Personalized welcome + room-aware help chips  
- My Requests list cards with SLA  
- Shortcuts: Wi‑Fi / hostel / scholarship from profile  
- Reliable seeded tickets for `22BCE1002` (and others)

## Login

1. `npm run dev` → open Local URL  
2. **Student Help:** `22BCE1002` / `vitb2026`  
3. Open **My Requests** — should show open + resolved items  
4. **Academic Ops:** Sign out → `ops.admin` / `campusops`  

Hard refresh once after this update (ticket data v3).

## Later (Phase B/C)

- Split `StudentShell` / `AdminShell`  
- `/impeccable critique` → `polish` on Academic Ops  
- Better intent model, real API, server auth  

See also [PLAN.md](./PLAN.md).
