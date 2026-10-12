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
    // Legacy (pre-stepper) fields, still present on older stored routes. Kept in the
    // schema so find() returns them and normalizeLegacyRoute can rebuild the stepper shape...
    route_origin_events:       { type: [Object], default: undefined },
    route_destination_events:  { type: [Object], default: undefined },
    route_intermediate_events: { type: [Object], default: undefined },
    route_intermediate_stops:  { type: [Object], default: undefined },

})

module.exports = mongoose.model('routes',objectSchema)