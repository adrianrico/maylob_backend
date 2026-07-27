'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/* - DATABASE MODEL
*  - Actual collections fields to be used in DB...
*  - MONGO collection must be created first in DB...!
*/
var maneuverSchema= schema({
    man_id: String,
    man_client:String,
    man_type:String,
    man_dispatch_date: String,
    man_finish_date:String,
    man_agent:String,
    man_executive:String,
    man_load_location:String,
    man_unload_location:String,
    man_extra_location:String,
    man_extra_location_link:String,
    man_eco:String,
    man_operator:String,
    man_gps_link:String,
    man_transporter:String,
    man_note:String,
    man_moni_enable:String,
    man_moni_key:String,
    man_update_action:String,
    man_update_source:String,
    man_update_date:String,
    man_reg_date:String,
    man_modality:String,
    man_current_location:String,
    man_current_status:String,
    man_progress: {
        type: String,
        default: '0%'
    },
    man_events:{
        type:[Object],
        default:[]
    },
    man_containers:{
    type:[Object],
    default:[]
    },
    man_intermediate_stops:{
    type:[Object],
    default:[]
    },
    man_route:{
        type:Object,
        default:null
    }
})

module.exports = mongoose.model('maneuver',maneuverSchema)