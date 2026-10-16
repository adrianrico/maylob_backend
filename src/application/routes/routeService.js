'use strict'

/**
 * @file Caso de uso: gestión de rutas personalizadas.
 * @module application/routes/routeService
 */

const { badRequest, notFound } = require('../../shared/appError')
const { createId } = require('../../shared/ids')
const { sanitizeLocationPoint } = require('../../domain/sanitizers')
const logger = require('../../shared/logger')

/** ¿Es un objeto plano (no null ni arreglo)? */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * @param {Object} deps Dependencias inyectadas.
 * @param {Object} deps.routeRepository Repositorio de rutas.
 */
function createRouteService({ routeRepository })
{
    return {
        /**
         * Crea una ruta o actualiza una existente.
         *
         * La numeración (`step_number`) la decide SIEMPRE el servidor:
         * origen = 1, intermedios = 2..n+1, destino = n+2. Los puntos se
         * reemplazan completos cuando se envían.
         *
         * @param {Object} dto Datos saneados por la capa HTTP.
         * @param {string|null} dto.route_id ID de la ruta a editar (null = alta).
         * @param {string|null} dto.route_name Nombre en mayúsculas (obligatorio).
         * @param {string|null} dto.route_category Categoría.
         * @param {*} dto.route_origin Punto de origen crudo (se sanea aquí por punto).
         * @param {*} dto.route_intermediate_points Puntos intermedios crudos.
         * @param {*} dto.route_destination Punto de destino crudo.
         * @returns {Promise<{created: boolean, route_id?: string, message: string}>}
         */
        async handleRoute(dto)
        {
            const { route_id, route_name, route_category, route_origin, route_intermediate_points, route_destination } = dto
            if ((route_name ?? '') === '') throw badRequest('Nombre de ruta requerida.')

            // Sólo se busca si llegó un ID: buscar con `undefined` podría empatar con cualquier ruta.
            const existing = route_id ? await routeRepository.findById(route_id) : null

            // ── Alta ────────────────────────────────────────────────────────
            if (!existing)
            {
                const newId = createId([route_name, route_origin?.location_name, route_destination?.location_name])
                const intermediate = Array.isArray(route_intermediate_points)
                    ? route_intermediate_points.map((p, i) => sanitizeLocationPoint(p, i + 2, 'NO INTERMEDIATE SET'))
                    : []

                await routeRepository.create({
                    route_id:                  newId,
                    route_name:                route_name,
                    route_category:            route_category || 'NO CATEGORY SET',
                    route_origin:              sanitizeLocationPoint(route_origin, 1, 'NO ORIGIN SET'),
                    route_intermediate_points: intermediate,
                    route_destination:         sanitizeLocationPoint(route_destination, intermediate.length + 2, 'NO DESTINATION SET'),
                })

                logger.info('routes.handle', 'Ruta creada.')
                return { created: true, route_id: newId, message: 'Route CREATED.' }
            }

            // ── Actualización: sólo lo que cambió ───────────────────────────
            const update = {}
            if (route_name !== existing.route_name) update.route_name = route_name
            if (route_category !== null && route_category !== existing.route_category) update.route_category = route_category

            if (isObject(route_origin))
                update.route_origin = sanitizeLocationPoint(route_origin, 1, existing.route_origin?.location_name || 'NO ORIGIN SET')

            let intermediateCount = existing.route_intermediate_points?.length || 0
            if (Array.isArray(route_intermediate_points))
            {
                const rebuilt = route_intermediate_points.map((p, i) => sanitizeLocationPoint(p, i + 2, 'NO INTERMEDIATE SET'))
                update.route_intermediate_points = rebuilt
                intermediateCount = rebuilt.length
            }

            // El destino continúa la secuencia; si cambió el nº de intermedios hay que re-sincronizar su paso.
            const destinationStep = intermediateCount + 2
            if (isObject(route_destination))
                update.route_destination = sanitizeLocationPoint(route_destination, destinationStep, existing.route_destination?.location_name || 'NO DESTINATION SET')
            else if (existing.route_destination && existing.route_destination.step_number !== destinationStep)
                update.route_destination = { ...existing.route_destination, step_number: destinationStep }

            if (Object.keys(update).length === 0) return { created: false, message: 'Sin cambios.' }

            await routeRepository.updateById(route_id, update)
            logger.info('routes.handle', 'Ruta actualizada.')
            return { created: false, message: 'RUTA actualizada parcialmente.' }
        },

        /** @returns {Promise<Array<Object>>} Todas las rutas. */
        listRoutes: () => routeRepository.list(),

        /**
         * Elimina una ruta.
         * @param {{route_id: (string|null)}} dto
         */
        async deleteRoute({ route_id })
        {
            if ((route_id ?? '') === '') throw badRequest('ID de ruta no válido.')

            const deleted = await routeRepository.deleteById(route_id)
            if (!deleted) throw notFound('Ruta no encontrada.', '0')

            logger.info('routes.delete', 'Ruta eliminada.')
            return { message: 'Ruta eliminada exitosamente.' }
        },
    }
}

module.exports = { createRouteService }
