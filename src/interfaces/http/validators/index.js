'use strict'

/**
 * @file Validadores/saneadores de entrada: convierten el `req.body`/`req.query`
 *       crudo en DTOs (objetos de transferencia) limpios para los servicios.
 * @module interfaces/http/validators
 *
 * Aquí TERMINA la desconfianza: los servicios de aplicación reciben únicamente
 * valores ya saneados y con la forma esperada. Todo lo que no esté en la lista
 * blanca de campos se ignora (no hay "mass assignment").
 */

const s = require('../../../domain/sanitizers')
const { isValidValue } = require('../../../shared/values')

/** El body puede venir vacío o ser un tipo inesperado: siempre se trabaja con un objeto. */
const asBody = (req) => (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body) ? req.body : {})

const upper = (value) => value?.toUpperCase()

// ───────────────────────────── AUTH ─────────────────────────────
const loginDto = (req) => ({ curp: s.sanitizeCurp(asBody(req).curp) })

// ──────────────────────────── CLIENTES ───────────────────────────
function clientDto(req)
{
    const b = asBody(req)
    return {
        search_client_id: s.sanitizeString(b.client_id)                  ?? null,
        client_name:      upper(s.sanitizeName(b.client_name))           ?? null,
        phone_provided:   isValidValue(b.client_phone),
        email_provided:   isValidValue(b.client_email),
        client_phone:     s.sanitizePhone(b.client_phone)                ?? '',
        client_email:     s.sanitizeEmail(b.client_email)                ?? '',
        client_status:    upper(s.sanitizeString(b.client_status))       ?? null,
        client_man_key:   s.sanitizeString(b.client_man_key)             ?? null,
    }
}
const clientDeleteDto = (req) => ({ client_id: s.sanitizeString(asBody(req).client_id) ?? null })

// ───────────────────────────── RUTAS ─────────────────────────────
function routeDto(req)
{
    const b = asBody(req)
    return {
        route_id:                  s.sanitizeString(b.route_id)       ?? null,
        route_name:                s.sanitizeString(b.route_name)     ?? null,
        route_category:            s.sanitizeString(b.route_category) ?? null,
        // Los puntos se sanean con detalle dentro del servicio (necesitan el nº de paso).
        route_origin:              b.route_origin,
        route_intermediate_points: b.route_intermediate_points,
        route_destination:         b.route_destination,
    }
}
const routeDeleteDto = (req) => ({ route_id: s.sanitizeString(asBody(req).route_id) ?? null })

// ──────────────────────────── TRANSPORTISTAS ─────────────────────
function transporterDto(req)
{
    const b = asBody(req)
    return {
        transporter_id:   s.sanitizeString(b.transporter_id)                       ?? null,
        transporter_name: upper(s.sanitizeName(b.transporter_name))                ?? null,
        transporter_caat: upper(s.sanitizeString(b.transporter_caat))              ?? 'DATO NO ASIGNADO',
    }
}
const transporterDeleteDto = (req) => ({
    transporter_id:   s.sanitizeString(asBody(req).transporter_id)                 ?? null,
    transporter_name: upper(s.sanitizeString(asBody(req).transporter_name))        ?? null,
})

/** Texto opcional en mayúsculas ('' si no viene). */
const optUpper = (v) => upper(s.sanitizeString(v)) ?? ''
/** Texto opcional respetando mayúsculas/minúsculas ('' si no viene). */
const opt = (v) => s.sanitizeString(v) ?? ''

function operatorDto(req)
{
    const b = asBody(req)
    return {
        transporter_id: s.sanitizeString(b.operator_tr_id) ?? null,
        id:             s.sanitizeString(b.operator_id)    ?? null,
        name:           upper(s.sanitizeName(b.operator_name)) ?? null,
        identity:       s.sanitizeCurp(b.operator_curp),
        action:         s.sanitizeString(b.action)?.toLowerCase() ?? null,
        available:      b.operator_available !== false,
        extras: {
            operator_rfc:     optUpper(b.operator_rfc),
            operator_nss:     optUpper(b.operator_nss),
            operator_license: optUpper(b.operator_license),
            operator_address: opt(b.operator_address),
        },
    }
}

function ecoDto(req)
{
    const b = asBody(req)
    return {
        transporter_id: s.sanitizeString(b.eco_tr_id) ?? null,
        id:             s.sanitizeString(b.eco_id)    ?? null,
        name:           upper(s.sanitizeName(b.eco_name)) ?? null,
        identity:       s.sanitizePlates(b.eco_plates),
        action:         s.sanitizeString(b.action)?.toLowerCase() ?? null,
        available:      b.eco_available !== false,
        extras: {
            eco_year:              opt(b.eco_year),
            eco_color:             optUpper(b.eco_color),
            eco_serial_number:     optUpper(b.eco_serial_number),
            eco_engine_serial:     optUpper(b.eco_engine_serial),
            eco_insurance_company: optUpper(b.eco_insurance_company),
            eco_insurance_policy:  opt(b.eco_insurance_policy),
        },
    }
}

