# kyc-sdk-javascript
The javascript sdk for kyc (Know Your Customer)
This SDK works in conjucntion with the [kyc-service](https://github.com/cmdotcom/kyc-service)


## Browser Compatibility
| Chrome| FF  | Safari |  IE  | Chrome Android | Mobile Safari | IE Mob 
|:------:|:---:|:------:|:----:|:--------------:|:-------------:|:------:|
|   ✓  |  ✓   |    ?   |  11  |       ?        |       ?       |    ?   |


## Development

### Setup

Make Sure you have [Node](https:/nodejs.org/en) installed (LTS) 
First run `npm i` to install all (dev) dependencies before continuing.

### Developing

run `gulp watch` to automatically update the changes in the ./src folder (this uses `gulp build` but does not clean up the build folder)

run `gulp` or `gulp build` to create a distribution  in the ./dist folder

### Usage
1. Put an element (with the ID you choose) to be used as the KYC SDK container in your HTML Body

    ```html
      <div id="myKYCelement" class="anyclassesyouwanttoadd" >
    ```

2. Define the kyc_config Object

     ```javascript
    kyc_config = {
        elementId: 'myKYCelement',//string (the id of the Element the KYC SDK should render the KYC content)
        context: {
    
            /*KYC User Authorization SPECIFIC -> bound to -> SDK Consumer(own implementation) SPECIFIC*/
            firstName: '',//Mandatory string to create or identify user stored by KYC
            lastName: '',//Mandatory  string to create or identify a user stored by KYC
            msisdn: '',//Mandatory  string to create or identify a user stored by KYC
    
            /*KYC Dossier SPECIFIC*/
            clientId: '',//string (guid, optional, default  serverside KYC Authorisation Service)
            templateId: '',//string (guid, optional, default configured in  serverside KYC Authorisation Service)
    
            /*SDK Consumer(own implementation) SPECIFIC*/
            customerName: '',// string that represents the Customer Entity name (company/account/ own full name)  as known by the SDK Consumer stored by KYC
            externalReference: '',//string that represents unique identifier for the Customer Entity (or his company or his account) known by the SDK Consumer stored by KYC
            userIdentifier: '',//string that represents unique identifier for the User known by the SDK Consumer used and stored by KYC
    
            /*SDK SPECIFIC routing*/
            dossierId: '',// string (guid, optional, for SDK specific to continue/invite etcera on a specific dossier),
            taskId: '',// string (guid, optional, for SDK specific to continue/invite etcera on a specific task in the dossier),
            checkId: '',// string (guid, optional, for SDK specific to continue/invite etcera on a specific check in the task in the dossier)
        },
        authorisationEndPoint: '',// string  URL of the to use serverside KYC Authorisation Service
        kycApiEndPoint: '',// string  URL of the to use KYC API
        /**
         * Optional function to translate strings (description and longDescription from the KYC check definitions and the predefined UX strings)
         * Translates strings
         *
         * @param {string}  inString The string to be translated
         * @returns {string}  outString The translated version of that string (maintained by the Customer)
         */
        translate: function (inString) {
            //Custom SDK Consumer Code
            var outString = inString;
            return outString;
        },
        /**
         * Optional function to format a date based on a Javascript Date object
         *
         *
         * @param {object}  Date Object 
         * @returns {string}  date string formatted to your wishes
         */
        formatDate: function (date) {
            //Custom SDK Consumer Code
            var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
            return date.toLocaleDateString('en-GB', options) + ' ' + date.toLocaleTimeString('en-GB');
        },
        /**
         * Optional function to prefill KYC requested data based on MetaDataKeys in a KYC check definition
         * Prefills Known metaDataObject
         *
         * @param {object}  inMetaDataObject The to be prefilled metaDataObject depending on the Task at hand
         * @returns {object}  outMetaDataObject The prefilled metaDataObject depending on the values known by the SDK Consumerknown values.
         */
        prefill: function (inMetaDataObject,callback) {
            //Custom SDK Consumer Code to enable prefilling the check forms with known data (base on the Metadata on the check definition)
            callback?callback(outMetaDataObject || inMetaDataObject):(outMetaDataObject || inMetaDataObject);
        },
        /**
         * Optional function that is called when the KYC SDK throws an event Changes (changed dossier, task, ckeck);
         * Prefills Known metaDataObject
         *
         * @param {object}  event The event object to be prefilled metaDataObject depending on the Task at hand
         */
        onEvent: function (event) {
            /**
             * Custom SDK Consumer Code to capture the different events cast by the KYC SDK
             *  @param {object} event contains all the data needed to take action.
             *  event.kyctype is on of [ 'changed','initialised','ready']
             *  event.target can be 'kyc_sdk' (the KYC SDK script) or the KYC SDK container, defined by the elementId in the kyc_config)
             */
            switch (event.kyctype) {
                
                case 'changed':
                    //something has changed
                    break;
                case 'login':
                    //the user is logged in
                    break;
                case 'identification':
                    //the user is identified
                    break;
                case 'dossierlist':
                    //kyc dossierlist has been build
                    break;
                case 'tasklist':
                    //the tasklist has been build
                    break;
                case 'taskform':
                    //the taskform has been build
                    break;
                case 'dossiers':                  /**
                      * kyc dossiers have been loaded
                      * event.detail.dossiers will contain the available dossiers
                      */
                    break;
                case 'tasks':
                    /**
                    * the tasks have been loaded
                    * event.detail.tasks will contain the available tasks
                    */ 
                    break;
                case 'task':
                    /**
                    * the task has been loaded
                    * event.detail.task will contain the available task
                    * event.detail.task.checks will contain the available checks within a task
                    */
                    break;                
                case 'initialised':
                    // the element is initialised
                     break;
                case 'reset':
                    //the element is rest (it was initialised before)
                    break;
                case 'ready':
                    /**
                     * something's ready (the KYC SDK)
                     * From this moment on you could asynchroniously (re)initialize the KYC SDK container (defined by the elementId in the kyc_config)
                     * This will be done automatically when everything all the necescary data (context) is set in the kyc_config
                     * and the element with id  elementId is present on the DOM.
                     */
                    break;
                case 'error':
                    /**
                    * something went wrong
                    * the event.detail provides as much information as possible
                    * event.detail.action (when available) will reflect the action that went wrong
                    * /
    */
    
            }
    
        }
    
    }
     ```

3. When the kyc_config and the Element definition are ready, the KYC SDK will kickstart itself.
   If you want to be in charge (asynchronious initializing the KYC SDK element) you can use the window 'load' event like this to initiate the Element whenever you want.

     ```javascript
    window.addEventListener('load', function (e) {
        // test if the event has a property kyctype an it equals to 'ready'
        if (!!e && !!e.kyctype && e.kyctype == 'ready') {
            //KYC SDK is Loaded
            //initiate the Element defined in the kyc_config (or even first define the kyc_config)
             kyc_sdk.init();
        }
    })
     ```
 
4.  Methods

     Method | Returns
    ------- |--------
    window.kyc_sdk.getToken()  |   Gets the Token from the authorisationEndPoint to use with the KYC API on the kycApiEndPoint
    window.kyc_sdk.getMe()    |   Gets the User information from the KYC API on the kycApiEndPoint
    window.kyc_sdk.getDossiers()  |   Gets the List of Dossiers for this User/clientId combination from the KYC API on the kycApiEndPoint
    window.kyc_sdk.getTasks(dossierId)   |   Gets the List of Tasks for a Dossier the KYC API on the kycApiEndPoint
    window.kyc_sdk.getTask(taskId)    |   Gets the Task and its Checks for a Task the KYC API on the kycApiEndPoint
    window.kyc_sdk.getUpload(uploadId)   |   Gets the content of an Upload from  the KYC API on the kycApiEndPoint           
    window.kyc_sdk.saveUpload(content)    |   Saves the content of an Upload to the KYC API on the kycApiEndPoint  and returns an object containing its uploadId in a 'saveUpload' KYC SDK event
    window.kyc_sdk.saveTask(task)   |   Saves a task (and it's checks) to the KYC API on the kycApiEndPoint  and returns the status in a 'saveTask' KYC SDK event

  

### Demo
You can start the Demo by opening examples/index.html in your browser.

You'll be asked to enter some information first to start the KYC experience.

This information automatically fills the kyc_config needed to start the KYC SDK.

 ```
        
        firstName: '',//Mandatory string to create or identify user stored by KYC
        lastName: '',//Mandatory  string to create or identify a user stored by KYC
        msisdn: '',//Mandatory  string to create or identify a user stored by KYC

        /*KYC Dossier SPECIFIC*/
        clientId: '',//string (guid, optional, default  serverside KYC Authorisation Service)
        templateId: '',//string (guid, optional, default configured in  serverside KYC Authorisation Service)

        /*SDK Consumer(own implementation) SPECIFIC*/
        customerName: '',// string that represents the Customer Entity name (company/account/ own full name)  as known by the SDK Consumer stored by KYC
        externalReference: '',//string that represents unique identifier for the Customer Entity (or his company or his account) known by the SDK Consumer stored by KYC
        userIdentifier: '',//string that represents unique identifier for the User known by the SDK Consumer used and stored by KYC

        /*SDK SPECIFIC routing*/
        dossierId: '',// string (guid, optional, for SDK specific to continue/invite etcera on a specific dossier),
        taskId: '',// string (guid, optional, for SDK specific to continue/invite etcera on a specific task in the dossier),
        checkId: '',// string (guid, optional, for SDK specific to continue/invite etcera on a specific check in the task in the dossier)
 
       authorisationEndPoint: '',// string  URL of the to use serverside KYC Authorisation Service
       kycApiEndPoint: '',// string  URL of the to use KYC API
```

### License
@cmdotcom/kyc-sdk is under the MIT license. See [LICENSE](/LICENSE.md) file.