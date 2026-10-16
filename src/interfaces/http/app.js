'use strict'

/**
 * @file Fábrica de la aplicación Express.
 * @module interfaces/http/app
 *
 * `createApp` recibe sus dependencias (servicios, configuración) en vez de
 * importarlas: así se puede armar una app de prueba con repositorios falsos
 * sin tocar MongoDB (ver `test/http.test.js`).
 *
 * ORDEN DE MIDDLEWARES (importa):
 *   proxy → cabeceras seguras → CORS → límite global → parseo de body (con tope)
 *   → anti-pollution → saneo NoSQL → rutas (cada una con su guardia) → 404 → errores
 */

const express = require('express')
const { securityHeaders, corsPolicy, parameterPollution, noSqlSanitizer, noStore } = require('./middleware/security')
const { globalLimiter, loginLimiter, monitorKeyLimiter, monitorIpLimiter } = require('./middleware/rateLimiters')
const { createAuthentication } = require('./middleware/authentication')
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler')
const { createControllers } = require('./controllers')
const { createRouters } = require('./routes')

/**
 * @param {Object} deps
 * @param {Readonly<Object>} deps.config Configuración validada (`config/env`).
 * @param {Object} deps.services Servicios de aplicación (auth, client, route, transporter, maneuver).
 * @returns {import('express').Express}
 */
function createApp({ config, services })
{
    const app = express()

    app.disable('x-powered-by')
    // Detrás del proxy de Render, req.ip debe ser la IP real del cliente (si no, todos compartirían un solo cupo de rate limit).
    app.set('trust proxy', config.trustProxy)

    app.use(securityHeaders())
    app.use(corsPolicy(config.corsOrigins, config.isLocal))
    app.use(globalLimiter(config.rateLimit))
    app.use(express.json({ limit: config.bodyLimit }))
    app.use(express.urlencoded({ extended: false, limit: config.bodyLimit }))
    app.use(parameterPollution())
    app.use(noSqlSanitizer)
    app.use(noStore)

    // Sonda de vida para Render (pública, sin datos sensibles).
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))

    const guards = createAuthentication({ config, authService: services.authService })
    const controllers = createControllers(services)
    const routers = createRouters(controllers, guards, {
        login:      loginLimiter(),
        monitorKey: monitorKeyLimiter(),
        monitorIp:  monitorIpLimiter(),
    })

    app.use('/auth/',         routers.auth)
    app.use('/clients/',      routers.clients)
    app.use('/transporters/', routers.transporters)
    app.use('/maneuvers/',    routers.maneuvers)
    app.use('/routes/',       routers.routes)

    app.use(notFoundHandler)
    app.use(errorHandler)

    return app
}

module.exports = { createApp }
