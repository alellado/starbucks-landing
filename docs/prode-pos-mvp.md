# STEP 1 - Architecture Overview

## Product scope
Production MVP for a FIFA World Cup 2026 prediction platform (Prode/Penca), focused on prediction gameplay, not gambling.

## System architecture
- Frontend: Next.js 15 + Tailwind CSS (`apps/prode-web`)
- Backend: Node.js + Express + TypeScript (`apps/prode-api`)
- Database: PostgreSQL (`db/prode_schema.sql`)
- Auth: JWT access token with role-based authorization (`user`, `admin`)

## Core modules
- Authentication: register, login, logout, profile
- Tournament: list, details, join
- Matches: fixtures, location (city/venue), and final scores
- Predictions: one prediction per user/match, editable until kickoff
- Scoring engine: exact=3, winner/draw=1, wrong=0 (configurable by tournament)
- Ranking: live leaderboard via SQL view + tie-breakers
- Admin panel: tournaments, match ingestion, result loading, user role management

## Scalability and clean architecture
- Domain modules split by responsibility (`auth`, `tournaments`, `matches`, `predictions`, `leaderboard`, `admin`)
- Services layer for scoring rules (`src/services/scoring.service.ts`)
- Repository/data layer per module
- Transactional writes for result updates + rescoring
- Indexed query paths for high-frequency reads (matches, predictions, leaderboard)
- Audit log for privileged actions

---

# STEP 2 - Database Schema

Main schema file: `db/prode_schema.sql`

## Main entities
- `users`
- `tournaments`
- `tournament_participants`
- `matches`
- `predictions`
- `audit_logs`

## Key constraints
- Unique email (`users.email`)
- One prediction per user/match (`UNIQUE (user_id, match_id)`)
- Valid score checks (`predicted_* >= 0`, `result_* >= 0`)
- Team mismatch check (`home_team <> away_team`)
- Tournament date validity (`end_date > start_date`)

## Ranking and scoring SQL assets
- `calc_prediction_points(...)` SQL function
- `leaderboard` SQL view with:
  - `total_points`
  - `exact_hits`
  - `winner_hits`
  - `position` (`RANK()` window function)

---

# STEP 3 - Backend

## Folder structure

```txt
apps/prode-api/
  src/
    app.ts
    server.ts
    config/env.ts
    db/pool.ts
    middleware/
      auth.ts
      error.ts
    routes/index.ts
    services/scoring.service.ts
    modules/
      auth/
        auth.controller.ts
        auth.repository.ts
        auth.routes.ts
      tournaments/
        tournaments.controller.ts
        tournaments.repository.ts
        tournaments.routes.ts
      matches/
        matches.controller.ts
        matches.repository.ts
        matches.routes.ts
      predictions/
        predictions.controller.ts
        predictions.repository.ts
        predictions.routes.ts
      leaderboard/
        leaderboard.controller.ts
        leaderboard.repository.ts
      admin/
        admin.controller.ts
        admin.repository.ts
        admin.routes.ts
```

## Core API endpoints

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Tournaments
- `GET /api/v1/tournaments`
- `GET /api/v1/tournaments/:tournamentId`
- `POST /api/v1/tournaments/:tournamentId/join`
- `GET /api/v1/tournaments/:tournamentId/matches`
- `GET /api/v1/tournaments/:tournamentId/leaderboard`

### Matches
- `GET /api/v1/matches/:matchId`

### Predictions
- `POST /api/v1/predictions`
- `GET /api/v1/predictions/me?tournamentId=<uuid>`

### Admin
- `POST /api/v1/admin/tournaments`
- `PATCH /api/v1/admin/tournaments/:tournamentId`
- `POST /api/v1/admin/tournaments/:tournamentId/reset`
- `POST /api/v1/admin/matches/bulk`
- `PATCH /api/v1/admin/matches/:matchId/result`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:userId/role`

Notas de reset:
- `mode: "results_only"`: limpia resultados de partidos y pone `points_awarded=0` en predicciones, sin borrar predicciones.
- `mode: "full"`: borra predicciones y limpia resultados; opcional `clearParticipants=true` para vaciar participantes.

## Core backend logic examples
- Prediction upsert and lock rules: `apps/prode-api/src/modules/predictions/predictions.controller.ts`
- Tournament join and validation: `apps/prode-api/src/modules/tournaments/tournaments.controller.ts`
- Scoring engine and rescoring: `apps/prode-api/src/services/scoring.service.ts`
- Result loading + transactional recalculation: `apps/prode-api/src/modules/admin/admin.controller.ts`

---

# STEP 4 - Frontend

## Folder structure

```txt
apps/prode-web/
  app/
    page.tsx
    login/page.tsx
    register/page.tsx
    tournaments/page.tsx
    tournaments/[id]/page.tsx
    tournaments/[id]/leaderboard/page.tsx
    admin/page.tsx
    layout.tsx
    globals.css
  components/
    top-nav.tsx
    tournament-card.tsx
    prediction-form.tsx
    leaderboard-table.tsx
  lib/
    api.ts
    auth.ts
