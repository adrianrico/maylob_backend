'use strict'

var express = require('express')

var maneuverController = require('../CONTROLLERS/maneuver')
var router = express.Router()

//#region [ CONTROLLER ROUTES ]

// [⚑ v2.0][ MANEUVER ROUTES ][ Modificado: 01/07/2026 ]
router.get('/maneuver/', maneuverController.get_all_maneuvers)
router.post('/maneuver/', maneuverController.handle_maneuver)
router.delete('/maneuver/', maneuverController.delete_maneuver)
router.patch('/updateLocation/', maneuverController.update_location)
router.get('/stats/', maneuverController.get_maneuver_stats)

//#endregion [ CONTROLLER ROUTES ]

module.exports = router
