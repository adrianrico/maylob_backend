'use strict'

/**
 * @file Regla de negocio central: registrar un avance de ubicación/estatus de una maniobra.
 * @module domain/maneuverTracking
 *
 * Función PURA: dado el historial previo y la ruta, calcula el nuevo historial y
 * el porcentaje de avance. No toca la base de datos (eso lo hace el servicio).
 */

const { buildRouteMilestones, findRoutePoint } = require('./routeProgress')

/**
 * Calcula el nuevo historial `man_events` y el avance tras una actualización.
 *
 * Casos:
 *  - CANCELADO: checkpoint especial; reporta 0% para ESTA actualización y no
 *    altera la secuencia (sin relleno ni poda).
 *  - Estatus fuera del flujo de la ruta (sin ruta o texto libre): se agrega al
 *    historial conservando el último avance conocido.
 *  - Estatus dentro del flujo:
 *      · avance hacia adelante → se RELLENAN los hitos saltados (misma marca de tiempo)
 *        para que la secuencia nunca tenga huecos;
 *      · retroceso → se descartan ese hito y los posteriores y se registra de nuevo.
 *
 * @param {Object} input
 * @param {Object|null} input.route            Ruta asignada (viva, embebida o heredada).
 * @param {Array<Object>} input.existingEvents Historial actual de la maniobra.
 * @param {string} input.location              Ubicación reportada.
 * @param {string} input.status                Estatus reportado ("EVENTO" o "EVENTO / SUBEVENTO").
 * @param {{name: string, curp: (string|null)}} input.actor Quién reporta.
 * @param {string} input.timestamp             Marca de tiempo de la actualización.
 * @returns {{events: Array<Object>, progressPercent: number}}
 */
function computeLocationUpdate({ route, existingEvents, location, status, actor, timestamp })
{
    const { milestones, totalUnits } = buildRouteMilestones(route)
    const previous = Array.isArray(existingEvents) ? existingEvents : []

    const baseEntry = (fields) => ({ ...fields, timestamp, updated_by_name: actor.name, updated_by_curp: actor.curp })

    // ── CANCELADO ───────────────────────────────────────────────────────────
    if (status.toUpperCase().includes('CANCEL'))
    {
        const point = findRoutePoint(route, location)
        return {
            events: [...previous, baseEntry({
                step_number: point?.step_number ?? null,
                sub_step_number: 0,
                location_name: location,
                event_name: 'CANCELADO',
                progress: '0%',
            })],
            progressPercent: 0,
        }
    }

    // El estatus llega como "EVENTO" o "EVENTO / SUBEVENTO" (los sub-eventos no tienen
    // identificador propio), así que se compara por nombre exacto o por prefijo "EVENTO / ".
    const targetIndex = milestones.findIndex((m) =>
        m.location_name === location &&
        (status === m.event_name || status.startsWith(m.event_name + ' / '))
    )

    // ── Fuera del flujo de la ruta ──────────────────────────────────────────
    if (targetIndex === -1)
    {
        const lastSequenced = [...previous].reverse().find((e) => e?.step_number != null && e?.sub_step_number != null)
        const progressPercent = lastSequenced ? (parseInt(lastSequenced.progress, 10) || 0) : 0
        return {
            events: [...previous, baseEntry({
                step_number: null,
                sub_step_number: null,
                location_name: location,
                event_name: status,
                progress: progressPercent + '%',
            })],
            progressPercent,
        }
    }

    // ── Dentro del flujo: validación de secuencia ───────────────────────────
    const indexOfEvent = (e) => milestones.findIndex((m) => m.step_number === e.step_number && m.sub_step_number === e.sub_step_number)

    // currentIndex = "marca de agua": un hito más allá del más alto ya alcanzado.
    let currentIndex = 0
    for (const e of previous)
    {
        if (e?.step_number == null || e?.sub_step_number == null) continue
        const idx = indexOfEvent(e)
        if (idx !== -1) currentIndex = Math.max(currentIndex, idx + 1)
    }

    const percentOf = (m) => (totalUnits > 0 ? Math.round(m.cumulativeUnits / totalUnits * 100) : 0)

    const toEntry = (idx) =>
    {
        const m = milestones[idx]
        return baseEntry({
            step_number: m.step_number,
            sub_step_number: m.sub_step_number,
            location_name: m.location_name,
            event_name: m.event_name,
            progress: percentOf(m) + '%',
        })
    }

    let events
    if (targetIndex >= currentIndex)
    {
        const filled = []
        for (let i = currentIndex; i < targetIndex; i++) filled.push(toEntry(i))
        filled.push(toEntry(targetIndex))
        events = [...previous, ...filled]
    }
    else
    {
        const kept = previous.filter((e) =>
        {
            if (e?.step_number == null || e?.sub_step_number == null) return true
            const idx = indexOfEvent(e)
            return idx !== -1 && idx < targetIndex
        })
        events = [...kept, toEntry(targetIndex)]
    }

    return { events, progressPercent: percentOf(milestones[targetIndex]) }
}

module.exports = { computeLocationUpdate }
