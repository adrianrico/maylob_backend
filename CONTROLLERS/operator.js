'use strict'

/** Import MODEL SCHEMA from models MODULE...*/
var operatorModelItem = require('../MODELS/operator.js')

/** Import auxiliary functions MODULE... */
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

/** All controllers logic definition and implementation... */
var controller = {

    /** [ CREATE OPERATOR ]
    * @param {*} req 
    * @param {*} res
    */    
    create_operator: async function(req,res)
    {
        auxFuncModule.logger("create_operator -> LN 18",1)

        /* - Step [1]
        *  - Receive values from CLIENT...
        *  - via POST -> BODY
        */
        let newOperatorObject = new operatorModelItem()
        let bodyValues        = req.body  

        newOperatorObject.operator_name         = auxFuncModule.isValidValue(bodyValues.operator_name)         ? bodyValues.operator_name.toUpperCase()         : 'DATO NO ASIGNADO',
        newOperatorObject.operator_curp         = auxFuncModule.isValidValue(bodyValues.operator_curp)         ? bodyValues.operator_curp.toUpperCase()         : 'DATO NO ASIGNADO',
        newOperatorObject.operator_rfc          = auxFuncModule.isValidValue(bodyValues.operator_rfc)          ? bodyValues.operator_rfc.toUpperCase()          : 'DATO NO ASIGNADO', 
        newOperatorObject.operator_nss          = auxFuncModule.isValidValue(bodyValues.operator_nss)          ? bodyValues.operator_nss.toUpperCase()          : 'DATO NO ASIGNADO',
        newOperatorObject.operator_license      = auxFuncModule.isValidValue(bodyValues.operator_license)      ? bodyValues.operator_license.toUpperCase()      : 'DATO NO ASIGNADO', 
        newOperatorObject.operator_address      = auxFuncModule.isValidValue(bodyValues.operator_address)      ? bodyValues.operator_address.toUpperCase()      : 'DATO NO ASIGNADO', 
        newOperatorObject.operator_affiliation  = auxFuncModule.isValidValue(bodyValues.operator_affiliation)  ? bodyValues.operator_affiliation.toUpperCase()  : 'DATO NO ASIGNADO', 
        newOperatorObject.operator_registration = auxFuncModule.isValidValue(bodyValues.operator_registration) ? bodyValues.operator_registration.toUpperCase() : 'DATO NO ASIGNADO', 
        newOperatorObject.operator_status       = auxFuncModule.isValidValue(bodyValues.operator_status)       ? bodyValues.operator_status.toUpperCase()       : 'DATO NO ASIGNADO' 
      
        const dateTime = new Date()
        const timeSnapshot = dateTime.getDate()
        +"-"+ dateTime.toLocaleString('default',{month:'long'}).toUpperCase()
        +"-"+ dateTime.getFullYear()
        +" "+ dateTime.getHours()
        +":"+ dateTime.getMinutes() 
        +":"+ dateTime.getSeconds()

        newOperatorObject.operator_registration = timeSnapshot
        
        auxFuncModule.logger("create_operator -> LN 46",2,1)

        /* - Step [2]
        *  - Validate if client is already created, if not then create it... BE SURE TO CHANGE IT TO AN ID...!
        */ 
        await operatorModelItem.find({operator_name:bodyValues.operator_name}).then((operatorObjectFound)=>
        {
            //Not found, then save new...
            if(operatorObjectFound.length == 0)
            {
                newOperatorObject.save()
                auxFuncModule.logger("create_operator -> LN 57",2,2)
                return res.status(200).send({message:'1'})
            }else
            {
                auxFuncModule.logger("create_operator -> LN 61",3,2);
                return res.status(200).send({message:'0'})
            } 
        }).catch((err)=>
        {
            auxFuncModule.logger("create_operator -> LN 66",5,2)+err
            return res.status(200).send({message:'0'})  
        }) 
    },





    /** [ READ OPERATOR ] */ 
    read_operator: async function(req,res)
    {
        auxFuncModule.logger("read_operator -> LN 73",1)

        /* - Step [1]
        *  - Search for stored clients in DB...
        */
        await operatorModelItem.find({}).then((operatorsFound)=>
        {
            let operator_names = []

            // No clients stored...
            if(operatorsFound.length === 0)
            {
                auxFuncModule.logger("read_operator -> LN 85",3,1)    
                return res.status(200).send({message:'0'})
            }else
            {
                // Return only names...
                for (let index = 0; index < operatorsFound.length; index++) 
                {
                    operator_names.push(operatorsFound[index].operator_name_name)
                }

                auxFuncModule.logger("read_operators -> LN 95",2,1)
                return res.status(200).send({operator_names})
            }

        }).catch((err)=>
        {
            auxFuncModule.logger("read_operators -> LN 101",5)+err
            return res.status(200).send({message:'0'})  
        })
    },

}

module.exports = controller