'use strict'

/**
 * @file Punto de arranque: configuración → base de datos → servidor HTTP.
 * @module server
 */

require('dotenv').config()

const { loadEnv } = require('./config/env')
const logger = require('./shared/logger')
const { connectDatabase, disconnectDatabase } = require('./infrastructure/database/connection')
const { buildServices } = require('./container')
const { createApp } = require('./interfaces/http/app')

async function main()
{
    // 1) Configuración: si es inválida, el proceso termina aquí (fail fast).
    let config
    try { config = loadEnv() }
    catch (error)
    {
        logger.error('SERVER', error.message)
        process.exit(1)
    }

    // 2) Base de datos.
    try { await connectDatabase(config.mongoUri) }
    catch (error)
    {
        logger.error('SERVER', 'No se pudo conectar a MongoDB: ' + error.message)
        process.exit(1)
    }

    // 3) Servidor HTTP con timeouts acotados (mitiga ataques tipo Slowloris).
    const app = createApp({ config, services: buildServices(config) })
    const server = app.listen(config.port, () => logger.info('SERVER', `Corriendo en puerto ${config.port} (${config.appEnv}).`))
    server.headersTimeout = 20000
    server.requestTimeout = 30000
    server.keepAliveTimeout = 5000

    // 4) Apagado ordenado: termina peticiones en curso y cierra la BD.
    const shutdown = (signal) =>
    {
        logger.info('SERVER', `${signal} recibido, cerrando...`)
        server.close(async () =>
        {
            await disconnectDatabase().catch(() => {})
            process.exit(0)
        })
        setTimeout(() => process.exit(1), 10000).unref() // salida forzada si algo se cuelga
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))
}

// Errores no capturados: se registran y se sale; el supervisor (Render) reinicia el proceso en estado limpio.
process.on('unhandledRejection', (reason) => { logger.error('PROCESS', 'unhandledRejection: ' + (reason?.message ?? reason)); process.exit(1) })
process.on('uncaughtException',  (error)  => { logger.error('PROCESS', 'uncaughtException: ' + error.message); process.exit(1) })

main()
