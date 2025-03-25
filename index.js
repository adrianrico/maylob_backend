'use strict'

var mongoose    = require('mongoose')
var app         = require('./app')
var port        = 8080

// [1] DATABASE CONNECTION PROMISE ONLY...
mongoose.Promise= global.Promise

// [2] DATABASE CONNECTION TO ONLINE SERVER... 
mongoose.connect('mongodb+srv://maylobcontrol:HzZf2OWCKGMzpJAz@maylobdb.u424k.mongodb.net/?retryWrites=true&w=majority&appName=maylobDB')
    .then(()=>{
        console.log("[⚑][SERVER] - Conexión a BD: ok")
        app.listen(port,()=>{
            console.log("[⚑][SERVER] - Corriendo en puerto: "+port)
        })
    })
    .catch(err => console.log(err))
