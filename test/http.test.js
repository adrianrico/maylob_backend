'use strict'

/**
 * Pruebas de INTEGRACIÓN HTTP con repositorios en memoria (no requieren MongoDB).
 * Verifican, sobre todo, los controles de SEGURIDAD de la API.
 * Ejecutar: `npm test`
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { loadEnv } = require('../src/config/env')
const { buildServices } = require('../src/container')
const { createApp } = require('../src/interfaces/http/app')

const ADMIN_KEY = 'k'.repeat(32)
const curpA = 'AAAA000000HDFAAA01'
const curpB = 'BBBB000000HDFBBB02'

// ── Repositorios falsos en memoria ─────────────────────────────────────────────
const clients = []
const maneuvers = [
    { man_id: 'M1', man_operator_id: curpA, man_client: 'C1', man_moni_key: 'LLAVE1', man_moni_enable: 'true', man_progress: '0%', man_current_status: 'SIN INICIAR', man_events: [], man_transporter: 'T1', man_route: route() },
    { man_id: 'M2', man_operator_id: curpB, man_moni_key: 'LLAVE2', man_moni_enable: 'true', man_progress: '0%', man_current_status: 'SIN INICIAR', man_events: [], man_route: route() },
]
const transporters = [{ transporter_id: 'T1', transporter_name: 'TRANS UNO', transporter_operators: [
    { operator_id: curpA, operator_name: 'OPERADOR A', operator_available: true },
    { operator_id: curpB, operator_name: 'OPERADOR B', operator_available: false },
] }]

function route()
{
    return { route_id: 'R1', route_origin: { location_name: 'ASLA', step_number: 1, events: [{ event_name: 'cancelado', sub_step_number: 0, sub_events: [] }, { event_name: 'EN ESPERA', sub_step_number: 1, sub_events: [] }] }, route_intermediate_points: [], route_destination: { location_name: 'PATIO', step_number: 2, events: [{ event_name: 'cancelado', sub_step_number: 0, sub_events: [] }] } }
}

const fakes = {
    clientRepository: {
        findById: async (id) => clients.find((c) => c.client_id === id) ?? null,
        findByManKey: async () => null,
        list: async () => clients,
        create: async (d) => { clients.push(d) },
        updateById: async () => ({}),
        deleteById: async (id) => { const i = clients.findIndex((c) => c.client_id === id); return i < 0 ? null : clients.splice(i, 1)[0] },
    },
    routeRepository: { findById: async () => null, findByEndpoints: async () => null, list: async () => [], create: async () => {}, updateById: async () => {}, deleteById: async () => null },
    maneuverRepository: {
        findById: async (id) => maneuvers.find((m) => m.man_id === id) ?? null,
        updateById: async (id, f) => { const m = maneuvers.find((x) => x.man_id === id); if (!m) return null; Object.assign(m, f); return m },
        findByMoniKey: async (k) => maneuvers.filter((m) => m.man_moni_key === k).map((m) => ({ ...m, man_moni_key: undefined })),
        findPendingByOperator: async (c) => maneuvers.filter((m) => m.man_operator_id === c),
        countAll: async () => maneuvers.length, page: async () => maneuvers,
        updateMoniKeyByClient: async () => ({ modifiedCount: 0 }), countStats: async () => ({ total: 0, canceled: 0, notStarted: 0 }),
        create: async () => {}, deleteById: async () => null,
    },
    transporterRepository: {
        findByOperatorId: async (curp) => transporters.find((t) => t.transporter_operators.some((o) => o.operator_id === curp)) ?? null,
        findById: async (id) => transporters.find((t) => t.transporter_id === id) ?? null,
        findNamesByIds: async () => [{ transporter_id: 'T1', transporter_name: 'TRANS UNO' }],
        list: async () => transporters,
    },
}

// ── Servidor de prueba ─────────────────────────────────────────────────────────
let server, base

test.before(async () =>
{
    const config = loadEnv({
        APP_ENV: 'production', MONGO_URI_PRODUCTION: 'mongodb://x/y', ADMIN_API_KEY: ADMIN_KEY,
        JWT_SECRET: 's'.repeat(40), CORS_ORIGINS: 'https://admin.maylob.test', TRUST_PROXY: '1',
    })
    const app = createApp({ config, services: buildServices(config, fakes) })
    await new Promise((resolve) => { server = app.listen(0, resolve) })
    base = `http://127.0.0.1:${server.address().port}`
})
test.after(() => server.close())

const call = (path, { method = 'GET', headers = {}, body } = {}) => fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
})
const admin = { 'x-api-key': ADMIN_KEY }

test('configuración de producción incompleta impide arrancar', () =>
{
    assert.throws(() => loadEnv({ APP_ENV: 'production', MONGO_URI_PRODUCTION: 'mongodb://x/y' }), /ADMIN_API_KEY[\s\S]*JWT_SECRET[\s\S]*CORS_ORIGINS/)
})

test('rutas de administración rechazan peticiones sin API key o con key incorrecta', async () =>
{
    assert.equal((await call('/clients/client/')).status, 401)
    assert.equal((await call('/clients/client/', { headers: { 'x-api-key': 'x'.repeat(32) } })).status, 401)
    assert.equal((await call('/transporters/transporter/')).status, 401)
    assert.equal((await call('/maneuvers/maneuver/', { method: 'DELETE', body: { man_id: 'M1' } })).status, 401)
})

test('con API key correcta el administrador opera', async () =>
{
    const created = await call('/clients/client/', { method: 'POST', headers: admin, body: { client_name: 'Acme', client_email: 'a@b.com' } })
    assert.equal(created.status, 200)
    const list = await (await call('/clients/client/', { headers: admin })).json()
    assert.equal(list.code, '1')
    assert.equal(list.clients_data[0].client_name, 'ACME')
})

test('validación: correo inválido se rechaza con 400', async () =>
{
    const r = await call('/clients/client/', { method: 'POST', headers: admin, body: { client_name: 'X', client_email: 'no-es-correo' } })
    assert.equal(r.status, 400)
})

test('cabeceras de seguridad presentes y sin X-Powered-By', async () =>
{
    const r = await call('/health')
    assert.equal(r.status, 200)
    assert.equal(r.headers.get('x-powered-by'), null)
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
    assert.ok(r.headers.get('strict-transport-security'))
    assert.equal(r.headers.get('cache-control'), 'no-store')
})

test('CORS: origen no permitido no recibe cabecera de autorización', async () =>
{
    const bad = await call('/health', { headers: { origin: 'https://evil.example' } })
    assert.equal(bad.headers.get('access-control-allow-origin'), null)
    const ok = await call('/health', { headers: { origin: 'https://admin.maylob.test' } })
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://admin.maylob.test')
})

test('body JSON mal formado → 400 sin filtrar detalles; body gigante → 413', async () =>
{
    const bad = await call('/auth/login', { method: 'POST', body: '{"curp": ' })
    assert.equal(bad.status, 400)
    assert.equal((await bad.json()).message, 'JSON mal formado.')
    const big = await call('/auth/login', { method: 'POST', body: { curp: 'A'.repeat(300_000) } })
    assert.equal(big.status, 413)
})

test('ruta inexistente → 404 uniforme', async () =>
{
    const r = await call('/no/existe')
    assert.equal(r.status, 404)
})

test('monitor público: rechaza inyección NoSQL (?key[$ne]=x)', async () =>
{
    assert.equal((await call('/maneuvers/monitor/?key[$ne]=x')).status, 400)
})

test('monitor público: devuelve datos pero SIN CURP ni llave', async () =>
{
    const r = await call('/maneuvers/monitor/?key=LLAVE1')
    const body = await r.json()
    assert.equal(body.code, '1')
    assert.equal(body.maneuvers_data[0].man_operator_id, undefined)
    assert.equal(body.maneuvers_data[0].man_moni_key, undefined)
    assert.equal(body.maneuvers_data[0].man_transporter, 'TRANS UNO')
})

test('monitor público: segundo intento inmediato con la misma llave → 429', async () =>
{
    const first = await call('/maneuvers/monitor/?key=LLAVE2')
    const second = await call('/maneuvers/monitor/?key=LLAVE2')
    assert.equal(first.status, 200)
    assert.equal(second.status, 429)
})

test('login: CURP inválido 400, inexistente 404, dado de baja 403, válido 200 con token', async () =>
{
    assert.equal((await call('/auth/login', { method: 'POST', body: { curp: { $ne: null } } })).status, 400)
    assert.equal((await call('/auth/login', { method: 'POST', body: { curp: 'ZZZZ000000HDFZZZ99' } })).status, 404)
    assert.equal((await call('/auth/login', { method: 'POST', body: { curp: curpB } })).status, 403)
    const ok = await call('/auth/login', { method: 'POST', body: { curp: curpA.toLowerCase() } })
    assert.equal(ok.status, 200)
    const body = await ok.json()
    assert.equal(body.code, '1')
    assert.ok(body.token.split('.').length === 3)
})

test('operador con token solo ve/modifica SUS maniobras (anti-IDOR)', async () =>
{
    const { token } = await (await call('/auth/login', { method: 'POST', body: { curp: curpA } })).json()
    const bearer = { authorization: `Bearer ${token}` }

    const mine = await (await call('/maneuvers/byOperator/', { headers: bearer })).json()
    assert.deepEqual(mine.maneuvers_data.map((m) => m.man_id), ['M1'])

    const own = await call('/maneuvers/updateLocation/', { method: 'PATCH', headers: bearer, body: { man_id: 'M1', man_current_location: 'ASLA', man_current_status: 'EN ESPERA' } })
    assert.equal(own.status, 200)
    assert.equal((await own.json()).man_progress, '67%')

    const foreign = await call('/maneuvers/updateLocation/', { method: 'PATCH', headers: bearer, body: { man_id: 'M2', man_current_location: 'ASLA', man_current_status: 'EN ESPERA' } })
    assert.equal(foreign.status, 403)
})

test('el token de operador NO da acceso a rutas de administración', async () =>
{
    const { token } = await (await call('/auth/login', { method: 'POST', body: { curp: curpA } })).json()
    assert.equal((await call('/clients/client/', { headers: { authorization: `Bearer ${token}` } })).status, 401)
})

test('tokens inválidos, manipulados o con algoritmo "none" son rechazados', async () =>
{
    const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from(`{"sub":"${curpA}","iss":"maylob-backend","aud":"maylob-operator"}`).toString('base64url') + '.'
    for (const t of [none, 'abc.def.ghi', 'x'])
        assert.equal((await call('/maneuvers/byOperator/', { headers: { authorization: `Bearer ${t}` } })).status, 401)
})

test('el header X-Operator-Curp ya NO autentica (suplantación bloqueada)', async () =>
{
    assert.equal((await call('/maneuvers/byOperator/', { headers: { 'x-operator-curp': curpA } })).status, 401)
    const r = await call('/maneuvers/updateLocation/', { method: 'PATCH', headers: { 'x-operator-curp': curpA }, body: { man_id: 'M1', man_current_location: 'ASLA', man_current_status: 'EN ESPERA' } })
    assert.equal(r.status, 401)
})

test('administrador puede actualizar ubicación de cualquier maniobra', async () =>
{
    const r = await call('/maneuvers/updateLocation/', { method: 'PATCH', headers: admin, body: { man_id: 'M2', man_current_location: 'ASLA', man_current_status: 'EN ESPERA' } })
    assert.equal(r.status, 200)
})

test('operador con token puede LEER rutas pero no crearlas ni borrarlas', async () =>
{
    const { token } = await (await call('/auth/login', { method: 'POST', body: { curp: curpA } })).json()
    const bearer = { authorization: `Bearer ${token}` }

    assert.equal((await call('/routes/route', { headers: bearer })).status, 200)
    assert.equal((await call('/routes/route')).status, 401)
    assert.equal((await call('/routes/route', { method: 'POST', headers: bearer, body: {} })).status, 401)
    assert.equal((await call('/routes/route/', { method: 'DELETE', headers: bearer, body: {} })).status, 401)
})
