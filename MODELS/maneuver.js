'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/* - DATABASE MODEL
*  - Actual collections fields to be used in DB...
*  - MONGO collection must be created first in DB...!
*/
var maneuverSchema= schema({
    man_folio: String,
    man_cliente:String,
    man_modalidad:String,
    man_despacho: String,
    man_termino:String,
    man_aa:String,
    man_ejecutiva:String,
    man_terminal:String,
    man_descarga:String,
    man_descarga_extraLocation:String,
    man_eco:String,
    man_operador:String,
    man_gpsLink:String,
    man_transportista:String,
    man_note:String,
    manCont_1_id:String,
    manCont_1_size:String,
    manCont_1_contenido:String,
    manCont_1_peso:String,
    manCont_1_tipo:String,
    manCont_2_id:String,
    manCont_2_size:String,
    manCont_2_contenido:String,
    manCont_2_peso:String,
    manCont_2_tipo:String,
    manCont_3_id:String,
    manCont_3_size:String,
    manCont_3_contenido:String,
    manCont_3_peso:String,
    manCont_3_tipo:String,
    manCont_4_id:String,
    manCont_4_size:String,
    manCont_4_contenido:String,
    manCont_4_peso:String,
    manCont_4_tipo:String,
    man_placas:String,
    man_caat:String,
    man_moni_enable:String,
    man_moni_key:String,
    maneuver_update_action:String,
    maneuver_update_source:String,
    maneuver_update_date:String,
    maneuver_directive:String,
    maneuver_current_location:String,
    maneuver_current_status:String,
    maneuver_events:{
        type:[String],
        default:[]
    },
    maneuver_equipment:{
        type:[String],
        default:[]
    },
    maneuver_containers:{
        type:[String],
        default:[]
    }
    
})

module.exports = mongoose.model('maneuver',maneuverSchema)