'use strict'

var express = require('express')

var objectController = require('../CONTROLLERS/object')
const { model } = require('mongoose')

var router = express.Router()

//#region [ CONTROLLER ROUTES ]

// Add new object...
router.post('/addObject',objectController.addObject)

// Read one object only...
router.post('/getObject/', objectController.getObject)

// Read all objects...
router.get('/readAllObjects',objectController.readAllObjects)

// Update one object...
router.patch('/updateObject/',objectController.updateObject)

// Delete one object...
router.delete('/deleteObject/',objectController.deleteObject)

// Get only AVAILABLE OBJECTS...
router.get('/getAvailableObjects',objectController.getAvailableObjects)

//#endregion [ CONTROLLER ROUTES ]

module.exports = router