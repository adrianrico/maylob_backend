'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be created first in DB...!
 */
var clientSchema = schema({
    client_id: String,
    client_name: String,
    client_priority:String,
    client_registration:String,
    client_status:String
})

module.exports = mongoose.model('client',clientSchema)