'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be creaated first in DB...!
 */
var objectSchema= schema({
    object_owner: String,
    object_priority:Number,
    object_type: String,
    object_id: String,
    object_plates: String,
    object_available: Number,
    object_requested:Number,
    object_maneuver_id:String
})

module.exports = mongoose.model('object',objectSchema)