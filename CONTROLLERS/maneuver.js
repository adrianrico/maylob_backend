'use strict'

//Import required MODEL SCHEMAS from models MODULE...
var maneuverModelItem  = require('../MODELS/maneuver.js')
let transportModelItem = require('../MODELS/transporter.js') 
let objectModelItem    = require('../MODELS/object.js') 

// Import auxiliary functions MODULE...
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')
const { get } = require('mongoose')

// All controllers logic definition and implementation...
var controller = {

    /** [ ADD MANEUVER ]
    * @param {*} req 
    * @param {*} res
    */    
    addManeuver: async function(req,res)
    {
        auxFuncModule.logger("addManeuver",1)

        /** Steps handler... */
        let stepsHandler = [false,false]    

        /** - Step [1]
         *  - Receive values from CLIENT...
         *  - via POST -> BODY
         */
        let newManeuverObject = new maneuverModelItem()
        let bodyValues        = req.body  

        newManeuverObject.maneuver_id               = ''
        newManeuverObject.maneuver_type             = bodyValues.maneuver_type,
        newManeuverObject.maneuver_origin           = bodyValues.maneuver_origin,
        newManeuverObject.maneuver_destination      = bodyValues.maneuver_destination,
        newManeuverObject.maneuver_customer         = bodyValues.maneuver_customer,
        newManeuverObject.maneuver_planned_date     = bodyValues.maneuver_planned_date,
        newManeuverObject.maneuver_operator         = bodyValues.maneuver_operator,
        newManeuverObject.maneuver_directive        = "PUERTO - PATIO"
        newManeuverObject.maneuver_current_location = "SIN INICIAR"
        newManeuverObject.maneuver_current_status   = "SIN INICIAR"
        newManeuverObject.maneuver_equipment        = bodyValues.maneuver_equipment
        newManeuverObject.maneuver_containers       = bodyValues.maneuver_containers    
        newManeuverObject.maneuver_tracking_link    = bodyValues.maneuver_tracking_link    

        const dateTime = new Date()
        const event_time = dateTime.getDate()
        +"-"+ dateTime.toLocaleString('default',{month:'long'}).toUpperCase()
        +"-"+ dateTime.getFullYear()
        +" "+ dateTime.getHours()
        +":"+ dateTime.getMinutes() 
        +":"+ dateTime.getSeconds()

        let starting_events = [event_time, 'SIN INICIAR', 'SIN INICIAR','0%']

        newManeuverObject.maneuver_events = starting_events

        stepsHandler[0] = true
        auxFuncModule.logger("addManeuver",2,1)

        /** - Step [2]
         *  - Change equipment status in DB...
         */ 

        const statusPromises    = []
        let updateObjectChecker = 0

        if (bodyValues.maneuver_type !== 'EXTERNA')
        {
            newManeuverObject.maneuver_equipment.forEach(equipmentElement => 
            {
                const promise = objectModelItem.findOneAndUpdate({object_id:equipmentElement},{object_available:0,object_requested:1},{new:true}).then((updatedObject) =>
                {
                    if(!updatedObject)
                    {
                        auxFuncModule.logger("addManeuver",3,2)
                    }else
                    {
                        updateObjectChecker++ 
                        console.log('[i][addManeuver] - Step 2; FLAGS available & requested changed...')
                    } 
                }).catch((err)=>
                {
                    auxFuncModule.logger("addManeuver",3,2)+err
                })

                statusPromises.push(promise)        
            })
        }   

        await Promise.all(statusPromises).then(()=>
        {
            auxFuncModule.logger("addManeuver",2,2)
            stepsHandler[1]  = true
        })  


        /** - Step [3]
         *  - Validate if maneuver exists already...
         *  - If validation ok then maneuver is saved...
         */ 
        if (stepsHandler[1])
        {
            let firstIDSection  = generateIDHeader(newManeuverObject.maneuver_operator,newManeuverObject.maneuver_customer,newManeuverObject.maneuver_planned_date)
            let headerSearch    = new RegExp("^" + firstIDSection, "i")
        
            await maneuverModelItem.find({maneuver_id:{$regex:headerSearch}}).then((maneuverObjectFound)=>
            {
                /** - Step [3]
                 *  - Save new maneuver...
                 *  - By using REGEX the promise will find the # of coincidences
                 *    that´s why using maneuverObjectFound.length+1 for consecutive...
                 */
            
                 if(maneuverObjectFound.length == 0)
                {
                    newManeuverObject.maneuver_id = firstIDSection+"_01"
                    newManeuverObject.save()
                
                    auxFuncModule.logger("addManeuver",2,3)
                
                    //return res.status(200).send(newManeuverObject)
                }else
                {
                    let nextConsecutiveID = firstIDSection+"_0"+(maneuverObjectFound.length+1)
                    newManeuverObject.maneuver_id = nextConsecutiveID
                    newManeuverObject.save()
                
                    auxFuncModule.logger("addManeuver",2,3);
                    //return res.status(200).send(newManeuverObject)
                } 
            })   
        }   

        return res.status(200).send({message:'MANIOBRA GUARDADA'})
    },






    
    


    
    /** [ UPDATE MANEUVER ]
     * @param {*} req 
     * @param {*} res
     */
    updateManeuver: async function(req, res)
    {
        auxFuncModule.logger("updateManeuver_195",1)

        /** - Step [1]
         *  - Receive filter values from client request...
         *  - via -> PATCH -> BODY
         */
        let bodyValues = req.body;

        if (!auxFuncModule.isValidValue(bodyValues.maneuver_id)) 
        {
            auxFuncModule.logger("updateManeuver_205",3,1)
            return res.status(200).send({message:'0'}) 
        }else
        {
            auxFuncModule.logger("updateManeuver_209",2,1)

            /** - Step [2]
             *  - Search maneuver in the DB...
             */
            await maneuverModelItem.find({maneuver_id:bodyValues.maneuver_id}).then((foundManeuver)=>
            {   

                if (foundManeuver.length <= 0)
                {
                    auxFuncModule.logger("updateManeuver_219",3,2)
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger("updateManeuver_223",2,2)

                    let eventsFound = foundManeuver[0].maneuver_events.length;
                    let event       = [bodyValues.maneuver_event_time,bodyValues.maneuver_current_location,bodyValues.maneuver_current_status,bodyValues.maneuver_completion] 

                    for (let index = 0; index <= eventsFound; index++) 
                    {
                        if(foundManeuver[0].maneuver_events[(index*4)+1] === bodyValues.maneuver_current_location && foundManeuver[0].maneuver_events[(index*4)+2] === bodyValues.maneuver_current_status) 
                        {
                            //console.log(foundManeuver[0].maneuver_events[(index*4)+1],foundManeuver[0].maneuver_events[(index*4)+2]);
                            return res.status(200).send({message:'event already saved...'})
                        }else
                        {
                            if (index+1 === eventsFound) 
                            {
                                maneuverModelItem.findOneAndUpdate(
                                    { maneuver_id:bodyValues.maneuver_id }, // Search Filter...
                                    {
                                    // Update loop...
                                    $push:{maneuver_events:{$each:event}},
                                    $set:
                                        {
                                            maneuver_current_location:bodyValues.maneuver_current_location,
                                            maneuver_current_status:bodyValues.maneuver_current_status
                                        }
                                    }, 
                                    {new:true}
                                )
                                .then((updatedManeuver) =>
                                {
                                    if(!updatedManeuver)
                                    {
                                        auxFuncModule.logger("updateManeuver_255",3,2)
                                        return res.status(200).send({message:'0'})       
                                    }else
                                    {
                                        auxFuncModule.logger("updateManeuver_259",2,2)
                                        return res.status(200).send({updatedManeuver})
                                    }                   
                                }).catch((err)=>
                                {
                                    auxFuncModule.logger("updateManeuver_264",5,2)+err
                                    return res.status(200).send({message:'0'})  
                                }) 
                            }
                        }
                    }
                }
            }).catch((err)=>
            {
                auxFuncModule.logger("updateManeuver_273",5,2)+err
                return res.status(200).send({message:'0'})  
            })
        } 
    },








    

    /** [ UPDATE MANEUVER GPS ]
     * @param {*} req 
     * @param {*} res
     */
    updateManeuverGPS: async function(req, res)
    {
        auxFuncModule.logger("updateManeuverGPS",1)

        /** - Step [1]
         *  - Receive filter values from client request...
         *  - via -> PATCH -> BODY
         */
        let bodyValues = req.body;

        if (!auxFuncModule.isValidValue(bodyValues.maneuver_id)) 
        {
            auxFuncModule.logger("updateManeuverGPS",3,1)
            return res.status(200).send({message:'0'}) 
        }else
        {
            auxFuncModule.logger("updateManeuverGPS",2,1)
           
            /** - Step [2]
             *  - Update maneuver in DB...
             */
            await maneuverModelItem.findOneAndUpdate({maneuver_id:bodyValues.maneuver_id },{maneuver_tracking_link:bodyValues.maneuver_tracking_link},{new:true}).then((updatedManeuver) =>
            {
                if(!updatedManeuver)
                {
                    auxFuncModule.logger("updateManeuverGPS",3,2)
                    return res.status(200).send({message:'0'})       
                }else
                {
                    auxFuncModule.logger("updateManeuverGPS",2,2)
                    return res.status(200).send({updatedManeuver})
                }                   
            }).catch((err)=>
            {
                auxFuncModule.logger("updateManeuverGPS",3,2)+err
                return res.status(200).send({message:'0'})  
            }) 
        } 
    },
    




    /** [ GET MANEUVER GPS ]
     * @param {*} req 
     * @param {*} res
     */
        getGPS: async function(req, res)
        {
            auxFuncModule.logger("getGPS",1)
        
            /** - Step [1]
             *  - get maneuver ID from client request...
             *  - via GET -> URL PARAMETER
             */
            let searchingValue = Object.keys(req.query);

            console.log(searchingValue);

            if(!auxFuncModule.isValidValue(searchingValue))
            {
                auxFuncModule.logger("getGPS",3,1)
                return res.status(200).send({message:'0'})
            }else
            {
                /** - Step [2]
                 *  - Search maneuver in the DB...
                 */
                await maneuverModelItem.find({maneuver_id:searchingValue}).then((foundManeuver)=>
                {   
                    if (foundManeuver.length <= 0)
                    {
                        auxFuncModule.logger("getGPS",3,2)
                        return res.status(200).send({message:'0'})
                    }else
                    {
                        let trackingLink = foundManeuver[0].maneuver_tracking_link

                        auxFuncModule.logger("getGPS",2,2)
                        return res.status(200).send({trackingLink})    
                    }
                }).catch((err)=>
                {
                    auxFuncModule.logger("getGPS",3,2)+err
                    return res.status(200).send({message:'0'})  
                })
            }
        },














        
//#region [ v1.2 CONTROLLER ]

    // [ SAVE NEW MANEUVER ][⚑]
    saveNewManeuver: async function(req,res)
    {
        let function_name = "saveNewManeuver"
        auxFuncModule.logger(function_name, 365,0)

        /* - Step [1]
        *  - Receive values from CLIENT and validate them...
        *  - via POST -> BODY
        */
        let newManeuverObject = new maneuverModelItem()
        let bodyValues        = req.body  

        // Block 1 data...
        newManeuverObject.man_cliente   = auxFuncModule.isValidValue(bodyValues.man_cliente)   ? bodyValues.man_cliente.toUpperCase()   : 'SIN DATO ASIGNADO'
        newManeuverObject.man_modalidad = auxFuncModule.isValidValue(bodyValues.man_modalidad) ? bodyValues.man_modalidad.toUpperCase() : 'SIN DATO ASIGNADO'
        newManeuverObject.man_despacho  = auxFuncModule.isValidValue(bodyValues.man_despacho)  ? bodyValues.man_despacho                : 'SIN DATO ASIGNADO'
        newManeuverObject.man_aa        = auxFuncModule.isValidValue(bodyValues.man_aa)        ? bodyValues.man_aa.toUpperCase()        : 'SIN DATO ASIGNADO'
        newManeuverObject.man_ejecutiva = auxFuncModule.isValidValue(bodyValues.man_ejecutiva) ? bodyValues.man_ejecutiva.toUpperCase() : 'SIN DATO ASIGNADO'

        // Block 2 data...
        newManeuverObject.man_terminal               = auxFuncModule.isValidValue(bodyValues.man_terminal)               ? bodyValues.man_terminal               : 'SIN DATO ASIGNADO'
        newManeuverObject.man_descarga               = auxFuncModule.isValidValue(bodyValues.man_descarga)               ? bodyValues.man_descarga               : 'SIN DATO ASIGNADO'
        newManeuverObject.man_descarga_extraLocation = auxFuncModule.isValidValue(bodyValues.man_descarga_extraLocation) ? bodyValues.man_descarga_extraLocation : 'SIN DATO ASIGNADO'
        
        // Block 3 data...
        newManeuverObject.man_transportista = auxFuncModule.isValidValue(bodyValues.man_transportista) ? bodyValues.man_transportista : 'SIN DATO ASIGNADO' ,    
        newManeuverObject.man_eco           = auxFuncModule.isValidValue(bodyValues.man_eco)           ? bodyValues.man_eco           : 'SIN DATO ASIGNADO' ,
        newManeuverObject.man_operador      = auxFuncModule.isValidValue(bodyValues.man_operador)      ? bodyValues.man_operador      : 'SIN DATO ASIGNADO' , 
        newManeuverObject.man_gpsLink       = auxFuncModule.isValidValue(bodyValues.man_gpsLink)       ? bodyValues.man_gpsLink       : 'SIN DATO ASIGNADO' ,     
  
        // Block 4...
        newManeuverObject.manCont_1_id        = auxFuncModule.isValidValue(bodyValues.manCont_1_id)        ? bodyValues.manCont_1_id.toUpperCase()        : ''   
        newManeuverObject.manCont_1_size      = auxFuncModule.isValidValue(bodyValues.manCont_1_size)      ? bodyValues.manCont_1_size                    : ''   
        newManeuverObject.manCont_1_contenido = auxFuncModule.isValidValue(bodyValues.manCont_1_contenido) ? bodyValues.manCont_1_contenido.toUpperCase() : ''   
        newManeuverObject.manCont_1_peso      = auxFuncModule.isValidValue(bodyValues.manCont_1_peso)      ? bodyValues.manCont_1_peso                    : ''   
        newManeuverObject.manCont_1_tipo      = auxFuncModule.isValidValue(bodyValues.manCont_1_tipo)      ? bodyValues.manCont_1_tipo.toUpperCase()      : '' 

        // Block 5...
        newManeuverObject.manCont_2_id        = auxFuncModule.isValidValue(bodyValues.manCont_2_id)        ? bodyValues.manCont_2_id.toUpperCase()        : ''
        newManeuverObject.manCont_2_size      = auxFuncModule.isValidValue(bodyValues.manCont_2_size)      ? bodyValues.manCont_2_size                    : ''
        newManeuverObject.manCont_2_contenido = auxFuncModule.isValidValue(bodyValues.manCont_2_contenido) ? bodyValues.manCont_2_contenido.toUpperCase() : ''
        newManeuverObject.manCont_2_peso      = auxFuncModule.isValidValue(bodyValues.manCont_2_peso)      ? bodyValues.manCont_2_peso                    : ''
        newManeuverObject.manCont_2_tipo      = auxFuncModule.isValidValue(bodyValues.manCont_2_tipo)      ? bodyValues.manCont_2_tipo.toUpperCase()      : ''

        // Block 6...
        newManeuverObject.manCont_3_id        = auxFuncModule.isValidValue(bodyValues.manCont_3_id)        ? bodyValues.manCont_3_id.toUpperCase()        : '' ,    
        newManeuverObject.manCont_3_size      = auxFuncModule.isValidValue(bodyValues.manCont_3_size)      ? bodyValues.manCont_3_size                    : '' ,    
        newManeuverObject.manCont_3_contenido = auxFuncModule.isValidValue(bodyValues.manCont_3_contenido) ? bodyValues.manCont_3_contenido.toUpperCase() : '' ,    
        newManeuverObject.manCont_3_peso      = auxFuncModule.isValidValue(bodyValues.manCont_3_peso)      ? bodyValues.manCont_3_peso                    : '' ,    
        newManeuverObject.manCont_3_tipo      = auxFuncModule.isValidValue(bodyValues.manCont_3_tipo)      ? bodyValues.manCont_3_tipo.toUpperCase()      : '' ,  

        // Block 7...
        newManeuverObject.manCont_4_id        = auxFuncModule.isValidValue(bodyValues.manCont_4_id)        ? bodyValues.manCont_4_id.toUpperCase()        : '' ,    
        newManeuverObject.manCont_4_size      = auxFuncModule.isValidValue(bodyValues.manCont_4_size)      ? bodyValues.manCont_4_size                    : '' ,    
        newManeuverObject.manCont_4_contenido = auxFuncModule.isValidValue(bodyValues.manCont_4_contenido) ? bodyValues.manCont_4_contenido.toUpperCase() : '' ,    
        newManeuverObject.manCont_4_peso      = auxFuncModule.isValidValue(bodyValues.manCont_4_peso)      ? bodyValues.manCont_4_peso                    : '' ,    
        newManeuverObject.manCont_4_tipo      = auxFuncModule.isValidValue(bodyValues.manCont_4_tipo)      ? bodyValues.manCont_4_tipo.toUpperCase()      : '' 

        // Build initial default values...
        newManeuverObject.man_note                  = ""
        newManeuverObject.maneuver_update_action    = "CREATED MANEUVER"
        newManeuverObject.maneuver_update_source    = "ADMINISTRATOR"
        newManeuverObject.maneuver_update_date      = timeSnapshot()
        newManeuverObject.maneuver_directive        = "PUERTO - PATIO"
        newManeuverObject.maneuver_current_location = "SIN INICIAR"
        newManeuverObject.maneuver_current_status   = "SIN INICIAR"
        newManeuverObject.man_moni_enable           = "true"
        newManeuverObject.man_moni_key              = "NO KEY"

        //  Events handled like array -> INDEX * 4 -> Each event length -> [0] Date and time | [1] Location | [2] Status | [3] Percentage...
        let starting_events = [timeSnapshot(), 'SIN INICIAR', 'SIN INICIAR','0%']
        newManeuverObject.maneuver_events = starting_events

        auxFuncModule.logger(function_name,432,1,1,"[i] Initial values processed")

        /* - Step [2]
        *  - Start promises to get PLATES and get CAAT before saving...
        */ 
        let searchPromises = []
        const getPlates_promise = objectModelItem.find({object_owner:bodyValues.man_transportista,object_id:bodyValues.man_eco}).then((foundObject)=>
        {
            if(!foundObject)
            {
                auxFuncModule.logger(function_name, 442,2,2,"[e] Error, PLATES not found...")
            }else
            {
                newManeuverObject.man_placas = foundObject[0].object_plates
                auxFuncModule.logger(function_name, 446,2,1,"[i] PLATES value found, ready to update...")
            } 
        })

        const getCAAT_promise = transportModelItem.find({transporter_name:bodyValues.man_transportista}).then((foundTransporter)=>
        {
            if(!foundTransporter)
            {
                auxFuncModule.logger(function_name, 454,2,2,"[e] Error, CAAT not found...")
            }else
            {
                newManeuverObject.man_caat = foundTransporter[0].transporter_caat
                auxFuncModule.logger(function_name, 458,2,1,"[i] CAAT value found, ready to update...")
            } 
        })
 
        searchPromises.push(getPlates_promise)
        searchPromises.push(getCAAT_promise)

        // Wait for previous promises to resolve before genetaring new DOCUMENT...
        await Promise.all(searchPromises).then(()=>
        {
            auxFuncModule.logger(function_name, 468,2,1)

            /* - Step [3]
            *  - Generate new maneuver ID based on the input data if previous promises were completed...
            */ 

            let firstIDSection  = generateIDHeader(newManeuverObject.man_operador,newManeuverObject.man_cliente,newManeuverObject.man_despacho)
            let headerSearch    = new RegExp("^" + firstIDSection, "i")

            auxFuncModule.logger(function_name, 477,3,1,"[i] Generated first MANEUVER ID section...")

            /* - Step [4]
            *  - Save new maneuver by finding maneuver ID...
            */ 
            maneuverModelItem.find({man_folio:{$regex:headerSearch}}).then((maneuverObjectFound)=>
            {
                if(maneuverObjectFound.length == 0)
                {
                    newManeuverObject.man_folio = firstIDSection+"_01"
                    newManeuverObject.save()
                
                    auxFuncModule.logger(function_name,489,4,1,"[i] Consecutive maneuver stored...")
                
                    return res.status(200).send({message:'1'})
                }else
                {
                    let nextConsecutiveID = firstIDSection+"_0"+(maneuverObjectFound.length+1)
                    newManeuverObject.man_folio = nextConsecutiveID
                    newManeuverObject.save()
                
                    auxFuncModule.logger(function_name,498,4,1,"[i] First maneuver stored...")

                    return res.status(200).send({message:'1'})
                } 
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name, 508,4,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })  
        })
    },





    // [ DELETE MANEUVER ][⚑]
    deleteManeuver: async function(req,res)
    {        
        let function_name = 'deleteManeuver'
        auxFuncModule.logger(function_name, 518,0)

        /* - Step [1]
        *  - Receive values from CLIENT...
        *  - via POST -> BODY
        */
        let bodyValues = req.body 

        /* - Step[2] 
        *  - Received parameter double check...
        */
        if (!auxFuncModule.isValidValue(bodyValues.maneuverID_toDelete)) 
        {
            auxFuncModule.logger(function_name, 531,2,2,"[e] Empty MAN ID value received, stopping and sending res 0...")
            return res.status(200).send({message:'0'}) 
        }else
        {
            /* - Step[3] 
            *  - Virtual DELETE DB...
            */
            await maneuverModelItem.findOneAndUpdate({man_folio:bodyValues.maneuverID_toDelete},
                {maneuver_update_action:"DELETED MANEUVER"},
                {maneuver_update_source:"ADMINISTRATOR"},
                {maneuver_update_date:timeSnapshot()},
            ).then((deletedManeuver) =>
            {
                if(!deletedManeuver)
                {
                    auxFuncModule.logger(function_name, 546,3,2,"[e] Error while deleting, maneuver not updated...")
                    return res.status(200).send({message:'0'})       
                }else
                {
                    auxFuncModule.logger(function_name, 550,2,1,"[i] Maneuver updated, virtually deleted...")
                    return res.status(200).send({message:'1'})
                }                   
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name, 555,3,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            }) 
        }
    },





    // [ GET ALL MANEUVERS ][⚑]
    getAllManeuvers: async function(req, res)
    {
        let function_name = "getAllManeuvers"
        auxFuncModule.logger(function_name,569,0)

        /* - Step [1]
        *  - Search for maneuvers that are not "DELETED"...
        */
        await maneuverModelItem.find({maneuver_update_action:{$ne:"DELETED MANEUVER"}}).then((objectsFound)=>
        {
            if(objectsFound.length === 0)
            {
                auxFuncModule.logger(function_name,578,1,2,"[e] Error while searching...")
                return res.status(200).send({message:'0'})
            }else
            {
                auxFuncModule.logger(function_name,582,1,1,"[i] Maneuvers found...")
                return res.status(200).send({objectsFound})
            }

        }).catch((err)=>
        {
            auxFuncModule.logger(function_name,588,1,3,"[e] "+err)
            return res.status(200).send({message:'0'})  
        })
    },





    // [ UPDATE MANEUVER GPS TRACKING LINK ][⚑]
    updateTrackingLink: async function(req, res)
    {
        let function_name = "updateTrackingLink"
        auxFuncModule.logger(function_name,601,0)

        /* - Step [1]
        *  - Receive values from client request...
        *  - via -> PATCH -> BODY
        */
        let bodyValues = req.body;
        
        if (!auxFuncModule.isValidValue(bodyValues.man_folio)) 
        {
            auxFuncModule.logger(function_name,611,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'}) 
        }else
        {
            /* - Step [2]
            *  - Update maneuver tracking link in DB...
            */
            await maneuverModelItem.findOneAndUpdate({man_folio:bodyValues.man_folio},
                {man_gpsLink:bodyValues.man_gpsLink},
                {maneuver_update_action:"UPDATED GPS LINK"},
                {maneuver_update_source:"ADMINISTRATOR"},
                {maneuver_update_date:timeSnapshot()},
            ).then((updatedManeuver) =>
            {
                if(!updatedManeuver)
                {
                    auxFuncModule.logger(function_name,627,2,2,"[e] Error while searching...")
                    return res.status(200).send({message:'0'})       
                }else
                {
                    auxFuncModule.logger(function_name,631,2,1,"[i] GPS LINK updated...")
                    return res.status(200).send({message:'1'})
                }                   
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,636,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        } 
    },





    // [ GET CLIENT MANEUVERS ][⚑]
    getClientManeuvers: async function(req, res)
    {
        let function_name = "getClientManeuvers"
        auxFuncModule.logger(function_name,650,0)

        /* - Step [1]
        *  - Receive SEARCH KEY from client request...
        *  - via GET -> URL PARAMETER
        */
        let search_key = Object.keys(req.query);

        if(!auxFuncModule.isValidValue(search_key))
        {
            auxFuncModule.logger(function_name,660,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'})
        }else
        {
            /* - Step [2]
            *  - Search maneuver in the DB...
            */
            await maneuverModelItem.find({man_cliente:search_key[0],maneuver_current_status:{$nin:["100%"]},man_moni_enable:"true"}).then((foundManeuver)=>
            {   
                if (foundManeuver.length <= 0)
                {
                    auxFuncModule.logger(function_name,671,2,2,"[e] Maneuvers not found...")
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger(function_name,675,2,1,"[i] Sending all found maneuvers...")
                    return res.status(200).send({foundManeuver})    
                }
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,660,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        }
    },





    // [ UPDATE MANEUVER MONI ENABLE VALUES ][⚑]
    updateMoniStatus: async function(req, res)
    {
        let function_name = "updateMoniStatus"
        auxFuncModule.logger(function_name,694,0)
        
        /* - Step [1]
        *  - Receive values from client request...
        *  - via -> PATCH -> BODY
        */
        let bodyValues = req.body;
        
        if (!auxFuncModule.isValidValue(bodyValues.man_folio)) 
        {
            auxFuncModule.logger(function_name,704,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'}) 
        }else
        {
            /* - Step [2]
            *  - Update maneuver in DB...
            */
            await maneuverModelItem.findOneAndUpdate({man_folio:bodyValues.man_folio},
                {man_moni_enable:bodyValues.man_moni_enable},
                {maneuver_update_action:"UPDATED MONI STATUS"},
                {maneuver_update_source:"ADMINISTRATOR"},
                {maneuver_update_date:timeSnapshot()},
            ).then((updatedManeuver) =>
            {
                if(!updatedManeuver)
                {
                    auxFuncModule.logger(function_name,720,2,2,"[e] MONI STATUS not updated...")
                    return res.status(200).send({message:'0'})       
                }else
                {
                    auxFuncModule.logger(function_name,724,2,1,"[i] MONI STATUS updated...")
                    return res.status(200).send({message:'1'})
                }                   
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,729,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        } 
    },





    // [ SEND MANEUVER GPS LOCATION ][⚑]
    getGPS: async function(req, res)
    {
        let function_name = "getGPS"
        auxFuncModule.logger(function_name,743,0)
    
        /* - Step [1]
        *  - get maneuver ID from client request...
        *  - via GET -> URL PARAMETER
        */
        let searchingValue = Object.keys(req.query);

        if(!auxFuncModule.isValidValue(searchingValue))
        {
            auxFuncModule.logger(function_name,753,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'})
        }else
        {
            /* - Step [2]
            *  - Search maneuver in the DB...
            */
            await maneuverModelItem.find({man_folio:searchingValue}).then((foundManeuver)=>
            {   
                if (foundManeuver.length <= 0)
                {
                    auxFuncModule.logger(function_name,764,2,2,"[e] MAN ID not found...")
                    return res.status(200).send({message:'0'})
                }else
                {
                    let trackingLink = foundManeuver[0].man_gpsLink
                    auxFuncModule.logger(function_name,764,2,1,"[i] MAN ID not found...")
                    return res.status(200).send({trackingLink})    
                }
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,774,2,3,"[i] "+err)
                return res.status(200).send({message:'0'})  
            })
        }
    },





    // [ UPDATE MANEUVER LOCATION AND EVENTS ][⚑]
    updateManeuverEvents: async function(req, res)
    {
        let function_name = "updateManeuverEvents"
        auxFuncModule.logger(function_name,788,0)

        /* - Step [1]
        *  - Receive searching values from client request...
        *  - via -> PATCH -> BODY
        */
        let bodyValues = req.body; //Receive man_folio, man_location, man_event...

        if (!auxFuncModule.isValidValue(bodyValues.man_folio)) 
        {
            auxFuncModule.logger(function_name,798,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'}) 
        }else
        {
            /* - Step [2]
            *  - Find maneuver in BD...
            */
            await maneuverModelItem.find({man_folio:bodyValues.man_folio}).then((foundManeuver)=>
            {   
                if (foundManeuver.length <= 0)
                {
                    auxFuncModule.logger(function_name,809,2,2,"[e] MAN ID not found...")
                    return res.status(200).send({message:'0'})
                }else
                {
                    /* - Step [3]
                    *  - Validate if user data is a valid combination...
                    */
                    if (processEvent(bodyValues.man_location,bodyValues.man_event).length <= 1) //Means that a valid combination was not found...
                    {
                        auxFuncModule.logger(function_name,818,3,2,"[e] Not a valid EVENT combination...")
                        return res.status(200).send({message:'0'})    
                    }else
                    {
                        let event = processEvent(bodyValues.man_location,bodyValues.man_event)

                        let maneuver_finish_date = 'Aún en curso'

                        if (event[2] === 'FINALIZADO' || event[3] === '100%') 
                        {
                            maneuver_finish_date = timeSnapshot()
                        }

                        maneuverModelItem.findOneAndUpdate(
                            { man_folio:bodyValues.man_folio }, // Search Filter...
                            {
                            // Update loop...
                            $push:{maneuver_events:{$each:event}},
                            $set:
                                {
                                    maneuver_current_location:bodyValues.man_location,
                                    maneuver_current_status:bodyValues.man_event,
                                    maneuver_update_action:'UPDATED EVENT',
                                    maneuver_update_source:'ADMINISTRATOR',
                                    maneuver_update_date:event_time,
                                    man_termino:maneuver_finish_date
                                }
                            }, 
                            {new:true}
                        )
                        .then((updatedManeuver) =>
                        {
                            if(!updatedManeuver)
                            {
                                auxFuncModule.logger(function_name,852,3,2,"[e] EVENT was not updated...")
                                return res.status(200).send({message:'0'})       
                            }else
                            {
                                auxFuncModule.logger(function_name,856,3,1,"[i] EVENT updated succesfully...")
                                return res.status(200).send({message:'1'})
                            }                   
                        }).catch((err)=>
                        {
                            auxFuncModule.logger(function_name,861,3,3,"[e] "+err)
                            return res.status(200).send({message:'0'})  
                        })               
                    }
                }
                
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,869,3,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
                            
        }
    },





    // [ UPDATE MANEUVER NOTE ][⚑]
    updateNote: async function(req, res)
    {
        let function_name = "updateNote"
        auxFuncModule.logger(function_name,884,0)

        /* - Step [1]
        *  - Receive values from client request...
        *  - via -> PATCH -> BODY
        */
        let bodyValues = req.body;
        
        if (!auxFuncModule.isValidValue(bodyValues.man_folio)) 
        {
            auxFuncModule.logger(function_name,894,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'}) 
        }else
        {
            /* - Step [2]
            *  - Update maneuver NOTE in DB...
            */
    
            await maneuverModelItem.findOneAndUpdate({man_folio:bodyValues.man_folio},
                {man_note:bodyValues.man_note},
                {maneuver_update_action:"UPDATED NOTE"},
                {maneuver_update_source:"ADMINISTRATOR"},
                {maneuver_update_date:timeSnapshot()},
            ).then((updatedManeuver) =>
            {
                if(!updatedManeuver)
                {
                    auxFuncModule.logger(function_name,911,2,2,"[e] NOTE not updated...")
                    return res.status(200).send({message:'0'})       
                }else
                {
                    auxFuncModule.logger(function_name,915,2,1,"[i] NOTE updated succesfully...")
                    return res.status(200).send({message:'1'})
                }                   
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,920,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        } 
    },





    // [ FIND ONE MANEUVER BY MANEUVER ID ONLY ][⚑]
    findManeuver: async function(req, res)
    {
        let function_name = "findManeuver"
        auxFuncModule.logger(function_name,934,0)
    
        /** - Step [1]
         *  - get searching value from client...
         *  - via GET -> URL PARAMETER
         */
        let searchingValue = Object.keys(req.query);

        if(!auxFuncModule.isValidValue(searchingValue))
        {
            auxFuncModule.logger(function_name,944,1,2,"[e] Empty MAN ID value received...")
            return res.status(200).send({message:'0'})
        }else
        {
            /** - Step [2]
             *  - Search maneuver in the DB...
             */
            await maneuverModelItem.find({man_folio:searchingValue}).then((foundManeuver)=>
            {   
                if (foundManeuver.length <= 0)
                {
                    auxFuncModule.logger(function_name,955,2,2,"[e] MAN not found...")
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger(function_name,959,2,1)
                    return res.status(200).send({foundManeuver})    
                }
            }).catch((err)=>
            {
                auxFuncModule.logger(function_name,964,2,3,"[e] "+err)
                return res.status(200).send({message:'0'})  
            })
        }
    },





    // [ MASIVE MANEUVERS UPDATE ]
    updateManeuvers: async function(req, res) 
    {
        let function_name = 'updateManeuvers'
        auxFuncModule.logger(function_name, 1042,0)

        /** - Step [1]
         *  - Receive maneuvers objects from client...
         *  - Via PATCH...
         *  - used CONTENT/TYPE on client request to handle this...!
         */
        let body_values = req.body;
        auxFuncModule.logger(function_name,1050,1,1,"[i] Received objects from client: "+body_values.objects_to_save.length)

        /** - Step [2]
         *  - Validate values and set defaults...
         */
        for (let index = 0; index < body_values.objects_to_save.length; index++) 
        {
            auxFuncModule.isValidValue(body_values.objects_to_save[index].man_cliente) ? body_values.objects_to_save[index].man_cliente = body_values.objects_to_save[index].man_cliente : "PENDIENTE" 

            // Maneuver start date assigment...
            let maneuverStartDate  = auxFuncModule.isValidValue(body_values.objects_to_save[index].man_despacho) ? body_values.objects_to_save[index].man_despacho = body_values.objects_to_save[index].man_despacho : "" 
            body_values.objects_to_save[index].man_despacho = maneuverStartDate
            body_values.objects_to_save[index].man_termino  = 'SIN INICIAR'

            body_values.objects_to_save[index].maneuver_update_action = 'UPDATED EVENT'
            body_values.objects_to_save[index].maneuver_update_source = 'ADMINISTRATOR'
            body_values.objects_to_save[index].maneuver_update_date   = timeSnapshot()

            //auxFuncModule.logger(function_name,1064,2,1,"[i] "+body_values.objects_to_save[index].man_folio+" Initial values processed")
        } auxFuncModule.logger(function_name,1005,2,1,"[i] Initial values processed")
        
        /** - Step [3]
         *  - If ECO values are not empty, find respective plates to be updated next...
         */
        let found_plates          = []
        let found_plates_promises = []
        for (let index = 0; index < body_values.objects_to_save.length; index++) 
        {
            // If received ECO is empty, allow to keep empty value...
            if (!auxFuncModule.isValidValue(body_values.objects_to_save[index].man_eco)) 
            {
                found_plates.push(body_values.objects_to_save[index].man_folio)
                found_plates.push("N/A") 

                auxFuncModule.logger(function_name, 1020,3,1,"[i] "+body_values.objects_to_save[index].man_folio + " ECO selection empty, setting PLATES & ECO to empty value..." );
            }else
            {   
                // If ECO input valid update new plates...
                const find_plates = objectModelItem.find({object_owner:body_values.objects_to_save[index].man_transportista,object_id:body_values.objects_to_save[index].man_eco}).then((foundObject)=>
                {
                    if(!foundObject)
                    {
                        auxFuncModule.logger(function_name, 1028,3,3,"[e] "+body_values.objects_to_save[index].man_folio+" Original object not found...")
                    }else
                    {
                        found_plates.push(body_values.objects_to_save[index].man_folio)
                        found_plates.push(foundObject[0].object_plates) 

                        auxFuncModule.logger(function_name, 1034,3,1,"[i] "+body_values.objects_to_save[index].man_folio+" ECO selection valid, value ready to update...")
                    } 
                })

                found_plates_promises.push(find_plates) 
            }
        } 

        /** - Step [4]
         *  - Wait until plates are found to update new plates on the maneuver document...
         */
        let updated_plates_promises = []
        await Promise.all(found_plates_promises).then(()=>
        {
            for (let index = 0; index < body_values.objects_to_save.length; index++) 
            {
                const id_2_update = body_values.objects_to_save[index].man_folio 

                const update_plates = maneuverModelItem.findOneAndUpdate({man_folio: id_2_update},{man_placas: found_plates[(index * 2) + 1 ]}).then((updated_maneuver) =>
                {
                    if (!updated_maneuver) 
                    {
                        auxFuncModule.logger(function_name, 1056,4,3,"[e] "+id_2_update+" PLATES not updated...")
                    }else
                    {
                        auxFuncModule.logger(function_name, 1059,4,1,"[i] "+id_2_update+" PLATES updated...")
                    }
                })

                updated_plates_promises.push(update_plates)
            } 
        }) 

        /** - Step [5]
         *  - Once plates update promises are completed update remaining document's fields...
         */
        let basic_data_promises = []
        await Promise.all(updated_plates_promises).then(()=>
        {
            for (let index = 0; index < body_values.objects_to_save.length; index++) 
            {     
               const id_2_update = body_values.objects_to_save[index].man_folio
            
                // Find original stored documents to keep original values in case new data is not valid...
                const find_original_maneuver = maneuverModelItem.find({man_folio:id_2_update},{_id:0,__v:0}).then((found_original_maneuver) =>
                {
                    if (!found_original_maneuver) 
                    {                        
                        auxFuncModule.logger(function_name, 1142,5,3)
                    }else
                    {
                        // Convert MONGO result to PLAIN JS OBJECT so it can be handled...!
                        let original_object = found_original_maneuver[0].toObject()

                        // Check for a valid event combination...
                        let size_of_event = auxFuncModule.isValidValue(processEvent(body_values.objects_to_save[index].maneuver_current_location,body_values.objects_to_save[index].maneuver_current_status))
                        if(size_of_event) 
                        {
                            body_values.objects_to_save[index].maneuver_events = processEvent(body_values.objects_to_save[index].maneuver_current_location,body_values.objects_to_save[index].maneuver_current_status)
                            body_values.objects_to_save[index].maneuver_events[body_values.objects_to_save[index].maneuver_events.length-1] === '100%' ?
                            body_values.objects_to_save[index].man_termino = timeSnapshot()
                            :
                            body_values.objects_to_save[index].man_termino = 'Aún en curso'
                            if (!allowAddNewEvent(original_object.maneuver_events[original_object.maneuver_events.length-3],original_object.maneuver_events[original_object.maneuver_events.length-2],body_values.objects_to_save[index].maneuver_current_location,body_values.objects_to_save[index].maneuver_current_status)) 
                            {
                                auxFuncModule.logger
                                (
                                    function_name,1098,5,1,
                                    "[i] "+body_values.objects_to_save[index].man_folio+ " Event is already last, not updating..."
                                    +"\nNew location : "+body_values.objects_to_save[index].maneuver_current_location
                                    +"\nNew status   : "+body_values.objects_to_save[index].maneuver_current_status
                                    +"\nNew events   : "+body_values.objects_to_save[index].maneuver_events
                                    +"\nLast events  : "+original_object.maneuver_events.slice(original_object.maneuver_events.length - 4) 
                                )

                                body_values.objects_to_save[index].maneuver_events = []

                            }else
                            {
                                auxFuncModule.logger
                                (
                                    function_name,1112,5,1,
                                    "[i] "+body_values.objects_to_save[index].man_folio+ " Valid event, new values ready to update..."
                                    +"\nNew location:"+body_values.objects_to_save[index].maneuver_current_location
                                    +"\nNew status  :"+body_values.objects_to_save[index].maneuver_current_status
                                    +"\nNew events  :"+body_values.objects_to_save[index].maneuver_events
                                )
                            }

                        }else
                        {
                            auxFuncModule.logger
                            (
                                function_name,1124,5,1,
                                "[i] "+body_values.objects_to_save[index].man_folio+ " No valid event, keeping previous values..."
                                +"\nKeeping location       :"+original_object.maneuver_current_location
                                +"\nKeeping status         :"+original_object.maneuver_current_status
                                +"\nKeeping previous event :"+original_object.maneuver_events
                            )

                            body_values.objects_to_save[index].maneuver_current_location = original_object.maneuver_current_location
                            body_values.objects_to_save[index].maneuver_current_status   = original_object.maneuver_current_status
                            body_values.objects_to_save[index].maneuver_events           = original_object.maneuver_events

                        }

                        // Check if LOCATION and STATUS are valid values...
                        body_values.objects_to_save[index].maneuver_current_location != 'SIN INICIAR' ? 
                        (
                            //New values to be updated...
                            body_values.objects_to_save[index].maneuver_current_location = body_values.objects_to_save[index].maneuver_current_location,
                            body_values.objects_to_save[index].maneuver_current_status   = body_values.objects_to_save[index].maneuver_current_status,  
                            auxFuncModule.logger(function_name,1143,5,1,"[i] "+body_values.objects_to_save[index].man_folio + " CURRENT LOCATION & CURRENT STATUS, ready to be updated, waiting for event result...")
                        )
                        :
                        (
                            // Set to MANEUVER DEFAULT START values...
                            body_values.objects_to_save[index].maneuver_current_location = "SIN INICIAR",
                            body_values.objects_to_save[index].maneuver_current_status   = "SIN INICIAR",
                            body_values.objects_to_save[index].maneuver_events = processEvent(body_values.objects_to_save[index].maneuver_current_location,body_values.objects_to_save[index].maneuver_current_status),
                            auxFuncModule.logger(function_name,1151,5,1,"[i] "+body_values.objects_to_save[index].man_folio + " CURRENT LOCATION & CURRENT STATUS, Set to default starting eventy values...")
                        )

                        // Check if OPERATOR value is valid...
                        auxFuncModule.isValidValue(body_values.objects_to_save[index].man_operador)? 
                        (
                            // New values to be updated...
                            body_values.objects_to_save[index].man_operador = body_values.objects_to_save[index].man_operador,
                            auxFuncModule.logger(function_name,1159,5,1,"[i] "+body_values.objects_to_save[index].man_folio+ " OPERATOR ready to be updated...")
                        )
                        :
                        (
                            auxFuncModule.logger(function_name, 1163,5,1,"[i] "+body_values.objects_to_save[index].man_folio+" Keeping previous OPERATOR value..."+ 
                            "\nORIGINAL: -> "+original_object.man_operador + 
                            "\nRECEIVED: -> "+body_values.objects_to_save[index].man_operador 
                            ),

                            // Keep previous values...
                            body_values.objects_to_save[index].man_operador = original_object.man_operador
                        )

                        // Get visibility value ready...
                        auxFuncModule.isValidValue(body_values.objects_to_save[index].man_moni_enable) ? 'true' : 'false' 
                }
            }) 

            basic_data_promises.push(find_original_maneuver)

            }
        }) 

        /** - Step [6]
         *  - Wait to all maenuvers to be updated...
         *  - When finished, send answer to client...
         */ 
        let update_promises = []
         await Promise.all(basic_data_promises).then(()=>
        {
             for (let index = 0; index < body_values.objects_to_save.length; index++) 
            {
                const object_to_save                        = body_values.objects_to_save[index];
                const { maneuver_events, ...fields_to_set } = object_to_save;
                const id_2_update = body_values.objects_to_save[index].man_folio 

                if (body_values.objects_to_save[index].maneuver_current_location === "SIN INICIAR") 
                {
                    const update_individual_maneuver = maneuverModelItem.findOneAndUpdate(
                    {man_folio: id_2_update},
                    {  
                        $set: body_values.objects_to_save[index] 
                    }).then((updated_maneuver) =>
                        {
                            if (!updated_maneuver) 
                            {
                                auxFuncModule.logger(function_name, 1205,5,3)
                            }else
                            {
                                auxFuncModule.logger(function_name, 1208,5,1,"[i] "+body_values.objects_to_save[index].man_folio + " Updated succesfully..." );
                            }
                        })

                    update_promises.push(update_individual_maneuver) 
                }else
                {
                    const update_individual_maneuver = maneuverModelItem.findOneAndUpdate(
                    {man_folio: id_2_update},
                    {   $push:{maneuver_events:{$each:body_values.objects_to_save[index].maneuver_events}},
                        //$set: body_values.objects_to_save[index]
                        $set: fields_to_set
                    }).then((updated_maneuver) =>
                    {
                        if (!updated_maneuver) 
                        {
                            auxFuncModule.logger(function_name, 1224,5,3)
                        }else
                        {
                            auxFuncModule.logger(function_name, 1227,5,1,"[i] "+body_values.objects_to_save[index].man_folio + " Updated succesfully..." );
                        }
                    })
                    update_promises.push(update_individual_maneuver) 
                }
            } 
        }) 

        await Promise.all(update_promises).then(()=>
        {
            res.send({message:'1'})
        }) 
    }

//#endregion [ v1.2 CONTROLLER ]

}

module.exports = controller

//#region [⚑] [ LOCAL COMMON AUX FUNCTIONS ]

/** [⚑ V1.2][ TIME SNAPSHOT ]
 *  @returns String date-time value
 *  @note es-mx language used as default 
 */
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

/** [⚑ V1.2][ TIME FORMAT ]
 *  @returns String date-time value
 *  @note es-mx language used as default 
 */
function formatTime(time2format)
{
    if (time2format != 'PENDIENTE') 
    {
        const dateTime = new Date(time2format)

        const day     = dateTime.getDate() < 10 ? '0' + dateTime.getDate() : dateTime.getDate() 
        const month   = dateTime.toLocaleString('es-mx',{month:'long'}).toUpperCase()
        const year    = dateTime.getFullYear()
        const hours   = dateTime.getHours()   < 10 ? "0" + dateTime.getHours()   : dateTime.getHours()
        const minutes = dateTime.getMinutes() < 10 ? "0" + dateTime.getMinutes() : dateTime.getMinutes()
        const seconds = dateTime.getSeconds() < 10 ? "0" + dateTime.getSeconds() : dateTime.getSeconds()

        const timeSnapshot = day +"-"+month+"-"+year+"  "+hours+":"+minutes+":"+seconds

        return timeSnapshot
   
    }else
    {
        return 'PENDIENTE'
    }
}

/** [⚑ V1.2][ CHECK FOR NEW EVENT VALID ]
 * @param {*} prev_location 
 * @param {*} prev_status 
 * @param {*} new_location 
 * @param {*} new_status 
 * @returns TRUE IF ALLOWED TO STORE NEW EVENT
 */
function allowAddNewEvent(prev_location, prev_status,new_location, new_status)
{
    if (prev_location === new_location && prev_status === new_status) 
    {
        return false
    }else
    {
        return true
    }
}

/** [⚑ V1.2][ AUTOMATIC MANEUVER PROGRESS ASSIGMENT ]
 * 
 * @param {*} location 
 * @param {*} event 
 * @returns Simple Array [date-time, location, status, percentage] 
 */
function processEvent(location, event) 
{
    const event_time = timeSnapshot()

    let updatedEvent 
    switch (true) 
    {
        case location === 'SIN INICIAR':
            updatedEvent = [event_time,'SIN INICIAR','SIN INICIAR','0%']
        break;

        case location === 'ASLA' && event === 'EN ESPERA':
            updatedEvent = [event_time,'ASLA','EN ESPERA','25%']
        break;

        case location === 'ASLA' && event === 'LLAMADO':
            updatedEvent = [event_time,'ASLA','LLAMADO','30%']
        break;

        case location === 'ASLA' && event === 'CANCELADO':
            updatedEvent = [event_time,'ASLA','CANCELADO','0%']
        break;

        case location === 'ASLA' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'ASLA','EVENTO EXTRA','-']
        break;

        case location === 'EN RUTA' && event === 'EN RUTA A TERMINAL':
            updatedEvent = [event_time,'EN RUTA','EN RUTA A TERMINAL','40%']
        break;

        case location === 'EN RUTA' && event === 'EN RUTA A PATIO':
            updatedEvent = [event_time,'EN RUTA','EN RUTA A PATIO','85%']
        break;

        case location === 'EN RUTA' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN RUTA','EVENTO EXTRA','-']
        break;

        case location === 'EN RUTA' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN RUTA','EVENTO EXTRA','-']
        break;

        case location === 'EN TERMINAL' && event === 'ESPERANDO A SER CARGADO':
            updatedEvent = [event_time,'EN TERMINAL','ESPERANDO A SER CARGADO','50%']
        break;

        case location === 'EN TERMINAL' && event === 'CONTENEDORES CARGADOS':
            updatedEvent = [event_time,'EN TERMINAL','CONTENEDORES CARGADOS','75%']
        break;

        case location === 'EN TERMINAL' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN TERMINAL','EVENTO EXTRA','-']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'SIN MODULAR':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','SIN MODULAR','80%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'VERDE':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','VERDE','85%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'AMARILLO':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','AMARILLO','82%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'ROJO':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','ROJO','0%']
        break;

        case location === 'RUTA FISCAL / MODULACIÓN' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'RUTA FISCAL / MODULACIÓN','EVENTO EXTRA','-']
        break;

        case location === 'EN PATIO' && event === 'ESPERANDO A SER DESCARGADO':
            updatedEvent = [event_time,'EN PATIO','ESPERANDO A SER DESCARGADO','90%']
        break;

        case location === 'EN PATIO' && event === 'FINALIZADO':
            updatedEvent = [event_time,'EN PATIO','FINALIZADO','100%']
        break;

        case location === 'EN PATIO' && event === 'EVENTO EXTRA':
            updatedEvent = [event_time,'EN PATIO','EVENTO EXTRA','-']
        break;
    }
    return updatedEvent
}

/** [⚑ V1.2] [ DYNAMIC MANEUVER ID GENERATOR ] 
 *  @returns String "fullID"
 *  @param String operator
 *  @param String customer
 *  @param String date
 */
function generateIDHeader(operator, customer, date)
{
    /* - Step [1]
    *  - Get two first characters of OPERATOR...
    */
    var opFirstLetter  = operator.charAt(0).toUpperCase()
    var opSecondLetter = ''

    var secondWordStartIndex = operator.indexOf(' ')
    if (secondWordStartIndex == -1) 
    {
        opSecondLetter = operator.charAt(1).toUpperCase()
    }else
    {
        opSecondLetter = operator.charAt(secondWordStartIndex+1).toUpperCase()
    }

    /* - Step [2]
    *  - Get two first characters of CUSTOMER...
    */
    var cusFirstLetter  = customer.charAt(0).toUpperCase()
    var cusSecondLetter = ''

    secondWordStartIndex = customer.indexOf(' ')
    if (secondWordStartIndex == -1) 
    {
        cusSecondLetter = customer.charAt(1).toUpperCase()
    }else
    {
        cusSecondLetter = customer.charAt(secondWordStartIndex+1).toUpperCase()
    }

    /* - Step [3]
    *  - Get date values...
    */
    var dateSection = date.substring(2,4) + date.substring(5,7) + date.substring(8,10)

    /** - Step [4]
     *  - Generate FULL ID string...
     */
    var IDheader = cusFirstLetter+
    cusSecondLetter+
    opFirstLetter+ 
    opSecondLetter+
    dateSection

    return IDheader
}

//#endregion [ [⚑] LOCAL AUX FUNCTIONS ]