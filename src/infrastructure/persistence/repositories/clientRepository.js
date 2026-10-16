'use strict'

/**
 * @file Repositorio de clientes (acceso a datos).
 * @module infrastructure/persistence/repositories/clientRepository
 *
 * Un repositorio es la ÚNICA clase de objeto que habla con la base de datos.
 * Los servicios de aplicación dependen de su "contrato" (estos métodos), no de
 * Mongoose; así se puede cambiar de BD o usar un repositorio falso en pruebas.
 */

const { Client } = require('../models')

const clientRepository = {
    /** @param {string} clientId @returns {Promise<Object|null>} */
    findById: (clientId) => Client.findOne({ client_id: clientId }).lean(),

    /**
     * Busca por llave de monitoreo.
     * @param {string} manKey Llave MONI.
     * @param {Object} [projection] Campos a devolver.
     */
    findByManKey: (manKey, projection) => Client.findOne({ client_man_key: manKey }, projection).lean(),

    /** @returns {Promise<Array<Object>>} Todos los clientes. */
    list: () => Client.find({}).lean(),

    /** @param {Object} data Campos del cliente nuevo. */
    create: (data) => new Client(data).save(),

    /**
     * Actualiza campos de un cliente.
     * @param {string} clientId ID del cliente.
     * @param {Object} fields Campos a modificar (`$set`).
     * @returns {Promise<Object|null>} Documento previo o `null` si no existía.
     */
    updateById: (clientId, fields) => Client.findOneAndUpdate({ client_id: clientId }, { $set: fields }, { new: false }).lean(),

    /** @param {string} clientId @returns {Promise<Object|null>} Documento eliminado. */
    deleteById: (clientId) => Client.findOneAndDelete({ client_id: clientId }).lean(),
}

module.exports = { clientRepository }
