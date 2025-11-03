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
//#endregion [⚑] AUXILIARY FUCTIONS...

//Use this to export each individual function...
module.exports = {
    isValidValue,
    logger,
    timeSnapshot
}