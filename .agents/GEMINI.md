# DigitalClassRoom — Project Context & Design Rules

## 📚 MANDATORY: Architecture Docs (Read Before Building Any Screen)

These 3 files define the COMPLETE app specification. You MUST read the relevant file(s) before building any screen or service:

| File | What's Inside | Path |
|------|--------------|------|
| **Part1_Backend_Matrix.md** | All REST API endpoints, DTOs, roles, critical invariants (I1–I7), backend gaps (G1–G7) | `.agents/docs/Part1_Backend_Matrix.md` |
| **Part2_Screen_Inventory.md** | All 52 screens — exact UI spec, backend calls, form fields, UX states per screen | `.agents/docs/Part2_Screen_Inventory.md` |
| **Part3_Routing_UX_Architecture.md** | Route tree, guards, 8 UX states, age-adaptive system, offline/sync architecture, component count | `.agents/docs/Part3_Routing_UX_Architecture.md` |

> ⚠️ **Rule:** Before implementing ANY component, service, or screen — read the relevant section from these docs first. Never guess API paths, DTOs, or screen specs.

---

## 📱 Project Overview
- **App:** DigitalClassRoom — Digital School Management App for Indian schools
- **Framework:** Ionic + Angular (standalone components)
- **Backend:** Spring Boot REST API (JWT Auth)
- **Language:** TypeScript + SCSS
- **Bilingual:** English + Telugu (NFC Unicode — NEVER normalize Telugu strings)
- **Portals:** 4 role portals (Student, Teacher, Parent, Admin)
- **Total Screens:** 52 standalone Angular components
- **Architecture Docs:** `G:\HATS\IONIC\AI\UI\` (Part1, Part2, Part3)

---

## 🏗️ Architecture Summary
- **Student Portal** `/student` — Bottom tabs (Home, Learn, AI, Progress, Me) — 19+ screens
- **Teacher Portal** `/teacher` — Bottom tabs (Home, Classes, Activities, Analytics, Me) — 12 screens
- **Parent Portal** `/parent` — Bottom tabs (Home, Progress, Tests, Alerts, Me) — 5 screens
- **Admin Panel** `/admin` — Side-nav, Desktop-first responsive — 9 screens
- **Auth** — Splash, Login, ChangePassword (shared, no tabs)
- **Guards:** AuthGuard, RoleGuard, PublicGuard, ExamSessionGuard

---

## 🎨 Design System — EduPulse Theme

### Mode
- **Primary:** Dark mode first (`#0D1117` background)
- Light mode toggle supported via CSS custom properties

### Portal Brand Colors (CRITICAL — each portal has its own primary color)
| Portal | Primary | Usage |
|--------|---------|-------|
| Student | `#6C63FF` Violet | All student screens |
| Teacher | `#2563EB` Blue | All teacher screens |
| Parent  | `#059669` Emerald | All parent screens |
| Admin   | `#6366F1` Indigo | Admin panel |

### Base Surface Colors
```
--bg-app:       #0D1117
--surface-1:    #161B22
--surface-2:    #1C2128
--border-subtle: rgba(255,255,255,0.06)
--border-default: rgba(255,255,255,0.12)
```

### Semantic Colors
```
--color-success: #00D9A3
--color-warning: #F59E0B
--color-danger:  #FF6B6B
--color-info:    #4ECDC4
--color-offline: #94A3B8
```

### Subject Card Gradients
```
Math:    linear-gradient(135deg, #667EEA, #764BA2)
Science: linear-gradient(135deg, #11998E, #38EF7D)
Telugu:  linear-gradient(135deg, #F7971E, #FFD200)
English: linear-gradient(135deg, #2563EB, #4ECDC4)
History: linear-gradient(135deg, #FC5C7D, #6A3093)
EVS:     linear-gradient(135deg, #56AB2F, #A8E063)
Default: linear-gradient(135deg, #6C63FF, #8B85FF)
```

---

