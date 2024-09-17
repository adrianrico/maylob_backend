'use strict'

/** Import MODEL SCHEMA from models MODULE...*/
var userModelItem = require('../MODELS/user') 

/** Import auxiliary functions MODULE... */
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

/** All controllers logic definition and implementation... */
var controller = {

    /** [ ADD USER ]
     * @param {*} req 
     * @param {*} res
     */
    addUser: async function (req, res)
    {
        auxFuncModule.logger("addUser",1)

        let newUser = new userModelItem()
        
        /**  - Step [1]
         *   - Get values to be stored...
         *   - via POST -> BODY
         */

        let bodyValues = req.body
        
        newUser.user_email      = bodyValues.user_email,      
        newUser.user_name       = bodyValues.user_name,       
        newUser.user_phone      = bodyValues.user_phone,
        newUser.user_priority   = bodyValues.user_priority,
        newUser.user_privilege  = bodyValues.user_privilege

        // Default MONI is available to new users...
        let userModules = ['MONI']
        newUser.user_modules = userModules

        auxFuncModule.logger("addUser",2,1)

        /**  - Step [2]
         *   - No empty values validation...
         */
        if (!auxFuncModule.isValidValue(newUser.user_email)) 
        {
            auxFuncModule.logger("addUser",3,2)
            return res.status(200).send({message:'0'})
        }else
        {
            /** - Step [3] 
             *  - check if it's already registered...
             */
            userModelItem.findOne({user_email:newUser.user_email}).then((foundObject) =>
            {
                if(foundObject)
                {                    
                    auxFuncModule,auxFuncModule.logger("addUser",3,3)
                    return res.status(200).send({message:'0'}) 
                }else
                {   
                    /** - Step [4]
                     *  - Save new user in DB...
                     */
                    newUser.save()

                    auxFuncModule.logger("addUser",2,3)
                    return res.status(200).send(newUser)
                } 
            })
        }
    },




    /** [ GET USER MODULES ]
     * @param {*} req 
     * @param {*} res
     */
    getUserModules: async function(req, res)
    {   
        auxFuncModule.logger("getUserModules",1)

        /** - Step [1]
         *  - Receive value from client request...
         *  - Via POST -> URL PARAMETER...
         */
        let searchingValue = Object.keys(req.query);

        if (!auxFuncModule.isValidValue(searchingValue))     
        {
            auxFuncModule.logger("getUserModules",3,1)
            return res.status(200).send({message:'0'})
        }else
        {
            /** - Step [2]
             *  - Actual search in DB...
             *  - Return all modules if user found...
             */
            await userModelItem.findOne({user_email:searchingValue[0]}).then((foundObject) =>
            {    
                if(!foundObject)
                {
                    auxFuncModule.logger("getUserModules",3,2)
                    return res.status(200).send({message:'0'})
                }else
                {
                    let userModules = []

                    foundObject.user_modules.forEach(element => 
                    {
                        userModules.push(element)    
                    });
            
                    auxFuncModule("getUserModules",2,2)
                    return res.status(200).send({userModules})
                }    
            }).catch((err)=>
            {
                auxFuncModule.logger("getUserModules",3,2)+err
                return res.status(200).send({message:'0'})  
            })
        } 
    },

} 

module.exports = controller