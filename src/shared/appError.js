'use strict'

/**
 * @file Error de aplicación con código HTTP.
 * @module shared/appError
 *
 * Las capas internas (servicios de aplicación) NO conocen Express: cuando algo
 * sale mal lanzan un `AppError`. La capa HTTP (`errorHandler`) lo traduce a una
 * respuesta con el código de estado correcto. Cualquier otro error (bug,
 * caída de la BD) se responde como 500 genérico SIN filtrar detalles internos.
 */
class AppError extends Error
{
    /**
     * @param {number} status  Código HTTP (400, 401, 403, 404, 409...).
     * @param {string} message Mensaje seguro de mostrar al cliente (en español).
     * @param {string} [code]  Código funcional del contrato histórico de la API ('-1', '0').
     */
    constructor(status, message, code = '-1')
    {
        super(message)
        this.name   = 'AppError'
        this.status = status
        this.code   = code
    }
}

/** Fábricas cortas para los errores más comunes. */
const badRequest   = (message, code) => new AppError(400, message, code)
const unauthorized = (message, code) => new AppError(401, message, code)
const forbidden    = (message, code) => new AppError(403, message, code)
const notFound     = (message, code) => new AppError(404, message, code)
const conflict     = (message, code) => new AppError(409, message, code)

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict }
