'use strict'

var express = require('express')

var operatorAuthController = require('../CONTROLLERS/operatorAuth')
var router = express.Router()

//#region [ OPERATOR AUTH ROUTES ][ TIL OPERATOR portal ]

router.post('/login', operatorAuthController.login)

//#endregion [ OPERATOR AUTH ROUTES ]

module.exports = router
