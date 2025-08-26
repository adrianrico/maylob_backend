'use strict'

var express = require('express')

var maneuverController = require('../CONTROLLERS/maneuver')
const { model } = require('mongoose')

var router = express.Router()

//#region [ CONTROLLER ROUTES ]

// [v1.0.4] POST ROUTES...
router.post('/addManeuver/',maneuverController.addManeuver) // Deprecated...
router.post('/saveNewManeuver/',maneuverController.saveNewManeuver)
router.post('/deleteManeuver/',maneuverController.deleteManeuver)

// [v1.0.4] UPDATE ROUTES... 
router.patch('/updateManeuver/',maneuverController.updateManeuver)
router.patch('/updateManeuverEvents/',maneuverController.updateManeuverEvents)
router.patch('/updateManeuverGPS/',maneuverController.updateManeuverGPS)
router.patch('/updateTrackingLink/',maneuverController.updateTrackingLink)
router.patch('/updateNote/',maneuverController.updateNote)
router.patch('/updateMoniStatus/',maneuverController.updateMoniStatus)
router.patch('/updateManeuvers/',maneuverController.updateManeuvers)

// [v1.0.4] GET ROUTES...
router.get('/findManeuver/',maneuverController.findManeuver)
router.get('/getGPS/',maneuverController.getGPS)
router.get('/getClientManeuvers',maneuverController.getClientManeuvers)
router.get('/getAllManeuvers',maneuverController.getAllManeuvers)

//#endregion [ CONTROLLER ROUTES ]

module.exports = router