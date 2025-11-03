'use strict'

var express = require('express')

var operatorController = require('../CONTROLLERS/operator')
const { model } = require('mongoose')

var router = express.Router()

//#region [ OPERATOR ROUTES ]

// CREATE new OPERATOR...
router.post('/createOperator/',operatorController.create_operator)

// READ all OPERATOR...
router.get('/readOperators/',operatorController.read_operator)

//#endregion [ OPERATOR ROUTES ]

module.exports = router