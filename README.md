# MAYLOB [ v2.0 ] — Backend Node.js (Arquitectura limpia)

API REST para gestión de clientes, transportistas (operadores y ECOs), rutas y seguimiento de maniobras.

## Estructura

```
index.js                      punto de entrada (delegan a src/server.js)
src/
  config/env.js               configuración validada (fail-fast)
  shared/                     errores, logger seguro, ids, reloj
  domain/                     reglas puras: sanitizers, routeProgress, maneuverTracking
  application/                casos de uso (auth, clients, routes, transporters, maneuvers)
  infrastructure/             MongoDB (models, repositories, connection) y JWT
  interfaces/http/            Express: app, routes, controllers, middleware, validators
  container.js                composición / inyección de dependencias
  server.js                   arranque y apagado ordenado
test/                         pruebas (npm test, sin necesidad de MongoDB)
docs/
  GUIA_APRENDIZAJE.md         conceptos y pasos para construir un proyecto así desde cero
  SEGURIDAD.md                matriz de acceso, controles, cambios para clientes y riesgos
```

Regla de dependencias: `interfaces → application → domain`; `infrastructure` implementa lo que
`application` necesita; sólo `container.js` conoce todas las capas.

## Comandos

```bash
npm install
npm run dev     # nodemon, local
npm start       # node index.js (producción / Render)
npm test        # pruebas de dominio y de seguridad HTTP
```

## Configuración

Copia `.env.example` a `.env`. En **production** son obligatorias `ADMIN_API_KEY`, `JWT_SECRET`
y `CORS_ORIGINS` (si faltan, el servidor no arranca). En Render, `JWT_SECRET` se genera solo
(`render.yaml`); el resto se captura en el dashboard.

- `APP_ENV=local` → MongoDB local (`MONGO_URI_LOCAL`). En local, sin `ADMIN_API_KEY`, las rutas admin quedan abiertas (con aviso).
- `APP_ENV=production` → MongoDB Atlas (`MONGO_URI_PRODUCTION`).

## Autenticación (resumen)

- Administrador / servicios: header `X-API-Key`.
- Operador: `POST /auth/login {curp}` → `token`; luego `Authorization: Bearer <token>`.
- Detalle completo y riesgos pendientes: [docs/SEGURIDAD.md](docs/SEGURIDAD.md).

## Aprender / extender

Ver [docs/GUIA_APRENDIZAJE.md](docs/GUIA_APRENDIZAJE.md).

## Notas heredadas
- Valores booleanos en minúsculas (`'true'`/`'false'` como texto en `man_moni_enable`).
- La línea de tiempo (`man_events`) y el avance (`man_progress`) se calculan en el servidor a partir de la ruta asignada.
