'use strict'

/**
 * @file Logger mínimo y seguro.
 * @module shared/logger
 *
 * SEGURIDAD (Log Injection, CWE-117): todo valor que llega a la bitácora se
 * limpia de saltos de línea y caracteres de control, de modo que un atacante
 * no pueda falsificar entradas de log enviando "\n[INFO] admin login ok".
 * Nunca registrar secretos (JWT, API keys, URIs de BD con contraseña).
 */

/** Elimina caracteres de control y limita la longitud de un mensaje. */
function clean(value)
{
    return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1000)
}

function write(level, scope, message)
{
    const line = `${new Date().toISOString()} [${level}] [${clean(scope)}] ${clean(message)}`
    if (level === 'ERROR')     console.error(line)
    else if (level === 'WARN') console.warn(line)
    else                       console.log(line)
}

module.exports = {
    info:  (scope, message) => write('INFO',  scope, message),
    warn:  (scope, message) => write('WARN',  scope, message),
    error: (scope, message) => write('ERROR', scope, message),
}
