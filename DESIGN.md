# Design System — Campus Triage

## Mood
Campus registrar desk: quiet confidence, ink and light. Students feel calm daylight; ops feel focused night. One strong action color, everything else restraint.

## Color strategy
**Restrained.** Deep ink primary + one saffron action accent (campus India, not SaaS crimson kits). Cool slate neutrals — never cream/sand.

| Role | OKLCH | Use |
|------|-------|-----|
| ink / primary | `oklch(0.36 0.07 265)` | Brand, headings, primary filled buttons |
| primary-on | `oklch(0.99 0 0)` | On ink fills |
| action | `oklch(0.68 0.15 55)` | Single saffron CTA / demo emphasis |
| accent | `oklch(0.48 0.09 230)` | Links, secondary |
| accent-ops | `oklch(0.72 0.11 195)` | Ops teal |
| bg (student) | `oklch(0.975 0.008 250)` | Cool slate mist |
| surface | `oklch(1 0 0)` | Panels |
| muted | `oklch(0.44 0.025 260)` | Supporting text ≥4.5:1 |

## Typography
**Sora** (UI) + IBM Plex Mono (ticket IDs). Fixed rem scale. Headings −0.02em.

## Layout principles
- Student home = **My Requests dashboard first**; Ask help is second (lighter first paint)
- One-tap problems on dashboard auto-send into Ask help (no typing)
- Open request: **Open status** + **Continue in Help** (auto-ask about ticket)
- Ops: teal-forward night desk; queue / RAG desk / Pipeline
- Tickets always show priority grade + ETA + owner contact
- Login: split brand + doors with trust pills + triage steps
- Quiet density: useful micro-detail, never tip-wall spam

## Motion
160–200ms ease-out only. Prefer `prefers-reduced-motion`.
