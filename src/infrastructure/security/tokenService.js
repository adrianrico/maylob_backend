'use strict'

/**
 * @file Emisión y verificación de tokens JWT para operadores.
 * @module infrastructure/security/tokenService
 *
 * Buenas prácticas aplicadas:
 *  - Algoritmo FIJO (HS256) en `sign` Y en `verify`: evita el ataque
 *    "alg: none" / confusión de algoritmos.
 *  - Caducidad corta (`expiresIn`): un token robado deja de servir.
 *  - `issuer` y `audience` verificados: un token de otro sistema no se acepta.
 *  - El secreto sólo viene de la configuración (variable de entorno), nunca del código.
 */

const jwt = require('jsonwebtoken')

const ISSUER   = 'maylob-backend'
const AUDIENCE = 'maylob-operator'

/**
 * @param {{jwtSecret: string, jwtExpiresIn: string}} config Configuración validada.
 * @returns {{sign: Function, verify: Function, expiresIn: string}}
 */
function createTokenService(config)
{
    return {
        expiresIn: config.jwtExpiresIn,

        /**
         * Genera un token firmado.
         * @param {{curp: string}} operator Operador autenticado (`curp` va en `sub`).
         * @returns {string} JWT.
         */
        sign: (operator) => jwt.sign({}, config.jwtSecret, {
            algorithm: 'HS256',
            expiresIn: config.jwtExpiresIn,
            issuer: ISSUER,
            audience: AUDIENCE,
            subject: operator.curp,
        }),

        /**
         * Verifica firma, caducidad, emisor y audiencia.
         * @param {string} token JWT recibido.
         * @returns {{curp: string}|null} Datos del token o `null` si es inválido/caducado.
         */
        verify: (token) =>
        {
            try
            {
                const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE })
                return typeof payload.sub === 'string' ? { curp: payload.sub } : null
            }
            catch
            {
                return null
            }
        },
    }
}

module.exports = { createTokenService }
