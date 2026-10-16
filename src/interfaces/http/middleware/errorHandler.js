'use strict'

/**
 * @file Manejo centralizado de errores y rutas inexistentes.
 * @module interfaces/http/middleware/errorHandler
 *
 * SEGURIDAD (CWE-209): al cliente NUNCA se le envía un stack trace, un mensaje de
 * Mongo ni rutas de archivos; eso ayuda al atacante a mapear el sistema. El detalle
 * real se escribe en el log del servidor.
 */

const { AppError } = require('../../../shared/appError')
const logger = require('../../../shared/logger')

/** Envuelve un controlador async para que cualquier excepción llegue a `errorHandler` (Express 4 no lo hace solo). */
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

/** 404 uniforme para rutas que no existen. */
function notFoundHandler(req, res)
{
    res.status(404).json({ code: '-1', message: 'Recurso no encontrado.' })
}

/* eslint-disable-next-line no-unused-vars */
function errorHandler(error, req, res, next)
{
    // Errores de negocio previstos.
    if (error instanceof AppError)
    {
        return res.status(error.status).json({ code: error.code, message: error.message })
    }

    // JSON mal formado o body demasiado grande (lanzados por express.json).
    if (error.type === 'entity.parse.failed') return res.status(400).json({ code: '-1', message: 'JSON mal formado.' })
    if (error.type === 'entity.too.large')    return res.status(413).json({ code: '-1', message: 'La petición es demasiado grande.' })

    // Cualquier otra cosa es un fallo inesperado: se registra y se responde genérico.
    logger.error('http', `${req.method} ${req.path} → ${error.message}`)
    return res.status(500).json({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
}

module.exports = { asyncHandler, notFoundHandler, errorHandler }
