'use strict'

// Import MODEL SCHEMA from models MODULE...
var transporterModelItem = require('../MODELS/transporter.js')

//Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

// All controllers logic definition and implementation... 
var controller = {

//#region [ v1.2 CONTROLLER ]

    //[?][ CREATE TRANSPORTER ]
    create_transporter: async function(req,res)
    {   
        let function_name = 'create_transporter'
        auxFuncModule.logger(function_name,18,0)

        /* - Step [1]
        *  - Receive values from CLIENT...
        *  - via POST -> BODY
        */
        let newTransporterObject = new transporterModelItem()
        let bodyValues           = req.body  

        newTransporterObject.transporter_id        = auxFuncModule.isValidValue(bodyValues.transporter_id)     ? bodyValues.transporter_id.toUpperCase()     : 'DATO NO ASIGNADO' ,
        newTransporterObject.transporter_name      = auxFuncModule.isValidValue(bodyValues.transporter_name)   ? bodyValues.transporter_name.toUpperCase()   : 'DATO NO ASIGNADO' ,
        newTransporterObject.transporter_caat      = auxFuncModule.isValidValue(bodyValues.transporter_caat  ) ? bodyValues.transporter_caat.toUpperCase()   : 'DATO NO ASIGNADO' 

        newTransporterObject.transporter_registration = auxFuncModule.timeSnapshot()
        //Just to testing only...!
        //newTransporterObject.transporter_equipment = ['eco_56','eco_65']
        //newTransporterObject.transporter_operators = ['operador_agustin_1','operador_agustin_2']
        auxFuncModule.logger(function_name,35,1,1,"[i] Values have been received...")
    
        /* - Step [2]
        *  - Validate if transporter is already created, if not then create it... BE SURE TO CHANGE IT TO AN ID...!
        */ 
        await transporterModelItem.find({transporter_name:bodyValues.transporter_name}).then((transporterObjectFound)=>
        {
            //Not found, then save new...
            if(transporterObjectFound.length == 0)
            {
                newTransporterObject.save()
                auxFuncModule.logger(function_name,44,2,1,"[i] Transporter has been created...")
                return res.status(200).send({message:'1'})
            }else
            {
                auxFuncModule.logger(function_name,48,2,2,"[i] Transporter could not be created...")
                return res.status(200).send({message:'0'})
            } 
        }).catch((err)=>
        {
            auxFuncModule.logger(function_name,53,2,3,"[e] "+err)
            return res.status(200).send({message:'0'})  
        }) 
    },





    //[?][ READ TRANSPORTERS ]
    read_transporters: async function(req,res)
    {
        let function_name = 'read_transporters'
        auxFuncModule.logger(function_name,66,0)

        /* - Step [1]
        *  - Receive values from CLIENT if only one transporter should be found...
        *  - via POST -> BODY
        */
        let bodyValues = req.body

        auxFuncModule.isValidValue(bodyValues.transporter_name) ?  
        auxFuncModule.logger(function_name,75,1,1,"[i] Searching "+bodyValues.transporter_name+"...")
        :
        auxFuncModule.logger(function_name,77,1,1,"[i] Searching all transporters...")

        /* - Step [2]
        *  - [A] Search by NAME parameter...
        *  - [B] Return all results...
        */

        // [A]
        if (bodyValues.transporter_name.length > 0)  
        {
            await transporterModelItem.find({transporter_name:bodyValues.transporter_name}).then((transportersFound)=>
            {
                // No transporters stored...
                if(transportersFound.length === 0)
                {
                    auxFuncModule.logger(function_name,92,2,2,"[e] No transporters stored in DB...")    
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger(function_name,96,2,1,"[i] Sending found transporter...")    
                    return res.status(200).send({transportersFound})
                }
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,101,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        }else 
        {   // [B]
            await transporterModelItem.find({}).then((transportersFound)=>
                {
                    // No transporters stored...
                    if(transportersFound.length === 0)
                    {
                        auxFuncModule.logger(function_name,111,2,2,"[e] No transporters stored in DB...")    
                        return res.status(200).send({message:'0'})
                    }else
                    {
                        auxFuncModule.logger(function_name,115,2,1,"[i] Sending all transporters...")    
                        return res.status(200).send({transportersFound})
                    }
        
                }).catch((err)=>
                {
                    auxFuncModule.logger(function_name,101,2,3,"[e] "+err)
                    return res.status(200).send({message:'0'})  
                })
        }
    },

//#endregion [ v1.2 CONTROLLER ]
}

module.exports = controller