'use strict'

/**
 * @file Repositorio de rutas (acceso a datos).
 * @module infrastructure/persistence/repositories/routeRepository
 */

const { Route } = require('../models')

const routeRepository = {
    /** @param {string} routeId @returns {Promise<Object|null>} */
    findById: (routeId) => Route.findOne({ route_id: routeId }).lean(),

    /**
     * Ruta heredada sin vínculo explícito: coincide por nombre de origen y destino.
     * @param {string} origin Nombre del origen.
     * @param {string} destination Nombre del destino.
     */
    findByEndpoints: (origin, destination) => Route.findOne({
        'route_origin.location_name':      origin,
        'route_destination.location_name': destination,
    }).lean(),

    /** @returns {Promise<Array<Object>>} */
    list: () => Route.find({}).lean(),

    /** @param {Object} data */
    create: (data) => new Route(data).save(),

    /** @param {string} routeId @param {Object} fields Campos `$set`. */
    updateById: (routeId, fields) => Route.updateOne({ route_id: routeId }, { $set: fields }),

    /** @param {string} routeId @returns {Promise<Object|null>} */
    deleteById: (routeId) => Route.findOneAndDelete({ route_id: routeId }).lean(),
}

module.exports = { routeRepository }
