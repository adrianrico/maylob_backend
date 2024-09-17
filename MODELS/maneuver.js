'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be creaated first in DB...!
 */
var maneuverSchema= schema({
    maneuver_id: String,
    maneuver_type:String,
    maneuver_size: Number,
    maneuver_origin:String,
    maneuver_destination:String,
    maneuver_customer: String,
    maneuver_operator:String,
    maneuver_planned_date: String,
    maneuver_tracking_link:String,
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