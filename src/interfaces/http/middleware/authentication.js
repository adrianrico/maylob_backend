'use strict'

/**
 * @file Autenticación y autorización de peticiones.
 * @module interfaces/http/middleware/authentication
 *
 * Dos tipos de actor:
 *  - ADMIN    → portal de administración y servicios internos. Se identifica con la
 *               cabecera `X-API-Key` (llave larga y secreta del servidor).
 *  - OPERATOR → portal TIL OPERATOR. Se identifica con `Authorization: Bearer <JWT>`
 *               obtenido en `POST /auth/login`.
 *
 * Tras autenticar, `req.actor = { type, name, curp }` queda disponible para los controladores.
 */

const crypto = require('crypto')
const { unauthorized } = require('../../../shared/appError')
const { sanitizeCurp } = require('../../../domain/sanitizers')
const logger = require('../../../shared/logger')

/**
 * Comparación en TIEMPO CONSTANTE de dos secretos. Se comparan los hashes SHA-256
 * (misma longitud siempre) con `timingSafeEqual`, de modo que ni la velocidad de
 * respuesta ni la longitud revelan cuántos caracteres de la llave fueron correctos.
 */
function safeEqual(a, b)
{
    const ha = crypto.createHash('sha256').update(String(a)).digest()
    const hb = crypto.createHash('sha256').update(String(b)).digest()
    return crypto.timingSafeEqual(ha, hb)
}

/**
 * @param {Object} deps
 * @param {Readonly<Object>} deps.config Configuración (`adminApiKey`, `allowLegacyOperatorHeader`...).
 * @param {Object} deps.authService Servicio de autenticación (resuelve operadores).
 */
function createAuthentication({ config, authService })
{
    // En local, sin ADMIN_API_KEY, el modo admin queda abierto para facilitar el desarrollo.
    // En producción `loadEnv` obliga a definirla, así que esta rama no puede darse ahí.
    const adminOpen = config.adminApiKey === ''
    if (adminOpen) logger.warn('auth', 'ADMIN_API_KEY no definida: rutas de administrador SIN protección (sólo permitido en local).')

    const isAdmin = (req) => adminOpen || (typeof req.headers['x-api-key'] === 'string' && safeEqual(req.headers['x-api-key'], config.adminApiKey))

    /**
     * Intenta identificar a un operador.
     * @returns {Promise<Object|null|false>} Operador, `null` si no hay credenciales, `false` si son inválidas.
     */
    async function readOperator(req)
    {
        const authorization = req.headers.authorization
        if (typeof authorization === 'string')
        {
            const match = /^Bearer\s+(\S+)$/i.exec(authorization)
            if (!match) return false
            return (await authService.resolveFromToken(match[1])) ?? false
        }

        // Modo de migración (desactivado por defecto): el header X-Operator-Curp NO es una
        // credencial, cualquiera puede escribirlo. Sólo existe para no romper clientes viejos.
        const legacy = req.headers['x-operator-curp']
        if (config.allowLegacyOperatorHeader && typeof legacy === 'string' && legacy.trim() !== '')
        {
            const curp = sanitizeCurp(legacy)
            return curp ? ((await authService.resolveOperator(curp)) ?? false) : false
        }

        return null
    }

    const asOperatorActor = (operator) => ({ type: 'operator', name: operator.name, curp: operator.curp, operator })
    const adminActor = { type: 'admin', name: 'ADMINISTRATOR', curp: null }

    return {
        /** Sólo administrador. */
        requireAdmin: (req, res, next) =>
        {
            if (isAdmin(req)) { req.actor = adminActor; return next() }
            return next(unauthorized('No autorizado.'))
        },

        /** Sólo operador autenticado con token. */
        requireOperator: async (req, res, next) =>
        {
            try
            {
                const operator = await readOperator(req)
                if (!operator) return next(unauthorized('Operador no identificado.'))
                req.actor = asOperatorActor(operator)
                req.operator = operator
                return next()
            }
            catch (error) { return next(error) }
        },

        /** Operador (si presenta credencial de operador) o, en su defecto, administrador. */
        requireAdminOrOperator: async (req, res, next) =>
        {
            try
            {
                const operator = await readOperator(req)
                if (operator)
                {
                    req.actor = asOperatorActor(operator)
                    req.operator = operator
                    return next()
                }
                if (operator === false) return next(unauthorized('Operador no identificado.')) // credencial presente pero inválida
                if (isAdmin(req)) { req.actor = adminActor; return next() }
                return next(unauthorized('No autorizado.'))
            }
            catch (error) { return next(error) }
        },
    }
}

module.exports = { createAuthentication, safeEqual }
