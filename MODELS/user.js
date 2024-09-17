'use strict'

var mongoose = require('mongoose')

var schema = mongoose.Schema

/** - DATABASE MODEL
 *  - Actual collections fields to be used in DB...
 *  - MONGO collection must be creaated first in DB...!
 */
var userSchema= schema({
    user_email: String,
    user_name:String,
    user_phone:String,
    user_priority: Number,
    user_privilege: Number,
    user_modules:{
        type:[String],
        default:[]
    }
})

module.exports = mongoose.model('user',userSchema)