'use strict'

var express = require('express')

var operatorController = require('../CONTROLLERS/operator')
var router = express.Router()

//#region [ OPERATOR ROUTES ]

// CREATE new OPERATOR...
router.post('/createOperator/',operatorController.create_operator)

// READ OPERATOR(S)...
router.post('/readOperator/',operatorController.read_operator)

//#endregion [ OPERATOR ROUTES ]

module.exports = router