## ✒️ Typography — Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?
  family=Plus+Jakarta+Sans:wght@400;500;600;700;800&
  family=Inter:wght@300;400;500;600&
  family=Outfit:wght@400;500;600&
  family=Noto+Sans+Telugu:wght@400;500;600;700&
  display=swap" rel="stylesheet">
```

| Font | Role |
|------|------|
| Plus Jakarta Sans | Hero headings, page titles, greetings |
| Inter | Body text, descriptions, form data |
| Outfit | Buttons, nav labels, badges, tags |
| Noto Sans Telugu | ALL Telugu text fields (MANDATORY per Invariant I3) |

---

## 🪟 Glassmorphism Standard
```scss
.glass-card {
  background: rgba(22, 27, 34, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
}
```

---

## 📐 Spacing & Radius Tokens
```
--space-4: 16px  --space-6: 24px  --space-8: 32px
--radius-md: 12px  --radius-xl: 20px  --radius-2xl: 24px  --radius-full: 9999px
--shadow-glow: 0 8px 32px rgba(108, 99, 255, 0.2)
```

---

## 👶 Age-Adaptive System (Student Portal)
Students in Std 1-10 get different UI density:
| Group | Standards | Font Base | Tap Target | Style |
|-------|-----------|-----------|------------|-------|
| early | Std 1-2 | 20px | 56px | Warm pastels, Gyan mascot, bouncy animations |
| middle | Std 3-5 | 18px | 48px | Bright vibrant, gamification |
| upper | Std 6-7 | 16px | 44px | Cool blues/greens, standard ease |
| senior | Std 8-10 | 15px | 40px | Professional neutral, minimal animation |

Applied via `[data-age-group]` attribute on `<ion-app>`.

---

## 💫 Animation Rules
- **Page enter:** `translateY(20px) → 0` ease-out 380ms
- **Card list:** stagger 50ms between cards
- **Early group:** bouncy spring (scale 0.6 → 1.1 → 1)
- **Senior group:** disable all animations (prefers-reduced-motion)
- **Exam submit:** confetti effect
- **Offline:** shake badge
- **Loading:** shimmer skeleton (never spinner)
- **Mascot "Gyan":** floating bounce, Early group only

---

## 🔑 Critical Invariants (from architecture docs)
| # | Rule |
|---|------|
| I1 | IDOR: never cache child list client-side for Parent portal |
| I2 | Tenant scoping: always inject `schoolId` from `/api/auth/me` |
| I3 | Telugu NFC: use `Noto Sans Telugu` font, never `normalize()` Telugu strings |
| I4 | Anti-cheat: hide "Ask AI" during ASSESSMENT type exams |
| I5 | Async ingestion: poll with exponential backoff, show step progress UI |
| I6 | Force password change: detect via interceptor, route to `/change-password` |
| I7 | Media streaming: inject Auth header, use Object URL from blob |

---

## 📋 8 UX States (ALL screens must implement)
Every page uses `<app-ux-state [state]="pageState">`:
`normal | loading | empty | error | offline | expired | no-access | success`
- Loading → shimmer skeleton (never spinner)
- Empty → mascot + message + CTA
- Offline → top banner + cached data
- Success → green toast 3s (confetti on exam submit)

---

## 🔌 MCP Stack
- **Context7** — Live Ionic/Angular docs
- **Filesystem** — Project file access
- **GitHub** — Version control

---

## 📁 Project Location
`G:\HATS\IONIC\DigtalClassRoom\`

---

## 🚫 Things to NEVER do
- Never use Ionic default colors (override all with custom palette)
- Never use `normalize()` or `trim()` on Telugu strings
- Never show AI hint button during formal exams (ASSESSMENT type)
- Never use plain spinners — always use shimmer skeletons
- Never use `margin/padding` inline — always use `--space-*` tokens
- Never mix portal color themes (Student=Violet, Teacher=Blue, Parent=Emerald, Admin=Indigo)
