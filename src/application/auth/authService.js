'use strict'

/**
 * @file Caso de uso: autenticación de operadores (portal TIL OPERATOR).
 * @module application/auth/authService
 */

const { badRequest, notFound, forbidden } = require('../../shared/appError')
const logger = require('../../shared/logger')

/**
 * @param {Object} deps Dependencias inyectadas.
 * @param {Object} deps.transporterRepository Repositorio de transportistas.
 * @param {Object} deps.tokenService Servicio de tokens JWT.
 */
function createAuthService({ transporterRepository, tokenService })
{
    /**
     * Busca al operador por CURP en toda la flota (el CURP es el `operator_id`).
     * @param {string} curp CURP normalizado.
     * @returns {Promise<{operator: Object, transporter: Object}|null>}
     */
    async function findOperator(curp)
    {
        const transporter = await transporterRepository.findByOperatorId(curp)
        const operator = transporter?.transporter_operators?.find((op) => op.operator_id === curp) ?? null
        return transporter && operator ? { operator, transporter } : null
    }

    return {
        /**
         * Inicio de sesión de un operador. Devuelve sus datos y un JWT de corta vida.
         * @param {{curp: (string|null)}} dto CURP ya saneado por la capa HTTP.
         * @returns {Promise<{operator: Object, token: string, expires_in: string}>}
         * @throws {AppError} 400 CURP inválido, 404 no existe, 403 dado de baja.
         */
        async login({ curp })
        {
            if (!curp) throw badRequest('CURP no válido.')

            const found = await findOperator(curp)
            if (!found)
            {
                logger.warn('auth.login', 'Intento de login con CURP no registrado.')
                throw notFound('CURP no encontrado.')
            }
            if (found.operator.operator_available === false)
            {
                logger.warn('auth.login', 'Intento de login de operador dado de baja.')
                throw forbidden('Operador dado de baja, contacta a tu transportista.')
            }

            return {
                operator: {
                    operator_id:      found.operator.operator_id,
                    operator_name:    found.operator.operator_name,
                    transporter_id:   found.transporter.transporter_id,
                    transporter_name: found.transporter.transporter_name,
                },
                token: tokenService.sign({ curp }),
                expires_in: tokenService.expiresIn,
            }
        },

        /**
         * Resuelve la identidad de un operador ACTIVO a partir de su CURP.
         * Se consulta la BD en cada petición para que una baja surta efecto
         * de inmediato aunque el token siga vigente.
         * @param {string} curp CURP normalizado.
         * @returns {Promise<{curp: string, name: string, transporter_id: string, transporter_name: string}|null>}
         */
        async resolveOperator(curp)
        {
            const found = await findOperator(curp)
            if (!found || found.operator.operator_available === false) return null
            return {
                curp,
                name:             found.operator.operator_name,
                transporter_id:   found.transporter.transporter_id,
                transporter_name: found.transporter.transporter_name,
            }
        },

        /**
         * Resuelve la identidad a partir de un JWT.
         * @param {string} token JWT recibido en `Authorization: Bearer`.
         * @returns {Promise<Object|null>} Operador o `null` si el token es inválido.
         */
        async resolveFromToken(token)
        {
            const payload = tokenService.verify(token)
            return payload ? this.resolveOperator(payload.curp) : null
        },
    }
}

module.exports = { createAuthService }
