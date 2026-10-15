# Project Hub — Frontend

React 19 + TypeScript + Bun, **react-router-dom** for routing, **React Context** for state (auth, theme, toasts) and **custom hooks** for data fetching. GitHub-style UI, light/dark theme, responsive.

## Run

```bash
cd frontend
bun install
bun dev                      # http://localhost:3000
```

The Bun server serves the UI and **proxies `/api/*` to the backend** (default `http://localhost:8000`), so the httpOnly auth cookie works with no CORS setup. Change the target with `BACKEND_URL=http://host:port bun dev`.

Production: `bun run build` then `bun run start`. Type-check: `bun run typecheck`.

## Backend additions (required)
The existing backend had no way to restore a session or list users, so copy these from `../backend-additions/` into `backend/`:
- `src/controllers/users.controller.ts` (new)  — `GET /api/users/me`, `GET /api/users` (Admin / Project Manager)
- `src/routes/users.route.ts` (new)
- `src/app.ts` — adds `app.use("/api/users", usersRouter)`

## Structure
```
src/
  api/         client (fetch wrapper, ApiError), services (endpoint functions), types
  context/     AuthContext, ThemeContext, ToastContext
  hooks/       useAsync (fetch/cancel/poll/optimistic), useData (useProjects, useTasks, ...), useDebounce
  lib/         formatting, permission helpers (mirror backend rules)
  components/  ui/ (Modal, Field, Badges, Pagination, ...), layout/, projects/, tasks/ (Kanban, list, forms)
  pages/       Login, Register, Dashboard, Projects, ProjectDetail, Tasks, TaskDetail, Users
```

## Bonus features done
Kanban board with drag-and-drop (optimistic, permission-aware, select fallback for touch/keyboard), auto-refresh (polling) of board/task/dashboard, dark mode, frontend Dockerfile, GitHub Actions CI.
