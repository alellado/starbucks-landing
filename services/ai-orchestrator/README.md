# AI Orchestrator (FastAPI)

Servicio dedicado a pipelines IA.

## Endpoints implementados

- `GET /health`
- `POST /generate` (mock IA deterministico con trazabilidad)

## Reglas de implementacion

- toda respuesta debe incluir trazabilidad
- persistir eventos de tokens/latencia/modelo
- aislar prompts por tarea en archivos versionables

## Run local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 4001
```
