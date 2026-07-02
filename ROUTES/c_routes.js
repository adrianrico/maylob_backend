'use strict'

var express = require('express')

var c_routeController = require('../CONTROLLERS/c_routes')
var router = express.Router()

//#region [ CONTROLLER ROUTES ]

// Create new route...
router.post('/route',c_routeController.handle_route)

// Read all routes...
router.get('/route',c_routeController.read_custom_routes)

// Delete one route...
router.delete('/route/',c_routeController.delete_route)

//#endregion [ CONTROLLER ROUTES ]

module.exports = router