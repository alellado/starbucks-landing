# Deploy publico Prode Web en Netlify

## Que deploya Netlify

- Este deploy publica solo el frontend `Next.js` (`/apps/prode-web`).
- La API (`/apps/prode-api`) no debe quedar en localhost; tiene que estar en un host publico (Render, Railway, Fly.io, VPS, etc.).

## 1) Subir repo a GitHub

```bash
cd "/Users/alellado/Documents/New project"
git add .
git commit -m "chore: netlify deploy config for prode web"
git push
```

## 2) Crear sitio en Netlify

1. Ir a Netlify -> `Add new site` -> `Import an existing project`.
2. Conectar GitHub y elegir este repo.
3. Build settings:
   - Build command: `pnpm --filter @prode/web build`
   - Publish directory: dejar vacio (plugin Next lo maneja).
   - Base directory: vacio (raiz del repo).

> `netlify.toml` ya deja estos valores configurados.

## 3) Variables de entorno en Netlify (sitio frontend)

En `Site settings -> Environment variables` crear:

- `NEXT_PUBLIC_API_URL=https://TU_API_PUBLICA/api/v1`

Ejemplo:

- `NEXT_PUBLIC_API_URL=https://prode-api.onrender.com/api/v1`

## 4) Configurar CORS en tu API

En el host donde publiques `apps/prode-api`, definir:

- `CORS_ORIGIN=https://TU_SITIO_NETLIFY.netlify.app`

Si usas dominio custom, agrega ambos separados por coma:

- `CORS_ORIGIN=https://TU_SITIO_NETLIFY.netlify.app,https://tudominio.com`

## 5) Verificacion

1. Abrir URL de Netlify.
2. Probar registro/login.
3. Confirmar en Network que llamadas van a `NEXT_PUBLIC_API_URL` (no localhost).
4. Confirmar que `/health` de API responde en publico.
