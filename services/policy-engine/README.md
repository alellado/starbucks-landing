# Policy Engine

Validaciones automaticas sobre versiones:

- brand voice
- legal/compliance
- SEO tecnico
- accesibilidad basica
- factualidad minima

## Endpoints implementados

- `GET /health`
- `POST /validate`

`POST /validate` recibe:
- `versionId`
- `documentId`
- `plainText`
- `graph` (opcional)

## Output estandar

```json
{
  "score": 84.5,
  "blockingIssues": 1,
  "findings": [
    { "code": "LEGAL_CLAIM_UNSUPPORTED", "severity": "blocker", "message": "..." }
  ]
}
```

## Run local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 4002
```
