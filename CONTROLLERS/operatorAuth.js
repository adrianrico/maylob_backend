'use strict'

// Import MODEL SCHEMA from models MODULE...
var transporterModelItem = require('../MODELS/transporter.js')

// Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation...
var controller =
{
    // [⚑ v1.0][ LOGIN OPERATOR BY CURP ][ TIL OPERATOR portal ]
    login: async function(req, res)
    {
        let function_name = "login"
        auxFuncModule.logger(function_name, 0, 0)

        /* - Step [1]
        *  - Receive and sanitize CURP from CLIENT via POST -> BODY. Same normalization as
        *    the CURP-as-id used when operators are created (handle_operator)...
        */
        const bodyValues = req.body
        const curp = auxFuncModule.sanitizeString(bodyValues.curp)?.toUpperCase().replace(/\s+/g, '') ?? null

        if (!curp)
        {
            auxFuncModule.logger(function_name, 0, 1, 2, "[e] curp not valid, rejecting request...")
            return res.status(400).send({ code: '-1', message: 'CURP no válido.' })
        }

        auxFuncModule.logger(function_name, 0, 1, 1, "[i] CURP received and sanitized...")

        try
        {
            /* - Step [2]
            *  - Cross-fleet lookup: operator_id IS the CURP inside transporter_operators...
            */
            const transporterFound = await transporterModelItem.findOne(
                { 'transporter_operators.operator_id': curp },
                { transporter_id: 1, transporter_name: 1, transporter_operators: 1 }
            ).lean()

            const operatorFound = transporterFound?.transporter_operators?.find(op => op.operator_id === curp) ?? null

            if (!transporterFound || !operatorFound)
            {
                auxFuncModule.logger(function_name, 0, 2, 2, "[e] Operator not found for given CURP...")
                return res.status(404).send({ code: '-1', message: 'CURP no encontrado.' })
            }

            if (operatorFound.operator_available === false)
            {
                auxFuncModule.logger(function_name, 0, 2, 2, "[e] Operator found but marked unavailable...")
                return res.status(403).send({ code: '-1', message: 'Operador dado de baja, contacta a tu transportista.' })
            }

            auxFuncModule.logger(function_name, 0, 2, 1, "[i] Operator resolved, login OK...")

            return res.status(200).send({
                code: '1',
                operator: {
                    operator_id:       operatorFound.operator_id,
                    operator_name:     operatorFound.operator_name,
                    transporter_id:    transporterFound.transporter_id,
                    transporter_name:  transporterFound.transporter_name,
                }
            })
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 0, 3, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },
}

module.exports = controller
