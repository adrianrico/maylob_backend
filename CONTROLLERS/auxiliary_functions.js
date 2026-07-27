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

// Deep-sanitizes a route location's events[] and enforces the fixed, unremovable "cancelado" checkpoint.
// Client-supplied sub_step_number is ignored - the server always renumbers sequentially (1..n),
// and any client-sent "cancelado" entry is dropped since it's always regenerated fresh.
// sub_events is an array of strings - multiple sub-events can belong to the same sub_step.
function sanitizeLocationEvents(arr, maxItems = 30, maxSubEvents = 10)
{
    const cleanedEvents = (Array.isArray(arr) ? arr : [])
        .slice(0, maxItems)
        .map(ev =>
        {
            if (typeof ev !== 'object' || ev === null || Array.isArray(ev)) return null
            const event_name = sanitizeString(String(ev.event_name ?? ''), 100) ?? ''
            if (event_name === '' || event_name.toLowerCase() === 'cancelado') return null

            const sub_events = (Array.isArray(ev.sub_events) ? ev.sub_events : [])
                .slice(0, maxSubEvents)
                .map(se => sanitizeString(String(se ?? ''), 300))
                .filter(se => se !== null)

            return {
                event_name,
                sub_events,
            }
        })
        .filter(Boolean)
        .map((ev, index) => ({ event_name: ev.event_name, sub_step_number: index + 1, sub_events: ev.sub_events }))

    return [{ event_name: 'cancelado', sub_step_number: 0, sub_events: [] }, ...cleanedEvents]
}

// Builds a route location point {location_name, step_number, events[]} from client input.
function sanitizeLocationPoint(raw, stepNumber, defaultName)
{
    const source = (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) ? raw : {}
    return {
        location_name: sanitizeString(source.location_name) || defaultName,
        step_number: stepNumber,
        events: sanitizeLocationEvents(source.events),
    }
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

//#region [⚑] ROUTE SEQUENCE FUNCTIONS...

// Flattens a route's origin/intermediate points/destination into the ordered
// (step_number, sub_step_number) sequence man_events is validated/backfilled against.
// sub_step_number 0 ("cancelado") is excluded - it's a fixed override checkpoint on
// each point, not part of the forward flow.
//
// Progress is weighted, not one-unit-per-event: totalUnits = every point (origin +
// intermediate points + destination) + every one of its events (cancelado excluded)
// + every sub_event of those events. The endpoint can only ever target a whole event
// (step_number + sub_step_number) - sub_events have no identifier of their own - so
// reaching an event credits that event's own unit plus all of its sub_events' units,
// and a point's unit is credited alongside the first event of that point that gets
// reached (a point with no events of its own is simply carried into the next point's
// first event, same as it can't be targeted independently anyway). Each milestone's
// cumulativeUnits is the running total once that milestone is reached, so progress
// is just cumulativeUnits / totalUnits.
function buildRouteMilestones(route)
{
    if (!route) return { milestones: [], totalUnits: 0 }

    const points = [route.route_origin, ...(Array.isArray(route.route_intermediate_points) ? route.route_intermediate_points : []), route.route_destination]
        .filter(point => point && typeof point === 'object')
        .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))

    const milestones = []
    let cumulativeUnits = 0

    for (const point of points)
    {
        const events = Array.isArray(point.events) ? point.events : []
        const sortedEvents = events
            .filter(event => event && event.sub_step_number !== 0)
            .sort((a, b) => (a.sub_step_number ?? 0) - (b.sub_step_number ?? 0))

        cumulativeUnits += 1 // the point itself

        for (const event of sortedEvents)
        {
            const subEventsCount = Array.isArray(event.sub_events) ? event.sub_events.length : 0
            cumulativeUnits += 1 + subEventsCount // the event + all of its sub_events

            milestones.push({
                step_number: point.step_number,
                sub_step_number: event.sub_step_number,
                location_name: point.location_name,
                event_name: event.event_name,
                cumulativeUnits,
            })
        }
    }

    return { milestones, totalUnits: cumulativeUnits }
}

// Finds a route's origin/intermediate/destination point matching a location_name,
// regardless of whether that point has any real (non-cancelado) events...
function findRoutePoint(route, location_name)
{
    if (!route) return null
    const points = [route.route_origin, ...(Array.isArray(route.route_intermediate_points) ? route.route_intermediate_points : []), route.route_destination]
    return points.find(point => point && typeof point === 'object' && point.location_name === location_name) ?? null
}

//#endregion [⚑] ROUTE SEQUENCE FUNCTIONS...

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
    sanitizeLocationEvents,
    sanitizeLocationPoint,
    sanitizeContainers,
    sanitizeObject,
    buildRouteMilestones,
    findRoutePoint,
}
