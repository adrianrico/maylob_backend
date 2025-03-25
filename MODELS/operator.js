'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be created first in DB...!
 */
var operatorSchema = schema({
    operator_name: String,
    operator_curp: String,
    operator_rfc: String,
    operator_nss: String,
    operator_license: String,
    operator_address: String,
    operator_affiliation: String,
    operator_status:String,
    operator_registration:String
})

module.exports = mongoose.model('operator',operatorSchema)