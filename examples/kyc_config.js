/**
 * KYC = Know Your Customer API
 *
 * SDK = that's the javascript we provide
 *
 * SDK Consumer = that's you
 *
 */

my_kyc_config = {
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
     * optional string  URL to use to return to when using external verification tools like IDIN. Extra query parameters will be added to this URL.
     * It should take the form of location.origin+location.pathname+location.search+location.hash
     */
    returnUrl: '',
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
     * @param {object}  inMetaDataObject The to be prefilled metaDataObject depending on the Task at hand
     * @returns {object}  outMetaDataObject The prefilled metaDataObject depending on the values known by the SDK Consumerknown values.
     */
    formatDate: function (date) {
        //Custom SDK Consumer Code
        //var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        var options = { year: 'numeric', month: '2-digit', day: '2-digit'};
        return date.toLocaleDateString('nl-NL', options) + ' ' + date.toLocaleTimeString('nl-NL');
    },
    /**
     * Optional function to prefill KYC requested data based on MetaDataKeys in a KYC check definition
     * Prefills Known metaDataObject
     *
     * @param {object}  inMetaDataObject The to be prefilled metaDataObject depending on the Task at hand
     * @returns {object}  outMetaDataObject The prefilled metaDataObject depending on the values known by the SDK Consumerknown values.
     */
    prefill: function (inMetaDataObject,callback) {
        //Custom SDK Consumer Code
        var outMetaDataObject={};
        for(var key in inMetaDataObject){
            var val= inMetaDataObject[key];
            switch(key){
                case 'MY_CUSTOM_KNOWN_METEDATAKEY':
                    val='my vustom known metaData Value';
                    break;
            }
            outMetaDataObject[key]=val;
        }
        if(!!callback){
            callback(outMetaDataObject);
            return;
        }

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
         *  event.type is on of [ 'changed','initialised','ready']
         *  event.target can be 'kyc_sdk' (the KYC SDK script) or the KYC SDK container, defined by the elementId in the kyc_config)
         */
console.info('KYC EVENT',event.type,event.detail)
        console.log('KYC EVENT custom eventlistener', event.kyctype, event.detail,event.target)
        switch (event.type) {
            case 'changed':
                //something has changed
                break;
            case 'identifiaction':
            //the user is identified
            case 'dossierlist':
            //kyc dossierlist has been build
            case 'tasklist':
            //the tasklist has been build
            case 'taskform':
            //the taskform has been build
            case 'dossiers':
                //kyc dossiers have been loaded
            case 'tasks':
                //the tasks have been loaded
            case 'task':
                //the task has been loaded
            case 'savetask':
                //the task has been saved
                break;
            case 'error':
                //something went wrong
                break;
            case 'initialised':
                if (event.target && event.target.classList) {
                    //it's the element
                    event.target.classList.add('ready');

                    document.querySelector('form#login').setAttribute('style', 'display:none');

                }
                break;
            case 'ready':
                /**
                 * something's ready (the KYC SDK)
                 * From this moment on you could asynchroniously (re)initialize the KYC SDK container (defined by the elementId in the kyc_config)
                 * This will be done automatically when everything all the necescary data (context) is set in the kyc_config
                 * and the element with id  elementId is present on the DOM.
                 */

                break;

        }

    }

}
