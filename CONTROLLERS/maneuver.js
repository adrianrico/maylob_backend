'use strict'

/** Import MODEL SCHEMA from models MODULE...*/
var maneuverModelItem   = require('../MODELS/maneuver.js')

/** Import MODEL SCHEMA from models MODULE...*/
let objectModelItem = require('../MODELS/object.js') 

/** Import auxiliary functions MODULE... */
let auxFuncModule = require('../CONTROLLERS/auxiliary_functions.js')

/** All controllers logic definition and implementation... */
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





    /** [ FIND MANEUVER BY ID ]
     * @param {*} req 
     * @param {*} res
     */
    findManeuver: async function(req, res)
    {
        auxFuncModule.logger("findManeuver",1)
    
        /** - Step [1]
         *  - get maneuver ID from client request...
         *  - via GET -> URL PARAMETER
         */
        let searchingValue = Object.keys(req.query);

        if(!auxFuncModule.isValidValue(searchingValue))
        {
            auxFuncModule.logger("findManeuver",3,1)
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
                    auxFuncModule.logger("findManeuver",3,2)
                    return res.status(200).send({message:'0'})
                }else
                {
                    auxFuncModule.logger("findManeuver",2,2)
                    return res.status(200).send({foundManeuver})    
                }
            }).catch((err)=>
            {
                auxFuncModule.logger("findManeuver",3,2)+err
                return res.status(200).send({message:'0'})  
            })
        }
    },
    
    


    
    /** [ UPDATE MANEUVER ]
     * @param {*} req 
     * @param {*} res
     */
    updateManeuver: async function(req, res)
    {
        auxFuncModule.logger("updateManeuver",1)

        /** - Step [1]
         *  - Receive filter values from client request...
         *  - via -> PATCH -> BODY
         */
        let bodyValues = req.body;

        if (!auxFuncModule.isValidValue(bodyValues.maneuver_id)) 
        {
            auxFuncModule.logger("updateManeuver",3,1)
            return res.status(200).send({message:'0'}) 
        }else
        {
            auxFuncModule.logger("updateManeuver",2,1)
           
            /** - Step [2]
             *  - Update maneuver in DB...
             */
            let event = [bodyValues.maneuver_event_time,bodyValues.maneuver_current_location,bodyValues.maneuver_current_status,bodyValues.maneuver_completion] 
           
            await maneuverModelItem.findOneAndUpdate(
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
                    auxFuncModule.logger("updateManeuver",3,2)
                    return res.status(200).send({message:'0'})       
                }else
                {
                         auxFuncModule.logger("updateManeuver",2,2)
                    return res.status(200).send({updatedManeuver})
                }                   
            }).catch((err)=>
            {
                auxFuncModule.logger("updateManeuver",3,2)+err
                return res.status(200).send({message:'0'})  
            }) 
        } 
    },





    /** [ GET AVAILABLE MANEUVERS ]
     * @param {*} req 
     * @param {*} res
     */
    getManeuvers: async function(req, res)
    {
        auxFuncModule.logger("getManeuvers",1)

        /** MANEUVERS 
         *  FULL:
         *  1 tracto
         *  2 chassis
         *  1 dolly
         * 
         *  SINGLE:
         *  1 tracto
         *  1 chassis or 1 platform
         * 
         *  EXTERNAL:
         *  No need to select or fill equipment...
         *  Always selectable option...
         */

        /** - Step [1]
         *  - Search for available and not requested objects...
         */
        var availableTrucks         = 0
        var availableChassises      = 0
        var availableDollys         = 0
        var availablePlatforms      = 0
        var availableManeuvers      = ['EXTERNA']

        await objectModelItem.find({object_available: 1, object_requested:0}).then((objectsFound)=>
        {
            if(objectsFound.length === 0)
            {
                auxFuncModule.logger("getManeuvers",3,1)    
                return res.status(200).send({availableManeuvers})
            }else
            {
                objectsFound.forEach(element => 
                {
                    const objectType = element.object_type

                    objectType == 'TRACTO'      ? availableTrucks++ : availableTrucks + 0
                    objectType == 'CHASSIS'     ? availableChassises++ : availableChassises + 0
                    objectType == 'DOLLY'       ? availableDollys++ : availableDollys + 0
                    objectType == 'PLATAFORMA'  ? availablePlatforms++ : availablePlatforms + 0
                })

                //console.log(availableTrucks,availableChassises,availableDollys,availablePlatforms);
                auxFuncModule.logger("getManeuvers",2,1)

                /** - Step [2]
                 *  - Get maneuvers with the equipment found...
                 */
                if (availableTrucks >= 1) 
                {
                    /**Check conditions for a FULL maneuver...*/
                    if (availableDollys >= 1) 
                    {   
                        if ((availableChassises + availablePlatforms) >= 2)
                        {
                            availableManeuvers.push('FULL')   
                        }
                    }
    
                    /**Check conditions for a SINGLE maneuver...*/
                    if (availableChassises >= 1 || availablePlatforms >= 1) 
                    {
                        availableManeuvers.push('SENCILLA')
                    }

                    auxFuncModule.logger("getManeuvers",2,2)
                    return res.status(200).send({availableManeuvers})
                }       
                
            }

        }).catch((err)=>
        {
            auxFuncModule.logger("getManeuvers",3,1)+err
            return res.status(200).send({message:'0'})  
        })
    },





    /** [ GET AVAILABLE MANEUVERS ]
     * @param {*} req 
     * @param {*} res
     */
    getAllManeuvers: async function(req, res)
    {
        auxFuncModule.logger("getAllManeuvers",1)

        /** - Step [1]
         *  - Search for available and not requested objects...
         */

        await maneuverModelItem.find({}).then((objectsFound)=>
        {
            if(objectsFound.length === 0)
            {
                auxFuncModule.logger("getAllManeuvers",3,1)    
                return res.status(200).send({message:'0'})
            }else
            {
                auxFuncModule.logger("getAllManeuvers",2,1)
                return res.status(200).send({objectsFound})
            }

        }).catch((err)=>
        {
            auxFuncModule.logger("getAllManeuvers",3,1)+err
            return res.status(200).send({message:'0'})  
        })
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

}

