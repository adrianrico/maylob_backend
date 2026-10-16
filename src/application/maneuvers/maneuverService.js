'use strict'

/**
 * @file Caso de uso: gestión y seguimiento de maniobras (viajes).
 * @module application/maneuvers/maneuverService
 */

const { badRequest, notFound, forbidden, AppError } = require('../../shared/appError')
const { createId } = require('../../shared/ids')
const { compact } = require('../../shared/values')
const { computeLocationUpdate } = require('../../domain/maneuverTracking')
const logger = require('../../shared/logger')

/**
 * Quita datos personales (CURP del operador) de una maniobra antes de mostrarla
 * en el portal PÚBLICO de seguimiento. Quien tenga la llave MONI no necesita ni
 * debe ver identificadores personales de los operadores.
 * @param {Object} maneuver Maniobra (objeto plano).
 * @returns {Object} Copia sin PII.
 */
function stripPersonalData(maneuver)
{
    const { man_operator_id, man_update_by_curp, ...safe } = maneuver
    if (Array.isArray(safe.man_events))
    {
        safe.man_events = safe.man_events.map(({ updated_by_curp, ...event }) => event)
    }
    return safe
}

/**
 * @param {Object} deps Dependencias inyectadas.
 * @param {Object} deps.maneuverRepository Repositorio de maniobras.
 * @param {Object} deps.routeRepository Repositorio de rutas.
 * @param {Object} deps.clientRepository Repositorio de clientes.
 * @param {Object} deps.transporterRepository Repositorio de transportistas.
 * @param {{timeSnapshot: Function}} deps.clock Reloj.
 */
