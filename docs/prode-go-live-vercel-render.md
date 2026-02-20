# Go-live Prode (Vercel + Render)

## Estado actual

- Frontend ya desplegado en Vercel:
  - `https://prode-web-steel.vercel.app`
- Falta dejar API y DB publicas en Render y conectar ambos.

## 1) Crear API + DB en Render (Blueprint)

1. Subi cambios a GitHub:

```bash
cd "/Users/alellado/Documents/New project"
git add .
git commit -m "chore: render blueprint and db migrate script"
git push
```

2. En Render:
   - `New` -> `Blueprint`
   - Selecciona este repo
   - Render detecta `/render.yaml` y crea:
     - DB: `prode-db`
     - API: `prode-api`

## 2) Configurar CORS en Render

En el servicio `prode-api` agrega:

- `CORS_ORIGIN=https://prode-web-steel.vercel.app`

Si usas dominio propio luego:

- `CORS_ORIGIN=https://prode-web-steel.vercel.app,https://tu-dominio.com`

## 3) Conectar Vercel al backend publico

En Vercel -> proyecto `prode-web` -> `Settings -> Environment Variables`:

- `NEXT_PUBLIC_API_URL=https://TU_RENDER_API.onrender.com/api/v1`

Luego redeploy del frontend.

## 4) Cargar data oficial (fixtures)

Con API publica en Render:

```bash
cd "/Users/alellado/Documents/New project"
API_BASE=https://TU_RENDER_API.onrender.com/api/v1 \
ADMIN_EMAIL=tu-admin@mail.com \
ADMIN_PASSWORD='tu-password' \
pnpm import:fixtures -- --file db/seeds/worldcup2026-from-archive.csv --tournament-name "Mundial 2026 - General"
```

## 5) Smoke test final

```bash
curl https://TU_RENDER_API.onrender.com/health
curl https://prode-web-steel.vercel.app
```

Checklist:

- Registro/Login funcionando desde Vercel
- Torneos y partidos visibles
- Guardado de prediccion funcionando
- Leaderboard responde
