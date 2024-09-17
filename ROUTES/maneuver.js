'use strict'

var express = require('express')

var maneuverController = require('../CONTROLLERS/maneuver')
const { model } = require('mongoose')

var router = express.Router()

//#region [ CONTROLLER ROUTES ]

// Add new maneuver...
router.post('/addManeuver/',maneuverController.addManeuver)

// Find maneuver by ID...
router.get('/findManeuver/',maneuverController.findManeuver)

// Update maneuver by ID... 
router.patch('/updateManeuver/',maneuverController.updateManeuver)

// Update maneuver GPS by ID... 
router.patch('/updateManeuverGPS/',maneuverController.updateManeuverGPS)

// Get maneuver GPS by ID... 
router.get('/getGPS/',maneuverController.getGPS)

// Get available maneuvers based on the equipment...
router.get('/getManeuvers',maneuverController.getManeuvers)

// Get all maneuvers...
router.get('/getAllManeuvers',maneuverController.getAllManeuvers)

//#endregion [ CONTROLLER ROUTES ]

module.exports = router