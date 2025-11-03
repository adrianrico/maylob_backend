'use strict'

// Import MODEL SCHEMA from models MODULE...
var operatorModelItem = require('../MODELS/operator.js')

// Import auxiliary functions MODULE... 
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation... 
var controller = {

//#region [ v1.2 CONTROLLER ]

    //[?][ CREATE OPERATOR ]
    create_operator: async function(req,res)
    {
        let function_name = 'create_operator'
        auxFuncModule.logger(function_name,18,0)

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
        newOperatorObject.operator_registration = auxFuncModule.timeSnapshot()
        
        auxFuncModule.logger(function_name,38,1,1,"[i] Values have been received...")
        
        /* - Step [2]
        *  - Validate if operator is already created, if not then create it... BE SURE TO CHANGE IT TO AN ID...!
        */ 
        await operatorModelItem.find({operator_name:bodyValues.operator_name}).then((operatorObjectFound)=>
        {
            //Not found, then save new...
            if(operatorObjectFound.length == 0)
            {
                newOperatorObject.save()
                auxFuncModule.logger(function_name,49,2,1,"[i] Operator has been created...")
                return res.status(200).send({message:'1'})
            }else
            {
                auxFuncModule.logger(function_name,53,2,2,"[e] Operator could not be created...")
                return res.status(200).send({message:'0'})
            } 
        }).catch((err)=>
        {
            auxFuncModule.logger(function_name,58,2,3,"[e] "+err)
            return res.status(200).send({message:'0'})  
        }) 
    },





    //[?][ READ OPERATORS ]
    read_operator: async function(req,res)
    {
        let function_name = 'read_operator'
        auxFuncModule.logger(function_name,70,0)

        /* - Step [1]
        *  - Receive values from CLIENT if only one transporter should be found...
        *  - via POST -> BODY
        */
        let bodyValues = req.body
        
        auxFuncModule.isValidValue(bodyValues.operator_name) ?  
        auxFuncModule.logger(function_name,80,1,1,"[i] Searching "+bodyValues.operator_name+"...")
        :
        auxFuncModule.logger(function_name,82,1,1,"[i] Searching all operators...")

        //[A]
        if (bodyValues.operator_name.length > 0) 
        {
            await operatorModelItem.find({operator_name:bodyValues.operator_name}).then((operatorFound)=>
            {
                // No operators stored...
                if(operatorFound.length === 0)
                {
                    auxFuncModule.logger(function_name,92,2,2,"[e] No operators stored in DB...")    
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger(function_name,96,2,1,"[i] Sending found operator...")    
                    return res.status(200).send({operatorFound})
                }
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,101,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        } else 
        {   //[B]
            await operatorModelItem.find({}).then((operatorsFound)=>
            {
                let operator_names = []

                // No operators stored...
                if(operatorsFound.length === 0)
                {
                    auxFuncModule.logger(function_name,113,2,2,"[e] No operators stored in DB...")    
                    return res.status(200).send({message:'0'})
                }else
                {
                    // Return only names...
                    for (let index = 0; index < operatorsFound.length; index++) 
                    {
                        operator_names.push(operatorsFound[index].operator_name)
                    }

                    auxFuncModule.logger(function_name,123,2,1,"[i] Sending found operators names only...")  
                    return res.status(200).send({operator_names})
                }
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,129,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        }
    },

//#endregion [ v1.2 CONTROLLER ]
}

module.exports = controller