'use strict'

// Import required MODEL SCHEMAS from models MODULE...
var clientModelItem = require('../MODELS/client.js')

// Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation...
var controller = {

//#region    [ v2.0 CONTROLLER ]

    /**
     * Crea un cliente nuevo o actualiza uno existente.
     * Busca por client_id: si no se encuentra, genera un client_id y lo
     * almacena (client_man_key se autocompleta con ese mismo client_id);
     * si se encuentra, compara campos y aplica solo los cambios detectados
     * (client_man_key incluido, editable en este paso).
     */
    //[⚑ v.1.2.2][ CREATE OR UPDATE CLIENT ]
    handle_client: async function(req,res)
    {
        let function_name = "handle_client"
        auxFuncModule.logger(function_name, 25, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues       = req.body
        const search_client_id = auxFuncModule.sanitizeString(bodyValues.client_id)                ?? null
        const client_name      = auxFuncModule.sanitizeName(bodyValues.client_name)?.toUpperCase() ?? null
        const phone_provided   = auxFuncModule.isValidValue(bodyValues.client_phone)
        const email_provided   = auxFuncModule.isValidValue(bodyValues.client_email)
        const client_phone     = auxFuncModule.sanitizePhone(bodyValues.client_phone)              ?? ''
        const client_email     = auxFuncModule.sanitizeEmail(bodyValues.client_email)              ?? ''
        const client_status    = auxFuncModule.sanitizeString(bodyValues.client_status)?.toUpperCase() ?? null
        const client_man_key   = auxFuncModule.sanitizeString(bodyValues.client_man_key) ?? null

        auxFuncModule.logger(function_name, 41, 1, 1, "[i] Input values received and sanitized (client_status: " + client_status + ", client_man_key: " + client_man_key + ")...")

        /* - Step [2]
        *  - Validate client_name before proceeding...
        */
        if ((client_name ?? '') === '' || client_name === 'NUEVO CONTACTO')
        {
            auxFuncModule.logger(function_name, 48, 2, 2, "[e] client_name not valid, rejecting request...")
            return res.status(400).send({code:'0', message:'Entrada de nombre debe contener un valor válido.'})
        }

        /* - Step [2b]
        *  - A phone/email WAS submitted but failed its format check — reject instead of
        *  - silently storing an empty value with a success response.
        */
        if (phone_provided && client_phone === '')
        {
            auxFuncModule.logger(function_name, 58, 2, 2, "[e] client_phone format invalid, rejecting request...")
            return res.status(400).send({code:'0', message:'El teléfono no tiene un formato válido.'})
        }
        if (email_provided && client_email === '')
        {
            auxFuncModule.logger(function_name, 63, 2, 2, "[e] client_email format invalid, rejecting request...")
            return res.status(400).send({code:'0', message:'El correo no tiene un formato válido.'})
        }

        try
        {
            /* - Step [3]
            *  - Generate new client_id dynamically...
            */
            const new_client_id = auxFuncModule.createId([client_name, client_phone, client_email])
            auxFuncModule.logger(function_name, 73, 3, 1, "[i] client_id generated: " + new_client_id)

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
                auxFuncModule.logger(function_name, 87, 4, 1, "[i] Client not found, STORING new record...")

                const newClientObject              = new clientModelItem()
                newClientObject.client_id          = new_client_id
                newClientObject.client_name        = client_name
                newClientObject.client_phone       = client_phone
                newClientObject.client_email       = client_email
                newClientObject.client_status      = 'ACTIVO'
                newClientObject.client_last_update = auxFuncModule.timeSnapshot()
                // client_man_key uses the client-provided value when sent; otherwise it
                // auto-fills with the new client_id.
                newClientObject.client_man_key     = client_man_key ?? new_client_id

                auxFuncModule.logger(function_name, 99, 4, 1, "[i] New client prepared with status: ACTIVO, client_man_key: " + newClientObject.client_man_key + "...")

                await newClientObject.save()

                auxFuncModule.logger(function_name, 103, 4, 1, "[i] Client STORED successfully...")
                return res.status(200).send({code:'1', message:'Cliente almacenado correctamente.'})
            }
            else
            {
                auxFuncModule.logger(function_name, 108, 4, 1, "[i] Client found, comparing fields for diff...")

                const diff = {}
                if (client_name  !== clientFound.client_name)  diff.client_name  = client_name
                // Phone is optional: only touch it when the request actually sent one.
                // If it came empty, leave the stored value untouched (empty stays empty,
                // a previously saved phone is not wiped by an unrelated partial update).
                if (phone_provided && client_phone !== clientFound.client_phone)
                {
                    auxFuncModule.logger(function_name, 117, 4, 1, "[i] client_phone change detected: " + clientFound.client_phone + " -> " + client_phone)
                    diff.client_phone = client_phone
                }
                // Email is optional too: same rule as phone — only touch it when the
                // request actually sent one, so an unrelated partial update doesn't wipe it.
                if (email_provided && client_email !== clientFound.client_email)
                {
                    auxFuncModule.logger(function_name, 124, 4, 1, "[i] client_email change detected: " + clientFound.client_email + " -> " + client_email)
                    diff.client_email = client_email
                }
                if (client_status !== null && client_status !== clientFound.client_status)
                {
                    auxFuncModule.logger(function_name, 116, 4, 1, "[i] client_status change detected: " + clientFound.client_status + " -> " + client_status)
                    diff.client_status = client_status
                }
                if (client_man_key !== null && client_man_key !== clientFound.client_man_key)
                {
                    auxFuncModule.logger(function_name, 121, 4, 1, "[i] client_man_key change detected: " + clientFound.client_man_key + " -> " + client_man_key)
                    diff.client_man_key = client_man_key
                }

                if (Object.keys(diff).length === 0)
                {
                    auxFuncModule.logger(function_name, 127, 4, 1, "[i] No field changes detected, skipping update...")
                    return res.status(200).send({code:'1', message:'Sin cambios detectados.'})
                }

                // client_id must stay stable across updates — Maniobras/Rutas reference clients
                // by this id, so it must never change once assigned at creation.
                diff.client_last_update = auxFuncModule.timeSnapshot()

                auxFuncModule.logger(function_name, 135, 4, 1, "[i] Changes detected, UPDATING fields: " + Object.keys(diff))

                const updateResult = await clientModelItem.findOneAndUpdate(
                    {client_id: search_client_id},
                    {$set: diff},
                    {new: false}
                )

                if (updateResult)
                {
                    auxFuncModule.logger(function_name, 145, 4, 1, "[i] Client UPDATED successfully...")
                    return res.status(200).send({code:'1', message:'Cliente actualizado correctamente.'})
                }
                else
                {
                    auxFuncModule.logger(function_name, 150, 4, 2, "[e] findOneAndUpdate returned null...")
                    return res.status(500).send({code:'0', message:'Error al actualizar el cliente.'})
                }
            }
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 157, 5, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'0', message:'Error al procesar los datos en el servidor.'})
        }
    },




    /**
     * Devuelve todos los clientes almacenados, filtrando solo los campos
     * públicos (id, nombre, teléfono, correo, estatus, client_man_key).
     */
    //[⚑ v.1.2.2][ READ CLIENTS ]
    read_clients: async function(req,res)
    {
        let function_name = "read_clients"
        auxFuncModule.logger(function_name, 173, 0)

        try
        {
            /* - Step [1]
            *  - Search for stored clients in DB...
            */
            const clientsFound = await clientModelItem.find({})
            auxFuncModule.logger(function_name, 181, 1, 1, "[i] Query executed, records found: " + clientsFound.length)

            if (clientsFound.length === 0)
            {
                auxFuncModule.logger(function_name, 185, 1, 1, "[i] No clients stored in DB...")
                return res.status(200).send({code:'0', message:'No hay clientes registrados todavía.'})
            }

            /* - Step [2]
            *  - Format and return only the required fields...
            */
            const propsObject  = ({client_id, client_name, client_phone, client_email, client_status, client_man_key}) => ({client_id, client_name, client_phone: client_phone ?? '', client_email: client_email ?? '', client_status, client_man_key})
            const clients_data = clientsFound.map(propsObject)

            auxFuncModule.logger(function_name, 195, 2, 1, "[i] Sending all found CLIENTS data...")
            return res.status(200).send({code:'1', clients_data})
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 200, 3, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'-1', message:'Error al procesar la solicitud en el servidor.'})
        }
    },




    /**
     * Elimina un cliente localizándolo por client_id.
     */
    //[⚑ v.1.2.2][ DELETE CLIENT ]
    delete_client: async function(req,res)
    {
        let function_name = "delete_client"
        auxFuncModule.logger(function_name, 215, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues       = req.body
        const search_client_id = auxFuncModule.sanitizeString(bodyValues.client_id) ?? null

        auxFuncModule.logger(function_name, 224, 1, 1, "[i] Input value received and sanitized...")

        /* - Step [2]
        *  - Validate client_id before proceeding...
        */
        if ((search_client_id ?? '') === '')
        {
            auxFuncModule.logger(function_name, 231, 2, 2, "[e] client_id not valid, rejecting request...")
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
                auxFuncModule.logger(function_name, 244, 3, 2, "[e] Client not found, nothing deleted...")
                return res.status(404).send({code:'0', message:'Cliente no encontrado.'})
            }

            auxFuncModule.logger(function_name, 248, 3, 1, "[i] Client DELETED successfully...")
            return res.status(200).send({code:'1', message:'Cliente eliminado exitosamente.'})
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 253, 4, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'-1', message:'Error al procesar los datos en el servidor.'})
        }
    },


//#endregion [ v2.0 CONTROLLER ]

}

module.exports = controller
