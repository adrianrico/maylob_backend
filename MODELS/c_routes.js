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
    route_origin: String,
    route_origin_events:{
        type:[Object],
        default:[]
    },
    route_destination: String,
    route_destination_events:{
        type:[Object],
        default:[]
    },
    route_intermediate_points: String,
    route_intermediate_events:{
        type:[Object],
        default:[]
    },
    route_intermediate_stops:{
        type:[Object],
        default:[]
    },

})

module.exports = mongoose.model('routes',objectSchema)