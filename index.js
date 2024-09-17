'use strict'

var mongoose    = require('mongoose')
var app         = require('./app')
var port        = 8080

//[1] Conexión a la base de datos...
mongoose.Promise= global.Promise
mongoose.connect('mongodb://127.0.0.1:27017/db_maylob')
        .then(()=>{
            console.log("[⚑][SERVER] - Conexión a BD: ok")

            //Si la conexión a la BD es exitosa, entonces crear el servidor...
            app.listen(port,()=>{
                console.log("[⚑][SERVER] - Corriendo en puerto: "+port)
            })
        })
        .catch(err => console.log(err))