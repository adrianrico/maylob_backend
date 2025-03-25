'use strict'

var express = require('express')

var transporterController = require('../CONTROLLERS/transporter')
const { model } = require('mongoose')

var router = express.Router()

//#region [ TRANSPORTER ROUTES ]

// CREATE new TRANSPORTER...
router.post('/createTransporter/',transporterController.create_transporter)

// READ all TRANSPORTER...
//router.get('/readTransporters/',transporterController.read_transporters)
router.post('/readTransporters/',transporterController.read_transporters)

//#endregion [ TRANSPORTER ROUTES ]

module.exports = router