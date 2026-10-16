'use strict'

const crypto = require('crypto')
const { isValidValue } = require('./values')

/**
 * @file Generación de identificadores de negocio.
 * @module shared/ids
 */

/**
 * Construye un ID legible: 2 letras de cada campo + fecha/hora + sufijo aleatorio.
 *
 * MEJORA DE SEGURIDAD/INTEGRIDAD: el formato anterior (solo fecha/hora al
 * segundo) era predecible y dos altas en el mismo segundo producían el mismo ID,
 * lo que hacía que la segunda "actualizara" silenciosamente a la primera. El
 * sufijo de 6 caracteres hexadecimales proviene de `crypto` (aleatorio seguro).
 *
 * @param {Array<*>} fields Campos de los que se toman los prefijos.
 * @param {Date} [now] Fecha de referencia (inyectable para pruebas).
 * @returns {string} ID alfanumérico en mayúsculas.
 */
function createId(fields, now = new Date())
{
    let prefix = ''

    for (const field of fields)
    {
        if (isValidValue(field))
        {
            const clean = String(field).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
            prefix += (clean.substring(0, 2) || 'ND')
        }
        else
        {
            prefix += 'ND'
        }
    }

    const p = (n) => String(n).padStart(2, '0')
    const stamp = `${p(now.getDate())}${p(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
    const random = crypto.randomBytes(3).toString('hex').toUpperCase()

    return `${prefix}${stamp}${random}`
}

module.exports = { createId }
