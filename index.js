'use strict'

require('dotenv').config()

var mongoose    = require('mongoose')
var app         = require('./app')

var isLocal  = process.env.APP_ENV === 'local'
var port     = isLocal ? process.env.PORT_LOCAL : process.env.PORT_PRODUCTION
var mongoUri = isLocal ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI_PRODUCTION

// [1] DATABASE CONNECTION PROMISE ONLY...
mongoose.Promise= global.Promise

// [2] DATABASE CONNECTION (según APP_ENV: local | production)...
mongoose.connect(mongoUri)
    .then(()=>{
        console.log(`[⚑][SERVER] - Conexión a BD (${process.env.APP_ENV}): ok`)
        app.listen(port,()=>{
            console.log("[⚑][SERVER] - Corriendo en puerto: "+port)
        })
    })
    .catch(err => console.log(err))
