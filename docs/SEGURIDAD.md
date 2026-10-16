# Seguridad del backend MAYLOB

## 1. Matriz de acceso

| Ruta | Acceso |
|------|--------|
| `GET /health` | público |
| `POST /auth/login` | público, máx. 10 intentos fallidos / 15 min / IP |
| `GET /maneuvers/monitor/?key=` | público por llave MONI (1 petición / 10 s por llave, 60 / min por IP). Sin CURP del operador |
| `PATCH /maneuvers/updateLocation/` | operador (`Authorization: Bearer`) **o** administrador (`X-API-Key`). El operador solo sobre sus maniobras |
| `GET /maneuvers/byOperator/` | operador (Bearer) |
| `/clients/*`, `/transporters/*`, `/routes/*`, resto de `/maneuvers/*` | administrador (`X-API-Key`) |

## 2. Cambios que afectan a los clientes (frontends)

Antes **ningún endpoint tenía autenticación**. Para no dejar la API abierta, los clientes deben adaptarse:

1. **Portal de administración y `til_forwarder`**: enviar `X-API-Key: <ADMIN_API_KEY>` en cada petición.
   > Importante: una API key incrustada en un frontend web público **es visible para cualquiera**.
   > Lo correcto es que el portal admin pase por un backend propio (BFF) o, a futuro, tenga login real con usuario/contraseña y JWT de rol admin.
2. **Portal TIL OPERATOR**: `POST /auth/login` ahora devuelve `token` y `expires_in`. Enviar
   `Authorization: Bearer <token>` en `byOperator` y `updateLocation`. El header `X-Operator-Curp`
   ya **no** autentica (cualquiera podía escribirlo). Para una migración gradual existe
   `ALLOW_LEGACY_OPERATOR_HEADER=true`; no usarlo en producción más tiempo del imprescindible.
3. **Portal público MONI**: sin cambios, salvo que la respuesta ya no incluye `man_operator_id`
   ni `updated_by_curp` / `man_update_by_curp` (datos personales).
4. **CORS**: el navegador solo podrá llamar desde los orígenes listados en `CORS_ORIGINS`.

## 3. Variables de entorno de seguridad (producción)

| Variable | Requisito |
|----------|-----------|
| `ADMIN_API_KEY` | ≥ 24 caracteres aleatorios |
| `JWT_SECRET` | ≥ 32 caracteres aleatorios |
| `CORS_ORIGINS` | lista separada por comas |

Si falta alguna, el servidor **no arranca** (`src/config/env.js`).
Generar secretos: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 4. Controles implementados

- **Autenticación**: API key comparada en tiempo constante; JWT HS256 con algoritmo fijo, `issuer`, `audience` y caducidad. El operador se re-consulta en cada petición (una baja surte efecto de inmediato).
- **Autorización**: default-deny por router; anti-IDOR en `updateLocation`.
- **Inyección NoSQL**: validación de tipos (`typeof`), `noSqlSanitizer` (quita `$…`, `.`, `__proto__`), `mongoose.set('sanitizeFilter', true)`.
- **XSS / inyección**: saneadores con lista blanca; URLs solo `http(s)`; CSP `default-src 'none'`.
- **Cabeceras**: Helmet (HSTS, nosniff, frame-ancestors none, no-referrer), `X-Powered-By` oculto, `Cache-Control: no-store`.
- **DoS / fuerza bruta**: límite global, de login y de consulta pública; tope de body (`BODY_LIMIT`, 200 kb); paginación con tope de 100; timeouts HTTP (Slowloris); `hpp`.
- **Errores**: nunca se filtran stacks ni mensajes de Mongo; log solo en servidor.
- **Logs**: sin secretos y sin inyección de saltos de línea.
- **Integridad**: IDs con 24 bits aleatorios (antes colisionaban en el mismo segundo); operaciones atómicas sobre operadores/ECOs; bug corregido donde `route_id` indefinido podía empatar con cualquier ruta.
- **Proceso**: apagado ordenado, salida ante `unhandledRejection`, config fail-fast.

## 5. Riesgos conocidos y siguientes pasos recomendados

1. **Login solo por CURP**: el CURP no es secreto (aparece en documentos). Quien lo conozca puede obtener un token de ese operador. Recomendado: añadir PIN/contraseña por operador (con `argon2`/`bcrypt`) o un código por SMS/WhatsApp.
2. **Enumeración de CURP**: `404` vs `403` distingue "no existe" de "dado de baja" (se mantuvo por compatibilidad con el frontend); el límite de intentos lo mitiga.
3. **API key única de admin**: sin usuarios nominales ni bitácora de quién hizo qué. Evolucionar a usuarios admin con JWT y roles.
4. **Sin revocación de tokens** antes de su caducidad (mitigado por re-consulta del operador y `JWT_EXPIRES_IN=8h`).
5. **Atlas**: restringir IPs de acceso, usuario de BD con permisos mínimos, copias de seguridad.
6. **Dependencias**: ejecutar `npm audit` en cada despliegue. Se aplicó `npm audit fix` (express 4.22, mongoose 8.24). Las advertencias restantes son de `nodemon` (solo desarrollo, no se instala en producción).
7. **Código retirado**: `CONTROLLERS/user.js` y `CONTROLLERS/operator.js` (+ sus rutas) no estaban montados en `app.js` (inalcanzables) y se eliminaron; siguen en el historial de git.
