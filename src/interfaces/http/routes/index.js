'use strict'

/**
 * @file Tabla de rutas HTTP y su política de acceso.
 * @module interfaces/http/routes
 *
 * MATRIZ DE AUTORIZACIÓN (default = denegar: cada ruta declara explícitamente su guardia)
 *
 *  Ruta                                   | Acceso
 *  ---------------------------------------|---------------------------------
 *  GET  /health                           | público
 *  POST /auth/login                       | público (limitado a 10 fallos/15 min)
 *  GET  /maneuvers/monitor/?key=          | público por llave MONI (limitado)
 *  PATCH /maneuvers/updateLocation/       | operador (token) o administrador
 *  GET  /maneuvers/byOperator/            | operador (token)
 *  GET  /routes/route                     | operador (token) o administrador
 *  todo lo demás                          | administrador (X-API-Key)
 */

const express = require('express')

/**
 * @param {Object} controllers Controladores (ver `controllers/index.js`).
 * @param {Object} guards `requireAdmin`, `requireOperator`, `requireAdminOrOperator`.
 * @param {Object} limiters Limitadores de tasa específicos de rutas.
 * @returns {{auth: Router, clients: Router, transporters: Router, routes: Router, maneuvers: Router}}
 */
function createRouters(controllers, guards, limiters)
{
    const { requireAdmin, requireOperator, requireAdminOrOperator } = guards

    // ── /auth ───────────────────────────────────────────────────────────────
    const auth = express.Router()
    auth.post('/login', limiters.login, controllers.auth.login)

    // ── /clients ────────────────────────────────────────────────────────────
    const clients = express.Router()
    clients.use(requireAdmin)
    clients.post('/client/',   controllers.clients.handle)
    clients.get('/client/',    controllers.clients.read)
    clients.delete('/client/', controllers.clients.remove)

    // ── /transporters ───────────────────────────────────────────────────────
    const transporters = express.Router()
    transporters.use(requireAdmin)
    transporters.post('/transporter/',   controllers.transporters.handle)
    transporters.post('/operator/',      controllers.transporters.handleOperator)
    transporters.post('/eco/',           controllers.transporters.handleEco)
    transporters.get('/transporter/',    controllers.transporters.read)
    transporters.delete('/transporter/', controllers.transporters.remove)

    // ── /routes ─────────────────────────────────────────────────────────────
    const routes = express.Router()
    routes.get('/route',     requireAdminOrOperator, controllers.routes.read) // el operador consulta rutas completas
    routes.post('/route',    requireAdmin, controllers.routes.handle)
    routes.delete('/route/', requireAdmin, controllers.routes.remove)

    // ── /maneuvers ──────────────────────────────────────────────────────────
    const maneuvers = express.Router()
    maneuvers.get('/monitor/',         limiters.monitorIp, limiters.monitorKey, controllers.maneuvers.readByKey) // público
    maneuvers.patch('/updateLocation/', requireAdminOrOperator, controllers.maneuvers.updateLocation)
    maneuvers.get('/byOperator/',       requireOperator,        controllers.maneuvers.readByOperator)
    maneuvers.get('/maneuver/',         requireAdmin, controllers.maneuvers.readAll)
    maneuvers.post('/maneuver/',        requireAdmin, controllers.maneuvers.handle)
    maneuvers.delete('/maneuver/',      requireAdmin, controllers.maneuvers.remove)
    maneuvers.get('/stats/',            requireAdmin, controllers.maneuvers.stats)

    return { auth, clients, transporters, routes, maneuvers }
}

module.exports = { createRouters }