module.exports = controller









/** 
 * +==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+
 * +                                                                                               +
 * + [⚑] LOCAL AUX FUNCTIONS                                                                     +
 * +                                                                                               +
 * +==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+
 */

/** [ DYNAMIC MANEUVER ID GENERATOR ] 
 *  @returns STRING "fullID"
 *  @param operator
 *  @param customer
 *  @param date
 */
function generateIDHeader(operator, customer, date)
{
    /** - Paso [1]
     *  - Obtener las primeras letras del parámetro OPERADOR...
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

    /** - Paso [2]
     *  - Obtener las primeras letras del parámetro customer...
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

    /** - Paso [3]
     *  - Obtener los valores de la fecha...
     */
    var dateSection = date.substring(2,4) + date.substring(5,7) + date.substring(8,10)

    /** - Paso [4]
     *  - Generar el string ID
     */
    var IDheader = opFirstLetter+ 
    opSecondLetter+
    cusFirstLetter+
    cusSecondLetter+
    dateSection

    return IDheader
}




/** [ AUTOMATIC EQUIPMENT ASSIGMENT ] 
 *  @returns ARRAY "asignedEquipment"
 *  @param requestedManeuver
 *  @param selectableTrucks
 *  @param selectableChassises
 *  @param selectablePlatforms
 *  @param selectableDollys
 */
