'use strict'

/**
 * @file Repositorio de maniobras (acceso a datos).
 * @module infrastructure/persistence/repositories/maneuverRepository
 *
 * Los filtros con operadores de MongoDB (`$ne`, `$not`, `$gte`...) se marcan con
 * `mongoose.trusted()` porque la conexión tiene `sanitizeFilter` activo. Los
 * valores que van DENTRO de esos filtros ya fueron validados por la capa HTTP.
 */

const mongoose = require('mongoose')
const { Maneuver } = require('../models')

const trusted = mongoose.trusted
const CANCEL_REGEX = /cancel/i

const maneuverRepository = {
    /** @param {string} manId @returns {Promise<Object|null>} */
    findById: (manId) => Maneuver.findOne({ man_id: manId }).lean(),

    /** @param {Object} data Maniobra nueva. */
    create: (data) => new Maneuver(data).save(),

    /**
     * @param {string} manId ID de la maniobra.
     * @param {Object} fields Campos `$set`.
     * @returns {Promise<Object|null>} Documento previo o `null`.
     */
    updateById: (manId, fields) => Maneuver.findOneAndUpdate({ man_id: manId }, { $set: fields }, { new: false }).lean(),

    /** @param {string} manId @returns {Promise<Object|null>} */
    deleteById: (manId) => Maneuver.findOneAndDelete({ man_id: manId }).lean(),

    /** Cuenta TODAS las maniobras. */
    countAll: () => Maneuver.countDocuments({}),

    /**
     * Página de maniobras, de la más reciente a la más antigua.
     * @param {number} skip Registros a saltar.
     * @param {number} limit Registros a devolver.
     */
    page: (skip, limit) => Maneuver.find({}).sort({ _id: -1 }).skip(skip).limit(limit).lean(),

    /**
     * Maniobras pendientes (no al 100 % y no canceladas) de un operador.
     * @param {string} curp CURP del operador.
     */
    findPendingByOperator: (curp) => Maneuver.find({
        man_operator_id:    curp,
        man_progress:       trusted({ $ne: '100%' }),
        man_current_status: trusted({ $not: CANCEL_REGEX }),
    }).sort({ _id: -1 }).lean(),

    /**
     * Maniobras visibles públicamente por llave MONI. Igualdad estricta contra
     * un valor ya saneado; la llave NO se devuelve (proyección `man_moni_key: 0`).
     * @param {string} key Llave MONI.
     */
    findByMoniKey: (key) => Maneuver.find({ man_moni_key: key, man_moni_enable: 'true' }, { man_moni_key: 0 }).sort({ _id: -1 }).lean(),

    /**
     * Propaga una nueva llave MONI a todas las maniobras de un cliente.
     * @returns {Promise<{matchedCount: number, modifiedCount: number}>}
     */
    updateMoniKeyByClient: (clientId, key) => Maneuver.updateMany({ man_client: clientId }, { $set: { man_moni_key: key } }),

    /**
     * Conteos agregados por la BD (no se transfieren documentos).
     * @param {Object} dateFilter `{ $gte?, $lte? }` sobre `man_dispatch_date` (vacío = sin filtro).
     * @returns {Promise<{total: number, canceled: number, notStarted: number}>}
     */
    async countStats(dateFilter)
    {
        const base = Object.keys(dateFilter).length > 0 ? { man_dispatch_date: trusted(dateFilter) } : {}
        const [total, canceled, notStarted] = await Promise.all([
            Maneuver.countDocuments(base),
            Maneuver.countDocuments({ ...base, man_current_status: trusted({ $regex: CANCEL_REGEX }) }),
            Maneuver.countDocuments({ ...base, man_current_status: trusted({ $not: CANCEL_REGEX }), man_progress: '0%' }),
        ])
        return { total, canceled, notStarted }
    },
}

module.exports = { maneuverRepository }