```

## UX/UI direction
- Sports-oriented visual style inspired by ESPN/FIFA/DraftKings
- Bold heading typography (`Bebas Neue`) + performant body font (`Manrope`)
- Fast, minimal cards and gradient/radial background layers
- Mobile-ready layout via Tailwind responsive utilities

## Frontend functional pages
- Auth pages for register/login storing JWT token
- Tournament listing page
- Tournament detail page with fixture list and inline prediction form
- Leaderboard page (live standings)
- Admin page for entering final match results

---

# STEP 5 - Deployment Instructions

## 1) Database
1. Create PostgreSQL database (example: `prode`).
2. Run schema:
   - `psql "$DATABASE_URL" -f db/prode_schema.sql`
3. If your DB already existed before location support:
   - `psql "$DATABASE_URL" -f db/migrations/002_add_match_location.sql`
4. Add index for duplicate-safe bulk imports:
   - `psql "$DATABASE_URL" -f db/migrations/003_matches_natural_key_index.sql`

## 2) Install dependencies
- `pnpm install`

## 3) Backend env
Create `apps/prode-api/.env` from `apps/prode-api/.env.example`:
- `DATABASE_URL`
- `JWT_SECRET` (32+ chars)
- `API_PORT`
- `CORS_ORIGIN`

## 4) Frontend env
Create `apps/prode-web/.env.local` from `apps/prode-web/.env.example`:
- `NEXT_PUBLIC_API_URL=http://localhost:4100/api/v1`

## 5) Run locally
- API: `pnpm dev:prode-api`
- Web: `pnpm dev:prode-web`

## 5b) Run with Docker
- `docker compose -f infra/docker-compose.prode.yml up --build`

## 6) Production checklist
- Enforce HTTPS + secure reverse proxy (Nginx/ALB)
- Rotate JWT secret and store in vault/secret manager
- Enable DB backups + PITR
- Add rate limiting at API gateway
- Add centralized logs and metrics
- Run migrations in CI/CD before rolling app containers

## 7) Import masivo de fixtures (CSV)
- CSV de ejemplo: `db/seeds/worldcup2026-fixtures.sample.csv`
- Script: `scripts/import-fixtures.mjs`
- Columnas soportadas: `home_team,away_team,match_date,stage,city,venue,status`
- Comportamiento anti-duplicados: si un partido ya existe por `tournament_id + home_team + away_team + match_date`, el sistema lo actualiza en lugar de insertar otro.

Ejemplo:
```bash
API_BASE=http://localhost:4100/api/v1 \
ADMIN_EMAIL=alellado@gmail.com \
ADMIN_PASSWORD='tu_password' \
pnpm import:fixtures -- --file db/seeds/worldcup2026-fixtures.sample.csv --tournament-name "Mundial 2026 - General"
```

Modo validacion sin insertar:
```bash
API_BASE=http://localhost:4100/api/v1 \
ADMIN_EMAIL=alellado@gmail.com \
ADMIN_PASSWORD='tu_password' \
pnpm import:fixtures -- --file db/seeds/worldcup2026-fixtures.sample.csv --tournament-name "Mundial 2026 - General" --dry-run
```

### Convertir dataset de archivo (matches/teams/stages/host_cities)
- Script: `scripts/convert-archive-fixtures.mjs`
- Entrada esperada en carpeta base:
  - `matches.csv`
  - `teams.csv`
  - `tournament_stages.csv`
  - `host_cities.csv`

Ejemplo:
```bash
pnpm convert:fixtures -- --base "/Users/alellado/Desktop/archive" --out db/seeds/worldcup2026-from-archive.csv
```
