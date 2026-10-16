'use strict'

/**
 * @file Funciones de saneamiento (sanitización) de entradas del usuario.
 * @module domain/sanitizers
 *
 * PRINCIPIO: toda entrada externa es hostil hasta demostrar lo contrario.
 * Estas funciones aplican una LISTA BLANCA / limpieza antes de que un dato toque
 * la lógica de negocio o la base de datos. Cada una devuelve `null` cuando el
 * valor no es válido, de modo que quien llama decide si rechaza o usa un default.
 *
 * Defensas cubiertas: inyección NoSQL (`$`), inyección de cabeceras/logs (CR/LF),
 * XSS almacenado (`<>`), inyección de comandos/plantillas, prototype pollution.
 */

/**
 * Cadena general: elimina bytes nulos, saltos de línea y caracteres peligrosos.
 * @param {*} value Valor recibido.
 * @param {number} [maxLength=200] Longitud máxima (trunca el resto).
 * @returns {string|null} Cadena limpia o `null` si no era texto / quedó vacía.
 */
function sanitizeString(value, maxLength = 200)
{
    if (typeof value !== 'string') return null
    const cleaned = value
        .replace(/[\x00\r\n]/g, '')            // bytes nulos + saltos de línea (CRLF / log injection)
        .replace(/[$`<>{};'"\\|]/g, '')        // NoSQL ($), plantillas, HTML, comandos, comillas, escapes, pipe
        .trim()
        .substring(0, maxLength)
    return cleaned === '' ? null : cleaned
}

/**
 * Identificadores: solo alfanuméricos, guion y guion bajo.
 * @param {*} value Valor recibido.
 * @param {number} [maxLength=100] Longitud máxima.
 * @returns {string|null}
 */
function sanitizeId(value, maxLength = 100)
{
    if (typeof value !== 'string') return null
    const cleaned = value
        .replace(/[^a-zA-Z0-9_\-]/g, '')
        .trim()
        .substring(0, maxLength)
    return cleaned === '' ? null : cleaned
}

/**
 * Nombres de persona/empresa: letras (con acentos), dígitos, espacios, guion y punto.
 * @param {*} value Valor recibido.
 * @returns {string|null}
 */
function sanitizeName(value)
{
    const cleaned = sanitizeString(value, 100)
    if (cleaned === null) return null
    return /^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/.test(cleaned) ? cleaned : null
}

/**
 * Teléfono: dígitos, espacios, `+`, `-` y paréntesis.
 * @param {*} value Valor recibido.
 * @returns {string|null}
 */
function sanitizePhone(value)
{
    const cleaned = sanitizeString(value, 20)
    if (cleaned === null) return null
    return /^[\d\s\+\-\(\)]+$/.test(cleaned) ? cleaned : null
}

/**
 * Correo electrónico con validación de formato básica.
 * @param {*} value Valor recibido.
 * @returns {string|null}
 */
function sanitizeEmail(value)
{
    const cleaned = sanitizeString(value, 100)
    if (cleaned === null) return null
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null
}

/**
 * URL: conserva los caracteres válidos de una URL, descarta los peligrosos y
 * EXIGE esquema http/https (bloquea `javascript:`, `data:`, `file:` → XSS / SSRF).
 * @param {*} value Valor recibido.
 * @param {number} [maxLength=500] Longitud máxima.
 * @returns {string|null}
 */
function sanitizeUrl(value, maxLength = 500)
{
    if (typeof value !== 'string') return null
    const cleaned = value
        .replace(/[\x00-\x1f\x7f<>"\\\s]/g, '')  // control, HTML, comillas, escapes y espacios
        .substring(0, maxLength)
    if (cleaned === '') return null
    return /^https?:\/\//i.test(cleaned) ? cleaned : null
}

/**
 * Normaliza un CURP: mayúsculas, sin espacios y solo alfanumérico.
 * (El CURP real tiene 18 caracteres; se acepta un rango por compatibilidad con datos históricos.)
 * @param {*} value Valor recibido.
 * @returns {string|null}
 */
function sanitizeCurp(value)
{
    if (typeof value !== 'string') return null
    const cleaned = value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '').substring(0, 30)
    return cleaned === '' ? null : cleaned
}

/**
 * Normaliza placas: mayúsculas, sin espacios, solo alfanumérico y guion.
 * @param {*} value Valor recibido.
 * @returns {string|null}
 */
function sanitizePlates(value)
{
    if (typeof value !== 'string') return null
    const cleaned = value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9\-]/g, '').substring(0, 20)
    return cleaned === '' ? null : cleaned
}

/** ¿Es un objeto "plano" (no null, no arreglo)? */
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Sanea un arreglo de eventos `{event_id, event_name, event_description}`.
 * @param {*} arr Arreglo recibido.
 * @param {number} [maxItems=30] Máximo de elementos (evita payloads gigantes).
 * @returns {Array<Object>}
 */
function sanitizeEvents(arr, maxItems = 30)
{
    if (!Array.isArray(arr)) return []
    return arr.slice(0, maxItems).map((ev) =>
    {
        if (!isPlainObject(ev)) return null
        return {
            event_id:          sanitizeString(String(ev.event_id          ?? ''), 100) ?? '',
            event_name:        sanitizeString(String(ev.event_name        ?? ''), 100) ?? '',
            event_description: sanitizeString(String(ev.event_description ?? ''), 300) ?? '',
        }
    }).filter(Boolean)
}

/**
 * Sanea un arreglo de paradas `{stop_name, stop_events[]}`.
 * @param {*} arr Arreglo recibido.
 * @param {number} [maxItems=20] Máximo de paradas.
 * @returns {Array<Object>}
 */
function sanitizeStops(arr, maxItems = 20)
{
    if (!Array.isArray(arr)) return []
    return arr.slice(0, maxItems).map((stop) =>
    {
        if (!isPlainObject(stop)) return null
        return {
            stop_name:   sanitizeString(String(stop.stop_name ?? ''), 100) ?? '',
            stop_events: sanitizeEvents(stop.stop_events),
        }
    }).filter(Boolean)
}

/**
 * Sanea los eventos de un punto de ruta y garantiza el checkpoint fijo "cancelado".
 *
 * - El `sub_step_number` que mande el cliente se IGNORA: el servidor renumera 1..n.
 * - Cualquier "cancelado" enviado por el cliente se descarta; siempre se regenera.
 * - `sub_events` es un arreglo de textos; varios pueden pertenecer al mismo evento.
 *
 * @param {*} arr Arreglo de eventos recibido.
 * @param {number} [maxItems=30] Máximo de eventos.
 * @param {number} [maxSubEvents=10] Máximo de sub-eventos por evento.
 * @returns {Array<Object>} Eventos limpios, con "cancelado" (paso 0) al inicio.
 */
function sanitizeLocationEvents(arr, maxItems = 30, maxSubEvents = 10)
{
    const cleanedEvents = (Array.isArray(arr) ? arr : [])
        .slice(0, maxItems)
        .map((ev) =>
        {
            if (!isPlainObject(ev)) return null
            const event_name = sanitizeString(String(ev.event_name ?? ''), 100) ?? ''
            if (event_name === '' || event_name.toLowerCase() === 'cancelado') return null

            const sub_events = (Array.isArray(ev.sub_events) ? ev.sub_events : [])
                .slice(0, maxSubEvents)
                .map((se) => sanitizeString(String(se ?? ''), 300))
                .filter((se) => se !== null)

            return { event_name, sub_events }
        })
        .filter(Boolean)
        .map((ev, index) => ({ event_name: ev.event_name, sub_step_number: index + 1, sub_events: ev.sub_events }))

    return [{ event_name: 'cancelado', sub_step_number: 0, sub_events: [] }, ...cleanedEvents]
}

/**
 * Construye un punto de ruta `{location_name, step_number, events[]}` a partir de input del cliente.
 * @param {*} raw Objeto recibido.
 * @param {number} stepNumber Número de paso asignado por el servidor.
 * @param {string} defaultName Nombre por defecto si no viene uno válido.
 * @returns {{location_name: string, step_number: number, events: Array<Object>}}
 */
function sanitizeLocationPoint(raw, stepNumber, defaultName)
{
    const source = isPlainObject(raw) ? raw : {}
    return {
        location_name: sanitizeString(source.location_name) || defaultName,
        step_number: stepNumber,
        events: sanitizeLocationEvents(source.events),
    }
}

/**
 * Sanea el arreglo de contenedores de una maniobra.
 * @param {*} arr Arreglo recibido.
 * @param {number} [maxItems=4] Máximo de contenedores.
 * @returns {Array<Object>}
 */
function sanitizeContainers(arr, maxItems = 4)
{
    if (!Array.isArray(arr)) return []
    return arr.slice(0, maxItems).map((c) =>
    {
        if (!isPlainObject(c)) return null
        const size   = Number(c.container_size)
        const weight = Number(c.container_weight)
        return {
            container_id:      sanitizeString(String(c.container_id      ?? ''), 50)  ?? '',
            container_size:    Number.isFinite(size)   ? size   : null,
            container_content: sanitizeString(String(c.container_content ?? ''), 200) ?? '',
            container_type:    sanitizeString(String(c.container_type    ?? ''), 100) ?? '',
            container_weight:  Number.isFinite(weight) ? weight : null,
        }
    }).filter(Boolean)
}

/**
 * Sanea un objeto de forma libre, recursivamente (profundidad limitada).
 * Descarta llaves de prototype pollution (`__proto__`, `constructor`, `prototype`),
 * operadores de Mongo (`$...`) y llaves con punto (`a.b`, ruta de campo anidado).
 *
 * @param {*} value Objeto recibido.
 * @param {number} [maxDepth=5] Profundidad máxima.
 * @returns {Object|null}
 */
function sanitizeObject(value, maxDepth = 5)
{
    if (!isPlainObject(value) || maxDepth <= 0) return null

    const dangerousKeys = ['__proto__', 'constructor', 'prototype']
    const cleaned = {}

    for (const key of Object.keys(value))
    {
        if (dangerousKeys.includes(key) || key.startsWith('$') || key.includes('.')) continue

        const entry = value[key]

        if (typeof entry === 'string')
        {
            cleaned[key] = sanitizeString(entry, 500)
        }
        else if (typeof entry === 'number' || typeof entry === 'boolean')
        {
            cleaned[key] = entry
        }
        else if (entry === null)
        {
            cleaned[key] = null
        }
        else if (Array.isArray(entry))
        {
            cleaned[key] = entry.slice(0, 100)
                .filter((item) => typeof item !== 'function')
                .map((item) =>
                {
                    if (typeof item === 'object' && item !== null) return sanitizeObject(item, maxDepth - 1)
                    if (typeof item === 'string') return sanitizeString(item, 500)
                    return item
                })
        }
        else if (typeof entry === 'object')
        {
            cleaned[key] = sanitizeObject(entry, maxDepth - 1)
        }
        // funciones, símbolos y undefined se descartan
    }

    return cleaned
}

module.exports = {
    sanitizeString,
    sanitizeId,
    sanitizeName,
    sanitizePhone,
    sanitizeEmail,
    sanitizeUrl,
    sanitizeCurp,
    sanitizePlates,
    sanitizeEvents,
    sanitizeStops,
    sanitizeLocationEvents,
    sanitizeLocationPoint,
    sanitizeContainers,
    sanitizeObject,
}
