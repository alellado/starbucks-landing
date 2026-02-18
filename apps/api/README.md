# API (Node + Express + TypeScript)

Responsabilidades:

- auth + RBAC
- CRUD de intents/documents/versions
- orquestacion de jobs IA y policy
- auditoria de acciones editoriales

## Endpoints implementados

- `GET /health`
- `GET /v1/intents`
- `GET /v1/documents`
- `GET /v1/documents/:documentId`
- `GET /v1/jobs/:jobId`
- `GET /v1/jobs`
- `GET /v1/documents/:documentId/versions`
- `GET /v1/documents/:documentId/publications`
- `GET /v1/versions/:versionId`
- `POST /v1/intents`
- `POST /v1/documents`
- `POST /v1/documents/:documentId/generate`
- `POST /v1/versions/:versionId/validate`
- `POST /v1/versions/:versionId/publish`

`publish` bloquea por defecto si el ultimo `policy_report` tiene `blocking_issues > 0`.
Puedes bypass con `force: true`.

`GET /v1/documents/:documentId/publications` soporta:
- `channel` (`web|app|newsletter|social`)
- `limit` (1..100)
- `cursor` (token opaco devuelto como `nextCursor`)

`GET /v1/documents/:documentId/versions` soporta:
- `limit` (1..100)
- `cursor` (token opaco devuelto como `nextCursor`)

`GET /v1/documents` soporta:
- `status` (`draft|in_review|approved|published|archived`)
- `search` (ILIKE por titulo)
- `limit` (1..100)
- `cursor` (token opaco devuelto como `nextCursor`)

`GET /v1/intents` y `GET /v1/jobs` soportan paginacion por `limit/cursor`.

Usa `docs/api/openapi.yaml` como contrato inicial.

## Variables de entorno

- `DATABASE_URL` (requerida)
- `API_PORT` (default: `3001`)
- `AI_ORCHESTRATOR_URL` (default: `http://localhost:4001`)
- `POLICY_ENGINE_URL` (default: `http://localhost:4002`)
- `CORS_ORIGIN` (default: `*`; recomendado `http://localhost:3000`)

## Dev

```bash
pnpm --filter @cms/api dev
```
