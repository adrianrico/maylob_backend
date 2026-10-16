# Guía de aprendizaje: cómo construir desde cero un backend como MAYLOB

Esta guía explica **los conceptos clave** y **los pasos en orden** para construir un
proyecto parecido (API REST con Node.js + Express + MongoDB, arquitectura limpia y
seguridad desde el diseño). Cada paso apunta al archivo real de este repositorio
donde puedes ver el ejemplo ya hecho.

---

## PARTE 1. CONCEPTOS CLAVE

### 1.1 Qué es una API REST
Un programa que escucha peticiones HTTP y responde datos (JSON). Cada petición tiene:
- **Método**: `GET` (leer), `POST` (crear/procesar), `PATCH` (modificar parcial), `DELETE` (borrar).
- **Ruta**: `/clients/client/`.
- **Cabeceras** (headers): metadatos, p. ej. `Authorization`.
- **Cuerpo** (body): los datos enviados, normalmente JSON.
- **Código de estado** en la respuesta: `200` ok, `400` datos inválidos, `401` no autenticado,
  `403` sin permiso, `404` no existe, `409` conflicto/duplicado, `429` demasiadas peticiones, `500` error del servidor.

### 1.2 Node.js, Express y middlewares
- **Node.js** ejecuta JavaScript fuera del navegador.
- **Express** es el framework HTTP. Su idea central es el **middleware**: una función
  `(req, res, next)` que procesa la petición y llama a `next()` para pasar a la
  siguiente. La petición atraviesa una **cadena** de middlewares (seguridad → parseo →
  autenticación → controlador). Ver `src/interfaces/http/app.js`: el **orden importa**.

### 1.3 MongoDB y Mongoose
- **MongoDB** guarda *documentos* (parecidos a JSON) en *colecciones*.
- **Mongoose** añade *esquemas* (qué campos tiene un documento) y *modelos* (cómo consultarlos).
  Ver `src/infrastructure/persistence/models/index.js`.

### 1.4 Arquitectura limpia (Clean Architecture)
Idea: **separar el código por responsabilidad** y que las dependencias apunten
siempre **hacia adentro** (lo de afuera conoce lo de adentro, nunca al revés).

```
        ┌───────────────────────────────────────────────────────┐
        │ interfaces/http   (Express: rutas, controladores,     │  ← "traduce" HTTP
        │                    middlewares, validadores)          │
        │   ┌───────────────────────────────────────────────┐   │
        │   │ application   (casos de uso / servicios)      │   │  ← "qué hace" el sistema
        │   │   ┌───────────────────────────────────────┐   │   │
        │   │   │ domain  (reglas puras del negocio)    │   │   │  ← "qué significa" el negocio
        │   │   └───────────────────────────────────────┘   │   │
        │   └───────────────────────────────────────────────┘   │
        │ infrastructure  (MongoDB, JWT: detalles técnicos)     │  ← "con qué" se hace
        └───────────────────────────────────────────────────────┘
```

| Capa | Carpeta | Responsabilidad | Puede importar |
|------|---------|-----------------|----------------|
| Dominio | `src/domain` | Reglas puras: cálculo de avance, saneamiento. Sin Express ni Mongoose. | nada externo |
| Aplicación | `src/application` | Casos de uso: "crear cliente", "actualizar ubicación". Orquesta repositorios y dominio. | dominio, shared |
| Infraestructura | `src/infrastructure` | Mongoose, repositorios, JWT. Implementa lo que la aplicación necesita. | todo lo anterior |
| Interfaces | `src/interfaces/http` | Express: recibe HTTP, valida, llama al caso de uso, responde. | aplicación, dominio |
| Composición | `src/container.js` | Único lugar que conecta todas las capas. | todo |

**Beneficios reales**: puedes probar la lógica sin base de datos (ver `test/http.test.js`,
que usa repositorios falsos), cambiar MongoDB por otra BD tocando solo `infrastructure`,
y encontrar cada cosa en un lugar predecible.

### 1.5 Patrones que verás en el código
- **Repositorio** (`repositories/*.js`): única clase que habla con la BD. El servicio pide
  `clientRepository.findById(id)` sin saber que debajo hay Mongoose.
- **Servicio / caso de uso** (`application/*/…Service.js`): reglas del proceso.
- **Controlador delgado** (`controllers/index.js`): extrae datos → llama servicio → responde. Nada más.
- **DTO** (objeto de transferencia, `validators/index.js`): el objeto limpio que viaja del
  controlador al servicio. Aquí se aplica la lista blanca de campos.
- **Inyección de dependencias** (`container.js`): los servicios *reciben* sus repositorios
  como parámetros (`createClientService({ clientRepository, ... })`) en vez de importarlos.
  Por eso las pruebas pueden darles repositorios falsos.
- **Factory** (`createApp`, `createXService`): funciones que construyen objetos ya configurados.
- **Error de aplicación** (`shared/appError.js`): los servicios *lanzan* `AppError(404, '…')`
  y un único `errorHandler` lo convierte en respuesta HTTP.

