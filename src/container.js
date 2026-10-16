'use strict'

/**
 * @file Raíz de composición (composition root): único lugar que conoce TODAS las capas.
 * @module container
 *
 * Aquí se "cablean" las dependencias:
 *   repositorios (infraestructura) → servicios (aplicación) → app HTTP (interfaces).
 * Es inyección de dependencias manual, sin framework. Las pruebas pasan sus propios
 * repositorios falsos a `buildServices` y reutilizan todo lo demás.
 */

const { systemClock } = require('./shared/clock')
const { createTokenService } = require('./infrastructure/security/tokenService')
const { clientRepository } = require('./infrastructure/persistence/repositories/clientRepository')
const { routeRepository } = require('./infrastructure/persistence/repositories/routeRepository')
const { maneuverRepository } = require('./infrastructure/persistence/repositories/maneuverRepository')
const { transporterRepository } = require('./infrastructure/persistence/repositories/transporterRepository')
const { createAuthService } = require('./application/auth/authService')
const { createClientService } = require('./application/clients/clientService')
const { createRouteService } = require('./application/routes/routeService')
const { createTransporterService } = require('./application/transporters/transporterService')
const { createManeuverService } = require('./application/maneuvers/maneuverService')

/** Repositorios reales (MongoDB). */
const defaultRepositories = { clientRepository, routeRepository, maneuverRepository, transporterRepository }

/**
 * Construye todos los servicios de aplicación.
 * @param {Readonly<Object>} config Configuración validada.
 * @param {Object} [overrides] Repositorios/reloj alternativos (pruebas).
 * @returns {Object} `{ authService, clientService, routeService, transporterService, maneuverService }`
 */
function buildServices(config, overrides = {})
{
    const repos = { ...defaultRepositories, ...overrides }
    const clock = overrides.clock ?? systemClock
    const tokenService = createTokenService(config)

    return {
        authService:        createAuthService({ transporterRepository: repos.transporterRepository, tokenService }),
        clientService:      createClientService({ clientRepository: repos.clientRepository, maneuverRepository: repos.maneuverRepository, clock }),
        routeService:       createRouteService({ routeRepository: repos.routeRepository }),
        transporterService: createTransporterService({ transporterRepository: repos.transporterRepository, clock }),
        maneuverService:    createManeuverService({ ...repos, clock }),
    }
}

module.exports = { buildServices }
