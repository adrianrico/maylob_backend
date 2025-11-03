'use strict'

/** Import MODEL SCHEMA from models MODULE...*/
var transporterModelItem = require('../MODELS/transporter.js')

/** Import auxiliary functions MODULE... */
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

/** All controllers logic definition and implementation... */
var controller = {

    /** [ CREATE TRANSPORTER ]
    * @param {*} req 
    * @param {*} res
    */    
    create_transporter: async function(req,res)
    {
        auxFuncModule.logger("create_transporter -> LN 18",1)

        /* - Step [1]
        *  - Receive values from CLIENT...
        *  - via POST -> BODY
        */
        let newTransporterObject = new transporterModelItem()
        let bodyValues           = req.body  

        newTransporterObject.transporter_id        = auxFuncModule.isValidValue(bodyValues.transporter_id)     ? bodyValues.transporter_id.toUpperCase()     : 'DATO NO ASIGNADO' ,
        newTransporterObject.transporter_name      = auxFuncModule.isValidValue(bodyValues.transporter_name)   ? bodyValues.transporter_name.toUpperCase()   : 'DATO NO ASIGNADO' ,
        newTransporterObject.transporter_caat      = auxFuncModule.isValidValue(bodyValues.transporter_caat  ) ? bodyValues.transporter_caat  .toUpperCase() : 'DATO NO ASIGNADO' 
      
        const dateTime = new Date()
        const timeSnapshot = dateTime.getDate()
        +"-"+ dateTime.toLocaleString('default',{month:'long'}).toUpperCase()
        +"-"+ dateTime.getFullYear()
        +" "+ dateTime.getHours()
        +":"+ dateTime.getMinutes() 
        +":"+ dateTime.getSeconds()

        newTransporterObject.transporter_registration = timeSnapshot

        //newTransporterObject.transporter_equipment = ['eco 23','c1']
        //newTransporterObject.transporter_operators = ['FRANCISCO GONZALEZ']

        auxFuncModule.logger("create_transporter -> LN 42",2,1)

        /* - Step [2]
        *  - Validate if client is already created, if not then create it... BE SURE TO CHANGE IT TO AN ID...!
        */ 
        await transporterModelItem.find({transporter_name:bodyValues.transporter_name}).then((transporterObjectFound)=>
        {
            //Not found, then save new...
            if(transporterObjectFound.length == 0)
            {
                newTransporterObject.save()
                auxFuncModule.logger("create_transporter -> LN 52",2,2)
                return res.status(200).send({message:'1'})
            }else
            {
                auxFuncModule.logger("create_transporter -> LN 56",2,2);
                return res.status(200).send({message:'0'})
            } 
        }).catch((err)=>
        {
            auxFuncModule.logger("create_transporter -> LN 61",5,2)+err
            return res.status(200).send({message:'0'})  
        }) 
    },





    /** [ READ TRANSPORTERS ] */ 
    read_transporters: async function(req,res)
    {
        auxFuncModule.logger("read_transporters -> LN 76",1)

        /* - Step [1]
        *  - Receive values from CLIENT if only one transporter should be found...
        *  - via POST -> BODY
        */
       
        let bodyValues = req.body
        
        auxFuncModule.logger("read_transporters -> LN 85",2,1)    

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
                        auxFuncModule.logger("read_transporters -> LN 100",3,2)    
                        return res.status(200).send({message:'0'})
                    }else
                    {
                        auxFuncModule.logger("read_transporters -> LN 104",2,2)
                        return res.status(200).send({transportersFound})
                    }
        
                }).catch((err)=>
                {
                    auxFuncModule.logger("read_transporters -> LN 110",5)+err
                    return res.status(200).send({message:'0'})  
                })
        }else 
        {  
            // [B]
            await transporterModelItem.find({}).then((transportersFound)=>
                {
                    // No transporters stored...
                    if(transportersFound.length === 0)
                    {
                        auxFuncModule.logger("read_transporters -> LN 121",3,2)    
                        return res.status(200).send({message:'0'})
                    }else
                    {
                        auxFuncModule.logger("read_transporters -> LN 125",2,2)
                        return res.status(200).send({transportersFound})
                    }
        
                }).catch((err)=>
                {
                    auxFuncModule.logger("read_transporters -> LN 131",5)+err
                    return res.status(200).send({message:'0'})  
                })
        }
    },


}

module.exports = controller