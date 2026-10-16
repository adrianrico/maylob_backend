'use strict'

/**
 * @file Modelos (esquemas) de Mongoose: la forma en que se guardan los datos.
 * @module infrastructure/persistence/models
 *
 * Esto es INFRAESTRUCTURA: sólo los repositorios deben importar estos modelos.
 * Los servicios de aplicación nunca los tocan directamente.
 *
 * Notas de seguridad:
 *  - `strict` (por defecto) descarta campos no declarados → evita "mass assignment".
 *  - `index: true` en los campos de búsqueda acelera consultas y reduce el costo
 *    de un intento de denegación de servicio por consultas lentas.
 *  - Los esquemas `Object`/`[Object]` son flexibles por compatibilidad con datos
 *    históricos; su contenido ya llega saneado desde `domain/sanitizers`.
 */

const mongoose = require('mongoose')
const { Schema } = mongoose

/** Clientes. `client_man_key` es la llave pública de monitoreo (MONI). */
const Client = mongoose.model('client', new Schema({
    client_id:          { type: String, index: true },
    client_name:        String,
    client_phone:       String,
    client_email:       String,
    client_last_update: String,
    client_status:      String,
    client_man_key:     { type: String, index: true },
}))

/** Rutas personalizadas (origen → intermedios → destino, con eventos por punto). */
const Route = mongoose.model('routes', new Schema({
    route_id:       { type: String, index: true },
    route_name:     String,
    route_category: String,
    route_origin:              { type: Object,   default: null },
    route_intermediate_points: { type: [Object], default: [] },
    route_destination:         { type: Object,   default: null },
    // Campos heredados (antes del "stepper"). Se conservan para poder leer rutas viejas.
    route_origin_events:       { type: [Object], default: undefined },
    route_destination_events:  { type: [Object], default: undefined },
    route_intermediate_events: { type: [Object], default: undefined },
    route_intermediate_stops:  { type: [Object], default: undefined },
}))

/** Maniobras (viajes) con su historial de eventos y avance. */
const Maneuver = mongoose.model('maneuver', new Schema({
    man_id:                  { type: String, index: true },
    man_client:              String,
    man_type:                String,
    man_dispatch_date:       String,
    man_finish_date:         String,
    man_agent:               String,
    man_executive:           String,
    man_load_location:       String,
    man_unload_location:     String,
    man_extra_location:      String,
    man_extra_location_link: String,
    man_eco:                 String,
    man_operator:            String,
    man_operator_id:         { type: String, index: true },
    man_gps_link:            String,
    man_transporter:         String,
    man_note:                String,
    man_moni_enable:         String,
    man_moni_key:            { type: String, index: true },
    man_update_action:       String,
    man_update_source:       String,
    man_update_by_curp:      String,
    man_update_date:         String,
    man_reg_date:            String,
    man_modality:            String,
    man_current_location:    String,
    man_current_status:      String,
    man_progress:            { type: String, default: '0%' },
    man_events:              { type: [Object], default: [] },
    man_containers:          { type: [Object], default: [] },
    man_intermediate_stops:  { type: [Object], default: [] },
    man_route:               { type: Object, default: null },
}))

/** Transportistas, con sus operadores y su equipo (ECOs) embebidos. */
const Transporter = mongoose.model('transporter', new Schema({
    transporter_id:           { type: String, index: true },
    transporter_name:         String,
    transporter_caat:         String,
    transporter_priority:     String,
    transporter_registration: String,
    transporter_equipment:    { type: [Object], default: [] },
    transporter_operators:    { type: [Object], default: [] },
}))

module.exports = { Client, Route, Maneuver, Transporter }
