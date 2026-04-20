# Hackathon Dashboard Demo

React + TypeScript + Vite hackathon management system with admin and participant dashboards.

## Tech Stack

- React 19, TypeScript, Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite` plugin, `@import "tailwindcss"` in index.css)
- React Router DOM v7
- Supabase (DB + Realtime)
- lucide-react

## Dev

```bash
npm install
npm run dev
```

## Key Architecture

- **Each page wraps its own layout** — not nested routes
- **TypeScript**: `verbatimModuleSyntax` enabled — always use `import type` for type-only imports
- **Tailwind**: use `sm:` / `lg:` breakpoints for responsive design
- **Supabase hooks**: each `useXxx` hook creates its own uniquely-named realtime channel (module-level counter prevents duplicate channel name conflicts when multiple instances coexist)
- **Notification contexts**: `MilestonesNotification.tsx` and `NoticesNotification.tsx` live inside `ParticipantLayout` — consumers must be descendants of the provider. Hooks called in a page's function body run *outside* the provider that lives inside that page's layout child.
- **Score criteria**: 4 items × 25pt = 100pt (`SCORE_CRITERIA` in `src/data/scoreStore.ts`)
- **`isDone` for milestones**: computed on frontend (`date < today`), not stored in DB

## Routes

| Path | Description |
|------|-------------|
| `/admin` | Admin dashboard |
| `/admin/participants` | Participants & teams |
| `/admin/notices` | Notice management (CRUD) |
| `/admin/milestones` | Milestone management (CRUD, admin only) |
| `/admin/submissions` | Submission review |
| `/admin/scores` | Scoring board (admin view-only, judge can input) |
| `/admin/score-input` | Score input — `admin` + `judge` roles |
| `/participant` | Participant dashboard |
| `/participant/schedule` | Milestone timeline |
| `/participant/notices` | Notice list |
| `/participant/submit` | Submission form |
| `/participant/notifications` | Notifications |

## Branch

`claude/setup-react-vite-project-6hmBh`
