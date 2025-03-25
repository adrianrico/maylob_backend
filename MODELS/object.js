'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be created first in DB...!
 */
var objectSchema= schema({
    object_id: String,
    object_owner: String,
    object_type: String,
    object_number: String,
    object_plates: String,
    object_year:String,
    object_color:String,
    object_serialNo:String,
    object_motorNo:String,
    object_insurance_company:String,
    object_insurance_policyNo:String,
    object_priority:String,
    object_available: String,
    object_requested:String,
    object_maneuver_id:String,
    object_registration:String,
})

module.exports = mongoose.model('object',objectSchema)