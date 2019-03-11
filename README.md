# kyc-sdk-javascript
The javascript sdk for kyc (Know Your Customer)
This SDK works in conjucntion with the [kyc-service](https://github.com/cmdotcom/kyc-service)


## Browser Compatibility
| Chrome |  FF  | Safari |  IE  | Chrome Android | Mobile Safari | IE Mob |
| :----: | :--: | :----: | :--: | :------------: | :-----------: | :----: |
|   ✓   |  ✓   |    ?   |  11  |       ?        |       ?       |    ?   |


## Development

### Setup

Make Sure you have [Node](https:/nodejs.org/en) installed (LTS) 
First run `npm i` to install all (dev) dependencies before continuing.

### Developing

run `gulp watch` to automatically update the changes in the ./src folder (this uses `gulp build` but doe not clean up the build folder)

run `gulp` or `gulp build` to create a distribution  in the ./dist folder

### Demo
You can start the Demo by opening examples/index.html in your browser
You'll be asked to enter some information first to start the KYC experience
This information automatically fills the kyc_config needed to start the KYC SDK

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
