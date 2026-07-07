># MAYLOB [ v1.2 ] - FULL NODE JS BACKEND PROJECT  
>- [⚑] **LOCAL COPY** is used separately to allow local **NPM INIT** and **INSTALL** in a way that local server is up and running for testing...
>- [⚑] [index.js] - Local file is configured to work offline by using **NPM START** command on the VS terminal...

>## UPDATE FROM LOCAL WORKING COPY TO LOCAL GIT REPO
>[⚑] When changes are complete make sure to update according to the following files order:
>1. index.js
>2. app.js
>3. **MODELS**
>4. **CONTROLLERS**
>5. **ROUTES**

>## NOTES 
>- [⚑] Boolean variables **must** be handled lower case...
>- [⚑] Only LOCAL AUX FUNCTIONS have params description...

>## MODO LOCAL vs PRODUCCIÓN
>- [⚑] La configuración vive en `.env` (no se sube a git; usa `.env.example` como plantilla).
>- [⚑] Para alternar de modo solo se cambia una línea en `.env`: `APP_ENV=local` o `APP_ENV=production`.
>- [⚑] **local** → conecta a MongoDB local (`MONGO_URI_LOCAL`, por defecto `mongodb://127.0.0.1:27017/maylobdb`).
>- [⚑] **production** → conecta a MongoDB Atlas (`MONGO_URI_PRODUCTION`).
>- [⚑] En el proveedor donde se despliega "en línea" hay que configurar las mismas variables de entorno (`APP_ENV`, `PORT_PRODUCTION`, `MONGO_URI_PRODUCTION`) en su panel, ya que `.env` no viaja con el repo.

>## TO DO
>- Clean obsolete controllers from each file...
>- Make Uniform routes: Remove all prefixes...
>- Create a SCRIPT to auto copy MODELS/CONTROLLERS/ROUTES from local copy to repo copy...
>- Create a cascade controller to update multiple models...

>## EXTENDED CHANGE LOG:
>>### [ AUXILIARY FUNCTIONS ]
>>- Moved **TIME SNAPSHOT FUNCTION** to be accesible to every controller...
>
>>### [ CLIENT ]
>> **ROUTES** 
>>- Added new route to create and delete a **SINGLE CLIENT**...
>>
>>**CONTROLLERS**
>>- Created controller logic to create and store a new client..
>>- Created controller logic to find and delete a client...
>
>>### [ OPERATOR ]
>> **ROUTES** 
>>- Modified route to read operator...
>>
>>**CONTROLLERS**
>>- Modified logic to be able to read operator by parameter or return all...