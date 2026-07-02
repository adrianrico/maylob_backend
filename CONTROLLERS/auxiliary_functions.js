'use strict'

//#region [⚑] AUXILIARY FUCTIONS...

function isValidValue(value_to_check)
{
    let result = (value_to_check === "" || value_to_check === undefined || value_to_check === null) ? false : true
    return result
}

function logger(functionName,line,functionStep,functionCategory, message)
{
    isValidValue(message) ? message = message : message = ''

    switch (functionCategory)
    {
        case 1:
            functionCategory = "Done..."
        break;

        case 2:
            functionCategory = "Error..."
        break;

        case 3:
            functionCategory = "Promise error..."
        break;
    }

    if (functionStep === 0 )
    {
        console.log('\n\n\n\n\n============================================================================================================================================================================');
        console.log('[⚑]['+functionName+']['+line+'] → Requested...')
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------');
    }else
    {
        console.log('['+functionName+']['+line+'] → STEP ['+functionStep+'] '+functionCategory+' '+message);
        console.log('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------');
    }
}

function timeSnapshot()
{
    const dateTime = new Date()

    const day     = dateTime.getDate() < 10 ? '0' + dateTime.getDate() : dateTime.getDate()
    const month   = dateTime.toLocaleString('es-mx',{month:'long'}).toUpperCase()
    const year    = dateTime.getFullYear()
    const hours   = dateTime.getHours()   < 10 ? "0" + dateTime.getHours()   : dateTime.getHours()
    const minutes = dateTime.getMinutes() < 10 ? "0" + dateTime.getMinutes() : dateTime.getMinutes()
    const seconds = dateTime.getSeconds() < 10 ? "0" + dateTime.getSeconds() : dateTime.getSeconds()

    const timeSnapshot = day +"-"+month+"-"+year+"  "+hours+":"+minutes+":"+seconds

    return timeSnapshot
}

function createId(fields)
{
    let prefix = ''

    for (let index = 0; index < fields.length; index++)
    {
        if (isValidValue(fields[index]))
        {
            const clean = String(fields[index]).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
            prefix += (clean.substring(0, 2) || 'ND')
        }else
        {
            prefix += 'ND'
        }
    }

    const d  = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    const HH = String(d.getHours()).padStart(2, '0')
    const MM = String(d.getMinutes()).padStart(2, '0')
    const SS = String(d.getSeconds()).padStart(2, '0')

    return `${prefix}${dd}${mm}${yy}${HH}${MM}${SS}`
}

//#endregion [⚑] AUXILIARY FUCTIONS...

//#region [⚑] SANITIZATION FUNCTIONS...

