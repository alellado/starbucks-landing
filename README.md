# AI-Native CMS Monorepo

CMS pensado desde cero para que la IA sea el motor de redaccion, edicion, compliance y distribucion multicanal.

## Stack propuesto (MVP -> v1)

- Frontend Studio (MVP): static web app + Node server simple
- API Gateway (MVP): Express + TypeScript
- Orquestacion IA: Python + FastAPI + LangGraph/LlamaIndex-style pipelines
- Policy Engine (MVP): Python + FastAPI (reglas declarativas)
- Datos: PostgreSQL 16 + pgvector
- Cache/colas: Redis + BullMQ
- Storage media: S3 compatible
- Observabilidad: OpenTelemetry + Grafana/Tempo/Loki
- Auth/RBAC: Keycloak o Auth0 (segun preferencia de negocio)

## Estructura

```txt
apps/
  studio/                # UI de redactores/editores (IA-first)
  api/                   # BFF + API publica
services/
  ai-orchestrator/       # Pipelines de generacion, reescritura, RAG
  policy-engine/         # Validaciones y scoring de riesgo/calidad
packages/
  content-graph/         # Tipos, contratos y logica del grafo de contenido
db/
  schema.sql             # Modelo de datos inicial
docs/
  architecture.md        # Decisiones tecnicas y flujo end-to-end
  api/openapi.yaml       # Contrato API inicial
infra/
  docker-compose.yml     # Stack local
```

## Flujo IA-first (resumen)

1. Editor define intencion: objetivo, audiencia, tono, restricciones.
2. IA propone un `Content Graph` por bloques + assets sugeridos.
3. Editor corrige en lenguaje natural o en modo diff.
4. Policy Engine valida y emite score (brand/legal/SEO/a11y).
5. Publicacion a canales + variantes A/B.
6. Feedback de rendimiento alimenta nuevas sugerencias.

Detalles en `docs/architecture.md`.

## Inicio rapido sugerido

1. Levantar base local:
   - `docker compose -f infra/docker-compose.yml up -d`
2. Crear schema:
   - `psql "$DATABASE_URL" -f db/schema.sql`
3. Instalar dependencias JS:
   - `pnpm install`
4. Levantar API:
   - `pnpm dev:api`
5. Levantar Studio (en otra terminal):
   - `pnpm dev:studio`
   - abrir `http://localhost:3000`
6. Levantar orquestador IA (en otra terminal):
   - `cd services/ai-orchestrator`
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload --port 4001`
7. Levantar policy engine (otra terminal):
   - `cd services/policy-engine`
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload --port 4002`

## Smoke test end-to-end

1. Crear intent:
```bash
curl -s -X POST http://localhost:3001/v1/intents \
  -H "content-type: application/json" \
  -d '{"title":"Landing IA","objective":"Capturar leads","audience":"CMOs SaaS","tone":"directo"}'
```

2. Crear documento (usa el `intentId` devuelto):
```bash
curl -s -X POST http://localhost:3001/v1/documents \
  -H "content-type: application/json" \
  -d '{"title":"Producto X","intentId":"<INTENT_ID>"}'
```

3. Generar version:
```bash
curl -s -X POST http://localhost:3001/v1/documents/<DOCUMENT_ID>/generate \
  -H "content-type: application/json" \
  -d '{"mode":"draft","instructions":"Incluir CTA fuerte"}'
```

4. Consultar estado del job (usa `JOB_ID` del paso anterior):
```bash
curl -s http://localhost:3001/v1/jobs/<JOB_ID>
```

5. Listar versiones del documento (para tomar `VERSION_ID`):
```bash
curl -s http://localhost:3001/v1/documents/<DOCUMENT_ID>/versions
```

Con paginacion:
```bash
curl -s "http://localhost:3001/v1/documents/<DOCUMENT_ID>/versions?limit=10&cursor=<CURSOR>"
```

6. Validar version:
```bash
curl -s -X POST http://localhost:3001/v1/versions/<VERSION_ID>/validate \
  -H "content-type: application/json"
```

7. Publicar version:
```bash
curl -s -X POST http://localhost:3001/v1/versions/<VERSION_ID>/publish \
  -H "content-type: application/json" \
  -d '{"channel":"web","variantKey":"default","force":false}'
```

8. Ver historial de publicaciones del documento:
```bash
curl -s http://localhost:3001/v1/documents/<DOCUMENT_ID>/publications
```

Con filtros/paginacion:
```bash
curl -s "http://localhost:3001/v1/documents/<DOCUMENT_ID>/publications?channel=web&limit=10&cursor=<CURSOR>"
```

Si devuelve `409`, hubo bloqueantes de policy. Puedes corregir contenido o publicar forzado con `force:true`.

Si todo va bien, el job queda encolado y luego en `succeeded`, con `document_versions` y `ai_trace_events` creados. La validacion persiste `policy_reports`.

Tambien puedes ejecutar el smoke test automatico:
```bash
API_BASE=http://localhost:3001 ./scripts/smoke-test.sh
```

## Endpoints base para Studio

- `GET /v1/intents`
- `GET /v1/documents`
- `GET /v1/documents/:documentId`
- `GET /v1/versions/:versionId`
- `GET /v1/jobs`

## Principio no negociable

Toda salida IA debe ser trazable:

- modelo y version
- prompt y herramientas usadas
- fuentes consultadas
- reglas aplicadas
- usuario que aprobo
