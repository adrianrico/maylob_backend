'use strict'

/**
 * @file Caso de uso: gestión de clientes.
 * @module application/clients/clientService
 */

const { badRequest, notFound, AppError } = require('../../shared/appError')
const { createId } = require('../../shared/ids')
const logger = require('../../shared/logger')

/**
 * @param {Object} deps Dependencias inyectadas.
 * @param {Object} deps.clientRepository Repositorio de clientes.
 * @param {Object} deps.maneuverRepository Repositorio de maniobras (para propagar la llave MONI).
 * @param {{timeSnapshot: Function}} deps.clock Reloj.
 */
function createClientService({ clientRepository, maneuverRepository, clock })
{
    return {
        /**
         * Crea un cliente nuevo o actualiza uno existente (sólo los campos que cambiaron).
         *
         * Reglas:
         *  - Si `search_client_id` no corresponde a un cliente, se crea con un ID nuevo
         *    y `client_man_key` se autocompleta con ese ID.
         *  - Teléfono y correo son opcionales: sólo se tocan si se enviaron (una
         *    actualización parcial no borra datos previos). Si se enviaron con
         *    formato inválido se RECHAZA en lugar de guardar vacío.
         *  - El `client_id` nunca cambia: maniobras y rutas lo referencian.
         *  - Si cambia `client_man_key`, se propaga a todas las maniobras del cliente.
         *
         * @param {Object} dto Datos ya saneados por la capa HTTP.
         * @returns {Promise<{message: string}>}
         */
        async handleClient(dto)
        {
            const { search_client_id, client_name, phone_provided, email_provided,
                    client_phone, client_email, client_status, client_man_key } = dto

            if ((client_name ?? '') === '' || client_name === 'NUEVO CONTACTO')
                throw badRequest('Entrada de nombre debe contener un valor válido.', '0')
            if (phone_provided && client_phone === '')
                throw badRequest('El teléfono no tiene un formato válido.', '0')
            if (email_provided && client_email === '')
                throw badRequest('El correo no tiene un formato válido.', '0')

            const clientFound = search_client_id ? await clientRepository.findById(search_client_id) : null

            // ── Alta ────────────────────────────────────────────────────────
            if (!clientFound)
            {
                const newId = createId([client_name, client_phone, client_email])
                await clientRepository.create({
                    client_id:          newId,
                    client_name,
                    client_phone,
                    client_email,
                    client_status:      'ACTIVO',
                    client_last_update: clock.timeSnapshot(),
                    client_man_key:     client_man_key ?? newId,
                })
                logger.info('clients.handle', 'Cliente almacenado.')
                return { message: 'Cliente almacenado correctamente.' }
            }

            // ── Actualización parcial (diff) ────────────────────────────────
            const diff = {}
            if (client_name !== clientFound.client_name) diff.client_name = client_name
            if (phone_provided && client_phone !== clientFound.client_phone) diff.client_phone = client_phone
            if (email_provided && client_email !== clientFound.client_email) diff.client_email = client_email
            if (client_status !== null && client_status !== clientFound.client_status) diff.client_status = client_status
            if (client_man_key !== null && client_man_key !== clientFound.client_man_key) diff.client_man_key = client_man_key

            if (Object.keys(diff).length === 0) return { message: 'Sin cambios detectados.' }

            diff.client_last_update = clock.timeSnapshot()

            const previous = await clientRepository.updateById(search_client_id, diff)
            if (!previous) throw new AppError(500, 'Error al actualizar el cliente.', '0')

            // La llave MONI de cada maniobra refleja la del cliente: si cambió, hay que propagarla.
            if (diff.client_man_key !== undefined)
            {
                const result = await maneuverRepository.updateMoniKeyByClient(search_client_id, diff.client_man_key)
                logger.info('clients.handle', `Llave MONI propagada a maniobras (modificadas: ${result.modifiedCount}).`)
            }

            return { message: 'Cliente actualizado correctamente.' }
        },

        /**
         * Lista los clientes exponiendo sólo los campos públicos.
         * @returns {Promise<Array<Object>>} Arreglo vacío si no hay clientes.
         */
        async listClients()
        {
            const clients = await clientRepository.list()
            return clients.map(({ client_id, client_name, client_phone, client_email, client_status, client_man_key }) => ({
                client_id, client_name, client_phone: client_phone ?? '', client_email: client_email ?? '', client_status, client_man_key,
            }))
        },

        /**
         * Elimina un cliente por `client_id`.
         * @param {{client_id: (string|null)}} dto
         * @returns {Promise<{message: string}>}
         */
        async deleteClient({ client_id })
        {
            if ((client_id ?? '') === '') throw badRequest('ID de cliente no válido.')

            const deleted = await clientRepository.deleteById(client_id)
            if (!deleted) throw notFound('Cliente no encontrado.', '0')

            logger.info('clients.delete', 'Cliente eliminado.')
            return { message: 'Cliente eliminado exitosamente.' }
        },
    }
}

module.exports = { createClientService }
