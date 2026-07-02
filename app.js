'use strict'

var express     = require('express')
var bodyParser  = require('body-parser')
var cors        = require('cors')

var app = express()

//⚑ Routes files includes...
var client_routes      = require('./ROUTES/client')
var transporter_routes = require('./ROUTES/transporter')
var c_routes_routes    = require('./ROUTES/c_routes')
var maneuver_routes    = require('./ROUTES/maneuver')

//⚑ MIDDLEWARE... 
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(cors()) //CORS added to enable external client and server integration...!

//⚑ Routes to be called from clients requests...
app.use('/clients/',client_routes)
app.use('/transporters/',transporter_routes)  
app.use('/maneuvers/',maneuver_routes) 
app.use('/routes/',c_routes_routes)

// Export module...
module.exports = app