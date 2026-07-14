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
                        body.route_origin?.location_name,
                        body.route_destination?.location_name
                    ])

                const intermediatePoints = Array.isArray(body.route_intermediate_points)
                    ? body.route_intermediate_points.map((point, index) => auxFuncModule.sanitizeLocationPoint(point, index + 2, 'NO INTERMEDIATE SET'))
                    : []

                const destinationStep = intermediatePoints.length + 2

                const newRoute = new objectModelItem({
                    route_id: route_id,
                    route_name:                  auxFuncModule.sanitizeString(body.route_name)        || 'NO NAME SET',
                    route_category:              auxFuncModule.sanitizeString(body.route_category)    || 'NO CATEGORY SET',
                    route_origin:                auxFuncModule.sanitizeLocationPoint(body.route_origin, 1, 'NO ORIGIN SET'),
                    route_intermediate_points:   intermediatePoints,
                    route_destination:           auxFuncModule.sanitizeLocationPoint(body.route_destination, destinationStep, 'NO DESTINATION SET'),
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

            // ROUTE ORIGIN (full replace, step_number siempre 1)...
            if (typeof body.route_origin === 'object' && body.route_origin !== null && !Array.isArray(body.route_origin))
            {
                updateFields.route_origin = auxFuncModule.sanitizeLocationPoint(body.route_origin, 1, existingRoute.route_origin?.location_name || 'NO ORIGIN SET')
                auxFuncModule.logger(function_name,127,3,1,"[i] ORIGIN replaced...")
            }

            // ROUTE INTERMEDIATE POINTS (full replace, step_number recalculado)...
            let intermediateCount = existingRoute.route_intermediate_points?.length || 0
            if (Array.isArray(body.route_intermediate_points))
            {
                const rebuiltIntermediatePoints = body.route_intermediate_points.map((point, index) => auxFuncModule.sanitizeLocationPoint(point, index + 2, 'NO INTERMEDIATE SET'))
                updateFields.route_intermediate_points = rebuiltIntermediatePoints
                intermediateCount = rebuiltIntermediatePoints.length
                auxFuncModule.logger(function_name,175,3,1,"[i] INTERMEDIATE POINTS replaced...")
            }

            // ROUTE DESTINATION (step_number continúa la secuencia desde ORIGIN(1) -> INTERMEDIATES(2..n+1) -> DESTINATION)...
            const destinationStep = intermediateCount + 2
            if (typeof body.route_destination === 'object' && body.route_destination !== null && !Array.isArray(body.route_destination))
            {
                updateFields.route_destination = auxFuncModule.sanitizeLocationPoint(body.route_destination, destinationStep, existingRoute.route_destination?.location_name || 'NO DESTINATION SET')
                auxFuncModule.logger(function_name,167,3,1,"[i] DESTINATION replaced...")
            }
            else if (existingRoute.route_destination && existingRoute.route_destination.step_number !== destinationStep)
            {
                updateFields.route_destination = { ...existingRoute.route_destination, step_number: destinationStep }
                auxFuncModule.logger(function_name,167,3,1,"[i] DESTINATION step_number resynced...")
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