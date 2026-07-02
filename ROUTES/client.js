'use strict'

var express = require('express')

var clientController = require('../CONTROLLERS/client')
var router = express.Router()

//#region [ CLIENT ROUTES ]

// Create or update object...
router.post('/client/',clientController.handle_client)

// Read objects...
router.get('/client/',clientController.read_clients)

// Delete objects...
router.delete('/client/',clientController.delete_client)

//#endregion [ CLIENT ROUTES ]

module.exports = router