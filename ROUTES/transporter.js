'use strict'

var express = require('express')

var transporterController = require('../CONTROLLERS/transporter')
var router = express.Router()

//#region [ TRANSPORTER ROUTES ]

// Create or update object...
router.post('/transporter/',transporterController.handle_transporter)
router.post('/operator/',transporterController.handle_operator)
router.post('/eco/',transporterController.handle_eco)

// Read objects...
router.get('/transporter/',transporterController.read_transporters)

// Delete objects...
router.delete('/transporter/',transporterController.delete_transporter)

//#endregion [ TRANSPORTER ROUTES ]

module.exports = router