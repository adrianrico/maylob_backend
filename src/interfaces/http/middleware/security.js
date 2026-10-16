'use strict'

/**
 * @file Middlewares de seguridad perimetral (defensa en profundidad).
 * @module interfaces/http/middleware/security
 */

const helmet = require('helmet')
const hpp = require('hpp')
const cors = require('cors')

/**
 * Cabeceras HTTP de seguridad (Helmet): HSTS, nosniff, anti-clickjacking, CSP restrictiva,
 * ocultar tecnología (`X-Powered-By`), etc. Esta API sólo devuelve JSON, por lo que
 * la política `default-src 'none'` es segura y no rompe nada.
 */
const securityHeaders = () => helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
})

/**
 * CORS con LISTA BLANCA de orígenes. (`cors()` sin opciones permite TODO origen,
 * lo que deja a cualquier página web maliciosa llamar la API desde el navegador de una víctima.)
 * Peticiones sin cabecera `Origin` (servidor a servidor, curl, apps móviles) no se ven
 * afectadas: CORS es una protección del NAVEGADOR; la protección real es la autenticación.
 *
 * @param {string[]} allowedOrigins Orígenes permitidos (`CORS_ORIGINS`).
 * @param {boolean} isLocal En local se permite cualquier origen si la lista está vacía.
 */
const corsPolicy = (allowedOrigins, isLocal) => cors({
    origin: (origin, callback) =>
    {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        if (isLocal && allowedOrigins.length === 0) return callback(null, true)
        return callback(null, false) // sin cabeceras CORS: el navegador bloquea la respuesta
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Operator-Curp'],
    maxAge: 600,
})

/** Contaminación de parámetros HTTP: `?a=1&a=2` se reduce al último valor en vez de un arreglo. */
const parameterPollution = () => hpp()

/**
 * Elimina llaves peligrosas de body, query y params (recursivo):
 *  - empiezan con `$`  → operadores de MongoDB (`{"$ne": null}`, `{"$gt": ""}`),
 *  - contienen `.`     → rutas de campo anidado,
 *  - `__proto__`, `constructor`, `prototype` → prototype pollution.
 * Es una capa EXTRA; la primaria sigue siendo validar tipos y `sanitizeFilter` de Mongoose.
 */
function noSqlSanitizer(req, res, next)
{
    const scrub = (value, depth = 0) =>
    {
        if (depth > 20 || value === null || typeof value !== 'object') return
        for (const key of Object.keys(value))
        {
            if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype')
            {
                delete value[key]
            }
            else
            {
                scrub(value[key], depth + 1)
            }
        }
    }
    scrub(req.body)
    scrub(req.query)
    scrub(req.params)
    next()
}

/** Las respuestas de la API contienen datos operativos: nunca deben quedar en cachés intermedias. */
function noStore(req, res, next)
{
    res.setHeader('Cache-Control', 'no-store')
    next()
}

module.exports = { securityHeaders, corsPolicy, parameterPollution, noSqlSanitizer, noStore }