// General string — strips all injection vectors including CRLF and prompt-injection chars
function sanitizeString(value, maxLength = 200)
{
    if (typeof value !== 'string') return null
    const cleaned = value
        .replace(/[\x00\r\n]/g, '')                  // null bytes + newlines (CRLF / prompt injection)
        .replace(/[$`<>{};'"\\|]/g, '')               // NoSQL ($), template, HTML, command, quote, escape, pipe
        .trim()
        .substring(0, maxLength)
    return cleaned === '' ? null : cleaned
}

// IDs only — strict alphanumeric + underscore + hyphen, nothing else
function sanitizeId(value, maxLength = 100)
{
    if (typeof value !== 'string') return null
    const cleaned = value
        .replace(/[^a-zA-Z0-9_\-]/g, '')
        .trim()
        .substring(0, maxLength)
    return cleaned === '' ? null : cleaned
}

// Human names — letters (including accented), digits, spaces, hyphens and dots only
function sanitizeName(value)
{
    const cleaned = sanitizeString(value, 100)
    if (cleaned === null) return null
    return /^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/.test(cleaned) ? cleaned : null
}

function sanitizePhone(value)
{
    const cleaned = sanitizeString(value, 20)
    if (cleaned === null) return null
    return /^[\d\s\+\-\(\)]+$/.test(cleaned) ? cleaned : null
}

function sanitizeEmail(value)
{
    const cleaned = sanitizeString(value, 100)
    if (cleaned === null) return null
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null
}

// URLs — keeps standard URL chars (:/?#[]@!$&'()*+,;=%-.) but strips dangerous ones
function sanitizeUrl(value, maxLength = 500)
{
    if (typeof value !== 'string') return null
    const cleaned = value
        .replace(/[\x00\r\n<>"\\]/g, '')              // null bytes, newlines, HTML tags, escapes, quotes
        .trim()
        .substring(0, maxLength)
    return cleaned === '' ? null : cleaned
}

// Deep-sanitizes an array of event objects {event_id?, event_name, event_description}
function sanitizeEvents(arr, maxItems = 30)
{
    if (!Array.isArray(arr)) return []
    return arr.slice(0, maxItems).map(ev =>
    {
        if (typeof ev !== 'object' || ev === null || Array.isArray(ev)) return null
        return {
            event_id:          sanitizeString(String(ev.event_id          ?? ''), 100) ?? '',
            event_name:        sanitizeString(String(ev.event_name        ?? ''), 100) ?? '',
            event_description: sanitizeString(String(ev.event_description ?? ''), 300) ?? '',
        }
    }).filter(Boolean)
}

// Deep-sanitizes an array of stop objects {stop_name, stop_events[]}
function sanitizeStops(arr, maxItems = 20)
{
    if (!Array.isArray(arr)) return []
    return arr.slice(0, maxItems).map(stop =>
    {
        if (typeof stop !== 'object' || stop === null || Array.isArray(stop)) return null
        return {
            stop_name:   sanitizeString(String(stop.stop_name ?? ''), 100) ?? '',
            stop_events: sanitizeEvents(stop.stop_events),
        }
    }).filter(Boolean)
}

// Deep-sanitizes an array of container objects
function sanitizeContainers(arr, maxItems = 4)
{
    if (!Array.isArray(arr)) return []
    return arr.slice(0, maxItems).map(c =>
    {
        if (typeof c !== 'object' || c === null || Array.isArray(c)) return null
        const size   = Number(c.container_size)
        const weight = Number(c.container_weight)
        return {
            container_id:      sanitizeString(String(c.container_id      ?? ''), 50)  ?? '',
            container_size:    Number.isFinite(size)   ? size   : null,
            container_content: sanitizeString(String(c.container_content ?? ''), 200) ?? '',
            container_type:    sanitizeString(String(c.container_type    ?? ''), 100) ?? '',
            container_weight:  Number.isFinite(weight) ? weight : null,
        }
    }).filter(Boolean)
}

// Deep-sanitizes a free-form object — strips prototype-pollution/Mongo-operator keys and cleans string leaves
function sanitizeObject(value, maxDepth = 5)
{
    if (typeof value !== 'object' || value === null || Array.isArray(value) || maxDepth <= 0) return null

    const dangerousKeys = ['__proto__', 'constructor', 'prototype']
    const cleaned = {}

    for (const key of Object.keys(value))
    {
        if (dangerousKeys.includes(key) || key.startsWith('$')) continue

        const entryValue = value[key]

        switch (typeof entryValue)
        {
            case 'string':
                cleaned[key] = sanitizeString(entryValue, 500)
            break

            case 'number':
            case 'boolean':
                cleaned[key] = entryValue
            break

            case 'object':
                if (entryValue === null)
                {
                    cleaned[key] = null
                }else if (Array.isArray(entryValue))
                {
                    cleaned[key] = entryValue
                        .filter(item => typeof item !== 'function')
                        .map(item =>
                        {
                            if (typeof item === 'object' && item !== null) return sanitizeObject(item, maxDepth - 1)
                            if (typeof item === 'string') return sanitizeString(item, 500)
                            return item
                        })
                }else
                {
                    cleaned[key] = sanitizeObject(entryValue, maxDepth - 1)
                }
            break

            // functions, symbols, undefined -> dropped
        }
    }

    return cleaned
}

//#endregion [⚑] SANITIZATION FUNCTIONS...

module.exports = {
    isValidValue,
    logger,
    timeSnapshot,
    createId,
    sanitizeString,
    sanitizeId,
    sanitizeName,
    sanitizePhone,
    sanitizeEmail,
    sanitizeUrl,
    sanitizeEvents,
    sanitizeStops,
    sanitizeContainers,
    sanitizeObject,
}
