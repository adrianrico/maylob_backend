'use strict'

/**
 * Pruebas de la capa de DOMINIO (lógica pura, sin BD ni HTTP).
 * Ejecutar: `npm test`
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const s = require('../src/domain/sanitizers')
const { buildRouteMilestones, normalizeLegacyRoute } = require('../src/domain/routeProgress')
const { computeLocationUpdate } = require('../src/domain/maneuverTracking')
const { createId } = require('../src/shared/ids')

/** Ruta de ejemplo: ORIGEN(2 eventos, uno con 1 sub-evento) → DESTINO(1 evento). */
const route = {
    route_origin: { location_name: 'ASLA', step_number: 1, events: [
        { event_name: 'cancelado', sub_step_number: 0, sub_events: [] },
        { event_name: 'EN ESPERA', sub_step_number: 1, sub_events: [] },
        { event_name: 'LLAMADO', sub_step_number: 2, sub_events: ['PUERTA 3'] },
    ] },
    route_intermediate_points: [],
    route_destination: { location_name: 'PATIO', step_number: 2, events: [
        { event_name: 'cancelado', sub_step_number: 0, sub_events: [] },
        { event_name: 'FINALIZADO', sub_step_number: 1, sub_events: [] },
    ] },
}
const actor = { name: 'JUAN', curp: 'AAAA000000HDFXXX00' }

test('sanitizeString elimina operadores NoSQL, CRLF y HTML', () =>
{
    assert.equal(s.sanitizeString('a$ne\r\n<script>'), 'anescript')
    assert.equal(s.sanitizeString({ $ne: 1 }), null)
    assert.equal(s.sanitizeString('   '), null)
})

test('sanitizeId solo deja alfanuméricos, guion y guion bajo', () =>
{
    assert.equal(s.sanitizeId('AB-12_x; DROP'), 'AB-12_xDROP')
    assert.equal(s.sanitizeId(['x']), null)
})

test('sanitizeUrl rechaza esquemas peligrosos', () =>
{
    assert.equal(s.sanitizeUrl('javascript:alert(1)'), null)
    assert.equal(s.sanitizeUrl('https://maps.google.com/?q=1'), 'https://maps.google.com/?q=1')
})

test('sanitizeObject descarta __proto__, $operadores y llaves con punto', () =>
{
    const dirty = JSON.parse('{"ok":"x","$where":"1","a.b":1,"__proto__":{"admin":true},"n":{"$ne":1,"z":"y"}}')
    assert.deepEqual(s.sanitizeObject(dirty), { ok: 'x', n: { z: 'y' } })
    assert.equal({}.admin, undefined)
})

test('sanitizeLocationEvents ignora el sub_step del cliente y regenera "cancelado"', () =>
{
    const out = s.sanitizeLocationEvents([
        { event_name: 'cancelado', sub_step_number: 9 },
        { event_name: 'A', sub_step_number: 77, sub_events: ['x', 5] },
    ])
    assert.deepEqual(out.map((e) => [e.event_name, e.sub_step_number]), [['cancelado', 0], ['A', 1]])
})

test('buildRouteMilestones pondera puntos, eventos y sub-eventos', () =>
{
    const { milestones, totalUnits } = buildRouteMilestones(route)
    // origen(1) + 2 eventos(2) + 1 sub-evento(1) + destino(1) + 1 evento(1) = 6
    assert.equal(totalUnits, 6)
    assert.deepEqual(milestones.map((m) => m.cumulativeUnits), [2, 4, 6])
})

test('normalizeLegacyRoute reconstruye rutas del formato anterior', () =>
{
    const legacy = { route_origin: 'A', route_destination: 'B', route_origin_events: [{ event_name: 'E1' }], route_destination_events: [], route_intermediate_stops: [] }
    const n = normalizeLegacyRoute(legacy)
    assert.equal(n.route_origin.location_name, 'A')
    assert.equal(n.route_destination.step_number, 2)
    assert.equal(n.route_origin.events[1].event_name, 'E1')
})

test('avance hacia adelante rellena hitos saltados y llega a 100 %', () =>
{
    const r = computeLocationUpdate({ route, existingEvents: [], location: 'PATIO', status: 'FINALIZADO', actor, timestamp: 't' })
    assert.equal(r.progressPercent, 100)
    assert.equal(r.events.length, 3) // EN ESPERA, LLAMADO (rellenados) + FINALIZADO
    assert.equal(r.events[0].updated_by_curp, actor.curp)
})

test('acepta "EVENTO / SUBEVENTO" y retroceso poda hitos posteriores', () =>
{
    const first = computeLocationUpdate({ route, existingEvents: [], location: 'PATIO', status: 'FINALIZADO', actor, timestamp: 't' })
    const back  = computeLocationUpdate({ route, existingEvents: first.events, location: 'ASLA', status: 'LLAMADO / PUERTA 3', actor, timestamp: 't2' })
    assert.equal(back.progressPercent, 67)
    assert.deepEqual(back.events.map((e) => e.event_name), ['EN ESPERA', 'LLAMADO'])
})

test('CANCELADO reporta 0 % y no altera la secuencia previa', () =>
{
    const base = computeLocationUpdate({ route, existingEvents: [], location: 'ASLA', status: 'EN ESPERA', actor, timestamp: 't' })
    const cancel = computeLocationUpdate({ route, existingEvents: base.events, location: 'ASLA', status: 'CANCELADO', actor, timestamp: 't2' })
    assert.equal(cancel.progressPercent, 0)
    assert.equal(cancel.events.length, base.events.length + 1)
})

test('estatus fuera de la ruta conserva el último avance', () =>
{
    const base = computeLocationUpdate({ route, existingEvents: [], location: 'ASLA', status: 'EN ESPERA', actor, timestamp: 't' })
    const extra = computeLocationUpdate({ route, existingEvents: base.events, location: 'ASLA', status: 'EVENTO EXTRA', actor, timestamp: 't2' })
    assert.equal(extra.progressPercent, base.progressPercent)
    assert.equal(extra.events.at(-1).step_number, null)
})

test('createId es único incluso dentro del mismo segundo', () =>
{
    const now = new Date()
    const ids = new Set(Array.from({ length: 50 }, () => createId(['A', 'B'], now)))
    assert.equal(ids.size, 50)
})
