'use strict'

// Import MODEL SCHEMA from models MODULE...
var transporterModelItem = require('../../MODELS/transporter.js')

// Import auxiliary functions MODULE...
let auxFuncModule = require('../auxiliary_functions.js')

/* [⚑ v1.0][ RESOLVE OPERATOR FROM X-Operator-Curp HEADER ]
*  - Identifies the calling operator (TIL OPERATOR portal) from the CURP sent in the
*    X-Operator-Curp header, same normalization/lookup as handle_operator's CURP-as-id.
*    Never rejects the request itself - attaches req.operator (or null) and lets each
*    route decide whether it's required. Requests without the header (e.g. til_forwarder,
*    the admin portal, which never sends it) pass through untouched with req.operator = null...
*/
async function resolveOperator(req, res, next)
{
    const rawCurp = req.headers['x-operator-curp']

    if (typeof rawCurp !== 'string' || rawCurp.trim() === '')
    {
        req.operator = null
        return next()
    }

    const curp = auxFuncModule.sanitizeString(rawCurp)?.toUpperCase().replace(/\s+/g, '') ?? null

    if (!curp)
    {
        req.operator = null
        return next()
    }

    try
    {
        const transporterFound = await transporterModelItem.findOne(
            { 'transporter_operators.operator_id': curp },
            { transporter_id: 1, transporter_name: 1, transporter_operators: 1 }
        ).lean()

        const operatorFound = transporterFound?.transporter_operators?.find(op => op.operator_id === curp) ?? null

        req.operator = (transporterFound && operatorFound) ? {
            curp:            curp,
            name:            operatorFound.operator_name,
            transporter_id:  transporterFound.transporter_id,
            transporter_name: transporterFound.transporter_name,
        } : null
    }
    catch (error)
    {
        // Lookup failure must not break requests that don't need the operator context...
        req.operator = null
    }

    return next()
}

module.exports = resolveOperator
