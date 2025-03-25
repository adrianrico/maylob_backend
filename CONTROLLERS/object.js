'use strict'

/** Import MODEL SCHEMA from models MODULE...*/
let objectModelItem = require('../MODELS/object.js') 

/** Import auxiliary functions MODULE... */
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

/** All controllers logic definition and implementation... */
var controller = {
 





    
    /** [ GET A SINGLE OBJECT ] 
    * @param {*} req 
    * @param {*} res
    */
    getObject: async function(req, res)
    {   
        auxFuncModule.logger("getObject",1)

        /** - Step [1]
         *  - Receive values from client...
         *  - via -> POST -> BODY
         */        
        let bodyValues  = req.body;
        let objectID    = bodyValues.object_id

        auxFuncModule.logger("getObject",2,1)

        if(!auxFuncModule.isValidValue(objectID))
        {
            auxFuncModule.logger("getObject",3,1)
            return res.status(200).send({message:'0'}) 
        }
        else
        {
            /** - Step [2]
             *  - Search in DB for the object...
             */
            await objectModelItem.findOne({object_id:objectID}).then((foundObject) =>
            {    
                if(!foundObject) return res.status(200).send({message:'0'})
    
                /** - Step [3]
                 *  - Return object if found... 
                 */    
                return res.status(200).send({foundObject})
            }).catch((err)=>
            {            
                auxFuncModule.logger("getObject",3,2)+err
                if (err) return res.status(200).send({message:'0'})    
            })
        }
    },
       




    /** [ READ ALL OBJECTS ]
     * @param {*} req 
     * @param {*} res
     */
    readAllObjects: async function(req, res)
    {
        auxFuncModule.logger("readAllObjects",1)

        /** - Step [1]
         *  - Different filters can be used in the QUERY...
         */
        await objectModelItem.find({/*object_available: 1,object_type:'tracto'*/}).then((objectsFound)=>
        {
            if(!objectsFound)
            {
                auxFuncModule.logger("readAllObjects",3,1)
                return res.status(200).send({message:'0'})
            }else
            {
                auxFuncModule.logger("readAllObjects",2,1)
                return res.status(200).send({objectsFound})
            } 
            
        }).catch((err)=>
        {                
            auxFuncModule.logger("readAllObjects",3,1)
            if (err) return res.status(200).send({message:'0'})    
        })
    },





    /** [ UPDATE OBJECT ]
     * @param {*} req 
     * @param {*} res 
     */
    updateObject: async function(req, res)
    {
        auxFuncModule.logger("updatedObject",1)

        /** - Step [1]
         *  - Receive filter values from client request...
         *  - via -> PATCH -> BODY
         */
        let bodyValues = req.body;
        
        if (!auxFuncModule.isValidValue(bodyValues.object_id)) 
        {
            auxFuncModule.logger("updateObject",3,1)
            return res.status(200).send({message:'0'}) 
        }else 
        {
            /** - Step [2]
             *  - Update object with body values...
             */
            await objectModelItem.findOneAndUpdate({object_id:bodyValues.object_id},bodyValues, {new:true}).then((updatedObject) =>
            {
                if(!updatedObject)
                {
                    auxFuncModule.logger("updateObject",3,2)
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger("updateObject",2,2)
                    return res.status(200).send({updatedObject})
                }

            }).catch((err)=>
            {
                auxFuncModule.logger("updateObject",3,2)+err
                if (err) return res.status(200).send({message:'0'})   }) 
        }
    },





    /** [ DELETE OBJECT ]
     * @param {*} req 
     * @param {*} res 
     */
    deleteObject: async function(req, res)
    {
        auxFuncModule.logger("deleteObject",1)

        /** - Step [1]
         *  - Receive values from client...
         *  - via -> DELETE -> BODY
         */        
        let bodyValues  = req.body;
        let objectID    = bodyValues.object_id

        if (!auxFuncModule.isValidValue(objectID)) 
        {
            auxFuncModule.logger("deleteObject",3,1)
            res.status(200).send({message:'0'})
        }else
        {
            /** - Step [2]
             *  - Actual deletion...
             */
            await objectModelItem.findOneAndDelete({object_id:objectID}).then((deletedObject) =>
            {
                if(!deletedObject)
                {
                    auxFuncModule.logger("deleteObject",3,2)
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger("deleteObject",2,2)
                    return res.status(200).send({deletedObject})
                }

            }).catch((err)=>
            {
                auxFuncModule.logger("deleteObject",3,2)+err
            })    
        }
    },





    /** [ GET AVAILABLE OBJECTS ]
     * @param {*} req 
     * @param {*} res 
     */
    getAvailableObjects: async function(req, res)
    {
        auxFuncModule.logger("getAvailableObjects",1)
    
        /** - Step [1]
        *   - Receive and validate values from CLIENT via GET params...
        */
        var equipmentType = Object.keys(req.query)
     
        auxFuncModule.logger("getAvailableObjects",2,1)
        
        if (!auxFuncModule.isValidValue(equipmentType)) 
        {
            auxFuncModule.logger("getAvailableObjects",3,1)
            return res.status(200).send({message:'0'})
        }else
        {
            /** - Step [2] 
            *   - Search in the database with the equipmentType value...
            */
            await objectModelItem.find({'object_type':equipmentType,'object_available':1, 'object_requested':0}).then((objectsFound)=>
            {
                if (objectsFound.length === 0) 
                {
                    auxFuncModule.logger("getAvailableObjects",3,2)
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger("getAvailableObjects",2,2)    
                    return res.status(200).send({objectsFound})
                }

            }).catch((err)=>
            {
                auxFuncModule.logger("getAvailableObjects",3,2)+err
                res.status(200).send({message:'0'})  
            })
        }
    },    


//#region [ v1.1 CONTROLLER ]

    /** [ CREATE OBJECT ]
     * @param {*} req 
     * @param {*} res
     */
    create_object: async function (req, res)
    {
        auxFuncModule.logger("create_object -> LN 245",1)
    
        /* - Step [1]
        *  - Receive values from CLIENT...
        *  - via POST -> BODY
        */

        let newObject = new objectModelItem() // Interface to DB...
        let bodyValues = req.body // Contains all received values...

        newObject.object_id    = auxFuncModule.isValidValue(bodyValues.object_id)    ? bodyValues.object_id.toUpperCase()    : 'DATO NO ASIGNADO',
        newObject.object_owner = auxFuncModule.isValidValue(bodyValues.object_owner) ? bodyValues.object_owner.toUpperCase() : 'DATO NO ASIGNADO',
        newObject.object_type  = auxFuncModule.isValidValue(bodyValues.object_type)  ? bodyValues.object_type.toUpperCase()  : 'DATO NO ASIGNADO'

        if (bodyValues.object_type === 'ECO') 
        {
            newObject.object_number             = auxFuncModule.isValidValue(bodyValues.object_number)             ? bodyValues.object_number.toUpperCase()             : 'DATO NO ASIGNADO',
            newObject.object_plates             = auxFuncModule.isValidValue(bodyValues.object_plates)             ? bodyValues.object_plates.toUpperCase()             : 'DATO NO ASIGNADO',
            newObject.object_year               = auxFuncModule.isValidValue(bodyValues.object_year)               ? bodyValues.object_year.toUpperCase()               : 'DATO NO ASIGNADO',
            newObject.object_color              = auxFuncModule.isValidValue(bodyValues.object_color)              ? bodyValues.object_color.toUpperCase()              : 'DATO NO ASIGNADO',
            newObject.object_serialNo           = auxFuncModule.isValidValue(bodyValues.object_serialNo)           ? bodyValues.object_serialNo.toUpperCase()           : 'DATO NO ASIGNADO',
            newObject.object_motorNo           = auxFuncModule.isValidValue(bodyValues.object_motorNo)           ? bodyValues.object_motorNo.toUpperCase()           : 'DATO NO ASIGNADO',
            newObject.object_insurance_company  = auxFuncModule.isValidValue(bodyValues.object_insurance_company)  ? bodyValues.object_insurance_company.toUpperCase()  : 'DATO NO ASIGNADO',
            newObject.object_insurance_policyNo = auxFuncModule.isValidValue(bodyValues.object_insurance_policyNo) ? bodyValues.object_insurance_policyNo.toUpperCase() : 'DATO NO ASIGNADO'
            
        }
        
        newObject.object_priority     = (bodyValues.object_owner === "MAYLOB") ? 'PRIORITARIA' : 'NORMAL', 
        newObject.object_available    = auxFuncModule.isValidValue(bodyValues.object_available)   ? bodyValues.object_available.toUpperCase()   : '0',
        newObject.object_requested    = auxFuncModule.isValidValue(bodyValues.object_requested)   ? bodyValues.object_requested.toUpperCase()   : '0'
        newObject.object_maneuver_id  = auxFuncModule.isValidValue(bodyValues.object_maneuver_id) ? bodyValues.object_maneuver_id.toUpperCase() : 'DATO NO ASIGNADO'

        const dateTime = new Date()
        const timeSnapshot = dateTime.getDate()
        +"-"+ dateTime.toLocaleString('default',{month:'long'}).toUpperCase()
        +"-"+ dateTime.getFullYear()
        +" "+ dateTime.getHours()
        +":"+ dateTime.getMinutes() 
        +":"+ dateTime.getSeconds()

        newObject.object_registration = timeSnapshot
        
        auxFuncModule.logger("create_object -> LN 287",2,1)
    
        /** - Step [2]
         *  - OBJECT ID double check...
         */

        if (!auxFuncModule.isValidValue(bodyValues.object_id))
        {
            auxFuncModule.logger("create_object -> LN 295",3,2)
            return res.status(200).send({message:'0'})    
        }else
        {
            auxFuncModule.logger("create_object -> LN 299",2,2)
            
            /* - Step [3]
            *  - Save new object if does not exist...
            */
            await objectModelItem.findOne({object_id:newObject.object_id}).then((foundObject) =>
            {
                if(foundObject)
                {                    
                    auxFuncModule.logger("create_object -> LN 308",3,2)
                    return res.status(200).send({message:'0'}) 
                }else
                {   
                    newObject.save()
                    auxFuncModule.logger("create_object -> LN 313",2,2)
                    return res.status(200).send({message:'1'})
                } 
            }).catch((err)=>
            {
                auxFuncModule.logger("create_object -> LN 318",5)
                res.status(200).send({message:'0'})  
            })
        }
    },

//#endregion [ v1.1 CONTROLLER ] 

}
module.exports = controller