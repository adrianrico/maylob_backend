'use strict'

/**
 * @file Caso de uso: transportistas, sus operadores y su equipo (ECOs).
 * @module application/transporters/transporterService
 *
 * Operadores y ECOs son sub-colecciones embebidas con la MISMA mecánica
 * (alta / actualización por diferencias / baja, identidad única en toda la flota),
 * así que comparten una sola rutina genérica configurada por una "especificación"
 * (`OPERATOR_SPEC`, `ECO_SPEC`). Menos código duplicado = menos lugares donde
 * pueda esconderse un bug de seguridad.
 */

const { badRequest, notFound, conflict, AppError } = require('../../shared/appError')
const { createId } = require('../../shared/ids')
const logger = require('../../shared/logger')

/**
 * Especificación de la sub-colección de OPERADORES.
 * `identityKey` es el campo que funge como identidad única (el CURP) y se copia a `idKey`.
 */
const OPERATOR_SPEC = {
    scope:           'transporters.operator',
    field:           'transporter_operators',
    idKey:           'operator_id',
    identityKey:     'operator_curp',
    nameKey:         'operator_name',
    availableKey:    'operator_available',
    registrationKey: 'operator_registration',
    extraKeys:       ['operator_rfc', 'operator_nss', 'operator_license', 'operator_address'],
    placeholderName: 'NUEVO OPERADOR',
    msg: {
        deleteIdMissing:  'ID de operador requerido para eliminar.',
        identityMissing:  'El CURP del operador es obligatorio.',
        notFound:         'Operador no encontrado.',
        deleted:          'Operador eliminado correctamente.',
        deleteFailed:     'Error al eliminar el operador.',
        duplicate:        'Ya existe un operador registrado con ese CURP.',
        created:          'Operador creado exitosamente.',
        createFailed:     'Error al guardar el operador.',
        updated:          'Operador actualizado correctamente.',
        updateFailed:     'Error al actualizar el operador.',
    },
}

/** Especificación de la sub-colección de EQUIPO (ECOs / camiones). La identidad son las placas. */
const ECO_SPEC = {
    scope:           'transporters.eco',
    field:           'transporter_equipment',
    idKey:           'eco_id',
    identityKey:     'eco_plates',
    nameKey:         'eco_name',
    availableKey:    'eco_available',
    registrationKey: 'eco_registration',
    extraKeys:       ['eco_year', 'eco_color', 'eco_serial_number', 'eco_engine_serial', 'eco_insurance_company', 'eco_insurance_policy'],
    placeholderName: 'NUEVO ECO',
    msg: {
        deleteIdMissing:  'ID de ECO requerido para eliminar.',
        identityMissing:  'Las placas del camión son obligatorias.',
        notFound:         'ECO no encontrado.',
        deleted:          'ECO eliminado correctamente.',
        deleteFailed:     'Error al eliminar el ECO.',
        duplicate:        'Ya existe un camión registrado con esas placas.',
        created:          'ECO creado exitosamente.',
        createFailed:     'Error al guardar el ECO.',
        updated:          'ECO actualizado correctamente.',
        updateFailed:     'Error al actualizar el ECO.',
    },
}

/**
 * @param {Object} deps Dependencias inyectadas.
 * @param {Object} deps.transporterRepository Repositorio de transportistas.
 * @param {{timeSnapshot: Function}} deps.clock Reloj.
 */