// ──────────────────────────── MANIOBRAS ──────────────────────────
function maneuverDto(req)
{
    const b = asBody(req)
    const pending = 'PENDIENTE'
    const isPlain = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

    return {
        man_id:                  s.sanitizeId(b.man_id) ?? null,
        man_client:              upper(s.sanitizeString(b.man_client))     ?? pending,
        man_type:                upper(s.sanitizeString(b.man_type))       ?? pending,
        man_modality:            upper(s.sanitizeString(b.man_modality))   ?? pending,
        man_dispatch_date:       s.sanitizeString(b.man_dispatch_date)     ?? pending,
        man_executive:           upper(s.sanitizeName(b.man_executive))    ?? pending,
        man_agent:               upper(s.sanitizeName(b.man_agent))        ?? pending,
        man_load_location:       s.sanitizeString(b.man_load_location)     ?? pending,
        man_unload_location:     s.sanitizeString(b.man_unload_location)   ?? pending,
        man_extra_location:      s.sanitizeString(b.man_extra_location)    ?? pending,
        man_extra_location_link: s.sanitizeUrl(b.man_extra_location_link)  ?? pending,
        man_eco:                 s.sanitizeString(b.man_eco)               ?? pending,
        man_operator:            upper(s.sanitizeName(b.man_operator))     ?? pending,
        man_operator_id:         s.sanitizeId(b.man_operator_id)           ?? '',
        man_gps_link:            s.sanitizeUrl(b.man_gps_link)             ?? pending,
        man_transporter:         s.sanitizeString(b.man_transporter)       ?? pending,
        man_moni_enable:         (b.man_moni_enable === false || b.man_moni_enable === 'false') ? 'false' : 'true',
        man_containers:          s.sanitizeContainers(b.man_containers),
        man_intermediate_stops:  s.sanitizeStops(b.man_intermediate_stops),
        man_route_id:            s.sanitizeId(b.man_route_id) ?? null,
        man_route_object:        isPlain(b.man_route) ? s.sanitizeObject(b.man_route) : null,
        // Valores iniciales para un alta.
        man_current_location:    upper(s.sanitizeString(b.man_current_location)) ?? 'SIN INICIAR',
        man_current_status:      upper(s.sanitizeString(b.man_current_status))   ?? 'SIN INICIAR',
        // Reinicio opcional del seguimiento (sólo en actualizaciones y sólo si se envía).
        reset: {
            location: b.man_current_location !== undefined ? (upper(s.sanitizeString(b.man_current_location)) ?? '') : undefined,
            status:   b.man_current_status   !== undefined ? (upper(s.sanitizeString(b.man_current_status))   ?? '') : undefined,
            progress: b.man_progress         !== undefined ? (s.sanitizeString(b.man_progress) ?? '0%')              : undefined,
            events:   Array.isArray(b.man_events) && b.man_events.length === 0 ? [] : undefined,
        },
    }
}

const updateLocationDto = (req) => ({
    man_id:               s.sanitizeId(asBody(req).man_id)                  ?? null,
    man_current_location: s.sanitizeString(asBody(req).man_current_location) ?? null,
    man_current_status:   s.sanitizeString(asBody(req).man_current_status)   ?? null,
})
const maneuverDeleteDto = (req) => ({ man_id: s.sanitizeString(asBody(req).man_id) ?? null })

/**
 * Paginación: valores enteros positivos, con tope de 100 por página
 * (un `limit=999999` sería un vector de denegación de servicio).
 */
function pagingDto(req)
{
    const page  = parseInt(req.query.page, 10)
    const limit = parseInt(req.query.limit, 10)
    return {
        page:  Number.isInteger(page)  && page  > 0 ? page : 1,
        limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20,
    }
}

/**
 * Llave MONI de la consulta pública. Se rechaza cualquier cosa que no sea texto plano:
 * Express convierte `?key[$ne]=x` en un OBJETO, y esta comprobación lo bloquea
 * ANTES de que llegue a ninguna consulta (inyección NoSQL).
 * @returns {string|null} Llave limpia o `null` si es inválida.
 */
function moniKeyDto(req)
{
    const raw = req.query.key
    if (typeof raw !== 'string') return null
    const key = s.sanitizeId(raw)
    return !key || key === 'NO KEY' ? null : key
}

/**
 * Rango de fechas de las estadísticas.
 * @returns {{date_from: (string|undefined), date_to: (string|undefined), error: (string|null)}}
 */
function statsDto(req)
{
    const re = /^\d{4}-\d{2}-\d{2}$/
    const { date_from, date_to } = req.query
    const isBad = (v) => v !== undefined && (typeof v !== 'string' || !re.test(v))

    if (isBad(date_from) || isBad(date_to)) return { error: 'Formato de fecha inválido, use YYYY-MM-DD.' }
    if (date_from && date_to && date_from > date_to) return { error: 'El rango de fechas es inválido.' }
    return { date_from: date_from || undefined, date_to: date_to || undefined, error: null }
}

module.exports = {
    loginDto, clientDto, clientDeleteDto, routeDto, routeDeleteDto,
    transporterDto, transporterDeleteDto, operatorDto, ecoDto,
    maneuverDto, updateLocationDto, maneuverDeleteDto, pagingDto, moniKeyDto, statsDto,
}
