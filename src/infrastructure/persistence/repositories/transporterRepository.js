'use strict'

/**
 * @file Repositorio de transportistas (acceso a datos).
 * @module infrastructure/persistence/repositories/transporterRepository
 *
 * Los operadores y los ECOs (camiones) viven EMBEBIDOS dentro del documento del
 * transportista, en los arreglos `transporter_operators` y `transporter_equipment`.
 * Las operaciones sobre esos arreglos usan operadores ATÓMICOS de MongoDB
 * (`$push`, `$pull`, `$set` posicional) en vez de leer-modificar-escribir el
 * arreglo completo, lo que evita perder datos si dos peticiones coinciden.
 */

const mongoose = require('mongoose')
const { Transporter } = require('../models')

const trusted = mongoose.trusted

const transporterRepository = {
    /** @param {string} transporterId @returns {Promise<Object|null>} */
    findById: (transporterId) => Transporter.findOne({ transporter_id: transporterId }).lean(),

    /** @returns {Promise<Array<Object>>} */
    list: () => Transporter.find({}).lean(),

    /** @param {Object} data */
    create: (data) => new Transporter(data).save(),

    /** @returns {Promise<Object|null>} Documento previo o `null`. */
    updateById: (transporterId, fields) => Transporter.findOneAndUpdate({ transporter_id: transporterId }, { $set: fields }, { new: false }).lean(),

    /** @returns {Promise<Object|null>} */
    deleteById: (transporterId) => Transporter.findOneAndDelete({ transporter_id: transporterId }).lean(),

    /**
     * Devuelve los datos de identificación del transportista dueño de un operador (login / auth).
     * @param {string} curp CURP (= operator_id).
     */
    findByOperatorId: (curp) => Transporter.findOne(
        { 'transporter_operators.operator_id': curp },
        { transporter_id: 1, transporter_name: 1, transporter_operators: 1 }
    ).lean(),

    /**
     * ¿Algún transportista tiene ya un elemento embebido con ese identificador?
     * @param {'transporter_operators'|'transporter_equipment'} field Arreglo embebido.
     * @param {string} idKey Llave identificadora (`operator_id` | `eco_id`).
     * @param {string} id Valor buscado.
     */
    async existsEmbedded(field, idKey, id)
    {
        const found = await Transporter.findOne({ [`${field}.${idKey}`]: id }, { _id: 1 }).lean()
        return found !== null
    },

    /** Agrega un elemento al arreglo embebido. @returns {Promise<Object|null>} */
    pushEmbedded: (transporterId, field, item) =>
        Transporter.findOneAndUpdate({ transporter_id: transporterId }, { $push: { [field]: item } }, { new: false }).lean(),

    /** Quita un elemento del arreglo embebido. @returns {Promise<boolean>} `true` si se modificó. */
    async pullEmbedded(transporterId, field, idKey, id)
    {
        const result = await Transporter.updateOne({ transporter_id: transporterId }, { $pull: { [field]: { [idKey]: id } } })
        return result.modifiedCount > 0
    },

    /** Reemplaza un elemento del arreglo embebido (posicional `$`). @returns {Promise<Object|null>} */
    replaceEmbedded: (transporterId, field, idKey, id, item) =>
        Transporter.findOneAndUpdate(
            { transporter_id: transporterId, [`${field}.${idKey}`]: id },
            { $set: { [`${field}.$`]: item } },
            { new: false }
        ).lean(),

    /** Resuelve nombres de varios transportistas en una sola consulta. */
    findNamesByIds: (ids) => Transporter.find({ transporter_id: trusted({ $in: ids }) }, { transporter_id: 1, transporter_name: 1 }).lean(),
}

module.exports = { transporterRepository }
