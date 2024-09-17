'use strict'

//#region [⚑] AUXILIARY FUCTIONS...
function isValidValue(value2Check)
{
    let result = (value2Check === "" || value2Check === undefined || value2Check === null) ? false : true
    return result
}





function logger(functionName,functionCategory,functionStep)
{
    /** - CATEGORIES
     *  - 1 -> Request
     *  - 2 -> Done
     *  - 3 -> Error
     *  - 4 -> Previous step error
     */
    switch (functionCategory) 
    {
        case 1:
            console.log('\n\n\n\n\n======================================================================================');
            console.log('[⚑][i]['+functionName+'] - Requested...')
            console.log('--------------------------------------------------------------------------------------');
        break;
    
        case 2:
            console.log('[↑][i]['+functionName+'] - Step '+functionStep+' done...');
            console.log('--------------------------------------------------------------------------------------');
        break;

        case 3:
            console.log('[↑][e]['+functionName+'] - Step '+functionStep+' ERROR... ');
            console.log('--------------------------------------------------------------------------------------');
        break;

        case 4:
            console.log('[↑][e]['+functionName+'] - Previous step error; Step '+functionStep+' not started...');
            console.log('--------------------------------------------------------------------------------------');
        break;

        case 5:
            console.log('[↑][e]['+functionName+'] - Promise ERROR '+functionStep);
            console.log('--------------------------------------------------------------------------------------');
        break;
    }

}
//#endregion [⚑] AUXILIARY FUCTIONS...

//Use this to export each individual function...
module.exports = {
    isValidValue,
    logger
}