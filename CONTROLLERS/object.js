'use strict'

/** Import MODEL SCHEMA from models MODULE...*/
let objectModelItem = require('../MODELS/object.js') 

/** Import auxiliary functions MODULE... */
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

/** All controllers logic definition and implementation... */
var controller = {
 
    /** [ ADD OBJECT ]
     * @param {*} req 
     * @param {*} res
     */
    addObject: async function (req, res)
    {
        auxFuncModule.logger("addObject",1)

        // Interface for new DB object to store...
        let newObject = new objectModelItem()
        
        /** - Step [1]
         *  - Receive values from client
         */
        let bodyValues = req.body // Contains all values...

        let object_owner    = auxFuncModule.isValidValue(bodyValues.object_owner) ? bodyValues.object_owner : "MAYLOB" 
        let object_priority = (object_owner === "MAYLOB") ? 1 : 2 

        newObject.object_owner      = object_owner,
        newObject.object_priority   = object_priority,
        newObject.object_type       = bodyValues.object_type,
        newObject.object_id         = bodyValues.object_id, 
        newObject.object_plates     = bodyValues.object_plates, 
        newObject.object_available  = bodyValues.object_available
        newObject.object_requested  = 0
        newObject.object_maneuver   = ""

        auxFuncModule.logger("addObject",2,1)

        /** - Step [2]
         *  - OBJECT ID double check...
         */
        if (!auxFuncModule.isValidValue(bodyValues.object_id))
        {
            auxFuncModule.logger("addObject",3,2)
            return res.status(200).send({message:'0'})    
        }else
        {
            /** - Step [3]
             *  -  Check if ID is alreday stored...
             */
            await objectModelItem.findOne({object_id:newObject.object_id}).then((foundObject) =>
            {
                if(foundObject)
                {                    
                    auxFuncModule.logger("addObject",3,3)
                    return res.status(200).send({message:'0'}) 
                }else
                {   
                    /** - Step [4]
                     *  - Save the new object and return the new object...
                     */
                    newObject.save()
                    return res.status(200).send(newObject)
                } 
            })
        }
    },




    
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


}
module.exports = controller