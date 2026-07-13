'use strict'

var express     = require('express')
var bodyParser  = require('body-parser')
var cors        = require('cors')
var rateLimit   = require('express-rate-limit')
var ipKeyGenerator = rateLimit.ipKeyGenerator

var app = express()

//⚑ Routes files includes...
var client_routes      = require('./ROUTES/client')
var transporter_routes = require('./ROUTES/transporter')
var c_routes_routes    = require('./ROUTES/c_routes')
var maneuver_routes    = require('./ROUTES/maneuver')

//⚑ MIDDLEWARE...
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(cors()) //CORS added to enable external client and server integration...!

//⚑ Rate limit for the public, unauthenticated MONI KEY lookup (TIL TRACKER).
//  The client is expected to poll this endpoint once every 10 seconds, so
//  only one request per key per 10s window is allowed - anything faster is
//  throttled. Keyed by the moni key itself (not just IP) so legitimate
//  clients sharing a NAT/proxy don't share one quota, and so unauthenticated
//  requests without a usable key still fall back to a safe per-IP key...
var monitorRateLimiter = rateLimit({
    windowMs: 10 * 1000,
    limit: 1,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: function(req, res)
    {
        var key = req.query.key
        return (typeof key === 'string' && key.length > 0) ? key : ipKeyGenerator(req.ip)
    },
    message: { code: '-1', message: 'Demasiadas solicitudes, intenta de nuevo en 10 segundos.' }
})
app.use('/maneuvers/monitor/', monitorRateLimiter)

//⚑ Health check for Render (uptime/liveness probe)...
app.get('/health',function(req, res){
    res.status(200).json({ status: 'ok' })
})

//⚑ Routes to be called from clients requests...
app.use('/clients/',client_routes)
app.use('/transporters/',transporter_routes)
app.use('/maneuvers/',maneuver_routes)
app.use('/routes/',c_routes_routes)

// Export module...
module.exports = app