# Arquitectura detallada (AI-native CMS)

## 1) Dominios principales

- `Intent`: briefing de negocio/editorial.
- `Knowledge Source`: fuentes internas/externas versionadas.
- `Content Graph`: nodos de contenido reutilizable.
- `Policy`: reglas de validacion y compliance.
- `Publication`: despliegue por canal y variante.
- `Feedback`: metricas y aprendizaje continuo.

## 2) Servicios

### `apps/studio`
- UI para edicion por bloques + chat IA.
- Vista de trazabilidad por bloque (fuentes, prompt, cambios).
- Workflows de aprobacion editorial/legal.

### `apps/api`
- Autenticacion/autorizacion.
- API para CRUD de entidades core.
- Disparador de jobs hacia `ai-orchestrator` y `policy-engine`.

### `services/ai-orchestrator`
- Pipeline:
  1. normaliza intent,
  2. recupera contexto (RAG),
  3. genera borrador en formato grafo,
  4. registra trazabilidad.
- Subtareas: generate, rewrite, summarize, channel-adapt.

### `services/policy-engine`
- Evalua:
  - tono de marca,
  - riesgo legal,
  - SEO,
  - accesibilidad,
  - factualidad basica.
- Devuelve `score`, `findings`, `blocking_issues`.

## 3) Content Graph (modelo)

Un documento no es HTML plano, es grafo:

- `Document`
- `Version`
- `Node` (hero, section, faq, cta, quote, image, video, metadata)
- `Edge` (orden, referencia, dependencia)
- `Claim` (afirmacion factual con evidencia)
- `Asset` (media)

Beneficios:
- reuso de bloques entre canales,
- personalizacion por audiencia,
- diffs semanticos, no solo textuales.

## 4) Flujo end-to-end

1. Editor crea `Intent`.
2. API crea job `generate`.
3. Orchestrator devuelve `Document + Version + Graph`.
4. Policy engine valida y marca bloqueantes.
5. Editor ajusta (chat o bloque directo).
6. Nuevo `Version` con diff.
7. Aprobacion final y `Publication`.
8. Ingesta de metricas para realimentar prompts/reglas.

## 5) Multi-tenant y seguridad

- Cada tabla core incluye `workspace_id`.
- RBAC minimo:
  - `admin`,
  - `editor`,
  - `reviewer`,
  - `publisher`.
- Auditoria inmutable para cambios sensibles (policy/publicacion).

## 6) Roadmap tecnico de implementacion

### Fase 1 (2-3 semanas)
- Esquema DB + CRUD de intents/documents/versions.
- Generacion IA basica por plantilla de bloques.
- UI simple de editor + historial.

### Fase 2 (3-4 semanas)
- Policy engine con reglas de marca/SEO/a11y.
- Aprobaciones y estados de workflow.
- Publicacion web basica.

### Fase 3 (3-4 semanas)
- RAG con fuentes versionadas.
- Adaptacion multicanal automatica.
- Dashboard de calidad y performance.