function createManeuverService({ maneuverRepository, routeRepository, clientRepository, transporterRepository, clock })
{
    return {
        /**
         * Crea una maniobra o actualiza una existente.
         *
         * - `man_moni_key` SIEMPRE refleja la llave del cliente asignado.
         * - En el alta el historial `man_events` arranca vacío: "SIN INICIAR" no es un hito real.
         * - En la actualización, los campos de reinicio de seguimiento (ubicación, estatus,
         *   avance, eventos) sólo se aplican si el cliente los envió explícitamente.
         *
         * @param {Object} dto Datos saneados por la capa HTTP (ver `maneuverValidator`).
         * @returns {Promise<{message: string}>}
         */
        async handleManeuver(dto)
        {
            const { reset, man_route_id, man_route_object, man_containers, man_intermediate_stops, man_moni_enable,
                    man_current_location, man_current_status, man_id: receivedId, ...fields } = dto

            const man_id = (receivedId ?? '') === '' || receivedId === '0'
                ? createId([fields.man_operator, fields.man_client, fields.man_dispatch_date])
                : receivedId

            // Ruta: por ID (copia viva de la BD) o, si no, el objeto saneado que mandó el cliente.
            let man_route = null
            if (man_route_id) man_route = (await routeRepository.findById(man_route_id)) ?? null
            else if (man_route_object) man_route = man_route_object

            // Llave MONI heredada del cliente asignado.
            const client = await clientRepository.findById(fields.man_client)
            const man_moni_key = client?.client_man_key ?? 'NO KEY'

            const existing = await maneuverRepository.findById(man_id)

            // ── Alta ────────────────────────────────────────────────────────
            if (!existing)
            {
                const now = clock.timeSnapshot()
                await maneuverRepository.create({
                    ...fields,
                    man_id,
                    man_route,
                    man_containers,
                    man_intermediate_stops,
                    man_moni_enable,
                    man_moni_key,
                    man_note:             '',
                    man_update_action:    'CREATED MANEUVER',
                    man_update_source:    'ADMINISTRATOR',
                    man_update_date:      now,
                    man_reg_date:         now,
                    man_current_location,
                    man_current_status,
                    man_progress:         '0%',
                    man_events:           [],
                })
                logger.info('maneuvers.handle', 'Maniobra almacenada.')
                return { message: 'Maniobra almacenada correctamente.' }
            }

            // ── Actualización ───────────────────────────────────────────────
            const previous = await maneuverRepository.updateById(man_id, compact({
                ...fields,
                man_moni_enable,
                man_moni_key,
                man_containers,
                man_intermediate_stops,
                man_route:            man_route !== null ? man_route : undefined,
                man_current_location: reset.location,
                man_current_status:   reset.status,
                man_progress:         reset.progress,
                man_events:           reset.events,
                man_update_action:    'UPDATED MANEUVER',
                man_update_source:    'ADMINISTRATOR',
                man_update_date:      clock.timeSnapshot(),
            }))

            if (!previous) throw new AppError(500, 'Error al actualizar la maniobra.')

            logger.info('maneuvers.handle', 'Maniobra actualizada.')
            return { message: 'Maniobra actualizada correctamente.' }
        },

        /**
         * Registra una nueva ubicación/estatus, recalcula el avance y guarda el historial.
         *
         * AUTORIZACIÓN: un OPERADOR sólo puede reportar sobre maniobras que tiene asignadas
         * (previene IDOR: que el operador A modifique la maniobra del operador B).
         *
         * @param {{man_id: string, man_current_location: string, man_current_status: string}} dto
         * @param {{type: 'admin'|'operator', name: string, curp: (string|null)}} actor Quién reporta.
         * @returns {Promise<{message: string, man_progress: string}>}
         */
        async updateLocation(dto, actor)
        {
            const { man_id, man_current_location, man_current_status } = dto
            if (!man_id || !man_current_location || !man_current_status)
                throw badRequest('Datos incompletos para actualizar la ubicación.')

            const maneuver = await maneuverRepository.findById(man_id)
            if (!maneuver) throw notFound('Maniobra no encontrada.')

            if (actor.type === 'operator' && maneuver.man_operator_id !== actor.curp)
            {
                logger.warn('maneuvers.updateLocation', 'Operador intentó modificar una maniobra que no tiene asignada.')
                throw forbidden('No tienes permiso para modificar esta maniobra.')
            }

            // Ruta: la viva (eventos frescos), si no la embebida, si no por origen/destino (maniobras heredadas).
            let route = null
            if (maneuver.man_route?.route_id) route = await routeRepository.findById(maneuver.man_route.route_id)
            if (!route) route = maneuver.man_route ?? null
            if (!route) route = await routeRepository.findByEndpoints(maneuver.man_load_location, maneuver.man_unload_location)

            const timestamp = clock.timeSnapshot()
            const { events, progressPercent } = computeLocationUpdate({
                route,
                existingEvents: maneuver.man_events,
                location: man_current_location,
                status:   man_current_status,
                actor:    { name: actor.name, curp: actor.curp ?? null },
                timestamp,
            })

            const man_progress = progressPercent + '%'
            const fields = {
                man_current_location,
                man_current_status,
                man_progress,
                man_events:         events,
                man_update_action:  'UPDATED LOCATION',
                man_update_source:  actor.name,
                man_update_by_curp: actor.curp ?? null,
                man_update_date:    timestamp,
            }
            // La fecha de término se estampa SOLO al llegar a 100 % para no pisarla después.
            if (progressPercent === 100) fields.man_finish_date = timestamp

            const previous = await maneuverRepository.updateById(man_id, fields)
            if (!previous) throw new AppError(500, 'Error al actualizar la ubicación.')

            logger.info('maneuvers.updateLocation', `Avance registrado: ${man_progress}.`)
            return { message: 'Ubicación actualizada correctamente.', man_progress }
        },

        /**
         * Elimina una maniobra por ID.
         * @param {{man_id: (string|null)}} dto
         */
        async deleteManeuver({ man_id })
        {
            if ((man_id ?? '') === '') throw badRequest('ID de maniobra no válido.')

            const deleted = await maneuverRepository.deleteById(man_id)
            if (!deleted) throw notFound('Maniobra no encontrada.', '0')

            logger.info('maneuvers.delete', 'Maniobra eliminada.')
            return { message: 'Maniobra eliminada exitosamente.' }
        },

        /**
         * Lista paginada (más recientes primero).
         * @param {{page: number, limit: number}} paging Valores ya acotados por la capa HTTP.
         * @returns {Promise<{maneuvers_data: Array<Object>, pagination: Object}>}
         */
        async listManeuvers({ page, limit })
        {
            const total = await maneuverRepository.countAll()
            if (total === 0) return { maneuvers_data: [], pagination: { page, limit, total: 0, total_pages: 0 } }

            const maneuvers_data = await maneuverRepository.page((page - 1) * limit, limit)
            return { maneuvers_data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } }
        },

        /**
         * Maniobras pendientes del operador autenticado.
         * @param {{curp: string}} operator Operador (viene del token, NO del cuerpo de la petición).
         */
        listByOperator: (operator) => maneuverRepository.findPendingByOperator(operator.curp),

        /**
         * Consulta PÚBLICA de solo lectura por llave MONI: sustituye ids por nombres
         * legibles (cliente y transportista) y elimina datos personales.
         * @param {string} key Llave MONI ya saneada.
         * @returns {Promise<Array<Object>>}
         */
        async listByMoniKey(key)
        {
            const found = await maneuverRepository.findByMoniKey(key)
            if (found.length === 0) return []
            const maneuvers = found.map(stripPersonalData)

            const client = await clientRepository.findByManKey(key, { client_name: 1 })
            if (client?.client_name) for (const m of maneuvers) m.man_client = client.client_name

            const transporterIds = [...new Set(maneuvers.map((m) => m.man_transporter).filter(Boolean))]
            if (transporterIds.length > 0)
            {
                const transporters = await transporterRepository.findNamesByIds(transporterIds)
                const nameById = new Map(transporters.map((t) => [t.transporter_id, t.transporter_name]))
                for (const m of maneuvers)
                {
                    const name = nameById.get(m.man_transporter)
                    if (name) m.man_transporter = name
                }
            }

            return maneuvers
        },

        /**
         * Estadísticas por rango de fechas de despacho (formato validado YYYY-MM-DD).
         * @param {{date_from: (string|undefined), date_to: (string|undefined)}} range
         * @returns {Promise<{total: number, activas: number, sin_iniciar: number, canceladas: number}>}
         */
        async getStats({ date_from, date_to })
        {
            const dateFilter = {}
            if (date_from) dateFilter.$gte = date_from
            if (date_to)   dateFilter.$lte = date_to

            const { total, canceled, notStarted } = await maneuverRepository.countStats(dateFilter)
            return { total, activas: total - canceled - notStarted, sin_iniciar: notStarted, canceladas: canceled }
        },
    }
}

module.exports = { createManeuverService, stripPersonalData }
