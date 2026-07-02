'use strict'

// Import required MODEL SCHEMAS from models MODULE...
let objectModelItem = require('../MODELS/c_routes.js') 

// Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation... 
var controller = {
 
//#region [ v1.2.2 CONTROLLER ]

    //[⚑ v.1.2.2][ CREATE OR UPDATE ROUTE ]
    handle_route: async function(req,res)
    {
        const function_name = 'handle_route'
        try 
        {
            auxFuncModule.logger(function_name,22,0)

            // [1] Receive client values via POST... 
            let body       = req.body
            let route_name = body.route_name?.toUpperCase()
            let route_id   = body.route_id

            auxFuncModule.logger(function_name,28,1,1,"[i] Values have been received...")
            if (!auxFuncModule.isValidValue(route_name)){ return res.status(400).send({ code:'-1', message:'Nombre de ruta requerida.'})}

            // [2] Find if the main object exists...
            const existingRoute = await objectModelItem.findOne({ route_id:route_id })
            
            // [2][A] Not found, means it's new, then save it...
            if (!existingRoute) 
            { 
                auxFuncModule.logger(function_name,37,2,1,"[i] Creating a new ROUTE...")

                // Dynamic ID building...
                let route_id = auxFuncModule.createId([
                        route_name,
                        body.route_origin,
                        body.route_destination
                    ])

                const newRoute = new objectModelItem({
                    route_id: route_id,
                    route_name:                  auxFuncModule.sanitizeString(body.route_name)        || 'NO NAME SET',
                    route_category:              auxFuncModule.sanitizeString(body.route_category)    || 'NO CATEGORY SET',
                    route_origin:                auxFuncModule.sanitizeString(body.route_origin)      || 'NO ORIGIN SET',
                    route_origin_events:         auxFuncModule.sanitizeEvents(body.route_origin_events),
                    route_destination:           auxFuncModule.sanitizeString(body.route_destination) || 'NO DESTINATION SET',
                    route_destination_events:    auxFuncModule.sanitizeEvents(body.route_destination_events),
                    route_intermediate_points:   auxFuncModule.sanitizeString(body.route_intermediate_points) || '',
                    route_intermediate_events:   auxFuncModule.sanitizeEvents(body.route_intermediate_events),
                    route_intermediate_stops:    auxFuncModule.sanitizeStops(body.route_intermediate_stops),
                })

                await newRoute.save()

                auxFuncModule.logger(function_name,58,2,1,"[i] ROUTE created, sending response...")
                return res.status(200).send({ code:'1', message: 'Route CREATED.', route_id })
            }

            // [2][B] It already exists, start updating fields, only if there was change...
            auxFuncModule.logger(function_name,64,2,1,"[i] UPDATING existing ROUTE...")
            let updateFields = {}

            const sanitizedName        = auxFuncModule.sanitizeString(body.route_name)
            const sanitizedCategory    = auxFuncModule.sanitizeString(body.route_category)
            const sanitizedOrigin      = auxFuncModule.sanitizeString(body.route_origin)
            const sanitizedDestination = auxFuncModule.sanitizeString(body.route_destination)

            //ROUTE NAME...
            if (sanitizedName !== null && sanitizedName !== existingRoute.route_name)
            {
                updateFields.route_name = sanitizedName
            }

            // CATEGORY...
            if (sanitizedCategory !== null && sanitizedCategory !== existingRoute.route_category)
            {
                updateFields.route_category = sanitizedCategory
            }

            // ROUTE ORIGIN...
            if (sanitizedOrigin !== null && sanitizedOrigin !== existingRoute.route_origin)
            {
                updateFields.route_origin = sanitizedOrigin
            }

            // ROUTE DESTINATION...
            if (sanitizedDestination !== null && sanitizedDestination !== existingRoute.route_destination)
            {
                updateFields.route_destination = sanitizedDestination
            }

            // ROUTE INTERMEDIATE POINTS...
            const sanitizedIntermediate = auxFuncModule.sanitizeString(body.route_intermediate_points)
            if (sanitizedIntermediate !== null && sanitizedIntermediate !== existingRoute.route_intermediate_points)
            {
                updateFields.route_intermediate_points = sanitizedIntermediate
            }

            // [3][B] REPLACE ORIGIN EVENTS (array entrante reemplaza al almacenado)...
            if (Array.isArray(body.route_origin_events))
            {
                updateFields.route_origin_events = auxFuncModule.sanitizeEvents(body.route_origin_events)
                auxFuncModule.logger(function_name,127,3,1,"[i] ORIGIN EVENTS replaced...")
            }

            // [4][B] REPLACE DESTINATION EVENTS...
            if (Array.isArray(body.route_destination_events))
            {
                updateFields.route_destination_events = auxFuncModule.sanitizeEvents(body.route_destination_events)
                auxFuncModule.logger(function_name,167,3,1,"[i] DESTINATION EVENTS replaced...")
            }

            // [5][B] REPLACE INTERMEDIATE EVENTS...
            if (Array.isArray(body.route_intermediate_events))
            {
                updateFields.route_intermediate_events = auxFuncModule.sanitizeEvents(body.route_intermediate_events)
                auxFuncModule.logger(function_name,175,3,1,"[i] INTERMEDIATE EVENTS replaced...")
            }

            // [5][C] REPLACE INTERMEDIATE STOPS (new multi-stop format)...
            if (Array.isArray(body.route_intermediate_stops))
            {
                updateFields.route_intermediate_stops = auxFuncModule.sanitizeStops(body.route_intermediate_stops)
                auxFuncModule.logger(function_name,176,3,1,"[i] INTERMEDIATE STOPS replaced...")
            }

            // [6] Update only if there was change...
            if (Object.keys(updateFields).length > 0) 
            {

                await objectModelItem.updateOne(
                    { route_id: route_id},
                    { $set: updateFields }
                )

                auxFuncModule.logger(function_name,180,5,1,"[i] Found ROUTE updated...")
                return res.status(200).send({code:1, message: 'RUTA actualizada parcialmente.' })
            }

            auxFuncModule.logger(function_name,184,5,1,"[i] ROUTE not modified...")
            return res.status(200).send({code:1, message: 'Sin cambios.' })
        } 
        catch (error) 
        {
            auxFuncModule.logger(function_name,189,1,3,"[e] Not processed, PROMISE(S) ERROR...\n"+error)
            return res.status(500).send({code:'-1',message:'Error interno del servidor.'})
        }
    },

    //[⚑ v.1.2.2][ READ ALL ROUTES ]
    read_custom_routes: async function(req,res)
    {
        let function_name = "read_custom_routes"
        auxFuncModule.logger(function_name, 196, 0)

        try
        {
            /* - Step [1]
            *  - Search for stored routes in DB...
            */
            const routesFound = await objectModelItem.find({})
            auxFuncModule.logger(function_name, 201, 1, 1, "[i] Query executed, records found: " + routesFound.length)

            if (routesFound.length === 0)
            {
                auxFuncModule.logger(function_name, 205, 1, 1, "[i] No routes stored in DB...")
                return res.status(200).send({code:'0', message:'No hay rutas registradas todavía.'})
            }

            auxFuncModule.logger(function_name, 215, 2, 1, "[i] Sending all found ROUTES data...")
            return res.status(200).send({code:'1', routes_data: routesFound})
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 220, 3, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'-1', message:'Error al procesar la solicitud en el servidor.'})
        }
    },

    //[⚑ v.1.2.2][ DELETE ROUTE ]
    delete_route: async function(req,res)
    {
        let function_name = "delete_route"
        auxFuncModule.logger(function_name, 232, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT...
        *  - via POST -> BODY
        */
        const bodyValues      = req.body
        const search_route_id = auxFuncModule.sanitizeString(bodyValues.route_id) ?? null

        auxFuncModule.logger(function_name, 241, 1, 1, "[i] Input value received and sanitized...")

        /* - Step [2]
        *  - Validate route_id before proceeding...
        */
        if ((search_route_id ?? '') === '')
        {
            auxFuncModule.logger(function_name, 248, 2, 2, "[e] route_id not valid, rejecting request...")
            return res.status(400).send({code:'-1', message:'ID de ruta no válido.'})
        }

        try
        {
            /* - Step [3]
            *  - Search and delete route by route_id...
            */
            const deletedRoute = await objectModelItem.findOneAndDelete({route_id: search_route_id})

            if (!deletedRoute)
            {
                auxFuncModule.logger(function_name, 261, 3, 2, "[e] Route not found, nothing deleted...")
                return res.status(404).send({code:'0', message:'Ruta no encontrada.'})
            }

            auxFuncModule.logger(function_name, 265, 3, 1, "[i] Route DELETED successfully...")
            return res.status(200).send({code:'1', message:'Ruta eliminada exitosamente.'})
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 270, 4, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({code:'-1', message:'Error al procesar los datos en el servidor.'})
        }
    },


//#endregion [ CONTROLLER v1.2 ]

}
module.exports = controller