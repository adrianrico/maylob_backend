'use strict'

/**
 * @file Reglas de negocio: estructura de una ruta y cálculo de hitos de avance.
 * @module domain/routeProgress
 *
 * Lógica PURA: no usa Express, Mongoose ni reloj. Recibe datos y devuelve datos,
 * por eso es fácil de probar (ver `test/domain.test.js`).
 *
 * Modelo de una ruta:
 *   origen (step 1) → puntos intermedios (step 2..n+1) → destino (step n+2)
 * Cada punto tiene `events[]`; cada evento tiene `sub_step_number` (1..n) y
 * `sub_events[]`. El evento "cancelado" (sub_step 0) es un checkpoint especial
 * que NO forma parte del flujo normal.
 */

/**
 * Reconstruye el formato actual de ruta a partir de rutas guardadas antes del
 * rediseño "stepper" (origen/destino como texto plano, eventos en campos aparte
 * y paradas en `route_intermediate_stops`). Las rutas actuales pasan sin cambios.
 *
 * @param {Object|null} route Ruta (documento de Mongoose u objeto plano).
 * @returns {Object|null} Ruta en formato `{location_name, step_number, events[]}`.
 */
function normalizeLegacyRoute(route)
{
    if (!route) return route
    const plain = typeof route.toObject === 'function' ? route.toObject() : route
    if (plain.route_origin && typeof plain.route_origin === 'object') return plain
    if (typeof plain.route_origin !== 'string') return plain

    const toEvents = (list) => [
        { event_name: 'cancelado', sub_step_number: 0, sub_events: [] },
        ...(Array.isArray(list) ? list : [])
            .map((ev) => String(ev?.event_name ?? '').trim())
            .filter((name) => name !== '' && name.toLowerCase() !== 'cancelado')
            .map((event_name, index) => ({ event_name, sub_step_number: index + 1, sub_events: [] })),
    ]

    const stops = Array.isArray(plain.route_intermediate_stops) ? plain.route_intermediate_stops : []
    return {
        ...plain,
        route_origin: { location_name: plain.route_origin, step_number: 1, events: toEvents(plain.route_origin_events) },
        route_intermediate_points: stops
            .filter((stop) => stop && String(stop.stop_name ?? '').trim() !== '')
            .map((stop, index) => ({ location_name: stop.stop_name, step_number: index + 2, events: toEvents(stop.stop_events) })),
        route_destination: { location_name: plain.route_destination, step_number: stops.length + 2, events: toEvents(plain.route_destination_events) },
    }
}

/**
 * Devuelve todos los puntos de la ruta en orden: origen, intermedios y destino.
 * @param {Object} route Ruta ya normalizada.
 * @returns {Array<Object>}
 */
function listPoints(route)
{
    const intermediates = Array.isArray(route.route_intermediate_points) ? route.route_intermediate_points : []
    return [route.route_origin, ...intermediates, route.route_destination]
}

/**
 * Aplana la ruta en la secuencia ordenada (step_number, sub_step_number) contra
 * la que se valida y rellena `man_events`, y calcula el avance PONDERADO.
 *
 * Ponderación: totalUnits = cada punto + cada evento (sin "cancelado") + cada
 * sub-evento. Alcanzar un evento acredita su unidad más la de todos sus
 * sub-eventos; la unidad del punto se acredita junto con su primer evento.
 * El avance es `cumulativeUnits / totalUnits`.
 *
 * @param {Object|null} route Ruta (puede ser legacy).
 * @returns {{milestones: Array<Object>, totalUnits: number}}
 */
function buildRouteMilestones(route)
{
    route = normalizeLegacyRoute(route)
    if (!route) return { milestones: [], totalUnits: 0 }

    const points = listPoints(route)
        .filter((point) => point && typeof point === 'object')
        .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))

    const milestones = []
    let cumulativeUnits = 0

    for (const point of points)
    {
        const events = Array.isArray(point.events) ? point.events : []
        const sortedEvents = events
            .filter((event) => event && event.sub_step_number !== 0)
            .sort((a, b) => (a.sub_step_number ?? 0) - (b.sub_step_number ?? 0))

        cumulativeUnits += 1 // el punto en sí

        for (const event of sortedEvents)
        {
            const subEventsCount = Array.isArray(event.sub_events) ? event.sub_events.length : 0
            cumulativeUnits += 1 + subEventsCount // el evento + todos sus sub-eventos

            milestones.push({
                step_number:     point.step_number,
                sub_step_number: event.sub_step_number,
                location_name:   point.location_name,
                event_name:      event.event_name,
                cumulativeUnits,
            })
        }
    }

    return { milestones, totalUnits: cumulativeUnits }
}

/**
 * Busca el punto (origen/intermedio/destino) por nombre de ubicación, aunque no tenga eventos reales.
 * @param {Object|null} route Ruta (puede ser legacy).
 * @param {string} locationName Nombre de la ubicación.
 * @returns {Object|null}
 */
function findRoutePoint(route, locationName)
{
    route = normalizeLegacyRoute(route)
    if (!route) return null
    return listPoints(route).find((point) => point && typeof point === 'object' && point.location_name === locationName) ?? null
}

module.exports = { normalizeLegacyRoute, buildRouteMilestones, findRoutePoint }
