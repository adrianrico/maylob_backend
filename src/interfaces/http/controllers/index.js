'use strict'

/**
 * @file Controladores HTTP (delgados): traducen HTTP ↔ casos de uso.
 * @module interfaces/http/controllers
 *
 * Un controlador hace TRES cosas y nada más:
 *   1. extrae/sanea la entrada (validators),
 *   2. llama a UN método del servicio de aplicación,
 *   3. da formato a la respuesta HTTP.
 * No contiene reglas de negocio ni toca la base de datos. Los errores se lanzan
 * (`AppError`) y los atiende `errorHandler`.
 *
 * Contrato de respuesta heredado (los frontends dependen de él):
 *   éxito → `{ code: '1', ...datos }`; vacío → `{ code: '0', message }`.
 */

const v = require('../validators')
const { badRequest } = require('../../../shared/appError')
const { asyncHandler } = require('../middleware/errorHandler')

/**
 * @param {Object} services Servicios de aplicación ya construidos.
 * @returns {Object} Controladores agrupados por módulo.
 */
function createControllers({ authService, clientService, routeService, transporterService, maneuverService })
{
    return {
        auth: {
            /** POST /auth/login */
            login: asyncHandler(async (req, res) =>
            {
                const { operator, token, expires_in } = await authService.login(v.loginDto(req))
                res.status(200).send({ code: '1', operator, token, expires_in })
            }),
        },

        clients: {
            /** POST /clients/client/ */
            handle: asyncHandler(async (req, res) =>
            {
                const { message } = await clientService.handleClient(v.clientDto(req))
                res.status(200).send({ code: '1', message })
            }),
            /** GET /clients/client/ */
            read: asyncHandler(async (req, res) =>
            {
                const clients_data = await clientService.listClients()
                if (clients_data.length === 0) return res.status(200).send({ code: '0', message: 'No hay clientes registrados todavía.' })
                res.status(200).send({ code: '1', clients_data })
            }),
            /** DELETE /clients/client/ */
            remove: asyncHandler(async (req, res) =>
            {
                const { message } = await clientService.deleteClient(v.clientDeleteDto(req))
                res.status(200).send({ code: '1', message })
            }),
        },

        routes: {
            /** POST /routes/route */
            handle: asyncHandler(async (req, res) =>
            {
                const result = await routeService.handleRoute(v.routeDto(req))
                // Contrato histórico: el alta responde code '1' (texto) y route_id; la edición, code 1 (número).
                if (result.created) return res.status(200).send({ code: '1', message: result.message, route_id: result.route_id })
                res.status(200).send({ code: 1, message: result.message })
            }),
            /** GET /routes/route */
            read: asyncHandler(async (req, res) =>
            {
                const routes_data = await routeService.listRoutes()
                if (routes_data.length === 0) return res.status(200).send({ code: '0', message: 'No hay rutas registradas todavía.' })
                res.status(200).send({ code: '1', routes_data })
            }),
            /** DELETE /routes/route */
            remove: asyncHandler(async (req, res) =>
            {
                const { message } = await routeService.deleteRoute(v.routeDeleteDto(req))
                res.status(200).send({ code: '1', message })
            }),
        },

        transporters: {
            /** POST /transporters/transporter/ */
            handle: asyncHandler(async (req, res) =>
            {
                const { message } = await transporterService.handleTransporter(v.transporterDto(req))
                res.status(200).send({ code: '1', message })
            }),
            /** GET /transporters/transporter/ */
            read: asyncHandler(async (req, res) =>
            {
                const transporters_data = await transporterService.listTransporters()
                if (transporters_data.length === 0) return res.status(200).send({ code: '0', message: 'No hay transportistas registrados todavía.' })
                res.status(200).send({ code: '1', transporters_data })
            }),
            /** DELETE /transporters/transporter/ */
            remove: asyncHandler(async (req, res) =>
            {
                const { message } = await transporterService.deleteTransporter(v.transporterDeleteDto(req))
                res.status(200).send({ code: '1', message })
            }),
            /** POST /transporters/operator/ */
            handleOperator: asyncHandler(async (req, res) =>
            {
                const { message } = await transporterService.handleOperator(v.operatorDto(req))
                res.status(200).send({ code: '1', message })
            }),
            /** POST /transporters/eco/ */
            handleEco: asyncHandler(async (req, res) =>
            {
                const { message } = await transporterService.handleEco(v.ecoDto(req))
                res.status(200).send({ code: '1', message })
            }),
        },

        maneuvers: {
            /** POST /maneuvers/maneuver/ */
            handle: asyncHandler(async (req, res) =>
            {
                const { message } = await maneuverService.handleManeuver(v.maneuverDto(req))
                res.status(200).send({ code: '1', message })
            }),
            /** PATCH /maneuvers/updateLocation/ */
            updateLocation: asyncHandler(async (req, res) =>
            {
                const { message, man_progress } = await maneuverService.updateLocation(v.updateLocationDto(req), req.actor)
                res.status(200).send({ code: '1', message, man_progress })
            }),
            /** DELETE /maneuvers/maneuver/ */
            remove: asyncHandler(async (req, res) =>
            {
                const { message } = await maneuverService.deleteManeuver(v.maneuverDeleteDto(req))
                res.status(200).send({ code: '1', message })
            }),
            /** GET /maneuvers/maneuver/?page=&limit= */
            readAll: asyncHandler(async (req, res) =>
            {
                const { maneuvers_data, pagination } = await maneuverService.listManeuvers(v.pagingDto(req))
                if (pagination.total === 0) return res.status(200).send({ code: '0', message: 'No hay maniobras registradas todavía.', maneuvers_data, pagination })
                res.status(200).send({ code: '1', maneuvers_data, pagination })
            }),
            /** GET /maneuvers/byOperator/ (operador autenticado) */
            readByOperator: asyncHandler(async (req, res) =>
            {
                const maneuvers_data = await maneuverService.listByOperator(req.operator)
                res.status(200).send({ code: '1', maneuvers_data })
            }),
            /** GET /maneuvers/monitor/?key= (PÚBLICO) */
            readByKey: asyncHandler(async (req, res) =>
            {
                const key = v.moniKeyDto(req)
                if (!key) throw badRequest('Llave no válida.')

                const maneuvers_data = await maneuverService.listByMoniKey(key)
                if (maneuvers_data.length === 0) return res.status(200).send({ code: '0', message: 'Llave sin maniobras activas o inválida.', maneuvers_data: [] })
                res.status(200).send({ code: '1', maneuvers_data })
            }),
            /** GET /maneuvers/stats/ */
            stats: asyncHandler(async (req, res) =>
            {
                const range = v.statsDto(req)
                if (range.error) throw badRequest(range.error)

                const stats = await maneuverService.getStats(range)
                res.status(200).send({ code: '1', stats })
            }),
        },
    }
}

module.exports = { createControllers }
