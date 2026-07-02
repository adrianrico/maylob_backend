'use strict'

// Import MODEL SCHEMA from models MODULE...
var transporterModelItem = require('../MODELS/transporter.js')

//Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation...
var controller = {

//#region [ v1.2.2 CONTROLLER ]

    //[⚑ v1.2.2][ CREATE OR UPDATE TRANSPORTER ]
    handle_transporter: async function(req,res)
    {
        let function_name = 'handle_transporter'
        auxFuncModule.logger(function_name, 18, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues       = req.body
        const transporter_name = auxFuncModule.sanitizeName(bodyValues.transporter_name)?.toUpperCase()    ?? null
        const transporter_caat = auxFuncModule.sanitizeString(bodyValues.transporter_caat)?.toUpperCase() ?? 'DATO NO ASIGNADO'
        const transporter_id   = auxFuncModule.sanitizeString(bodyValues.transporter_id)                   ?? null

        auxFuncModule.logger(function_name, 28, 1, 1, "[i] Values received and sanitized...")

        /* - Step [2]
        *  - Validate transporter_name...
        */
        if (!auxFuncModule.isValidValue(transporter_name) || transporter_name === 'NUEVO TRANSPORTISTA')
        {
            auxFuncModule.logger(function_name, 34, 2, 2, "[e] transporter_name not valid, rejecting request...")
            return res.status(400).send({code: '-1', message: 'Entrada de nuevo nombre debe contener algún valor válido.'})
        }

        try
        {
            /* - Step [3]
            *  - Determine transporter ID...
            */
            let final_id
            if (!auxFuncModule.isValidValue(transporter_id) || transporter_id === '0')
            {
                final_id = auxFuncModule.createId([transporter_name, transporter_caat, auxFuncModule.timeSnapshot()])
            }
            else
            {
                final_id = transporter_id
            }

            auxFuncModule.logger(function_name, 50, 3, 1, "[i] Transporter ID determined...")

            /* - Step [4]
            *  - Find transporter in DB and create or update...
            */
            const transporterObjectFound = await transporterModelItem.find({transporter_id: final_id})

            switch (true)
            {
                // Transporter does not exist → create...
                case (transporterObjectFound.length === 0):
                    let newTransporterObject              = new transporterModelItem()
                    newTransporterObject.transporter_id           = final_id
                    newTransporterObject.transporter_name         = transporter_name
                    newTransporterObject.transporter_caat         = transporter_caat
                    newTransporterObject.transporter_registration = auxFuncModule.timeSnapshot()

                    await newTransporterObject.save()

                    auxFuncModule.logger(function_name, 64, 4, 1, "[i] New TRANSPORTER has been STORED...")
                    return res.status(200).send({code: '1', message: 'Transportista almacenado correctamente.'})

                // Transporter exists → check diff and update...
                case (transporterObjectFound.length >= 1):
                    const stored = transporterObjectFound[0]
                    const diff   = {}

                    if (transporter_name !== stored.transporter_name) diff.transporter_name = transporter_name
                    if (transporter_caat !== stored.transporter_caat) diff.transporter_caat = transporter_caat

                    if (Object.keys(diff).length === 0)
                    {
                        auxFuncModule.logger(function_name, 76, 4, 1, "[i] No changes detected, skipping update...")
                        return res.status(200).send({code: '1', message: 'Sin cambios.'})
                    }

                    diff.transporter_registration = auxFuncModule.timeSnapshot()

                    const updateResult = await transporterModelItem.findOneAndUpdate(
                        {transporter_id: final_id},
                        {$set: diff},
                        {new: false}
                    )

                    if (updateResult)
                    {
                        auxFuncModule.logger(function_name, 87, 4, 1, "[i] TRANSPORTER updated successfully...")
                        return res.status(200).send({code: '1', message: 'Transportista actualizado correctamente.'})
                    }
                    else
                    {
                        auxFuncModule.logger(function_name, 92, 4, 2, "[e] findOneAndUpdate returned null...")
                        return res.status(500).send({code: '-1', message: 'Error al actualizar el transportista.'})
                    }

                default:
                    auxFuncModule.logger(function_name, 97, 4, 3, "[e] TRANSPORTER not processed...")
                    return res.status(404).send({code: '-1', message: 'Datos del transportista no encontrados.'})
            }
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 103, 3, 3, "[e] Transporter not processed, PROMISE(S) ERROR: " + error.message)
            return res.status(500).send({code: '-1', message: 'Error al procesar los datos en el servidor.'})
        }
    },




    //[⚑ v1.2.2][ READ ALL TRANSPORTERS ]
    read_transporters: async function(req,res)
    {
        let function_name = 'read_transporters'
        auxFuncModule.logger(function_name, 116, 0)

        /* - Step [1]
        *  - Search for stored transporters in DB...
        */
        await transporterModelItem.find({}).then((transportersFound) =>
        {
            let transporters_data = []

            if (transportersFound.length === 0)
            {
                auxFuncModule.logger(function_name, 127, 1, 1, "[i] No transporters stored in DB...")
                return res.status(200).send({code: '0', message: 'No hay transportistas registrados todavía.'})
            }
            else
            {
                transportersFound.forEach(element =>
                {
                    transporters_data.push(element)
                })

                auxFuncModule.logger(function_name, 137, 1, 1, "[i] Sending all found TRANSPORTERS data...")
                return res.status(200).send({code: '1', transporters_data})
            }
        }).catch((err)=>
        {
            auxFuncModule.logger(function_name, 142, 1, 3, "[e] " + err)
            return res.status(500).send({code: '-1', message: 'Error al procesar la solicitud en el servidor.'})
        })
    },




    //[⚑ v1.2.2][ DELETE TRANSPORTER ]
    delete_transporter: async function(req, res)
    {
        let function_name = "delete_transporter"
        auxFuncModule.logger(function_name, 154, 0)

        /* - Step [1]
        *  - Receive values from CLIENT...
        *  - via DELETE -> BODY
        */
        let bodyValues = req.body

        /* - Step [2]
        *  - Validate input params...
        */
        if (!auxFuncModule.isValidValue(bodyValues.transporter_id) || !auxFuncModule.isValidValue(bodyValues.transporter_name) || bodyValues.transporter_name === 'NUEVO TRANSPORTISTA' || bodyValues.transporter_id == '0')
        {
            auxFuncModule.logger(function_name, 166, 2, 2, "[e] Transporter inputs not valid, cannot delete...")
            return res.status(400).send({code: '-1', message: 'Entrada de NOMBRE debe contener algún valor válido.'})
        }
        else
        {
            try
            {
                await transporterModelItem.findOneAndDelete({transporter_id: bodyValues.transporter_id}).then((deletedObject)=>
                {
                    if (!deletedObject)
                    {
                        auxFuncModule.logger(function_name, 177, 2, 3, "[e] Transporter was not found, hence, not deleted...")
                        return res.status(404).send({code: '-1', message: 'Transportista no encontrado.'})
                    }
                    else
                    {
                        auxFuncModule.logger(function_name, 182, 2, 1, "[i] Transporter delete complete...")
                        return res.status(200).send({code: '1', message: 'Transportista eliminado exitosamente.'})
                    }
                })
            }
            catch (error)
            {
                auxFuncModule.logger(function_name, 189, 3, 3, "[e] Transporter not processed, PROMISE(S) ERROR...")
                return res.status(500).send({code: '-1', message: 'Error al procesar los datos en el servidor.'})
            }
        }
    },




    //[⚑ v1.2.2][ CREATE, UPDATE (with diff) OR DELETE OPERATOR ]
    handle_operator: async function(req, res)
    {
        let function_name = 'handle_operator'
        auxFuncModule.logger(function_name, 202, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues     = req.body
        const operator_tr_id = auxFuncModule.sanitizeString(bodyValues.operator_tr_id)              ?? null
        const operator_name  = auxFuncModule.sanitizeName(bodyValues.operator_name)?.toUpperCase()  ?? null
        const operator_id    = auxFuncModule.sanitizeString(bodyValues.operator_id)                 ?? null
        const operator_rfc   = auxFuncModule.sanitizeString(bodyValues.operator_rfc)?.toUpperCase() ?? null
        const action         = auxFuncModule.sanitizeString(bodyValues.action)?.toLowerCase()       ?? null

        auxFuncModule.logger(function_name, 214, 1, 1, "[i] Values received and sanitized...")

        /* - Step [2]
        *  - Validate required inputs...
        */
        if (!auxFuncModule.isValidValue(operator_tr_id))
        {
            auxFuncModule.logger(function_name, 220, 2, 2, "[e] operator_tr_id not valid, rejecting request...")
            return res.status(400).send({code: '-1', message: 'ID de transportista no válido.'})
        }

        if (action === 'delete')
        {
            if (!auxFuncModule.isValidValue(operator_id))
            {
                auxFuncModule.logger(function_name, 228, 2, 2, "[e] operator_id required for delete action...")
                return res.status(400).send({code: '-1', message: 'ID de operador requerido para eliminar.'})
            }
        }
        else
        {
            if (!auxFuncModule.isValidValue(operator_name) || operator_name === 'NUEVO OPERADOR')
            {
                auxFuncModule.logger(function_name, 236, 2, 2, "[e] operator_name not valid, rejecting request...")
                return res.status(400).send({code: '-1', message: 'Entrada de NOMBRE debe contener algún valor válido.'})
            }
        }

        try
        {
            /* - Step [3]
            *  - Find parent TRANSPORTER...
            */
            const transporterObjectFound = await transporterModelItem.find({transporter_id: operator_tr_id})

            if (transporterObjectFound.length === 0)
            {
                auxFuncModule.logger(function_name, 249, 3, 2, "[e] Transporter ID not found...")
                return res.status(404).send({code: '-1', message: 'Transportista no encontrado.'})
            }

            auxFuncModule.logger(function_name, 253, 3, 1, "[i] Parent transporter found...")
            const storedOperators = transporterObjectFound[0].transporter_operators

            /* - Step [4]
            *  - Branch by action...
            */

            // [ DELETE ]
            if (action === 'delete')
            {
                const operatorExists = storedOperators.find(op => op.operator_id === operator_id)

                if (!operatorExists)
                {
                    auxFuncModule.logger(function_name, 264, 4, 2, "[e] Operator not found in array, cannot delete...")
                    return res.status(404).send({code: '-1', message: 'Operador no encontrado.'})
                }

                const filteredOperators = storedOperators.filter(op => op.operator_id !== operator_id)

                const deleteResult = await transporterModelItem.findOneAndUpdate(
                    {transporter_id: operator_tr_id},
                    {$set: {transporter_operators: filteredOperators}},
                    {new: false}
                )

                if (deleteResult)
                {
                    auxFuncModule.logger(function_name, 276, 4, 1, "[i] Operator deleted successfully...")
                    return res.status(200).send({code: '1', message: 'Operador eliminado correctamente.'})
                }
                else
                {
                    auxFuncModule.logger(function_name, 281, 4, 2, "[e] Operator delete failed...")
                    return res.status(500).send({code: '-1', message: 'Error al eliminar el operador.'})
                }
            }

            // [ CREATE or UPDATE ] — explicit field whitelist (no body spreading)
            const found_operator    = storedOperators.find(op => op.operator_id === operator_id)
            const operator_rfc_safe = auxFuncModule.sanitizeString(bodyValues.operator_rfc)?.toUpperCase() ?? ''
            const operator_avail    = bodyValues.operator_available !== false

            // [ CREATE ] — operator not found in array
            if (!auxFuncModule.isValidValue(found_operator))
            {
                const op_id       = auxFuncModule.createId([operator_tr_id, operator_name, operator_rfc_safe])
                const new_operator = {
                    operator_id:        op_id,
                    operator_name:      operator_name,
                    operator_rfc:       operator_rfc_safe,
                    operator_available: operator_avail,
                }

                const createResult = await transporterModelItem.findOneAndUpdate(
                    {transporter_id: operator_tr_id},
                    {$push: {transporter_operators: new_operator}},
                    {new: false}
                )

                if (createResult)
                {
                    auxFuncModule.logger(function_name, 300, 4, 1, "[i] New operator created successfully...")
                    return res.status(200).send({code: '1', message: 'Operador creado exitosamente.'})
                }
                else
                {
                    auxFuncModule.logger(function_name, 305, 4, 2, "[e] Operator creation failed...")
                    return res.status(500).send({code: '-1', message: 'Error al guardar el operador.'})
                }
            }

            // [ UPDATE with diff ] — compare only whitelisted fields
            const diff = {}
            if (operator_name      !== found_operator.operator_name)      diff.operator_name      = operator_name
            if (operator_rfc_safe  !== found_operator.operator_rfc)       diff.operator_rfc       = operator_rfc_safe
            if (operator_avail     !== found_operator.operator_available)  diff.operator_available = operator_avail

            if (Object.keys(diff).length === 0)
            {
                auxFuncModule.logger(function_name, 317, 4, 1, "[i] No changes detected, skipping update...")
                return res.status(200).send({code: '1', message: 'Sin cambios.'})
            }

            const merged = {...found_operator, ...diff}

            const updateResult = await transporterModelItem.findOneAndUpdate(
                {transporter_id: operator_tr_id, "transporter_operators.operator_id": operator_id},
                {$set: {"transporter_operators.$": merged}},
                {new: false}
            )

            if (updateResult)
            {
                auxFuncModule.logger(function_name, 328, 4, 1, "[i] Operator updated successfully...")
                return res.status(200).send({code: '1', message: 'Operador actualizado correctamente.'})
            }
            else
            {
                auxFuncModule.logger(function_name, 333, 4, 2, "[e] Operator update failed...")
                return res.status(500).send({code: '-1', message: 'Error al actualizar el operador.'})
            }
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 339, 3, 3, "[e] Not processed, PROMISE(S) ERROR: " + error.message)
            return res.status(500).send({code: '-1', message: 'Error al procesar los datos en el servidor.'})
        }
    },




    //[⚑ v1.2.2][ CREATE, UPDATE (with diff) OR DELETE ECO ]
    handle_eco: async function(req, res)
    {
        let function_name = 'handle_eco'
        auxFuncModule.logger(function_name, 351, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues = req.body
        const eco_tr_id  = auxFuncModule.sanitizeString(bodyValues.eco_tr_id)              ?? null
        const eco_name   = auxFuncModule.sanitizeName(bodyValues.eco_name)?.toUpperCase()  ?? null
        const eco_id     = auxFuncModule.sanitizeString(bodyValues.eco_id)                 ?? null
        const eco_serial = auxFuncModule.sanitizeString(bodyValues.eco_serial_number)?.toUpperCase() ?? null
        const action     = auxFuncModule.sanitizeString(bodyValues.action)?.toLowerCase()  ?? null

        auxFuncModule.logger(function_name, 363, 1, 1, "[i] Values received and sanitized...")

        /* - Step [2]
        *  - Validate required inputs...
        */
        if (!auxFuncModule.isValidValue(eco_tr_id))
        {
            auxFuncModule.logger(function_name, 369, 2, 2, "[e] eco_tr_id not valid, rejecting request...")
            return res.status(400).send({code: '-1', message: 'ID de transportista no válido.'})
        }

        if (action === 'delete')
        {
            if (!auxFuncModule.isValidValue(eco_id))
            {
                auxFuncModule.logger(function_name, 377, 2, 2, "[e] eco_id required for delete action...")
                return res.status(400).send({code: '-1', message: 'ID de ECO requerido para eliminar.'})
            }
        }
        else
        {
            if (!auxFuncModule.isValidValue(eco_name) || eco_name === 'NUEVO ECO')
            {
                auxFuncModule.logger(function_name, 385, 2, 2, "[e] eco_name not valid, rejecting request...")
                return res.status(400).send({code: '-1', message: 'Entrada de NOMBRE debe contener algún valor válido.'})
            }
        }

        try
        {
            /* - Step [3]
            *  - Find parent TRANSPORTER...
            */
            const transporterObjectFound = await transporterModelItem.find({transporter_id: eco_tr_id})

            if (transporterObjectFound.length === 0)
            {
                auxFuncModule.logger(function_name, 398, 3, 2, "[e] Transporter ID not found...")
                return res.status(404).send({code: '-1', message: 'Transportista no encontrado.'})
            }

            auxFuncModule.logger(function_name, 402, 3, 1, "[i] Parent transporter found...")
            const storedEquipment = transporterObjectFound[0].transporter_equipment

            /* - Step [4]
            *  - Branch by action...
            */

            // [ DELETE ]
            if (action === 'delete')
            {
                const ecoExists = storedEquipment.find(eco => eco.eco_id === eco_id)

                if (!ecoExists)
                {
                    auxFuncModule.logger(function_name, 413, 4, 2, "[e] ECO not found in array, cannot delete...")
                    return res.status(404).send({code: '-1', message: 'ECO no encontrado.'})
                }

                const filteredEquipment = storedEquipment.filter(eco => eco.eco_id !== eco_id)

                const deleteResult = await transporterModelItem.findOneAndUpdate(
                    {transporter_id: eco_tr_id},
                    {$set: {transporter_equipment: filteredEquipment}},
                    {new: false}
                )

                if (deleteResult)
                {
                    auxFuncModule.logger(function_name, 425, 4, 1, "[i] ECO deleted successfully...")
                    return res.status(200).send({code: '1', message: 'ECO eliminado correctamente.'})
                }
                else
                {
                    auxFuncModule.logger(function_name, 430, 4, 2, "[e] ECO delete failed...")
                    return res.status(500).send({code: '-1', message: 'Error al eliminar el ECO.'})
                }
            }

            // [ CREATE or UPDATE ] — explicit field whitelist (no body spreading)
            const found_eco      = storedEquipment.find(eco => eco.eco_id === eco_id)
            const eco_serial_safe = auxFuncModule.sanitizeString(bodyValues.eco_serial_number)?.toUpperCase() ?? ''
            const eco_avail       = bodyValues.eco_available !== false

            // [ CREATE ] — eco not found in array
            if (!auxFuncModule.isValidValue(found_eco))
            {
                const ec_id   = auxFuncModule.createId([eco_tr_id, eco_name, eco_serial_safe])
                const new_eco = {
                    eco_id:            ec_id,
                    eco_name:          eco_name,
                    eco_serial_number: eco_serial_safe,
                    eco_available:     eco_avail,
                }

                const createResult = await transporterModelItem.findOneAndUpdate(
                    {transporter_id: eco_tr_id},
                    {$push: {transporter_equipment: new_eco}},
                    {new: false}
                )

                if (createResult)
                {
                    auxFuncModule.logger(function_name, 449, 4, 1, "[i] New ECO created successfully...")
                    return res.status(200).send({code: '1', message: 'ECO creado exitosamente.'})
                }
                else
                {
                    auxFuncModule.logger(function_name, 454, 4, 2, "[e] ECO creation failed...")
                    return res.status(500).send({code: '-1', message: 'Error al guardar el ECO.'})
                }
            }

            // [ UPDATE with diff ] — compare only whitelisted fields
            const diff = {}
            if (eco_name         !== found_eco.eco_name)          diff.eco_name          = eco_name
            if (eco_serial_safe  !== found_eco.eco_serial_number) diff.eco_serial_number = eco_serial_safe
            if (eco_avail        !== found_eco.eco_available)      diff.eco_available     = eco_avail

            if (Object.keys(diff).length === 0)
            {
                auxFuncModule.logger(function_name, 466, 4, 1, "[i] No changes detected, skipping update...")
                return res.status(200).send({code: '1', message: 'Sin cambios.'})
            }

            const merged = {...found_eco, ...diff}

            const updateResult = await transporterModelItem.findOneAndUpdate(
                {transporter_id: eco_tr_id, "transporter_equipment.eco_id": eco_id},
                {$set: {"transporter_equipment.$": merged}},
                {new: false}
            )

            if (updateResult)
            {
                auxFuncModule.logger(function_name, 477, 4, 1, "[i] ECO updated successfully...")
                return res.status(200).send({code: '1', message: 'ECO actualizado correctamente.'})
            }
            else
            {
                auxFuncModule.logger(function_name, 482, 4, 2, "[e] ECO update failed...")
                return res.status(500).send({code: '-1', message: 'Error al actualizar el ECO.'})
            }
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 488, 3, 3, "[e] Not processed, PROMISE(S) ERROR: " + error.message)
            return res.status(500).send({code: '-1', message: 'Error al procesar los datos en el servidor.'})
        }
    }

//#endregion [ v1.2.2 CONTROLLER ]
}

module.exports = controller
