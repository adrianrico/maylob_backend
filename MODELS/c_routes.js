'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be created first in DB...!
 */
var objectSchema= schema({
    route_id: String,
    route_name: String,
    route_category: String,
    route_origin: {
        type: Object,
        default: null
    },
    route_intermediate_points: {
        type: [Object],
        default: []
    },
    route_destination: {
        type: Object,
        default: null
    },

})

module.exports = mongoose.model('routes',objectSchema)