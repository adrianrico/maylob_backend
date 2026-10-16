'use strict'

/**
 * @file Configuración centralizada y validada del entorno.
 * @module config/env
 *
 * Única puerta de entrada a `process.env`. Si falta algo crítico en PRODUCCIÓN
 * el proceso NO arranca ("fail fast"): es preferible un deploy fallido a un
 * servidor en línea sin autenticación o con secretos débiles.
 */

const crypto = require('crypto')

/** Convierte "a, b ,c" en ['a','b','c'] ignorando vacíos. */
const toList = (value) => String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean)

/** Quita espacios y comillas envolventes que quedan al pegar valores en paneles de PaaS. */
const stripQuotes = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '')

/**
 * Lee y valida las variables de entorno.
 * @param {NodeJS.ProcessEnv} [source] Origen de variables (inyectable para pruebas).
 * @returns {Readonly<Object>} Configuración inmutable.
 * @throws {Error} Si la configuración es inválida (lista todos los problemas).
 */
function loadEnv(source = process.env)
{
    const isLocal = source.APP_ENV === 'local'
    const problems = []

    const mongoUri = stripQuotes(isLocal ? source.MONGO_URI_LOCAL : source.MONGO_URI_PRODUCTION)
    if (!mongoUri) problems.push(`Falta MONGO_URI_${isLocal ? 'LOCAL' : 'PRODUCTION'}.`)
    else if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) problems.push('La URI de MongoDB debe iniciar con "mongodb://" o "mongodb+srv://".')

    const adminApiKey = stripQuotes(source.ADMIN_API_KEY)
    let jwtSecret = stripQuotes(source.JWT_SECRET)
    const corsOrigins = toList(source.CORS_ORIGINS)

    if (!isLocal)
    {
        if (adminApiKey.length < 24)  problems.push('ADMIN_API_KEY es obligatoria en producción (mínimo 24 caracteres).')
        if (jwtSecret.length < 32)    problems.push('JWT_SECRET es obligatorio en producción (mínimo 32 caracteres).')
        if (corsOrigins.length === 0) problems.push('CORS_ORIGINS es obligatorio en producción (orígenes permitidos separados por coma).')
    }
    else if (!jwtSecret)
    {
        // Solo en local: secreto efímero (los tokens dejan de valer al reiniciar).
        jwtSecret = crypto.randomBytes(32).toString('hex')
    }

    if (problems.length > 0) throw new Error('Configuración inválida:\n - ' + problems.join('\n - '))

    const int = (value, fallback) => (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback)

    return Object.freeze({
        appEnv:       isLocal ? 'local' : 'production',
        isLocal,
        isProduction: !isLocal,
        port:         int(isLocal ? source.PORT_LOCAL : (source.PORT || source.PORT_PRODUCTION), 8080),
        mongoUri,
        corsOrigins,
        adminApiKey,
        jwtSecret,
        jwtExpiresIn: source.JWT_EXPIRES_IN || '8h',
        // Migración: acepta el header inseguro X-Operator-Curp. NUNCA activar en producción salvo transición corta.
        allowLegacyOperatorHeader: source.ALLOW_LEGACY_OPERATOR_HEADER === 'true',
        // Nº de proxies de confianza delante de la app (Render = 1). Necesario para que req.ip sea la IP real.
        trustProxy:   int(source.TRUST_PROXY, 1),
        rateLimit: {
            globalWindowMs: 15 * 60 * 1000,
            globalMax:      int(source.RATE_LIMIT_MAX, 600),
        },
        bodyLimit: source.BODY_LIMIT || '200kb',
    })
}

module.exports = { loadEnv }