function asignEquipment(requestedManeuver,trucks,chassises,platforms,dollys)
{ 
    //Salida...
    var asignedEquipment = []

    /** MANIOBRAS 
     *  ⚠ FULL:
     *  1 tracto
     *  2 chassis o plataforma
     *  1 dolly
     * 
     *  ⚠ SINGLE:
     *  1 tracto
     *  1 chassis o 1 plataforma
     */
    switch (requestedManeuver.toUpperCase()) 
    {
        case 'FULL':
            /** [TRACTO, CHASSIS, DOLLY, CHASSIS Ó PLATAFORMA] */
            var fullConditions = [0,0,0,0]

            if (trucks.length == 0 || dollys.length == 0) 
            {
                //console.log('[e][addManeuver][asignEquipment] - No hay equipos suficientes para realizar la maniobra...');
                return false
            }else 
            {
                /** - Paso [1]
                 *  - Asignar un TRACTO y quitarlo del BUFFER...
                 */
                for (let index = 0; index < trucks.length; index++) 
                {
                    if (fullConditions[0] == 1) 
                    {
                        //console.log('[i][addManeuver][asignEquipment] - Paso 1; TRACTO ya asignado en buffer --> '+asignedEquipment[0])
                    }else
                    {
                        asignedEquipment.push(trucks[index])
                        trucks.splice(index, 1);
                        fullConditions[0] = 1
                    }    
                }

                /** - Paso [2]
                 *  - Asignar el primer CHASSIS y quitarlo del BUFFER...
                 */
                for (let index = 0; index < chassises.length; index++) 
                {
                    if (fullConditions[1] == 1) 
                    {
                        //console.log('[i][addManeuver][asignEquipment] - Paso 2; Primer CHASSIS ya asignado en buffer --> '+asignedEquipment[1])
                    }else
                    {
                        asignedEquipment.push(chassises[index])
                        chassises.splice(index, 1);
                        fullConditions[1] = 1
                    }    
                }

                /** - Paso [3]
                 *  - Asignar el DOLLY y quitarlo del BUFFER...
                 */
                for (let index = 0; index < dollys.length; index++) 
                {
                    if (fullConditions[2] == 1) 
                    {
                        //console.log('[i][addManeuver][asignEquipment] - Paso 3; DOLLY ya asignado en buffer --> '+asignedEquipment[2])
                    }else
                    {
                        asignedEquipment.push(dollys[index])
                        dollys.splice(index, 1);
                        fullConditions[2] = 1
                    }    
                }

                /** - Paso [4]
                 *  - Asignar el segundo equipo, si queda algún CHASSIS se le da prioridad...
                 */
                //Si quedan CHASSIS disponibles se le da prioridad...
                if (chassises.length >= 1) 
                {
                    for (let index = 0; index < chassises.length; index++) 
                    {
                        if (fullConditions[3] == 1) 
                        {
                            //console.log('[i][addManeuver][asignEquipment] - Paso 4; CHASSIS ya asignado en buffer --> '+asignedEquipment[3])
                        }else
                        {
                            asignedEquipment.push(chassises[index])
                            chassises.splice(index, 1);
                            fullConditions[3] = 1
                        }    
                    }
                }else 
                {
                    //Si no quean CHASSIS disponibles entonces se asigna una plataforma...
                    for (let index = 0; index < platforms.length; index++) 
                    {
                        if (fullConditions[3] == 1) 
                        {
                            //console.log('[i][addManeuver][asignEquipment] - Paso 4; PLATAFORMA ya asignado en buffer --> '+asignedEquipment[3])
                        }else
                        {
                            asignedEquipment.push(platforms[index])
                            platforms.splice(index, 1);
                            fullConditions[3] = 1
                        }    
                    }  
                }
            }
        break

        case 'SINGLE':
            /** [TRACTO, CHASSIS Ó PLATAFORMA] */
            var singleCOnditions = [0,0]

            if (trucks.length == 0) 
            {
                //console.log('[e][addManeuver][asignEquipment] - No hay equipos suficientes para realizar la maniobra...');
                return false
            }else
            {
                /** - Paso [1]
                 *  - Asignar un TRACTO y quitarlo del BUFFER...
                 */
                for (let index = 0; index < trucks.length; index++) 
                {
                    if (singleCOnditions[0] == 1) 
                    {
                        //console.log('[i][addManeuver][asignEquipment] - Paso 1; TRACTO ya asignado en buffer --> '+asignedEquipment[0])
                    }else
                    {
                        asignedEquipment.push(trucks[index])
                        trucks.splice(index, 1);
                        singleCOnditions[0] = 1
                    }    
                }

                /** - Paso [2]
                 *  - Asignar el segundo equipo, si queda algún CHASSIS se le da prioridad...
                 */
                //Si quedan CHASSIS disponibles se le da prioridad...
                if (chassises.length >= 1) 
                {
                    for (let index = 0; index < chassises.length; index++) 
                    {
                        if (singleCOnditions[1] == 1) 
                        {
                            //console.log('[i][addManeuver][asignEquipment] - Paso 2; CHASSIS ya asignado en buffer --> '+asignedEquipment[3])
                        }else
                        {
                            asignedEquipment.push(chassises[index])
                            chassises.splice(index, 1);
                            singleCOnditions[1] = 1
                        }    
                    }
                }else 
                {
                    //Si no quedan CHASSIS disponibles entonces se asigna una plataforma...
                    if (platforms.length == 0 || platforms < 1) 
                    {
                        return false    
                    }else
                    {
                        for (let index = 0; index < platforms.length; index++) 
                        {
                            if (singleCOnditions[1] == 1) 
                            {
                                //console.log('[i][addManeuver][asignEquipment] - Paso 2; PLATAFORMA ya asignado en buffer --> '+asignedEquipment[3])
                            }else
                            {
                                asignedEquipment.push(platforms[index])
                                platforms.splice(index, 1);
                                singleCOnditions[1] = 1
                            }    
                        }    
                    } 
                }
            } 
        break

    }

    return asignedEquipment
} 

