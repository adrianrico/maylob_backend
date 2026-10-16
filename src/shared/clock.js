'use strict'

/**
 * @file Reloj de la aplicación.
 * @module shared/clock
 *
 * Se inyecta en los servicios (en vez de llamar `new Date()` directo) para que
 * las pruebas puedan fijar la hora y los resultados sean deterministas.
 */

const pad = (n) => String(n).padStart(2, '0')

/**
 * Marca de tiempo legible usada por todo el sistema, p. ej. `12-OCTUBRE-2026  09:05:03`.
 * @param {Date} [date] Fecha a formatear (por defecto, ahora).
 * @returns {string}
 */
function timeSnapshot(date = new Date())
{
    const month = date.toLocaleString('es-mx', { month: 'long' }).toUpperCase()
    return `${pad(date.getDate())}-${month}-${date.getFullYear()}  ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

module.exports = { timeSnapshot, systemClock: { timeSnapshot } }