### 1.6 Seguridad: modelo mental
Piensa siempre: **"¿qué haría un atacante con este endpoint?"** Las categorías
(basadas en OWASP Top 10 / OWASP API Security):

| Amenaza | Qué es | Defensa en este proyecto |
|---------|--------|--------------------------|
| Autenticación rota | Endpoints sin login o credenciales falsificables | `X-API-Key` admin + JWT operador (`middleware/authentication.js`) |
| Autorización rota / IDOR | Usuario A toca datos del usuario B | El operador solo modifica sus maniobras (`maneuverService.updateLocation`) |
| Inyección NoSQL | Enviar `{"$ne": null}` para saltarse filtros | Tipos estrictos + `noSqlSanitizer` + `sanitizeFilter` de Mongoose |
| XSS almacenado | Guardar `<script>` que se ejecuta en otro navegador | `sanitizeString`, `sanitizeUrl` (solo http/https), CSP de Helmet |
| Fuerza bruta / DoS | Millones de intentos o peticiones | `express-rate-limit`, límite de body, timeouts |
| Exposición de datos | Mostrar CURP, stack traces, contraseñas | Quitar PII en la ruta pública; `errorHandler` genérico; logs sin secretos |
| Mala configuración | CORS abierto, secretos débiles, cabeceras ausentes | `config/env.js` (fail-fast), Helmet, CORS con lista blanca |
| Mass assignment | El cliente fija campos que no debería | DTO con lista blanca explícita; esquemas `strict` |
| Prototype pollution | `{"__proto__": {...}}` altera todos los objetos | `sanitizeObject` y `noSqlSanitizer` |
| Log injection | Falsificar líneas del log con `\n` | `shared/logger.js` limpia caracteres de control |
| Condición de carrera | Dos peticiones simultáneas corrompen un arreglo | `$push` / `$pull` atómicos en `transporterRepository` |

**Principios**: desconfía de toda entrada · mínimo privilegio · denegar por defecto ·
defensa en profundidad (varias capas, ninguna es "la única") · fallar de forma segura ·
no filtrar información interna.

### 1.7 Autenticación vs autorización
- **Autenticación**: *¿quién eres?* (API key, JWT).
- **Autorización**: *¿qué puedes hacer?* (rol admin vs operador; ¿esta maniobra es tuya?).

### 1.8 JWT (JSON Web Token)
Un token firmado con tres partes `cabecera.carga.firma`. El servidor lo emite en el login;
el cliente lo manda en `Authorization: Bearer <token>`. Reglas: algoritmo fijo, caducidad
corta, verificar `issuer`/`audience`, secreto largo y fuera del código
(`infrastructure/security/tokenService.js`).

### 1.9 Variables de entorno
Los secretos y la configuración **nunca** van en el código ni en git: se leen de `process.env`
(archivo `.env` en local, panel del proveedor en producción). Se validan **una vez** al
arrancar (`config/env.js`) y, si falta algo crítico en producción, el proceso se niega a iniciar.

### 1.10 Pruebas
- **Unitarias** (`test/domain.test.js`): prueban funciones puras, rápidas, sin red.
- **De integración** (`test/http.test.js`): levantan la app real con repositorios falsos y
  hacen peticiones HTTP verdaderas, incluyendo **ataques simulados**.
- Se ejecutan con `npm test` (usa el módulo nativo `node:test`, sin librerías extra).

---

## PARTE 2. PASOS PARA CONSTRUIR UN PROYECTO SIMILAR DESDE CERO

### Paso 0. Herramientas
Instala Node.js ≥ 20, Git, un editor (VS Code), MongoDB local o una cuenta gratuita en MongoDB Atlas,
y un cliente HTTP (Postman, Insomnia o `curl`).

### Paso 1. Inicializar el proyecto
```bash
mkdir mi-backend && cd mi-backend
git init
npm init -y
npm install express mongoose dotenv helmet cors hpp express-rate-limit jsonwebtoken
npm install --save-dev nodemon
```
Añade en `package.json`: `"start": "node index.js"`, `"dev": "nodemon index.js"`,
`"test": "node --test \"test/*.test.js\""`. Crea `.gitignore` con `node_modules` y `.env`.

### Paso 2. Diseñar antes de programar
En papel responde: ¿qué **entidades** existen (cliente, ruta, maniobra, transportista)?
¿Qué **acciones** (casos de uso) tiene cada una? ¿Quién puede ejecutar cada acción
(público, operador, administrador)? Dibuja la **matriz de autorización** (ver el comentario
de `src/interfaces/http/routes/index.js`). Esto evita improvisar la seguridad al final.

### Paso 3. Crear la estructura de carpetas
```
src/
  config/          → env.js
  shared/          → utilidades sin dependencias (logger, errores, ids, reloj)
  domain/          → reglas puras del negocio
  application/     → servicios (casos de uso) por módulo
  infrastructure/  → database/, persistence/{models,repositories}/, security/
  interfaces/http/ → app.js, routes/, controllers/, middleware/, validators/
  container.js     → composición
  server.js        → arranque
test/
docs/
```

