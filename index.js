'use strict'

require('dotenv').config()

var mongoose    = require('mongoose')
var app         = require('./app')

var isLocal  = process.env.APP_ENV === 'local'
// Render (y la mayoría de PaaS) inyectan su propio PORT en runtime; hay que
// respetarlo en producción en vez de depender solo de PORT_PRODUCTION...
var port     = isLocal ? process.env.PORT_LOCAL : (process.env.PORT || process.env.PORT_PRODUCTION)
var mongoUri = isLocal ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI_PRODUCTION

if (!mongoUri) {
    console.error(`[⚑][SERVER] - Falta MONGO_URI_${isLocal ? 'LOCAL' : 'PRODUCTION'} en las variables de entorno (APP_ENV=${process.env.APP_ENV})`)
    process.exit(1)
}

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
