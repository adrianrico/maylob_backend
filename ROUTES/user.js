'use strict'

var express = require('express')

var userController = require('../CONTROLLERS/user')
const { model } = require('mongoose')

var router = express.Router()

//#region [ CONTROLLER ROUTES ]

// Add new user...
router.post('/addUser/', userController.addUser)

// Get user modules...
router.get('/getUserModules/', userController.getUserModules)

//#endregion [ CONTROLLER ROUTES ]

module.exports = router