### Paso 4. Configuración validada (`src/config/env.js`)
Lee `process.env` en un solo lugar, aplica valores por defecto, valida y **lanza error** si
en producción faltan secretos. Congela el objeto resultante (`Object.freeze`).

### Paso 5. Utilidades compartidas (`src/shared`)
- `appError.js`: clase de error con código HTTP.
- `logger.js`: log que limpia caracteres de control.
- `values.js`, `clock.js`, `ids.js`: helpers pequeños; el reloj se inyecta para poder probar.

### Paso 6. Dominio (`src/domain`)
Escribe primero lo que **no depende de nada**: el saneamiento de entradas
(`sanitizers.js`) y las reglas del negocio puras (`routeProgress.js`, `maneuverTracking.js`).
Hazlas con **pruebas** (`test/domain.test.js`) antes de seguir: es lo más barato de corregir.

### Paso 7. Modelos y conexión (infraestructura)
- `persistence/models/index.js`: un esquema Mongoose por colección; añade `index: true` a los campos que buscas.
- `database/connection.js`: `mongoose.connect` con `sanitizeFilter`, `strictQuery` y timeouts.

### Paso 8. Repositorios
Un archivo por colección con métodos pequeños y con nombre de negocio
(`findById`, `list`, `create`, `updateById`, `deleteById`). Reglas:
- Devuelve objetos planos (`.lean()`).
- Usa operadores **atómicos** de Mongo para arreglos embebidos (`$push`, `$pull`).
- Los filtros con operadores propios van envueltos en `mongoose.trusted()` (por `sanitizeFilter`).

### Paso 9. Servicios de aplicación
Una función fábrica por módulo: `createClientService({ clientRepository, clock })`.
Cada método = un caso de uso. Validan **reglas de negocio** (no formato HTTP), lanzan
`AppError` y devuelven datos simples. **No** importan Express ni Mongoose.

### Paso 10. Capa HTTP
1. **Validadores/DTO** (`validators/index.js`): convierten `req.body` en un objeto con lista blanca de campos ya saneados.
2. **Controladores** (`controllers/index.js`): `dto → servicio → res.send`. Envuelve cada uno con `asyncHandler`.
3. **Middlewares** (`middleware/`): seguridad (`security.js`), límites (`rateLimiters.js`),
   autenticación (`authentication.js`), errores (`errorHandler.js`).
4. **Rutas** (`routes/index.js`): cada ruta declara su guardia (`requireAdmin`, …). Regla de oro: **si olvidas declararla, no es pública por accidente** — agrupa por router y aplica `router.use(requireAdmin)` por defecto.
5. **`app.js`**: ensambla todo en el orden correcto.

### Paso 11. Composición y arranque
`container.js` crea repositorios → servicios; `server.js` carga la config, conecta la BD,
levanta el servidor con timeouts y registra el apagado ordenado (`SIGTERM`).

### Paso 12. Probar
Escribe pruebas de integración que incluyan: sin credencial → 401; token ajeno → 403;
payload `{"$ne":null}` → rechazado; body gigante → 413; origen CORS no permitido; límite de tasa → 429.

### Paso 13. Desplegar
- Sube a GitHub (sin `.env`).
- En Render/Railway/etc. configura variables: `APP_ENV=production`, `MONGO_URI_PRODUCTION`,
  `ADMIN_API_KEY`, `JWT_SECRET`, `CORS_ORIGINS`. Ver `render.yaml`.
- Usa una ruta `/health` para la sonda de vida.
- En Atlas, limita el acceso por IP y usa un usuario de BD con permisos mínimos.

### Paso 14. Mantener
`npm audit` periódico para dependencias vulnerables · rotar `ADMIN_API_KEY`/`JWT_SECRET` ante
cualquier sospecha · revisar logs · añadir una prueba por cada bug encontrado.

---

## PARTE 3. RECETA: AÑADIR UN MÓDULO NUEVO (p. ej. "vehículos")
1. Esquema en `models/index.js`.
2. `vehicleRepository.js` con sus métodos.
3. `application/vehicles/vehicleService.js` con las reglas.
4. DTO en `validators/index.js` (lista blanca + sanitizadores).
5. Controlador en `controllers/index.js`.
6. Rutas en `routes/index.js` **con su guardia** y registro en `app.js`.
7. Conecta todo en `container.js`.
8. Pruebas: caso feliz + al menos un caso de ataque.

## PARTE 4. QUÉ ESTUDIAR DESPUÉS
- OWASP Top 10 y **OWASP API Security Top 10** (owasp.org).
- Documentación de Express (middlewares), Mongoose (esquemas, `lean`, índices) y Helmet.
- Libro *Clean Architecture* (Robert C. Martin) y el concepto de *Hexagonal Architecture* (puertos y adaptadores).
- Validación declarativa con librerías como Zod o Joi (siguiente paso natural sobre `validators/`).
- Contraseñas: **bcrypt/argon2**, 2FA, refresh tokens y revocación (para evolucionar el login por CURP).
- Observabilidad: logs estructurados (pino), métricas y alertas.
