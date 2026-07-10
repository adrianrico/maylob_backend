'use strict'

// Import required MODEL SCHEMAS from models MODULE...
var clientModelItem = require('../MODELS/client.js')

// Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation... 
var controller = {

//#region    [ v2.0 CONTROLLER ]

    //[⚑ v.1.2.2][ CREATE OR UPDATE CLIENT ]
    handle_client: async function(req,res)
    {
        let function_name = "handle_client"
        auxFuncModule.logger(function_name, 18, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues       = req.body
        const search_client_id = auxFuncModule.sanitizeString(bodyValues.client_id)                ?? null
        const client_name      = auxFuncModule.sanitizeName(bodyValues.client_name)?.toUpperCase() ?? null
        const phone_provided   = auxFuncModule.isValidValue(bodyValues.client_phone)
        const email_provided   = auxFuncModule.isValidValue(bodyValues.client_email)
        const client_phone     = auxFuncModule.sanitizePhone(bodyValues.client_phone)              ?? 'TELEFONO NO REGISTRADO'
        const client_email     = auxFuncModule.sanitizeEmail(bodyValues.client_email)              ?? 'CORREO NO REGISTRADO'
        const client_status    = auxFuncModule.sanitizeString(bodyValues.client_status)?.toUpperCase() ?? null

        auxFuncModule.logger(function_name, 30, 1, 1, "[i] Input values received and sanitized (client_status: " + client_status + ")...")

        /* - Step [2]
        *  - Validate client_name before proceeding...
        */
        if ((client_name ?? '') === '' || client_name === 'NUEVO CONTACTO')
        {
            auxFuncModule.logger(function_name, 37, 2, 2, "[e] client_name not valid, rejecting request...")
            return res.status(400).send({code:'0', message:'Entrada de nombre debe contener un valor válido.'})
        }

        /* - Step [2b]
        *  - A phone/email WAS submitted but failed its format check — reject instead of
        *  - silently swapping it for the "NO REGISTRADO" placeholder with a success response.
        */
        if (phone_provided && client_phone === 'TELEFONO NO REGISTRADO')
        {
            auxFuncModule.logger(function_name, 40, 2, 2, "[e] client_phone format invalid, rejecting request...")
            return res.status(400).send({code:'0', message:'El teléfono no tiene un formato válido.'})
        }
        if (email_provided && client_email === 'CORREO NO REGISTRADO')
        {
            auxFuncModule.logger(function_name, 41, 2, 2, "[e] client_email format invalid, rejecting request...")
            return res.status(400).send({code:'0', message:'El correo no tiene un formato válido.'})
        }

        try
        {
            /* - Step [3]
            *  - Generate new client_id dynamically...
            */
            const new_client_id = auxFuncModule.createId([client_name, client_phone, client_email])
            auxFuncModule.logger(function_name, 47, 3, 1, "[i] client_id generated: " + new_client_id)

            /* - Step [4]
            *  - Search existing client by client_id...
            */
            const clientFound = search_client_id
                ? await clientModelItem.findOne({client_id: search_client_id})
                : null

            /* - Step [5]
            *  - Create or update based on search result...
            */
            if (!clientFound)
            {
                auxFuncModule.logger(function_name, 61, 4, 1, "[i] Client not found, STORING new record...")

                const newClientObject              = new clientModelItem()
                newClientObject.client_id          = new_client_id
                newClientObject.client_name        = client_name
                newClientObject.client_phone       = client_phone
                newClientObject.client_email       = client_email
                newClientObject.client_status      = 'ACTIVO'
                newClientObject.client_last_update = auxFuncModule.timeSnapshot()

                auxFuncModule.logger(function_name, 70, 4, 1, "[i] New client prepared with status: ACTIVO...")

                await newClientObject.save()

                auxFuncModule.logger(function_name, 72, 4, 1, "[i] Client STORED successfully...")
                return res.status(200).send({code:'1', message:'Cliente almacenado correctamente.'})
            }
            else
            {
                auxFuncModule.logger(function_name, 77, 4, 1, "[i] Client found, comparing fields for diff...")

                const diff = {}
                if (client_name  !== clientFound.client_name)  diff.client_name  = client_name
                if (client_phone !== clientFound.client_phone) diff.client_phone = client_phone
                if (client_email !== clientFound.client_email) diff.client_email = client_email
                if (client_status !== null && client_status !== clientFound.client_status)
                {
                    auxFuncModule.logger(function_name, 83, 4, 1, "[i] client_status change detected: " + clientFound.client_status + " -> " + client_status)
                    diff.client_status = client_status
                }

                if (Object.keys(diff).length === 0)
                {
                    auxFuncModule.logger(function_name, 86, 4, 1, "[i] No field changes detected, skipping update...")
                    return res.status(200).send({code:'1', message:'Sin cambios detectados.'})
                }

                // client_id must stay stable across updates — Maniobras/Rutas reference clients
                // by this id, so it must never change once assigned at creation.
                diff.client_last_update = auxFuncModule.timeSnapshot()

                auxFuncModule.logger(function_name, 93, 4, 1, "[i] Changes detected, UPDATING fields: " + Object.keys(diff))

                const updateResult = await clientModelItem.findOneAndUpdate(
                    {client_id: search_client_id},
                    {$set: diff},
                    {new: false}
                )

                if (updateResult)
                {
                    auxFuncModule.logger(function_name, 103, 4, 1, "[i] Client UPDATED successfully...")
                    return res.status(200).send({code:'1', message:'Cliente actualizado correctamente.'})
                }
                else
                {
                    auxFuncModule.logger(function_name, 108, 4, 2, "[e] findOneAndUpdate returned null...")
                    return res.status(500).send({code:'0', message:'Error al actualizar el cliente.'})
                }
            }
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 115, 5, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'0', message:'Error al procesar los datos en el servidor.'})
        }
    },





    //[⚑ v.1.2.2][ READ CLIENTS ]
    read_clients: async function(req,res)
    {
        let function_name = "read_clients"
        auxFuncModule.logger(function_name, 128, 0)

        try
        {
            /* - Step [1]
            *  - Search for stored clients in DB...
            */
            const clientsFound = await clientModelItem.find({})
            auxFuncModule.logger(function_name, 136, 1, 1, "[i] Query executed, records found: " + clientsFound.length)

            if (clientsFound.length === 0)
            {
                auxFuncModule.logger(function_name, 140, 1, 1, "[i] No clients stored in DB...")
                return res.status(200).send({code:'0', message:'No hay clientes registrados todavía.'})
            }

            /* - Step [2]
            *  - Format and return only the required fields...
            */
            const propsObject  = ({client_id, client_name, client_phone, client_email, client_status}) => ({client_id, client_name, client_phone, client_email, client_status})
            const clients_data = clientsFound.map(propsObject)

            auxFuncModule.logger(function_name, 150, 2, 1, "[i] Sending all found CLIENTS data...")
            return res.status(200).send({code:'1', clients_data})
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 155, 3, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'-1', message:'Error al procesar la solicitud en el servidor.'})
        }
    },





    //[⚑ v.1.2.2][ DELETE CLIENT ]
    delete_client: async function(req,res)
    {
        let function_name = "delete_client"
        auxFuncModule.logger(function_name, 168, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues       = req.body
        const search_client_id = auxFuncModule.sanitizeString(bodyValues.client_id) ?? null

        auxFuncModule.logger(function_name, 177, 1, 1, "[i] Input value received and sanitized...")

        /* - Step [2]
        *  - Validate client_id before proceeding...
        */
        if ((search_client_id ?? '') === '')
        {
            auxFuncModule.logger(function_name, 184, 2, 2, "[e] client_id not valid, rejecting request...")
            return res.status(400).send({code:'-1', message:'ID de cliente no válido.'})
        }

        try
        {
            /* - Step [3]
            *  - Search and delete client by client_id...
            */
            const deletedClient = await clientModelItem.findOneAndDelete({client_id: search_client_id})

            if (!deletedClient)
            {
                auxFuncModule.logger(function_name, 197, 3, 2, "[e] Client not found, nothing deleted...")
                return res.status(404).send({code:'0', message:'Cliente no encontrado.'})
            }

            auxFuncModule.logger(function_name, 201, 3, 1, "[i] Client DELETED successfully...")
            return res.status(200).send({code:'1', message:'Cliente eliminado exitosamente.'})
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 206, 4, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'-1', message:'Error al procesar los datos en el servidor.'})
        }
    },


//#endregion [ v2.0 CONTROLLER ]

}

module.exports = controller