'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be created first in DB...!
 */
var transporterSchema= schema({
    transporter_id: String,
    transporter_name:String,
    transporter_caat:String,
    transporter_priority: String,
    transporter_registration: String,
    transporter_equipment:{
        type:[Object],
        default:[]
    },
    transporter_operators:{
        type:[Object],
        default:[]
    },
})

module.exports = mongoose.model('transporter',transporterSchema)