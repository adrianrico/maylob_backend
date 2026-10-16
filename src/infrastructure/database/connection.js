'use strict'

/**
 * @file Conexión a MongoDB.
 * @module infrastructure/database/connection
 */

const mongoose = require('mongoose')
const logger = require('../../shared/logger')

/**
 * Abre la conexión a MongoDB con opciones seguras.
 *
 *  - `sanitizeFilter`: Mongoose envuelve en `$eq` cualquier objeto con operadores
 *    (`{ $ne: ... }`) que llegue dentro de un filtro, neutralizando la inyección
 *    NoSQL aunque se nos escape una validación. Los filtros legítimos con
 *    operadores se marcan explícitamente con `mongoose.trusted()` en los repositorios.
 *  - `strictQuery`: ignora en los filtros campos que no existen en el esquema.
 *  - Tiempos de espera acotados: una BD caída no deja peticiones colgadas.
 *
 * @param {string} uri URI de conexión (nunca se escribe en logs: puede traer contraseña).
 * @returns {Promise<typeof mongoose>}
 */
async function connectDatabase(uri)
{
    mongoose.set('sanitizeFilter', true)
    mongoose.set('strictQuery', true)

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 20,
    })

    logger.info('DATABASE', 'Conexión a MongoDB establecida.')
    return mongoose
}

/** Cierra la conexión (apagado ordenado del servidor). */
async function disconnectDatabase()
{
    await mongoose.disconnect()
}

module.exports = { connectDatabase, disconnectDatabase }
