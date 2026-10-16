'use strict'

/**
 * @file Utilidades de valores genéricos.
 * @module shared/values
 */

/**
 * Indica si un valor "tiene contenido" (no es cadena vacía, null ni undefined).
 * @param {*} value Valor a revisar.
 * @returns {boolean}
 */
function isValidValue(value)
{
    return !(value === '' || value === undefined || value === null)
}

/**
 * Devuelve una copia del objeto SIN las llaves cuyo valor es `undefined`.
 * Evita que un `$set` de MongoDB escriba campos vacíos por accidente.
 * @param {Object} object Objeto origen.
 * @returns {Object}
 */
function compact(object)
{
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
}

module.exports = { isValidValue, compact }
