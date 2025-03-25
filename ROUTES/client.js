'use strict'

var express = require('express')

var clientController = require('../CONTROLLERS/client')
const { model } = require('mongoose')

var router = express.Router()

//#region [ CLIENT ROUTES ]

// CREATE new client...
router.post('/createClient/',clientController.create_client)

// READ all clients...
router.get('/readClients/',clientController.read_clients)

//#endregion [ CLIENT ROUTES ]

module.exports = router