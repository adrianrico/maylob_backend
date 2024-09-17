'use strict'

var mongoose    = require('mongoose')
var app         = require('./app')
var port        = 8080

// DATABASE CONNECTION...
mongoose.Promise= global.Promise

// [!] - Uncomment following line to use with release version...!
mongoose.connect('mongodb+srv://maylobcontrol:HzZf2OWCKGMzpJAz@maylobdb.u424k.mongodb.net/?retryWrites=true&w=majority&appName=maylobDB')

// [!] - Uncomment following line to use ONLY with local DB for tests...!
//mongoose.connect('mongodb://127.0.0.1:27017/db_maylob')
    .then(()=>{
        console.log("[⚑][SERVER] - Conexión a BD: ok")
        app.listen(port,()=>{
            console.log("[⚑][SERVER] - Corriendo en puerto: "+port)
        })
    })
    .catch(err => console.log(err))
