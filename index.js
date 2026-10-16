'use strict'

/**
 * Punto de entrada histórico (`npm start` → `node index.js`).
 * Toda la lógica vive en `src/`; este archivo sólo delega para no cambiar
 * el comando de arranque de Render ni los scripts de package.json.
 */
require('./src/server')
