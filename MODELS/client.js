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
    client_phone:String,
    client_email:String,
    client_last_update:String,
    client_status:String,
    client_man_key:String
})

module.exports = mongoose.model('client',clientSchema)