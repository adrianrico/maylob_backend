'use strict'

var express     = require('express')
var bodyParser  = require('body-parser')
var cors        = require('cors')

var app = express()

var object_routes      = require('./ROUTES/object')
var maneuver_routes    = require('./ROUTES/maneuver')
var user_routes        = require('./ROUTES/user')
var client_routes      = require('./ROUTES/client')
var operator_routes    = require('./ROUTES/operator')
var transporter_routes = require('./ROUTES/transporter')

// MIDDLEWARE 
// CORS added to enable external client and server integration...
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(cors()) //CORS...!

// ROUTES
app.use('/',object_routes)
app.use('/man/',maneuver_routes) 
app.use('/user/',user_routes) 
app.use('/client/',client_routes) 
app.use('/',operator_routes) 
app.use('/',transporter_routes) 

// Export module...
module.exports = app