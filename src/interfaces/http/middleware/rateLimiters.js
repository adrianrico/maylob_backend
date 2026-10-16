'use strict'

/**
 * @file Limitadores de tasa (rate limiting) contra fuerza bruta, scraping y DoS.
 * @module interfaces/http/middleware/rateLimiters
 */

const rateLimit = require('express-rate-limit')

const ipKey = rateLimit.ipKeyGenerator

/** Formato de error uniforme con el resto de la API. */
const tooMany = (message) => ({ code: '-1', message })

/**
 * Límite GLOBAL por IP para toda la API.
 * @param {{globalWindowMs: number, globalMax: number}} cfg
 */
const globalLimiter = (cfg) => rateLimit({
    windowMs: cfg.globalWindowMs,
    limit: cfg.globalMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Demasiadas solicitudes, intenta más tarde.'),
})

/**
 * Límite ESTRICTO para el login: frena la adivinanza de CURPs (fuerza bruta / enumeración).
 * Sólo cuentan los intentos fallidos (`skipSuccessfulRequests`).
 */
const loginLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: tooMany('Demasiados intentos de inicio de sesión, intenta de nuevo en 15 minutos.'),
})

/**
 * Consulta PÚBLICA por llave MONI. El portal consulta cada 10 s, así que se permite
 * una petición por llave cada 10 s. Se limita por la llave misma (clientes tras un mismo
 * NAT no comparten cupo) y, además, por IP, para que rotar llaves no evada el límite.
 */
const monitorKeyLimiter = () => rateLimit({
    windowMs: 10 * 1000,
    limit: 1,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
    {
        const key = req.query.key
        return typeof key === 'string' && key.length > 0 ? 'key:' + key : ipKey(req.ip)
    },
    message: tooMany('Demasiadas solicitudes, intenta de nuevo en 10 segundos.'),
})

const monitorIpLimiter = () => rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Demasiadas solicitudes, intenta de nuevo en un minuto.'),
})

module.exports = { globalLimiter, loginLimiter, monitorKeyLimiter, monitorIpLimiter }