function createTransporterService({ transporterRepository, clock })
{
    /**
     * Rutina genérica para operadores y ECOs.
     *
     * @param {Object} spec Especificación (`OPERATOR_SPEC` | `ECO_SPEC`).
     * @param {Object} dto Datos saneados por la capa HTTP:
     *   `transporter_id` (padre), `id` (elemento a editar/borrar), `name`,
     *   `identity` (CURP/placas normalizados), `action` ('delete' | otro),
     *   `available` (bool) y `extras` (valores de `spec.extraKeys`).
     * @returns {Promise<{message: string}>}
     */
    async function handleEmbedded(spec, dto)
    {
        const { transporter_id, id, name, identity, action, available, extras } = dto

        // 1) Validación de entradas según la acción.
        if (!transporter_id) throw badRequest('ID de transportista no válido.')

        if (action === 'delete')
        {
            if (!id) throw badRequest(spec.msg.deleteIdMissing)
        }
        else
        {
            if (!name || name === spec.placeholderName) throw badRequest('Entrada de NOMBRE debe contener algún valor válido.')
            if (!identity) throw badRequest(spec.msg.identityMissing)
        }

        // 2) El transportista padre debe existir.
        const parent = await transporterRepository.findById(transporter_id)
        if (!parent) throw notFound('Transportista no encontrado.')

        const stored = Array.isArray(parent[spec.field]) ? parent[spec.field] : []
        const found = stored.find((item) => item[spec.idKey] === id)

        // 3) Baja (operación atómica $pull).
        if (action === 'delete')
        {
            if (!found) throw notFound(spec.msg.notFound)
            const removed = await transporterRepository.pullEmbedded(transporter_id, spec.field, spec.idKey, id)
            if (!removed) throw new AppError(500, spec.msg.deleteFailed)
            logger.info(spec.scope, 'Elemento eliminado.')
            return { message: spec.msg.deleted }
        }

        // 4) La identidad (CURP / placas) es única en TODA la flota. Se permite reenviar el
        //    mismo registro sin cambios (ya es dueño de esa identidad).
        if (!found || found[spec.identityKey] !== identity)
        {
            if (await transporterRepository.existsEmbedded(spec.field, spec.idKey, identity)) throw conflict(spec.msg.duplicate)
        }

        // 5) Alta.
        if (!found)
        {
            const item = {
                [spec.idKey]:           identity,
                [spec.nameKey]:         name,
                [spec.identityKey]:     identity,
                ...extras,
                [spec.availableKey]:    available,
                [spec.registrationKey]: clock.timeSnapshot(),
            }
            const result = await transporterRepository.pushEmbedded(transporter_id, spec.field, item)
            if (!result) throw new AppError(500, spec.msg.createFailed)
            logger.info(spec.scope, 'Elemento creado.')
            return { message: spec.msg.created }
        }

        // 6) Actualización por diferencias: sólo se comparan campos de la lista blanca.
        const diff = {}
        if (name !== found[spec.nameKey]) diff[spec.nameKey] = name
        if (identity !== found[spec.identityKey])
        {
            // Si cambia la identidad, cambia también el ID.
            diff[spec.identityKey] = identity
            diff[spec.idKey] = identity
        }
        for (const key of spec.extraKeys) if (extras[key] !== found[key]) diff[key] = extras[key]
        if (available !== found[spec.availableKey]) diff[spec.availableKey] = available

        if (Object.keys(diff).length === 0) return { message: 'Sin cambios.' }

        const result = await transporterRepository.replaceEmbedded(transporter_id, spec.field, spec.idKey, id, { ...found, ...diff })
        if (!result) throw new AppError(500, spec.msg.updateFailed)
        logger.info(spec.scope, 'Elemento actualizado.')
        return { message: spec.msg.updated }
    }

    return {
        /**
         * Crea un transportista o actualiza nombre/CAAT de uno existente.
         * @param {{transporter_id: (string|null), transporter_name: (string|null), transporter_caat: string}} dto
         * @returns {Promise<{message: string}>}
         */
        async handleTransporter({ transporter_id, transporter_name, transporter_caat })
        {
            if (!transporter_name || transporter_name === 'NUEVO TRANSPORTISTA')
                throw badRequest('Entrada de nuevo nombre debe contener algún valor válido.')

            const finalId = (!transporter_id || transporter_id === '0')
                ? createId([transporter_name, transporter_caat, clock.timeSnapshot()])
                : transporter_id

            const stored = await transporterRepository.findById(finalId)

            if (!stored)
            {
                await transporterRepository.create({
                    transporter_id:           finalId,
                    transporter_name,
                    transporter_caat,
                    transporter_registration: clock.timeSnapshot(),
                })
                logger.info('transporters.handle', 'Transportista almacenado.')
                return { message: 'Transportista almacenado correctamente.' }
            }

            const diff = {}
            if (transporter_name !== stored.transporter_name) diff.transporter_name = transporter_name
            if (transporter_caat !== stored.transporter_caat) diff.transporter_caat = transporter_caat
            if (Object.keys(diff).length === 0) return { message: 'Sin cambios.' }

            diff.transporter_registration = clock.timeSnapshot()
            const previous = await transporterRepository.updateById(finalId, diff)
            if (!previous) throw new AppError(500, 'Error al actualizar el transportista.')

            logger.info('transporters.handle', 'Transportista actualizado.')
            return { message: 'Transportista actualizado correctamente.' }
        },

        /** @returns {Promise<Array<Object>>} Todos los transportistas. */
        listTransporters: () => transporterRepository.list(),

        /**
         * Elimina un transportista. Exige ID y nombre válidos (doble confirmación).
         * @param {{transporter_id: (string|null), transporter_name: (string|null)}} dto
         */
        async deleteTransporter({ transporter_id, transporter_name })
        {
            if (!transporter_id || !transporter_name || transporter_name === 'NUEVO TRANSPORTISTA' || transporter_id === '0')
                throw badRequest('Entrada de NOMBRE debe contener algún valor válido.')

            const deleted = await transporterRepository.deleteById(transporter_id)
            if (!deleted) throw notFound('Transportista no encontrado.')

            logger.info('transporters.delete', 'Transportista eliminado.')
            return { message: 'Transportista eliminado exitosamente.' }
        },

        /** Alta / edición / baja de un operador del transportista. */
        handleOperator: (dto) => handleEmbedded(OPERATOR_SPEC, dto),

        /** Alta / edición / baja de un ECO (camión) del transportista. */
        handleEco: (dto) => handleEmbedded(ECO_SPEC, dto),
    }
}

module.exports = { createTransporterService, OPERATOR_SPEC, ECO_SPEC }
