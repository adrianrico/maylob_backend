'use strict'

//Import required MODEL SCHEMAS from models MODULE...
let maneuverModelItem     = require('../MODELS/maneuver.js')
let routeModelItem        = require('../MODELS/c_routes.js')
let clientModelItem       = require('../MODELS/client.js')
let transporterModelItem  = require('../MODELS/transporter.js')

// Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation...
var controller = 
{
    // [⚑ v2.0][ CREATE OR UPDATE MANEUVER ][ Modificado: 01/07/2026 ]
    handle_maneuver: async function(req, res)
    {
        let function_name = "handle_maneuver"
        auxFuncModule.logger(function_name, 16, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT via POST -> BODY
        */
        let bodyValues        = req.body
        let newManeuverObject = new maneuverModelItem()

        const man_id                  = auxFuncModule.sanitizeId(bodyValues.man_id)                           ?? null
        const man_client              = auxFuncModule.sanitizeString(bodyValues.man_client)?.toUpperCase()    ?? 'PENDIENTE'
        const man_type                = auxFuncModule.sanitizeString(bodyValues.man_type)?.toUpperCase()      ?? 'PENDIENTE'
        const man_modality            = auxFuncModule.sanitizeString(bodyValues.man_modality)?.toUpperCase()  ?? 'PENDIENTE'
        const man_dispatch_date       = auxFuncModule.sanitizeString(bodyValues.man_dispatch_date)            ?? 'PENDIENTE'
        const man_executive           = auxFuncModule.sanitizeName(bodyValues.man_executive)?.toUpperCase()   ?? 'PENDIENTE'
        const man_agent               = auxFuncModule.sanitizeName(bodyValues.man_agent)?.toUpperCase()       ?? 'PENDIENTE'
        const man_load_location       = auxFuncModule.sanitizeString(bodyValues.man_load_location)            ?? 'PENDIENTE'
        const man_unload_location     = auxFuncModule.sanitizeString(bodyValues.man_unload_location)          ?? 'PENDIENTE'
        const man_extra_location      = auxFuncModule.sanitizeString(bodyValues.man_extra_location)           ?? 'PENDIENTE'
        const man_extra_location_link = auxFuncModule.sanitizeUrl(bodyValues.man_extra_location_link)         ?? 'PENDIENTE'
        const man_eco                 = auxFuncModule.sanitizeString(bodyValues.man_eco)                      ?? 'PENDIENTE'
        const man_operator            = auxFuncModule.sanitizeName(bodyValues.man_operator)?.toUpperCase()    ?? 'PENDIENTE'
        const man_gps_link            = auxFuncModule.sanitizeUrl(bodyValues.man_gps_link)                    ?? 'PENDIENTE'
        const man_transporter         = auxFuncModule.sanitizeString(bodyValues.man_transporter)              ?? 'PENDIENTE'
        const man_moni_enable         = (bodyValues.man_moni_enable === false || bodyValues.man_moni_enable === 'false') ? 'false' : 'true'
        const man_containers          = auxFuncModule.sanitizeContainers(bodyValues.man_containers)
        const man_intermediate_stops  = auxFuncModule.sanitizeStops(bodyValues.man_intermediate_stops)
        const man_route_id            = auxFuncModule.sanitizeId(bodyValues.man_route_id) ?? null
        const man_current_location    = auxFuncModule.sanitizeString(bodyValues.man_current_location)?.toUpperCase() ?? 'SIN INICIAR'
        const man_current_status      = auxFuncModule.sanitizeString(bodyValues.man_current_status)?.toUpperCase()   ?? 'SIN INICIAR'

        newManeuverObject.man_client              = man_client
        newManeuverObject.man_type                = man_type
        newManeuverObject.man_modality            = man_modality
        newManeuverObject.man_dispatch_date       = man_dispatch_date
        newManeuverObject.man_executive           = man_executive
        newManeuverObject.man_agent               = man_agent
        newManeuverObject.man_load_location       = man_load_location
        newManeuverObject.man_unload_location     = man_unload_location
        newManeuverObject.man_extra_location      = man_extra_location
        newManeuverObject.man_extra_location_link = man_extra_location_link
        newManeuverObject.man_eco                 = man_eco
        newManeuverObject.man_operator            = man_operator
        newManeuverObject.man_gps_link            = man_gps_link
        newManeuverObject.man_transporter         = man_transporter

        auxFuncModule.logger(function_name, 61, 1, 1, "[i] Values received and sanitized...")

        /* - Step [2]
        *  - Determine ID: generate new one or use the received one...
        */
        if ((man_id ?? '') === '' || man_id === '0')
        {
            let id_params = [man_operator, man_client, man_dispatch_date]
            newManeuverObject.man_id = auxFuncModule.createId(id_params)
        }else
        {
            newManeuverObject.man_id = man_id
        }

        auxFuncModule.logger(function_name, 75, 2, 1, "[i] Maneuver ID determined: " + newManeuverObject.man_id)

        /* - Step [3]
        *  - Find if maneuver exists and create or update accordingly...
        */
        try
        {
            let man_route = null

            if (man_route_id)
            {
                const customRouteFound = await routeModelItem.findOne({ route_id: man_route_id })
                man_route = customRouteFound ?? null
            }else if (bodyValues.man_route && typeof bodyValues.man_route === 'object' && !Array.isArray(bodyValues.man_route))
            {
                man_route = auxFuncModule.sanitizeObject(bodyValues.man_route)
            }

            auxFuncModule.logger(function_name, 84, 3, 1, "[i] Route resolved via: " + (man_route_id ? "custom route lookup" : (man_route ? "client-provided object" : "none")))

            /* - Step [3.1]
            *  - man_moni_key mirrors the assigned client's client_id, so every maniobra
            *    assigned to the same client shares the same MONI key...
            */
            const clientFound = await clientModelItem.findOne({ client_id: man_client })
            const man_moni_key = clientFound?.client_id ?? 'NO KEY'

            auxFuncModule.logger(function_name, 84, 3, 1, "[i] man_moni_key resolved: " + man_moni_key)

            const maneuverObjectFound = await maneuverModelItem.find({ man_id: newManeuverObject.man_id })

            auxFuncModule.logger(function_name, 89, 4, 1, "[i] Query executed, matches found: " + maneuverObjectFound.length)

            switch (true)
            {
                // Maneuver does not exist -> create it...
                case (maneuverObjectFound.length === 0):
                    newManeuverObject.man_route               = man_route
                    newManeuverObject.man_containers          = man_containers
                    newManeuverObject.man_intermediate_stops  = man_intermediate_stops
                    newManeuverObject.man_moni_enable      = man_moni_enable
                    newManeuverObject.man_note             = ''
                    newManeuverObject.man_update_action    = 'CREATED MANEUVER'
                    newManeuverObject.man_update_source    = 'ADMINISTRATOR'
                    newManeuverObject.man_update_date      = auxFuncModule.timeSnapshot()
                    newManeuverObject.man_reg_date         = auxFuncModule.timeSnapshot()
                    newManeuverObject.man_current_location = man_current_location
                    newManeuverObject.man_current_status   = man_current_status
                    newManeuverObject.man_moni_key         = man_moni_key
                    newManeuverObject.man_progress         = '0%'
                    newManeuverObject.man_events           = [auxFuncModule.timeSnapshot(), man_current_location, man_current_status, newManeuverObject.man_progress]

                    await newManeuverObject.save()

                    auxFuncModule.logger(function_name, 111, 5, 1, "[i] New MANEUVER has been STORED...")
                    return res.status(200).send({ code: '1', message: 'Maniobra almacenada correctamente.' })

                // Maneuver exists -> update it...
                case (maneuverObjectFound.length >= 1):
                    // Optional tracking reset — only applied when the caller explicitly sends
                    // these fields (e.g. the frontend does this when the assigned route
                    // changes, since the old location/status/events no longer correspond to
                    // any point of the new route). Omitted fields leave the stored value
                    // untouched ($set skips `undefined`)...
                    const locationReset = bodyValues.man_current_location !== undefined
                        ? (auxFuncModule.sanitizeString(bodyValues.man_current_location)?.toUpperCase() ?? '')
                        : undefined
                    const statusReset = bodyValues.man_current_status !== undefined
                        ? (auxFuncModule.sanitizeString(bodyValues.man_current_status)?.toUpperCase() ?? '')
                        : undefined
                    const progressReset = bodyValues.man_progress !== undefined
                        ? (auxFuncModule.sanitizeString(bodyValues.man_progress) ?? '0%')
                        : undefined
                    const eventsReset = Array.isArray(bodyValues.man_events) && bodyValues.man_events.length === 0
                        ? []
                        : undefined

                    const updatedManeuver = await maneuverModelItem.findOneAndUpdate(
                        { man_id: newManeuverObject.man_id },
                        {
                            $set: {
                                man_client:              newManeuverObject.man_client,
                                man_type:                newManeuverObject.man_type,
                                man_modality:            man_modality,
                                man_dispatch_date:       newManeuverObject.man_dispatch_date,
                                man_executive:           newManeuverObject.man_executive,
                                man_agent:               newManeuverObject.man_agent,
                                man_load_location:       newManeuverObject.man_load_location,
                                man_unload_location:     newManeuverObject.man_unload_location,
                                man_extra_location:      newManeuverObject.man_extra_location,
                                man_extra_location_link: newManeuverObject.man_extra_location_link,
                                man_eco:                 newManeuverObject.man_eco,
                                man_operator:            newManeuverObject.man_operator,
                                man_gps_link:            newManeuverObject.man_gps_link,
                                man_transporter:         newManeuverObject.man_transporter,
                                man_moni_enable:         man_moni_enable,
                                man_moni_key:            man_moni_key,
                                man_containers:          man_containers,
                                man_intermediate_stops:  man_intermediate_stops,
                                man_route:               man_route !== null ? man_route : undefined,
                                man_current_location:    locationReset,
                                man_current_status:      statusReset,
                                man_progress:            progressReset,
                                man_events:              eventsReset,
                                man_update_action:       'UPDATED MANEUVER',
                                man_update_source:       'ADMINISTRATOR',
                                man_update_date:         auxFuncModule.timeSnapshot()
                            }
                        },
                        { new: false }
                    )

                    if (updatedManeuver)
                    {
                        auxFuncModule.logger(function_name, 149, 5, 1, "[i] Found MANEUVER has been UPDATED...")
                        return res.status(200).send({ code: '1', message: 'Maniobra actualizada correctamente.' })
                    }else
                    {
                        auxFuncModule.logger(function_name, 153, 5, 2, "[e] MANEUVER has NOT been updated...")
                        return res.status(500).send({ code: '-1', message: 'Error al actualizar la maniobra.' })
                    }

                default:
                    auxFuncModule.logger(function_name, 158, 6, 2, "[e] MANEUVER not processed...")
                    return res.status(404).send({ code: '-1', message: 'Datos de la maniobra no encontrados.' })
            }
        }catch(error)
        {
            auxFuncModule.logger(function_name, 163, 7, 3, "[e] Maneuver not processed, PROMISE(S) ERROR...")
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },


    //[⚑ v2.0][ UPDATE MANEUVER CURRENT LOCATION/STATUS ][ Modificado: 01/07/2026 ]
    update_location: async function(req, res)
    {
        let function_name = "update_location"
        auxFuncModule.logger(function_name, 0, 0)

        /* - Step [1]
        *  - Receive and sanitize values from CLIENT via PATCH -> BODY
        */
        const bodyValues           = req.body
        const man_id               = auxFuncModule.sanitizeId(bodyValues.man_id)                  ?? null
        const man_current_location = auxFuncModule.sanitizeString(bodyValues.man_current_location) ?? null
        const man_current_status   = auxFuncModule.sanitizeString(bodyValues.man_current_status)   ?? null

        auxFuncModule.logger(function_name, 1, 1, 1, "[i] Values received and sanitized...")

        /* - Step [2]
        *  - Validate required values before proceeding...
        */
        if (!man_id || !man_current_location || !man_current_status)
        {
            auxFuncModule.logger(function_name, 2, 2, 2, "[e] Missing required values, rejecting request...")
            return res.status(400).send({ code: '-1', message: 'Datos incompletos para actualizar la ubicación.' })
        }

        try
        {
            /* - Step [3]
            *  - Find the maneuver to update...
            */
            const maneuverFound = await maneuverModelItem.findOne({ man_id: man_id })

            if (!maneuverFound)
            {
                auxFuncModule.logger(function_name, 3, 3, 2, "[e] Maneuver not found...")
                return res.status(404).send({ code: '-1', message: 'Maniobra no encontrada.' })
            }

            auxFuncModule.logger(function_name, 3, 3, 1, "[i] Maneuver found, calculating progress...")

            /* - Step [4]
            *  - Resolve the route assigned to this maniobra: prefer the live route (fresh
            *    events/stops, matched by man_route.route_id), then the embedded snapshot
            *    itself (route deleted since linking), then a same origin/destination name
            *    match for legacy maniobras never explicitly linked — same resolution order
            *    the frontend uses (buildPointMap in RutasSeguimiento.jsx)...
            */
            let route = null
            if (maneuverFound.man_route?.route_id)
            {
                route = await routeModelItem.findOne({ route_id: maneuverFound.man_route.route_id })
            }
            if (!route) route = maneuverFound.man_route ?? null
            if (!route)
            {
                route = await routeModelItem.findOne({
                    route_origin:      maneuverFound.man_load_location,
                    route_destination: maneuverFound.man_unload_location
                })
            }

            const routeStops = route?.route_intermediate_stops
            const stops       = Array.isArray(routeStops) && routeStops.length > 0
                ? routeStops
                : (maneuverFound.man_intermediate_stops ?? [])

            const addPointMilestones = (validMilestones, pointName, events) => {
                for (const e of events ?? [])
                {
                    const eventName = e?.event_name ?? ''
                    if (eventName && eventName.toUpperCase() !== 'CANCELADO') validMilestones.add(pointName + '|' + eventName)
                }
            }

            /* - Step [5]
            *  - Build the set of every REAL (point + event) milestone defined by the route,
            *    split by origin/intermediates vs destination, excluding CANCELADO. The full
            *    union is both the denominator (its size) and the whitelist used to validate
            *    history — only genuine route events count towards progress, so a bogus/legacy
            *    entry like the creation snapshot ("SIN INICIAR") can never inflate it...
            */
            const priorMilestones = new Set() // origin + every intermediate stop...
            addPointMilestones(priorMilestones, route?.route_origin, route?.route_origin_events)
            for (const stop of stops) addPointMilestones(priorMilestones, stop.stop_name, stop.stop_events)

            const destinationMilestones = new Set()
            addPointMilestones(destinationMilestones, route?.route_destination, route?.route_destination_events)

            const validMilestones  = new Set([...priorMilestones, ...destinationMilestones])
            const totalRealEvents  = validMilestones.size
            const perEventValue    = totalRealEvents > 0 ? 100 / totalRealEvents : 0

            /* - Step [6]
            *  - This update's event overrides everything: selecting CANCELADO always yields
            *    0% for THIS update (does not permanently block future recalculations).
            *    Otherwise, the progress is the per-event value times the count of DISTINCT
            *    real route milestones reached so far (including this one) — re-saving the same
            *    point/event again, or a non-route event, must not inflate progress. If the
            *    location being updated IS the destination, origin + every intermediate point
            *    are treated as already completed (reaching the destination implies everything
            *    before it happened), so only the destination's own progress still depends on
            *    which of its events have actually been logged...
            */
            const newIsCancelled  = man_current_status.toUpperCase().includes('CANCEL')
            const existingEvents  = maneuverFound.man_events ?? []
            const destinationName = route?.route_destination || maneuverFound.man_unload_location
            const isDestinationUpdate = !!destinationName && man_current_location === destinationName

            let progressPercent = 0
            if (!newIsCancelled && totalRealEvents > 0)
            {
                const reachedMilestones = new Set()

                if (isDestinationUpdate)
                {
                    for (const milestone of priorMilestones) reachedMilestones.add(milestone)
                }

                for (let i = 0; i + 3 < existingEvents.length; i += 4)
                {
                    const pastKey = (existingEvents[i + 1] ?? '') + '|' + (existingEvents[i + 2] ?? '')
                    if (validMilestones.has(pastKey)) reachedMilestones.add(pastKey)
                }
                const newKey = man_current_location + '|' + man_current_status
                if (validMilestones.has(newKey)) reachedMilestones.add(newKey)

                progressPercent = Math.min(100, Math.round(reachedMilestones.size * perEventValue))
            }

            const man_progress = progressPercent + '%'
            const timestamp     = auxFuncModule.timeSnapshot()
            const man_events    = [...existingEvents, timestamp, man_current_location, man_current_status, man_progress]

            /* - Step [7]
            *  - Persist the new location, status, progress and event history. Reaching
            *    100% here means the route is fully complete, so man_finish_date is
            *    stamped in this same update — not on every write, only when progress
            *    hits 100%, so it is never overwritten by a later, unrelated update...
            */
            const updateFields = {
                man_current_location: man_current_location,
                man_current_status:   man_current_status,
                man_progress:         man_progress,
                man_events:           man_events,
                man_update_action:    'UPDATED LOCATION',
                man_update_source:    'ADMINISTRATOR',
                man_update_date:      timestamp
            }

            if (progressPercent === 100) updateFields.man_finish_date = timestamp

            const updatedManeuver = await maneuverModelItem.findOneAndUpdate(
                { man_id: man_id },
                { $set: updateFields },
                { new: false }
            )

            if (updatedManeuver)
            {
                auxFuncModule.logger(function_name, 7, 7, 1, "[i] MANEUVER location updated...")
                return res.status(200).send({ code: '1', message: 'Ubicación actualizada correctamente.', man_progress: man_progress })
            }else
            {
                auxFuncModule.logger(function_name, 7, 7, 2, "[e] MANEUVER location NOT updated...")
                return res.status(500).send({ code: '-1', message: 'Error al actualizar la ubicación.' })
            }
        }catch(error)
        {
            auxFuncModule.logger(function_name, 7, 7, 3, "[e] Maneuver location not processed, PROMISE(S) ERROR...")
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },

    //[⚑ v2.0][ DELETE MANEUVER BY ID ][ Modificado: 01/07/2026 ]
    delete_maneuver: async function(req, res)
    {
        let function_name = "delete_maneuver"
        auxFuncModule.logger(function_name, 0, 0)

        /* - Step [1]
        *  - Receive and sanitize man_id from CLIENT via POST -> BODY
        */
        const bodyValues  = req.body
        const search_id   = auxFuncModule.sanitizeString(bodyValues.man_id) ?? null

        auxFuncModule.logger(function_name, 1, 1, 1, "[i] Input value received and sanitized...")

        /* - Step [2]
        *  - Validate man_id before proceeding...
        */
        if ((search_id ?? '') === '')
        {
            auxFuncModule.logger(function_name, 2, 2, 2, "[e] man_id not valid, rejecting request...")
            return res.status(400).send({ code: '-1', message: 'ID de maniobra no válido.' })
        }

        /* - Step [3]
        *  - Search and delete maneuver by man_id...
        */
        try
        {
            const deletedManeuver = await maneuverModelItem.findOneAndDelete({ man_id: search_id })

            if (!deletedManeuver)
            {
                auxFuncModule.logger(function_name, 3, 3, 2, "[e] Maneuver not found, nothing deleted...")
                return res.status(404).send({ code: '0', message: 'Maniobra no encontrada.' })
            }

            auxFuncModule.logger(function_name, 3, 3, 1, "[i] MANEUVER deleted successfully...")
            return res.status(200).send({ code: '1', message: 'Maniobra eliminada exitosamente.' })
        }
        catch(error)
        {
            auxFuncModule.logger(function_name, 3, 3, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },

    // [⚑ v2.0][ GET ALL MANEUVERS (PAGINATED) ][ Modificado: 01/07/2026 ]
    get_all_maneuvers: async function(req, res)
    {
        let function_name = "get_all_maneuvers"
        auxFuncModule.logger(function_name, 213, 0)

        /* - Step [1]
        *  - Receive and sanitize pagination params from CLIENT via GET -> QUERY
        */
        const queryValues    = req.query
        const requestedPage  = parseInt(queryValues.page, 10)
        const requestedLimit = parseInt(queryValues.limit, 10)
        const page  = Number.isInteger(requestedPage)  && requestedPage  > 0 ? requestedPage  : 1
        const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20
        const skip  = (page - 1) * limit

        auxFuncModule.logger(function_name, 225, 1, 1, "[i] Pagination params received: page=" + page + ", limit=" + limit)

        try
        {
            /* - Step [2]
            *  - Count total maneuvers stored, needed for pagination metadata...
            */
            const totalManeuvers = await maneuverModelItem.countDocuments({})

            auxFuncModule.logger(function_name, 234, 2, 1, "[i] Total maneuvers found: " + totalManeuvers)

            if (totalManeuvers === 0)
            {
                auxFuncModule.logger(function_name, 238, 2, 1, "[i] No maneuvers stored in DB...")
                return res.status(200).send({ code: '0', message: 'No hay maniobras registradas todavía.', maneuvers_data: [], pagination: { page, limit, total: 0, total_pages: 0 } })
            }

            /* - Step [3]
            *  - Query only the requested page, sorted by most recent first...
            */
            const maneuversFound = await maneuverModelItem.find({}).sort({ _id: -1 }).skip(skip).limit(limit).lean()

            auxFuncModule.logger(function_name, 247, 3, 1, "[i] Page query executed, records returned: " + maneuversFound.length)

            return res.status(200).send({
                code: '1',
                maneuvers_data: maneuversFound,
                pagination: { page, limit, total: totalManeuvers, total_pages: Math.ceil(totalManeuvers / limit) }
            })
        }catch(error)
        {
            auxFuncModule.logger(function_name, 256, 4, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },

    // [⚑ v1.0][ GET MANEUVERS BY MONITOR KEY (READ ONLY, PUBLIC) ][ Creado: 07/07/2026 ]
    get_maneuvers_by_key: async function(req, res)
    {
        let function_name = "get_maneuvers_by_key"
        auxFuncModule.logger(function_name, 0, 0)

        /* - Step [1]
        *  - FIRST LINE OF DEFENSE: reject anything that is not a plain string.
        *    Express turns query params like ?key[$ne]=x into an OBJECT, so this
        *    check alone blocks NoSQL operator injection before it reaches sanitizeId...
        */
        const rawKey = req.query.key

        if (typeof rawKey !== 'string')
        {
            auxFuncModule.logger(function_name, 0, 1, 2, "[e] key param missing or not a string, rejecting request...")
            return res.status(400).send({ code: '-1', message: 'Llave no válida.' })
        }

        /* - Step [2]
        *  - Sanitize with the official ID sanitizer (allowlist [a-zA-Z0-9_-], max 100).
        *    Anything outside the allowlist is stripped; an empty or placeholder
        *    result is treated as a rejected key...
        */
        const cleanKey = auxFuncModule.sanitizeId(rawKey)

        if (!cleanKey || cleanKey === 'NO KEY')
        {
            auxFuncModule.logger(function_name, 0, 2, 2, "[e] key sanitized to empty/placeholder, rejecting request...")
            return res.status(400).send({ code: '-1', message: 'Llave no válida.' })
        }

        auxFuncModule.logger(function_name, 0, 2, 1, "[i] Key received and sanitized...")

        try
        {
            /* - Step [3]
            *  - Query by EQUALITY ONLY against the already-sanitized value. Never
            *    $where, never a regex built from input, never request objects
            *    inside the filter. Projection excludes man_moni_key so the key
            *    never travels back in the response...
            */
            const maneuversFound = await maneuverModelItem.find(
                { man_moni_key: cleanKey, man_moni_enable: 'true' },
                { man_moni_key: 0 }
            ).sort({ _id: -1 }).lean()

            auxFuncModule.logger(function_name, 0, 3, 1, "[i] Query executed, matches found: " + maneuversFound.length)

            if (maneuversFound.length === 0)
            {
                return res.status(200).send({ code: '0', message: 'Llave sin maniobras activas o inválida.', maneuvers_data: [] })
            }

            /* - Step [4]
            *  - man_moni_key mirrors the assigned client's client_id (see
            *    handle_maneuver), so cleanKey doubles as the client lookup key.
            *    man_client is stored as that same client_id — swap it here for
            *    the human-readable client_name so the read-only portal never
            *    shows the raw id. Falls back to the stored value if the client
            *    record is missing so the response never breaks...
            */
            const clientFound = await clientModelItem.findOne({ client_id: cleanKey }, { client_name: 1 }).lean()

            if (clientFound?.client_name)
            {
                for (const maneuver of maneuversFound) maneuver.man_client = clientFound.client_name
            }

            /* - Step [5]
            *  - man_transporter is stored as the assigned transporter's
            *    transporter_id, same pattern as man_client above. Each maniobra
            *    can have a different transporter, so resolve every distinct id
            *    found in this batch in a single query instead of the raw id
            *    ever reaching the read-only portal...
            */
            const transporterIds = [...new Set(maneuversFound.map((m) => m.man_transporter).filter(Boolean))]

            if (transporterIds.length > 0)
            {
                const transportersFound = await transporterModelItem.find(
                    { transporter_id: { $in: transporterIds } },
                    { transporter_id: 1, transporter_name: 1 }
                ).lean()

                const transporterNameById = new Map(transportersFound.map((t) => [t.transporter_id, t.transporter_name]))

                for (const maneuver of maneuversFound)
                {
                    const resolvedName = transporterNameById.get(maneuver.man_transporter)
                    if (resolvedName) maneuver.man_transporter = resolvedName
                }
            }

            return res.status(200).send({ code: '1', maneuvers_data: maneuversFound })
        }catch(error)
        {
            auxFuncModule.logger(function_name, 0, 4, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },

    // [⚑ v2.0][ GET MANEUVER STATS BY DATE RANGE ][ Modificado: 02/07/2026 ]
    get_maneuver_stats: async function(req, res)
    {
        let function_name = "get_maneuver_stats"
        auxFuncModule.logger(function_name, 0, 0)

        /* - Step [1]
        *  - Receive and validate optional date range params from CLIENT via GET -> QUERY
        */
        const queryValues = req.query
        const dateRegex    = /^\d{4}-\d{2}-\d{2}$/
        const date_from    = queryValues.date_from
        const date_to      = queryValues.date_to

        if ((date_from && !dateRegex.test(date_from)) || (date_to && !dateRegex.test(date_to)))
        {
            auxFuncModule.logger(function_name, 0, 1, 2, "[e] Invalid date format received...")
            return res.status(400).send({ code: '-1', message: 'Formato de fecha inválido, use YYYY-MM-DD.' })
        }
        if (date_from && date_to && date_from > date_to)
        {
            auxFuncModule.logger(function_name, 0, 1, 2, "[e] Invalid date range, date_from > date_to...")
            return res.status(400).send({ code: '-1', message: 'El rango de fechas es inválido.' })
        }

        const dateFilter = {}
        if (date_from) dateFilter.$gte = date_from
        if (date_to)   dateFilter.$lte = date_to
        const baseMatch = Object.keys(dateFilter).length > 0 ? { man_dispatch_date: dateFilter } : {}

        auxFuncModule.logger(function_name, 0, 1, 1, "[i] Date range validated: date_from=" + date_from + ", date_to=" + date_to)

        try
        {
            /* - Step [2]
            *  - Compute aggregated counts directly in DB, no documents transferred...
            */
            const [total, canceladas, sinIniciar] = await Promise.all([
                maneuverModelItem.countDocuments(baseMatch),
                maneuverModelItem.countDocuments({ ...baseMatch, man_current_status: { $regex: /cancel/i } }),
                maneuverModelItem.countDocuments({ ...baseMatch, man_current_status: { $not: /cancel/i }, man_progress: '0%' }),
            ])
            const activas = total - canceladas - sinIniciar

            auxFuncModule.logger(function_name, 0, 2, 1, "[i] Stats calculados: total=" + total + " activas=" + activas + " sin_iniciar=" + sinIniciar + " canceladas=" + canceladas)
            return res.status(200).send({ code: '1', stats: { total, activas, sin_iniciar: sinIniciar, canceladas } })
        }
        catch (error)
        {
            auxFuncModule.logger(function_name, 0, 3, 3, "[e] Promise error: " + error.message)
            return res.status(500).send({ code: '-1', message: 'Error al procesar los datos en el servidor.' })
        }
    },

//#endregion [ v1.2 CONTROLLER ]

}

module.exports = controller

/*
function processEvent(location, event) 
{
    const event_time = auxFuncModule.timeSnapshot()

    let updatedEvent 
    switch (true) 
    {
        case location === 'SIN INICIAR':
            updatedEvent = [event_time,'SIN INICIAR','SIN INICIAR','0%']
        break;

        case location === 'ASLA' && event === 'EN ESPERA':
            updatedEvent = [event_time,'ASLA','EN ESPERA','25%']
        break;

        case location === 'ASLA' && event === 'LLAMADO':
            updatedEvent = [event_time,'ASLA','LLAMADO','30%']
        break;

        case location === 'ASLA' && event === 'CANCELADO':
            updatedEvent = [event_time,'ASLA','CANCELADO','0%']
        break;

        case location === 'ASLA' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'ASLA','EVENTO EXTRA','-']
        break;

        case location === 'EN RUTA' && event === 'EN RUTA A TERMINAL':
            updatedEvent = [event_time,'EN RUTA','EN RUTA A TERMINAL','40%']
        break;

        case location === 'EN RUTA' && event === 'EN RUTA A PATIO':
            updatedEvent = [event_time,'EN RUTA','EN RUTA A PATIO','85%']
        break;

        case location === 'EN RUTA' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN RUTA','EVENTO EXTRA','-']
        break;

        case location === 'EN RUTA' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN RUTA','EVENTO EXTRA','-']
        break;

        case location === 'EN TERMINAL' && event === 'ESPERANDO A SER CARGADO':
            updatedEvent = [event_time,'EN TERMINAL','ESPERANDO A SER CARGADO','50%']
        break;

        case location === 'EN TERMINAL' && event === 'CONTENEDORES CARGADOS':
            updatedEvent = [event_time,'EN TERMINAL','CONTENEDORES CARGADOS','75%']
        break;

        case location === 'EN TERMINAL' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN TERMINAL','EVENTO EXTRA','-']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'SIN MODULAR':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','SIN MODULAR','80%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'VERDE':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','VERDE','85%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'AMARILLO':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','AMARILLO','82%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'ROJO':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','ROJO','0%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','EVENTO EXTRA','-']
        break;

        case location === 'EN PATIO' && event === 'ESPERANDO A SER DESCARGADO':
            updatedEvent = [event_time,'EN PATIO','ESPERANDO A SER DESCARGADO','90%']
        break;

        case location === 'EN PATIO' && event === 'FINALIZADO':
            updatedEvent = [event_time,'EN PATIO','FINALIZADO','100%']
        break;

        case location === 'EN PATIO' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN PATIO','EVENTO EXTRA','-']
        break;
    }
    return updatedEvent
}*/
