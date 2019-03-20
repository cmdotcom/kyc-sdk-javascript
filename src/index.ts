/**
 * Self executing anonymous function using TS.
 */
(function () {
        /* fallback for console (needed for IE)*/
        if (!window["console"] || typeof console == "undefined") {
            console = console || {};
            ["assert", "clear", "count", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "table", "time", "timeEnd", "trace", "warn"].map(function (e) {
                console[e] = function () {
                };
            })
        }
        let kycTemplate,
            showWarning = false,
            authorisationEndPoint,
            kycApiEndPoint,
            returnUrl,
            KYCToken,
            KycSdkReference,
            KYCStorage;

        const
            kyc_sdk = 'kyc_sdk',
            version = '0.0.1',
            origLocation = JSON.parse(JSON.stringify(window.location)),
            uploads = {},
            issuers = {IDIN: null, IBAN: null},
            initialised = new Date(),
            defaultTemplateString = '/*REPLACE_WITH_TEMPLATE_HTML*/',
            ap = Array.prototype,
            domReady = function (fn) {

                if (document.readyState === 'complete') {
                    fn();
                } else if (document.addEventListener) {
                    document.addEventListener('DOMContentLoaded', fn);
                } else if (document['attachEvent']) {
                    document['attachEvent']('onreadystatechange', function () {
                        if (document.readyState === 'complete')
                            fn();
                    });
                }
            },
            jwtDecode = function (token) {
                try {
                    // Get Token Header
                    const base64HeaderUrl = token.split('.')[0];
                    const base64Header = base64HeaderUrl.replace('-', '+').replace('_', '/');
                    const headerData = JSON.parse(window.atob(base64Header));

                    // Get Token payload and date's
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace('-', '+').replace('_', '/');
                    const dataJWT = JSON.parse(window.atob(base64));
                    dataJWT.header = headerData;

                    return dataJWT;
                } catch (err) {
                    return false;
                }
            },
            http = function (options) {
                /* Native XMLHttpRequest with callback
                 * @param {Object} options - Options object
                 * @param {String} options.method - Type of XHR
                 * @param {String} options.url - URL for XHR
                 * @param {String|Object} options.params - Query parameters for XHR
                 * @param {Object} options.headers - Query parameters for XHR
                 * @param {Object} options.callback - Function that will be called when the XHR has done loading (or errors)
                 */
                if (!!options && typeof(options) == 'string') {
                    options = {
                        url: options.trim()
                    }
                }

                options.method = options.method || 'GET';


                const callback = function (params) {
                        if (!!options.callback && typeof  options.callback == 'function') {
                            options.callback(params);
                        }
                    },
                    xhr = new XMLHttpRequest();
                let params = options.params,
                    response;
                try {
                    xhr.open(options.method, options.url);
                } catch (e) {
                    callback({error: e, xhr: xhr})
                    return;
                }

                xhr.withCredentials = options.withCredentials || false;

                xhr.addEventListener("load", function () {
                    if (xhr.readyState == 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                response = JSON.parse(xhr.response || xhr.responseText);
                            } catch (e) {
                                response = (xhr.response || xhr.responseText);
                            }
                            callback({success: response || 'OK', xhr: xhr});

                        } else {
                            try {
                                response = JSON.parse(xhr.response || xhr.responseText);
                            } catch (e) {
                                response = 'invalid http status';
                            }
                            callback({error: response || 'ERROR', xhr: xhr})
                        }
                    }
                });
                xhr.addEventListener("error", function () {
                    callback({error: 'invalid http status', xhr: xhr})
                });

                // Set headers
                if (options.headers) {
                    for (var key in options.headers) {
                        xhr.setRequestHeader(key, options.headers[key]);
                    }
                }

                // We'll need to stringify if we've been given an object
                // If we have a string, this is skipped.
                if (options.method == 'GET' && !!options.params && typeof options.params === 'object') {
                    params = [];
                    for (var key in options.params) {
                        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
                    }
                    params = params.join('&');
                }
                try {
                    xhr.send(params);
                } catch (e) {
                    callback({error: e, xhr: xhr})
                }

            },
            getLocation = function (href:string,parts?:boolean) {
                var l = document.createElement("a");
                l.href = href;
                return parts?l:(l.origin + l.pathname + l.search + l.hash);
            },
            callApi = function (options) {
                options.headers = {'Authorization': 'Bearer ' + KYCToken.userToken};
                http(options);
            },
            makeId = function (length) {
                const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                let text = "",
                    datesalt = new Date().valueOf().toString().split('');
                while (text.length < length) {

                    if (datesalt.length > 0) {
                        text += possible.charAt(Math.floor(Math.max(possible.length, parseInt(datesalt.shift() + ' ' + datesalt.shift()))));
                    } else {
                        text += possible.charAt(Math.floor(Math.random() * possible.length));
                    }

                }

                return text;
            },

            encrypt = function (value: string, salt: string) {
                const textToChars = function (text) {
                        return text.split('').map(c => c.charCodeAt(0))
                    },
                    byteHex = function (n) {
                        return ("0" + Number(n).toString(16)).substr(-2)
                    },
                    applySaltToChar = function (code) {
                        return textToChars(salt).reduce((a, b) => a ^ b, code)
                    };
                return value.split('').map(textToChars)
                    .map(applySaltToChar)
                    .map(byteHex)
                    .join('');

            },
            decrypt = function (value: string, salt: string) {
                const textToChars = text => text.split('').map(c => c.charCodeAt(0)),
                    saltChars = textToChars(salt),
                    applySaltToChar = code => textToChars(salt).reduce((a, b) => a ^ b, code);
                return ((value || '').match(/.{1,2}/g) || [])
                    .map(function (hex) {
                        return parseInt(hex, 16)
                    })
                    .map(applySaltToChar)
                    .map(function (charCode) {
                        return String.fromCharCode(charCode)
                    })
                    .join('')
            },
            getCookie = function (cname: string) {
                var name = cname + "=";
                var decodedCookie = decodeURIComponent(document.cookie);
                var ca = decodedCookie.split(';');
                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ') {
                        c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                        return c.substring(name.length, c.length);
                    }
                }
                return null;
            },
            setCookie = function (cname: string, cvalue: string, exdatetime?: Date) {
                if (!exdatetime) {
                    //set to expire in 15 minutes
                    exdatetime = new Date();
                    exdatetime.setTime(exdatetime.getTime() + (15 * 60 * 10000));

                }
                document.cookie = cname + "=" + cvalue + ";" + "expires=" + exdatetime.toUTCString() + ";path=/";
            },
            clearKycStorage = function () {
                if (typeof(Storage) !== "undefined") {
                    // Code for localStorage/sessionStorage.
                    if (!!sessionStorage['KYCStorage']) {
                        //remove storage
                        sessionStorage.removeItem('KYCStorage');
                    }

                } else {
                    // Sorry! No Web Storage support..
                    //delete Cookie
                    setCookie('KYCStorage', '', new Date(0));
                }
            },
            getKycStorage = function (KYCSecret: string) {
                let temp;
                if (typeof(Storage) !== "undefined") {
                    // Code for localStorage/sessionStorage.
                    if (!!sessionStorage['KYCStorage']) {
                        temp = JSON.parse(decrypt(sessionStorage['KYCStorage'] || '', KYCSecret));

                    }

                } else {
                    // Sorry! No Web Storage support..
                    temp = JSON.parse(decrypt(getCookie('KYCStorage') || '', KYCSecret));

                }
                if (!!temp && temp instanceof Object) {
                    KYCStorage = temp;
                    return KYCStorage;
                }
                return null;

            },
            setKycStorage = function (KYCSecret: string, value: object) {
                const _value = encrypt(JSON.stringify(value), KYCSecret);

                if (typeof(Storage) !== "undefined") {
                    // Code for localStorage/sessionStorage.
                    sessionStorage['KYCStorage'] = _value;
                } else {
                    // Sorry! No Web Storage support..
                    setCookie('KYCStorage', _value);
                }
            },
            getKycSdkReference = function () {
                if (!!KycSdkReference) {
                    return KycSdkReference
                }
                const keys = {};
                if (!!origLocation && !!origLocation.search) {
                    const search = origLocation.search.substr(1).split('&').map(function (val) {
                        val = val.split('=');
                        if (val.length > 1) {

                            const key = val.shift();

                            if (key == 'trxid') {

                                //return from IDIN
                                keys['IDIN'] = {transactionId: val.join('=').trim()};

                            }
                            if (key == 'testkyc') {

                                //return from IDIN
                                keys['TESTKYC'] = {testkyc: val.join('=').trim()};


                            }
                            if (key.split('kycs_').shift() == 'kycs_' && key.split('kycs_').length == 2) {
                                let temp = getKycStorage((key.split('kycs_').pop().trim()));
                                if (!!temp) {
                                    for (let i in temp) {
                                        if (i == 'KYCToken') {
                                            KYCToken = temp[i];

                                        } else {
                                            KycSdkReference = KycSdkReference || {};
                                            KycSdkReference[i] = temp[i];
                                        }
                                    }


                                }
                            }
                        }
                        return false;


                    });
                    if (!!KycSdkReference && !!KycSdkReference['IDIN']) {
                        if (
                            !!KycSdkReference['IDIN'].transactionId
                            && !!keys['IDIN']
                            && !!keys['IDIN'].transactionId
                            && !!keys['IDIN'].transactionId === !!KycSdkReference['IDIN'].transactionId
                        ) {
                            getIdinTransaction(KycSdkReference['IDIN'].transactionId, function (ret) {
                                if (!!ret) {
                                    KycSdkReference['IDIN'] = ret;
                                }

                            });
                        } else {
                            delete(KycSdkReference['IDIN']);
                        }

                    }


                }
                return KycSdkReference;
            },
            getToken = function (element?: HTMLElement) {
                if (KYCToken && KYCToken.userToken) {
                    if (!element) {
                        const
                            event = createEvent('getToken', {KYCToken: KYCToken});
                        notify(event, window);
                        return;
                    }
                    getMe(element)


                } else {
                    const base = element || window;
                    if (!base || (!(!!base['kyc'] && !!base['kyc'].context) && !(!!base['kyc_config'] && !!base['kyc_config'].context))) {
                        throwError(
                            "No kyc config found",
                            'getToken',
                            {description: 'invalid KYC configuration'},
                            {config: !!base ? (base['kyc_config'] || base['kyc']) : null},
                            element);
                        return
                    }
                    const options = {
                        url: authorisationEndPoint,
                        method: 'POST',
                        withCredentials: true,
                        headers: {'Content-Type': 'application/json;charset=UTF-8'},
                        params: JSON.stringify({

                            "clientId": (base['kyc_config'] || base['kyc']).context.clientId,
                            "templateId": (base['kyc_config'] || base['kyc']).context.templateId,
                            "customerName": (base['kyc_config'] || base['kyc']).context.customerName,
                            "externalReference": (base['kyc_config'] || base['kyc']).context.externalReference,
                            "firstName": (base['kyc_config'] || base['kyc']).context.firstName,
                            "lastName": (base['kyc_config'] || base['kyc']).context.lastName,
                            "msisdn": (base['kyc_config'] || base['kyc']).context.msisdn,
                            "userIdentifier": (base['kyc_config'] || base['kyc']).context.userIdentifier,
                        }),
                        callback: function (result) {
                            if (!!result.success) {


                                KYCToken = result.success;
                                KYCToken.data = jwtDecode(KYCToken.userToken);
                                if (!element) {
                                    const
                                        event = createEvent('getToken', {KYCToken: KYCToken});
                                    notify(event, window);
                                    return;
                                }
                                notify('login', element);
                                getMe(element);

                            } else {


                                throwError(
                                    "No kyc Token could be retrieved from " + authorisationEndPoint + "!",
                                    'getToken',
                                    result,
                                    {authorisationEndPoint: authorisationEndPoint},
                                    element);

                            }
                        }
                    }

                    http(options);


                }
            },
            getMe = function (element?: HTMLElement) {
                const options = {
                    'url': kycApiEndPoint + '/api/v1/users/me',
                    callback: function (result) {
                        if (!!result.success) {

                            if (!element) {
                                const
                                    event = createEvent('me', {me: result.success});
                                notify(event, window);
                                return;
                            }

                            element['kyc'].status.changed = new Date();
                            element['kyc'].context.firstName = result.success.firstName;
                            element['kyc'].context.lastName = result.success.lastName;
                            element['kyc'].context.msisdn = result.success.msisdn;
                            element['kyc'].context.userIdentifier = result.success.id;

                            notify('identification', element);


                            getDossiers(element);

                            return;
                        }
                        const errorMessage = "KYC identity could not be verified!",
                            action = 'getMe';
                        console.warn(errorMessage, result.error);
                        if (!element) {
                            const
                                event = createEvent('error', {
                                    action: action,
                                    'message': errorMessage,
                                    'error': result.error
                                });
                            notify(event, window);

                            return;
                        }
                        const details = safeKyc(element);
                        details['action'] = action;
                        details['message'] = errorMessage;
                        details['error'] = result.error;
                        notify('error', element, details);


                    }
                }

                callApi(options);
            },
            getIdinIssuers = function (callback?: Function) {
                if (!!issuers.IDIN) {

                    if (!!callback) {
                        callback(issuers.IDIN)
                        return;
                    }

                    const
                        event = createEvent('IDIN', {issuers: issuers.IDIN});
                    notify(event, window);
                    return;

                }
                const options = {
                    'url': kycApiEndPoint + '/api/v1/identityservices/idin/issuers',
                    callback: function (result) {
                        if (!!result.success) {

                            issuers.IDIN = result.success;
                            if (!callback) {
                                const
                                    event = createEvent('IdinIssuers', {issuers: issuers.IDIN});
                                notify(event, window);
                                return;
                            }
                            callback(issuers.IDIN)

                            return;
                        }
                        const errorMessage = "KYC could retrieve IDIN ISSUERS!",
                            action = 'getIdinIssuers';
                        throwError(
                            errorMessage,
                            action,
                            result.error
                        );
                        if (!!callback) {
                            callback(null);
                        }


                    }
                }

                callApi(options);
            },
            startIdinTransaction = function (issuerId: string, idinKeys: [string], ref?: any) {

                const _location=getLocation(ref.returnUrl||returnUrl,true),

                    search = _location.search.toString().substring(1).split('&').filter(function (q) {
                        return ['trxid', 'ec'].indexOf(q.toLowerCase().split('=').shift() || '') === -1 &&
                            !(
                                (q.toLowerCase().split('=').shift() || '').split('kycs_').shift() == 'kycs_'
                                && (q.toLowerCase().split('=').shift() || '').split('kycs_').length == 2

                            )

                    }).join('&').trim(),
                    idinReturnUrl = _location['origin'] +
                        _location['pathname'] +
                        ( !!search ? '?' + search + (!!ref.KYCSECRET && !!ref.KYCStorage ? '&kycs_' + ref.KYCsecret + '=1' : '') : (!!ref.KYCSECRET && !!ref.KYCStorage ? '?kycs_' + ref.KYCSECRET + '=1' : ''))+
                        _location['hash'] ,
                    options = {
                        'url': kycApiEndPoint + '/api/v1/identityservices/idin/transaction',
                        'method': 'POST',
                        'params': {
                            "issuerId": issuerId,
                            "idinKeys": idinKeys,
                            "merchantReturnUrl": idinReturnUrl
                        },
                        callback: function (result) {
                            if (!!result.success) {
                                if (!!result.issuerAuthenticationUrl) {
                                    if (ref instanceof Object && !!ref.KYCSECRET && !!ref.KYCStorage) {

                                        if (!!result.transaction_id) {
                                            ref.KYCStorage.IDIN = {
                                                transactionId: result.transactionId,
                                                issuerAuthenticationUrl: result.issuerAuthenticationUrl
                                            };
                                            //save to memory
                                            setKycStorage(ref.KYCSECRET, ref.KYCStorage)

                                        }


                                    }


                                    window.location.replace(result.issuerAuthenticationUrl);
                                    return;
                                }


                            }
                            const errorMessage = "KYC could retrieve IDIN AuthenticationUrl",
                                action = 'getIdinIssuers';
                            throwError(
                                errorMessage,
                                action,
                                result.error || {'error': result.success}
                            );


                        }
                    }

                callApi(options);
            },
            getIdinTransaction = function (transactionId: string, callback?: Function) {
//status = open|success|cancelled|failure|expired
                const options = {
                    'url': kycApiEndPoint + '/api/v1/identityservices/idin/transaction/transactionId',
                    callback: function (result) {
                        if (!!result.success) {


                            if (!callback) {
                                const
                                    event = createEvent('IdinTransaction', {transaction: result.success});
                                notify(event, window);
                                return;
                            }
                            callback(result.success)

                            return;
                        }
                        const errorMessage = "KYC could retrieve IDIN ISSUERS!",
                            action = 'getIdinIssuers';
                        throwError(
                            errorMessage,
                            action,
                            result.error
                        );
                        if (!!callback) {
                            callback(null);
                        }


                    }
                }

                callApi(options);
            },
            getDossiers = function (element?: HTMLElement) {
                const options = {
                    'url': kycApiEndPoint + '/api/v1/users/' + KYCToken.data.uuid + '/dossiers',
                    callback: function (result) {
                        if (!!result.success) {

                            const ref = getKycSdkReference(),
                                dossiers = (result.success.filter(function (client) {

                                    return !!KYCToken.data.clientId && client.clientId == KYCToken.data.clientId;
                                }).shift() || {dossiers: []}).dossiers;


                            if (!element) {
                                const
                                    event = createEvent('dossiers', {dossiers: dossiers});
                                notify(event, window);
                                return;
                            }

                            element['kyc'].status.changed = new Date();
                            //filter the dossiers on the clientId and customerName/externalReference

                            element['kyc'].dossiers = dossiers.filter(function (dossier) {
                                /*If dossierId is known in the ref return only that dossier**/
                                if (!!ref && !!ref.dossierId) {
                                    return dossier.id == ref.dossierId
                                }
                                /*If templateId is known  return only that dossier**/
                                if (!!dossier.templateId && !!element['kyc'].context.templateId) {
                                    return dossier.templateId == element['kyc'].context.templateId;
                                }
                                /*If dossierId is known return only that dossier*/
                                if (!!dossier.id && !!element['kyc'].context.dossierId) {

                                    return dossier.id == element['kyc'].context.dossierId;
                                }


                                return true;//(!!element['kyc'].context.customerName && dossier.customerName == element['kyc'].context.customerName) || (!!element['kyc'].context.externalReference && dossier.externalReference == element['kyc'].context.externalReference);
                            });
                            const details = safeKyc(element);
                            details['dossiers'] = dossiers;
                            notify('dossiers', element, details);
                            switch (element['kyc'].dossiers.length) {
                                case 0:
                                    buildNoDossiersList(element);
                                    break;
                                case 1:
                                    getTasks(element['kyc'].dossiers[0].id, element)
                                    break;
                                default:
                                    buildDossiersList(element);
                                    break;
                            }
                            return;

                        }

                        throwError(
                            "KYC dossiers could not be fetched!",
                            'getDossiers',
                            result.error,
                            null,
                            element);


                    }
                }
                callApi(options);
            },
            getTasks = function (dossierId: string, element?: HTMLElement) {


                const
                    curDossier = !!element ? element['kyc'].dossiers.filter(function (dossier) {
                        /*If dossierId is known in the ref return only that dossier**/

                        return dossier.id == dossierId

                    }).shift() : null;


                const options = {
                    'url': kycApiEndPoint + '/api/v1/dossiers/' + dossierId + '/tasks',
                    callback: function (result) {

                        if (!!result.success) {
                            const tasks = result.success.filter(function (task) {
                                //only show visible and shared tasks

                                return task.visible //&& task.shared
                            });


                            if (!element) {
                                const
                                    event = createEvent('tasks', {tasks: tasks});
                                notify(event, window);

                                return;
                            }
                            element['kyc'].status.changed = new Date();
                            if (!!curDossier) {

                                curDossier.tasks = tasks;

                                switch (curDossier.tasks.length) {

                                    case 1:

                                        getTask(tasks[0].id, curDossier.id, element);
                                        break;
                                    default:
                                        buildTaskList(element, curDossier)
                                        break;
                                }

                            }

                            const details = safeKyc(element);
                            details['tasks'] = tasks;
                            notify('tasks', element, details);

                            return;

                        }

                        throwError(
                            "KYC dossier tasks could not be fetched!",
                            'getTasks',
                            result.error,
                            {dossierId: dossierId},
                            element);


                    }
                }


                if (!!element) {
                    if (!!curDossier) {
                        if (!!curDossier.tasks) {
                            buildTaskList(element, curDossier);
                            return;
                        }
                        callApi(options);
                        return;

                    } else {
                        console.warn("KYC dossier could not be fetched!");
                    }


                }
                callApi(options);
                return;


            },
            getTask = function (taskId: string, dossierId?: string, element?: any) {
                let curTask;

                const curDossier = !!element && element['kyc'] ? element['kyc'].dossiers.filter(function (dossier) {

                        return dossier.id == dossierId

                    }).shift() : null,

                    options = {
                        'url': kycApiEndPoint + '/api/v1/tasks/' + taskId,
                        callback: function (result) {
                            if (!!result.success) {

                                const task = result.success;
                                if (!element) {
                                    const
                                        event = createEvent('task', {task: task});
                                    notify(event, window);
                                    return;

                                }
                                if (typeof element == 'function') {
                                    element(task);
                                    return;
                                }
                                if (!!element && element['kyc']) {
                                    element['kyc'].status.changed = new Date();
                                    if (!!curDossier && curTask) {

                                        /*PREFILLING*/
                                        if (!!window['kyc_config'] && !!window['kyc_config'].prefill && typeof window['kyc_config'].prefill == 'function') {
                                            let metaData;
                                            task.checks.map(function (check) {
                                                if (!!check && !(!!check.value) && !!check.definition && !!check.definition.metaDataKey) {
                                                    if (!(!!metaData)) {
                                                        metaData = {};
                                                    }
                                                    metaData[check.definition.metaDataKey] = '';
                                                }
                                            })
                                            if (!!metaData) {
                                                window['kyc_config'].prefill(metaData, function (retMetaData) {
                                                    if (!!retMetaData) {
                                                        task.checks = task.checks.map(function (check) {
                                                            if (!!check && !(!!check.value) && !!check.definition && !!check.definition.metaDataKey) {
                                                                if (!!retMetaData[check.definition.metaDataKey]) {
                                                                    check.value = retMetaData[check.definition.metaDataKey];
                                                                }

                                                            }
                                                            return check;
                                                        })
                                                    }
                                                    element['kyc'].status.changed = new Date()
                                                    curTask = task;


                                                    buildTaskForm(element, curDossier, curTask);
                                                    notify('task', element);
                                                    return;
                                                })
                                            }


                                        }
                                        /*END PREFILLING*/

                                        element['kyc'].status.changed = new Date()
                                        curTask = task;


                                        buildTaskForm(element, curDossier, curTask);
                                    }
                                    notify('task', element);
                                }
                                return;

                            }
                            if (typeof element == 'function') {
                                element({error: result.error});
                                return;
                            }
                            throwError(
                                "KYC dossier task could not be fetched!",
                                'getTask',
                                result.error,
                                {taskId: taskId, dossierId: dossierId},
                                element
                            )
                            ;


                        }
                    }


                if (!!element && element['kyc']) {
                    if (!!curDossier) {
                        if (!!curDossier.tasks) {
                            curTask = curDossier.tasks.filter(function (task) {
                                return task.id == taskId
                            }).shift();
                            if (curTask) {
                                if (curTask.checks) {

                                    buildTaskForm(element, curDossier, curTask);
                                    return;
                                }
                                callApi(options);

                            }

                            return;

                        } else {


                            throwError(
                                "KYC dossier could not be fetched!",
                                'getTask',
                                {description: 'invalid KYC dossier'},
                                {taskId: taskId, dossierId: dossierId},
                                element);
                            return;

                        }


                    }


                }
                callApi(options);
                return;
            },
            getUpload = function (uploadId: string, element?: HTMLElement, callback?: Function) {
                const options = {
                    'url': kycApiEndPoint + '/api/v1/uploads/' + uploadId,
                    method: 'GET',
                    callback: function (result) {
                        if (!!result.success) {
                            uploads[uploadId] = result.success;
                            if (!element) {
                                const
                                    event = createEvent('uploadId', {uploadId: uploadId, content: result.success});
                                notify(event, window);

                                return;
                            }
                            if (!!callback) {
                                callback({'success': result.success})

                            }
                            return;


                        }
                        throwError(
                            "No upload with the id " + uploadId + " could be retrieved!",
                            'getUpload',
                            result.error,
                            {uploadId: uploadId},
                            element);


                        if (!!callback) {
                            callback({'error': result.error})

                        }


                    }

                }
                callApi(options);
            },
            saveUpload = function (content: string, element?: HTMLElement, callback?: Function) {
                const options = {
                    'url': kycApiEndPoint + '/api/v1/uploads/',
                    params: content,
                    method: 'POST',
                    callback: function (result) {

                        if (!!result.success && !!result.success.uuid) {
                            uploads[result.success.uuid] = content;
                            if (!element) {

                                const
                                    event = createEvent('saveUpload', {
                                        uploadId: result.success.uuid,
                                        content: content
                                    });
                                notify(event, window);

                                return;
                            }
                            if (!!callback) {
                                callback({'success': result.success})

                            }
                            return;

                        }

                        throwError(
                            "The upload could not be saved!",
                            'saveUpload',
                            result.error || {description: 'no uploadId returned'},
                            {contant: content},
                            element);


                        if (!!callback) {
                            callback({'error': result.error || {description: 'no uploadId returned'}})

                        }
                    }

                }
                callApi(options);
            },
            saveTask = function (task, element?: HTMLElement, callback?: Function) {
                /*POST DATA*/
                const options = {
                    'url': kycApiEndPoint + '/api/v1/tasks/' + task.id,
                    method: 'POST',
                    params: JSON.stringify(task),
                    callback: function (result) {
                        if (!!result.success) {


                            getTask(task.id, '', function (result) {

                                if (!!result.error) {
                                    throwError(
                                        "The task could not be fetched!",
                                        'getTask',
                                        result.error,
                                        {task: task},
                                        element);
                                    if (!!callback) {
                                        callback({'error': result.error})

                                    }
                                }
                                task.checks = result.checks || task.checks;
                                task.status = result.status || task.status;
                                task.visible = result.visible || task.visible;
                                task.shared = result.shared || task.shared;
                                if (!element) {
                                    const
                                        event = createEvent('saveTask', {task: task});
                                    notify(event, window);

                                    return;
                                }

                                element['kyc'].status.changed = new Date();
                                const details = safeKyc(element);
                                details['task'] = task;
                                notify('savetask', element, details);

                                if (!!callback) {
                                    callback({'success': task})

                                }
                            })


                            return;

                        }

                        throwError(
                            "The task could not be saved!",
                            'saveTask',
                            result.error,
                            {task: task},
                            element);


                        if (!!callback) {
                            callback({'error': result.error})

                        }


                    }

                }
                callApi(options);
            },

            checkSdkConditions = function (elementId?: string, inContext?: object) {
                if (!window['kyc_config']) {
                    if (!!showWarning) {
                        console.warn("No kyc_config object found on window!");
                    }
                    return false;
                }
                const origwarning = showWarning;
                if (window['kyc_config']) {
                    showWarning = true;
                }
                if (!window['kyc_config'].authorisationEndPoint) {
                    if (!!showWarning) {
                        console.warn("No kyc authorisationEndPoint on the kyc_config object!");
                    }
                    return false;
                }
                if (!window['kyc_config'].kycApiEndPoint) {
                    if (!!showWarning) {
                        console.warn("No kyc kycApiEndPoint on the kyc_config object!");
                    }
                    return false;
                }
                authorisationEndPoint = window['kyc_config'].authorisationEndPoint;
                kycApiEndPoint = window['kyc_config'].kycApiEndPoint;
                returnUrl = getLocation(window['kyc_config'].returnUrl || location.href);

                if (!inContext) {
                    if (!window['kyc_config'].context) {
                        if (!!showWarning) {
                            console.warn("No context object found on the kyc_config object!");
                        }
                        return false;
                    }
                    inContext = window['kyc_config'].context
                }
                if (!elementId) {
                    if (!window['kyc_config'].elementId) {
                        if (!!origwarning) {
                            console.warn("No elementId object found on the kyc_config object!");
                            console.warn("Assuming Direct SDK Access!");
                        }
                        return {
                            element: window,
                            context: JSON.parse(JSON.stringify(inContext))
                        };

                        //  return false;
                    } else {
                        elementId = window['kyc_config'].elementId;
                        if (!(!!elementId)) {
                            if (!!showWarning) {
                                console.warn("No elementId is given!");
                            }
                            return false;
                        }
                    }
                }


                if (!!elementId) {
                    if (document.getElementById(elementId)) {
                        return {
                            element: document.getElementById(elementId),
                            context: JSON.parse(JSON.stringify(inContext))
                        };
                    } else if (!!showWarning) {
                        console.warn("The HTML element with id '" + elementId + "'  is not present in the DOM tree!");
                    }
                    return false;
                }

            },
            createEvent = function (type, detail) {
                let event;
                if (typeof(Event) === 'function') {
                    event = new Event(type);
                } else {
                    event = document.createEvent('Event');
                    event.initEvent(type, true, true);
                }
                if (!!detail) {
                    event['detail'] = detail;
                }
                return event;
            },
            triggerLoadEvent = function (target: any, type: string, detail?: any) {
                if (target != window) {
                    target['kyc'].eventType = type;
                }
                if ("createEvent" in document) {
                    var event = document.createEvent("HTMLEvents");

                    event.initEvent("load", false, true);
                    event['kyctype'] = type;
                    if (!!detail) {
                        event['detail'] = detail;
                    }
                    target.dispatchEvent(event);
                    return;
                }
                target['fireEvent']("onload");


            },
            throwError = function (errorMessage: string, action: string, error: any, details?: any, element?: HTMLElement) {

                console.warn(errorMessage, action, error, details);
                let errorDetial = {
                    action: action,
                    message: errorMessage,
                    error: error

                }

                if (!!details) {
                    for (var i in details) {
                        if (!(!!errorDetial[i])) {
                            errorDetial[i] = details[i];
                        }
                    }
                }

                if (!element) {
                    console.info('throw', errorDetial);
                    const
                        event = createEvent('error', errorDetial);
                    notify(event, window);
                    return;
                }
                details = safeKyc(element);
                for (var i in details) {
                    if (!(!!errorDetial[i])) {
                        errorDetial[i] = details[i];
                    }
                }

                notify('error', element, errorDetial);

            },
            formatDate = function (date: Date) {
                if (!!window['kyc_config'] && !!window['kyc_config'].formatDate && typeof window['kyc_config'].formatDate == 'function') {
                    return window['kyc_config'].formatDate(date);

                }
                return
                date.getFullYear() + '-' + (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate();
            },
            translate = function (str: string) {
                str = str || '';
                if (!!window['kyc_config'] && !!window['kyc_config'].translate && typeof window['kyc_config'].translate == 'function') {
                    return window['kyc_config'].translate(str);

                }
                return str;
            },
            notify = function (inEvent, target?: any, details?: any) {
                let event;

                if (!!inEvent && typeof inEvent == 'string' && !!target && !!target['kyc']) {

                    inEvent = createEvent(inEvent.trim(), details || safeKyc(target))

                }
                try {
                    event = JSON.parse(JSON.stringify(inEvent));
                } catch (err) {
                    console.warn(err, inEvent, typeof inEvent);
                    return;
                }
                event.isTrusted = true;
                event.type = inEvent.type.toString();

                if (!!target) {
                    event.target = target
                    triggerLoadEvent(target, event.type, event.detail);
                } else {
                    event.target = 'kyc_sdk';

                }
                if (!!window['kyc_config'] && !!window['kyc_config'].onEvent && typeof window['kyc_config'].onEvent == 'function') {
                    window['kyc_config'].onEvent(event);
                    return;
                }
                if (showWarning) {
                    console.warn("No onEvent function found on the kyc_config object!", {
                        event: event
                    });
                }

            },
            template = function (custom: string) {
                kycTemplate = document.createElement('kyc-template');
                const customTemplate = document.createElement('kyc-custom-template'),
                    defaultTemplate = document.createElement('kyc-default-template');


                defaultTemplate.innerHTML = defaultTemplateString;
                customTemplate.innerHTML = custom;
                kycTemplate.appendChild(customTemplate)
                kycTemplate.appendChild(defaultTemplate)

                return kycTemplate.cloneNode(true);

            },
            getPartial = function (selector: string, source?: HTMLElement) {

                const sourcetoUse = !!source ? source : kycTemplate,
                    partial = sourcetoUse.querySelector(selector);
                if (!!partial) {
                    return partial.cloneNode(true)
                }
                console.warn('A templating error has occured.!', {
                    selector: selector,
                    template: sourcetoUse.innerHTML
                });
                return null;
            },
            goBack = function (element: HTMLElement) {

                const lasthistory = element['kyc'].history.back.pop();
                if (!!lasthistory) {
                    element['kyc'].history.next.push(lasthistory);

                    if (typeof lasthistory == 'function') {
                        lasthistory();
                    }
                }
            },
            Validators = {
                IBAN: function isValidIBANNumber(input) {
                    var CODE_LENGTHS = {
                        AD: 24, AE: 23, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
                        CH: 21, CR: 21, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, ES: 24,
                        FI: 18, FO: 18, FR: 27, GB: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21,
                        HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
                        LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
                        MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
                        RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26
                    };
                    var iban = String(input).toUpperCase().replace(/[^A-Z0-9]/g, ''), // keep only alphanumeric characters
                        code = iban.match(/^([A-Z]{2})(\d{2})([A-Z\d]+)$/), // match and capture (1) the country code, (2) the check digits, and (3) the rest
                        digits;
                    // check syntax and length
                    if (!code || iban.length !== CODE_LENGTHS[code[1]]) {
                        return false;
                    }
                    // rearrange country code and check digits, and convert chars to ints
                    digits = (code[3] + code[1] + code[2]).replace(/[A-Z]/g, function (letter) {
                        return ((letter || '').toString().charCodeAt(0) - 55).toString();
                    });
                    // final check
                    return Validators.mod97(digits);
                },
                mod97(string) {
                    var checksum = string.slice(0, 2), fragment;
                    for (var offset = 2; offset < string.length; offset += 7) {
                        fragment = String(checksum) + string.substring(offset, offset + 7);
                        checksum = parseInt(fragment, 10) % 97;
                    }
                    return checksum;
                }
            },
            validateInputOnEvent = function (event) {

                /**
                 * Methods:
                 * MANUAL_TEXT_INPUT, MANUAL_SINGLE_CHOICE_ENUM, MANUAL_MULTIPLE_CHOICE_ENUM, MANUAL_DATE_INPUT, IDIN, RAW_DOCUMENT_SCAN, DOCUMENT_FILE_UPLOAD, SELFIE_CHECK
                 *
                 * Formats:
                 * SHORT_TEXT, LONG_TEXT, NATURAL_NUMBER, REAL_NUMBER, ALPHANUMERIC, EMAIL, PHONE_NUMBER, URL, IBAN
                 **/

                const valueFormat = event.target.getAttribute('data-value-format');
                switch (event.type) {
                    case 'prefill':
                        switch (valueFormat) {
                            case 'PHONE_NUMBER':
                                event.target.value = (event.target.value || '').replace(/[^0-9\s\+]/g, '').trim().replace(/^00+/g, '+');

                                break;
                            case 'IBAN':
                                event.target.value = (event.target.value || '').toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();

                                break;
                        }
                        return;
                        break;
                    case 'tokyc':

                        switch (valueFormat) {
                            case 'PHONE_NUMBER':
                                event.target.value = (event.target.value || '').replace(/[\+]/g, '00').replace(/[^0-9]/g, '').trim();

                                break;
                            default:
                                event.target.value = (event.target.value || '').trim();

                                break;
                        }
                        return event.target.value;
                        break;
                    case 'change':
                        switch (valueFormat) {
                            case 'IBAN':
                                event.target.setCustomValidity(Validators.IBAN(event.target.value || '') ? 'Invalid IBAN' : '');
                                break;
                            case null:
                            default:
                                event.target.setCustomValidity(!!(event.target.required && (event.target.value || '').trim() === '') ? 'No empty strings' : '');
                        }

                        break;
                    case 'input':
                        if (!!event.inputType && event.inputType == 'insertFromPaste') {
                            validateInputOnEvent({target: event.target, type: 'prefill'});

                        }

                        break;
                    case 'keypress':
                        const code = event.keyCode || event.which,
                            character = String.fromCharCode(code);
                        let allowedKeys;

                        switch (valueFormat) {
                            case 'PHONE_NUMBER':
                                allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", 8, 37, 39];
                                if (
                                    (/[\s\+]|\./.test(character) && !!event.target.value.trim())
                                    || (
                                        !/[0-9\s\+]|\./.test(character)
                                        && allowedKeys.indexOf(code) < 0
                                    )
                                ) {
                                    event.preventDefault();
                                    return;
                                }

                                break;
                            case 'IBAN':
                                allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", 8, 37, 39];
                                if (
                                    !/[A-Z0-9\-\s]|\./.test(character.toUpperCase())
                                    && allowedKeys.indexOf(code) < 0
                                ) {
                                    event.preventDefault();
                                    return;
                                }
                                break;

                        }
                        break;
                }
                const curform = (event.path || []).filter(function (el) {
                    return !!el && !!el.tagName && el.tagName === 'FORM';
                }).shift();
                if (!!curform && curform.tagName) {

                    ap.slice.call(curform.querySelectorAll('[data-kyc-task-next]')).map(function (nextbutton) {
                        nextbutton.disabled = !!curform && !curform.checkValidity()
                    });
                }


            },
            buildLoader = function (target: HTMLElement) {
                if (!target || !target.appendChild) {
                    //window
                    return;
                }
                target.innerHTML = '';
                const
                    loader = getPartial('[data-kyc-loader]', target['kyc'].template);
                if (!!loader) {
                    target.appendChild(loader);
                }
                target.setAttribute('kyc-sdk-status', 'loading')

            },
            buildNoDossiersList = function (target: HTMLElement) {
                if (!target) {
                    return;
                }
                try {
                    const
                        dossierlist = getPartial('[data-kyc-dossier-list]', target['kyc'].template),
                        dossierrow = dossierlist.querySelector('[data-kyc-dossier-item]'),
                        errorrow = dossierlist.querySelector('[data-kyc-dossier-none]'),

                        errornode = errorrow.querySelector('kyc-dossier-error');


                    if (!!errornode) {
                        errornode.parentNode.replaceChild(document.createTextNode(translate('No dossiers found')), errornode);
                    } else {
                        errorrow.appendChild(document.createTextNode(translate('No dossiers found')));
                    }


                    dossierrow.parentNode.removeChild(dossierrow);
                    target.innerHTML = '';
                    target.appendChild(dossierlist);
                    target.setAttribute('kyc-sdk-status', 'dossiers')
                    notify('dossierlist', target);
                } catch (error) {

                    throwError(
                        'A templating error has occured while building the dossier list!',
                        'dossierlist',
                        error,
                        {template: target['kyc'].template},
                        target);


                    return
                }

            },
            buildDossiersList = function (target: HTMLElement) {
                if (!target || !target.appendChild) {
                    //window
                    return;
                }
                try {
                    const
                        dossierlist = getPartial('[data-kyc-dossier-list]', target['kyc'].template),
                        dossierrow = dossierlist.querySelector('[data-kyc-dossier-item]'),
                        errorrow = dossierlist.querySelector('[data-kyc-dossier-none]'),

                        ap = Array.prototype;
                    let last = dossierrow;

                    errorrow.parentNode.removeChild(errorrow);

                    target['kyc'].dossiers.map(function (dossier) {

                        const curDossierrow = dossierrow.cloneNode(true),
                            namenode = curDossierrow.querySelector('kyc-dossier-name'),
                            statusnode = curDossierrow.querySelector('kyc-dossier-status'),
                            datenode = curDossierrow.querySelector('kyc-dossier-created');


                        curDossierrow.setAttribute('data-kyc-status', dossier.status);
                        if (!!namenode) {
                            namenode.parentNode.replaceChild(document.createTextNode(dossier.customerName), namenode);
                        }
                        if (!!statusnode) {
                            statusnode.parentNode.replaceChild(document.createTextNode(translate(dossier.status)), statusnode);
                        }
                        if (!!datenode) {
                            datenode.parentNode.replaceChild(document.createTextNode(formatDate(new Date(dossier.createdAt))), datenode);
                        }


                        last.parentNode.insertBefore(curDossierrow, last.nextSibling);
                        curDossierrow.addEventListener('click', function (event) {
                            buildLoader(target);
                            target['kyc'].history.back = [];
                            target['kyc'].history.next = [];
                            getTasks(dossier.id, target);

                        })
                        last = curDossierrow;
                    });

                    dossierrow.parentNode.removeChild(dossierrow);
                    target.innerHTML = '';
                    target.appendChild(dossierlist);
                    target.setAttribute('kyc-sdk-status', 'dossiers')
                    notify('dossierlist', target);
                } catch (error) {

                    throwError(
                        'A templating error has occured while building the dossier list!',
                        'dossierlist',
                        error,
                        {template: target['kyc'].template},
                        target);

                    return
                }

            },
            buildTaskList = function (target: HTMLElement, dossier) {
                if (!target || !target.appendChild) {
                    //window
                    return;
                }
                try {
                    const
                        tasklist = getPartial('[data-kyc-task-list]', target['kyc'].template),
                        dossierTitleElement = tasklist.querySelector('[data-kyc-dossier-title] kyc-text'),
                        taskrow = tasklist.querySelector('[data-kyc-task-item]'),
                        backbuttons = tasklist.querySelectorAll('[data-kyc-to-dossiers]'),
                        overrulestatus = ['ACCEPTED', 'SUBMITTED'].indexOf(dossier.status) > -1 ? dossier.status : null;

                    let last = taskrow;

                    if (!!dossierTitleElement) {
                        dossierTitleElement.parentNode.replaceChild(document.createTextNode(dossier.customerName), dossierTitleElement);
                    }

                    ap.slice.call(backbuttons).map(function (backbutton) {
                        if (target['kyc'].dossiers.length > 1) {
                            ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                            });

                            backbutton.addEventListener('click', function () {
                                buildDossiersList(target);
                            })
                        } else {
                            backbutton.parentNode.removeChild(backbutton);
                        }
                    });


                    dossier.tasks.map(function (task) {

                        const curTaskrow = taskrow.cloneNode(true),
                            namenode = curTaskrow.querySelector('kyc-task-name'),
                            statusnode = curTaskrow.querySelector('kyc-task-status');


                        curTaskrow.setAttribute('data-kyc-status', overrulestatus || task.status);
                        if (!!namenode) {
                            namenode.parentNode.replaceChild(document.createTextNode(task.name), namenode);
                        }
                        if (!!statusnode) {
                            statusnode.parentNode.replaceChild(document.createTextNode(translate(overrulestatus || task.status)), statusnode);
                        }


                        last.parentNode.insertBefore(curTaskrow, last.nextSibling);
                        curTaskrow.addEventListener('click', function (event) {
                            buildLoader(target);
                            target['kyc'].history.back = [];
                            target['kyc'].history.next = [];
                            getTask(task.id, dossier.id, target);

                        })
                        last = curTaskrow;
                    });


                    taskrow.parentNode.removeChild(taskrow);
                    target.innerHTML = '';
                    target.appendChild(tasklist);
                    target.setAttribute('kyc-sdk-status', 'tasks')
                    notify('tasklist', target);
                } catch (error) {

                    throwError(
                        'A templating error has occured while building the dossier task list!',
                        'tasklist',
                        error,
                        {template: target['kyc'].template},
                        target);

                    return
                }

            },
            buildTaskOverView = function (target: HTMLElement, dossier, task) {
                if (!target || !target.appendChild) {
                    //window
                    return;
                }
                try {
                    const dossierElement = getPartial('[data-kyc-dossier]', target['kyc'].template);

                    ap.slice.call(dossierElement.querySelectorAll('[name]')).map(function (e) {
                        e.removeAttribute('name');


                    });
                    const dossierTitleElement = dossierElement.querySelector('[data-kyc-dossier-title] kyc-text'),
                        dossierNavigationElement = dossierElement.querySelector(' [data-kyc-dossier-tasks-navigation]'),
                        taskFormElement = dossierElement.querySelector('[data-kyc-task]'),
                        taskTitleElement = taskFormElement.querySelector('[data-kyc-task-title] kyc-text'),
                        checkElement = taskFormElement.querySelector('[data-kyc-check]'),

                        checkStatusElement = taskFormElement.querySelector('[data-kyc-check-status]'),
                        statusnode = checkStatusElement.querySelector('kyc-task-status'),
                        overviewElement = taskFormElement.querySelector('[data-kyc-task-overview]'),
                        overviewCheckElement = overviewElement.querySelector('[data-kyc-task-overview-check]'),
                        taskNavigationElement = taskFormElement.querySelector('[data-kyc-task-navigation]'),
                        validatorInput = document.createElement('input'),
                        textinput = checkElement.querySelector('[data-kyc-input]').cloneNode(true),

                        overrulestatus = ['ACCEPTED', 'SUBMITTED'].indexOf(dossier.status) > -1 ? dossier.status : (['ACCEPTED', 'SUBMITTED'].indexOf(task.status) > -1 ? task.status : null);

                    let newinput,
                        last = overviewCheckElement;
                    if (!!dossierTitleElement) {
                        dossierTitleElement.parentNode.replaceChild(document.createTextNode(dossier.customerName), dossierTitleElement);
                    }
                    if (!!taskTitleElement) {
                        taskTitleElement.parentNode.replaceChild(document.createTextNode(task.name), taskTitleElement);
                    }


                    if (!!statusnode) {
                        statusnode.parentNode.replaceChild(document.createTextNode(translate(overrulestatus || task.status)), statusnode);
                    }
                    if (!!overviewElement) {

                        overviewElement.setAttribute('data-kyc-status', overrulestatus || task.status)
                    }
                    if (!!taskFormElement) {

                        taskFormElement.setAttribute('data-kyc-status', overrulestatus || task.status)
                    }

                    task.checks.map(function (check) {
                        if (!!(check.value || '').trim()) {
                            const curCheck = overviewCheckElement.cloneNode(true),
                                valueElement = curCheck.querySelector(' data-kyc-check-value');

                            ap.slice.call(curCheck.querySelectorAll('kyc-check-description')).map(function (e) {
                                if (!!check.definition.description) {
                                    e.parentNode.replaceChild(document.createTextNode(translate(check.definition.description)), e);
                                } else {
                                    e.parentNode.removeChild(e);
                                }

                            });

                            curCheck.setAttribute('data-kyc-check-value', check.value)

                            if (!!check.definition.method) {
                                curCheck.setAttribute('data-kyc-method', check.definition.method || null)
                            }
                            if (!!check.definition.valueFormat) {
                                curCheck.setAttribute('data-kyc-valueformat', check.definition.valueFormat || null)
                            }

                            /**
                             * Methods:
                             * MANUAL_TEXT_INPUT, MANUAL_SINGLE_CHOICE_ENUM, MANUAL_MULTIPLE_CHOICE_ENUM, MANUAL_DATE_INPUT, IDIN, RAW_DOCUMENT_SCAN, DOCUMENT_FILE_UPLOAD, SELFIE_CHECK
                             *
                             * Formats:
                             * SHORT_TEXT, LONG_TEXT, NATURAL_NUMBER, REAL_NUMBER, ALPHANUMERIC, EMAIL, PHONE_NUMBER, URL, IBAN
                             **/
                            switch (check.definition.method) {
                                case 'RAW_DOCUMENT_SCAN':
                                case 'DOCUMENT_FILE_UPLOAD':
                                case 'SELFIE_CHECK':
                                    newinput = document.createTextNode('')
                                    if (!!check.value) {
                                        newinput = document.createElement('img');
                                        if (!!uploads[check.value]) {
                                            newinput.setAttribute('src', uploads[check.value]);
                                        } else {
                                            getUpload(check.value, target, function (result) {
                                                if (!!result.success) {
                                                    newinput.setAttribute('src', result.success);
                                                }
                                            });
                                        }
                                    }
                                    break;
                                default:


                                    validatorInput.value = check.value || null;

                                    switch (check.definition.valueFormat) {


                                        case 'NATURAL_NUMBER':
                                        case 'REAL_NUMBER':
                                            validatorInput.setAttribute('type', 'number');
                                            if (check.definition.valueFormat == 'NATURAL_NUMBER') {
                                                validatorInput.setAttribute('step', '1');
                                                validatorInput.setAttribute('min', '0');
                                            }
                                            break;
                                        case 'EMAIL':
                                            validatorInput.setAttribute('type', 'email');
                                            break;
                                        case 'URL':
                                            validatorInput.setAttribute('type', 'url');
                                            break;
                                        case 'PHONE_NUMBER':
                                        case 'IBAN':
                                            validatorInput.setAttribute('type', 'tel');
                                            break;
                                        default:
                                            validatorInput.setAttribute('type', 'text');
                                            break;

                                    }
                                    validateInputOnEvent({'type': 'prefill', 'target': validatorInput});

                                    newinput = document.createTextNode(validatorInput.value);

                            }

                            valueElement.parentNode.replaceChild(newinput, valueElement);
                            last.parentNode.insertBefore(curCheck, last.nextSibling);
                            last = curCheck;
                        }
                    })

                    checkElement.parentNode.removeChild(checkElement);
                    overviewCheckElement.parentNode.removeChild(overviewCheckElement);
                    ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-dossiers]')).map(function (backbutton) {
                        if (target['kyc'].dossiers.length > 1) {
                            ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                            });

                            backbutton.addEventListener('click', function () {
                                buildDossiersList(target);
                            })
                        } else {
                            backbutton.parentNode.removeChild(backbutton);
                        }

                    });
                    ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-tasks]')).map(function (backbutton) {
                        if (task.checks.length > 1) {
                            ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                            });

                            backbutton.addEventListener('click', function () {
                                buildTaskList(target, dossier);
                            })
                        } else {
                            backbutton.parentNode.removeChild(backbutton);
                        }


                    });


                    ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-previous]')).map(function (backbutton) {
                        ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                            e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                        });

                        backbutton.addEventListener('click', function () {
                            buildTaskList(target, dossier);
                        })
                    });


                    ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-next]')).map(function (nextbutton) {

                        nextbutton.parentNode.removeChild(nextbutton)

                    });


                    target.innerHTML = '';
                    target.appendChild(dossierElement);
                    target.setAttribute('kyc-sdk-status', 'task')

                    notify('taskoverview', target);


                } catch (error) {

                    throwError(
                        'A templating error has occured while building the dossier task check overview!',
                        'taskoverview',
                        error,
                        {template: target['kyc'].template},
                        target);
                    return;

                }
            },
            buildTaskForm = function (target: HTMLElement, dossier, task, checkid?: string) {
                if (!target || !target.appendChild) {
                    //window
                    return;
                }
                const
                    overrulestatus = ['ACCEPTED', 'SUBMITTED'].indexOf(dossier.status) > -1 ? dossier.status : (['ACCEPTED', 'SUBMITTED'].indexOf(task.status) > -1 ? task.status : null);
                if (!!overrulestatus) {
                    buildTaskOverView(target, dossier, task);
                    return;
                }

                checkid = !!checkid ? checkid : task.sequence.initialCheckId;


                let check = task.checks.filter(function (check) {

                    return check.id == checkid;
                }).shift();
                if (!!check && check.id) {

                    const next = task.sequence.transitions.filter(function (transition) {
                            return transition.from == checkid;
                        }).map(function (transition) {
                            return transition;
                        }).shift(),

                        gotoNext = function (next) {


                            if (!!next) {
                                /*check info from transition*/
                                let nextCHeckID = next.defaultGoTo;


                                if (!!next.conditionalBranches) {
                                    //public enum Relation {   EQUAL,   NOT_EQUAL,   GREATER_THAN,   LESS_THAN,   INCLUDES,   EXCLUDES;
                                    let conditionDidValidate = false;
                                    next.conditionalBranches.map(function (condition) {
                                        if (!conditionDidValidate) {
                                            switch (condition.relation) {
                                                case 'EQUAL':
                                                    if (check.value.trim() === condition.value.trim()) {
                                                        conditionDidValidate = true;
                                                        nextCHeckID = condition.goTo || null;
                                                        return;
                                                    }
                                                    break;
                                                case 'NOT_EQUAL':
                                                    if (check.value.trim() != condition.value.trim()) {
                                                        conditionDidValidate = true;
                                                        nextCHeckID = condition.goTo || null;
                                                        return;
                                                    }
                                                    break;
                                                case 'GREATER_THAN':
                                                    if (parseFloat(check.value.trim()) > parseFloat(condition.value.trim())) {
                                                        conditionDidValidate = true;
                                                        nextCHeckID = condition.goTo || null;
                                                        return;
                                                    }
                                                    break;
                                                case 'LESS_THAN':
                                                    if (parseFloat(check.value.trim()) < parseFloat(condition.value.trim())) {
                                                        conditionDidValidate = true;
                                                        nextCHeckID = condition.goTo || null;
                                                        return;
                                                    }
                                                    break;
                                                case 'INCLUDES':
                                                    if (check.value instanceof Array && check.value.indexOf(condition.value.trim())) {
                                                        conditionDidValidate = true;
                                                        nextCHeckID = condition.goTo || null;
                                                        return;
                                                    }
                                                    break;
                                                case 'EXCLUDES':
                                                    if (check.value instanceof Array && !check.value.indexOf(condition.value.trim())) {
                                                        conditionDidValidate = true;
                                                        nextCHeckID = condition.goTo || null;
                                                        return;
                                                    }
                                                    break;
                                            }
                                        }
                                    })
                                }


                                if (!!nextCHeckID) {
                                    buildLoader(target);
                                    target['kyc'].history.back.push(function () {
                                        buildLoader(target);
                                        buildTaskForm(target, dossier, task, check.id);
                                    });
                                    buildTaskForm(target, dossier, task, nextCHeckID)
                                    return;
                                }
                            }
                            buildLoader(target);


                            saveTask(task, target, function (result) {
                                if (!!result.success) {

                                    task = result.success;

                                    //  buildTaskForm(element, curDossier, curTask);
                                    buildTaskList(target, dossier);

                                } else {
                                    //error (already thrown by saveTask

                                }
                            })

                        }

                    try {
                        const dossierElement = getPartial('[data-kyc-dossier]', target['kyc'].template);

                        ap.slice.call(dossierElement.querySelectorAll('[name]')).map(function (e) {
                            e.removeAttribute('name');


                        });
                        const dossierTitleElement = dossierElement.querySelector('[data-kyc-dossier-title] kyc-text'),
                            dossierNavigationElement = dossierElement.querySelector(' [data-kyc-dossier-tasks-navigation]'),
                            taskFormElement = dossierElement.querySelector('[data-kyc-task]'),
                            overviewElement = taskFormElement.querySelector('[data-kyc-task-overview]'),
                            taskTitleElement = taskFormElement.querySelector('[data-kyc-task-title] kyc-text'),
                            checkElement = taskFormElement.querySelector('[data-kyc-check]'),
                            checkStatusElement = taskFormElement.querySelector('[data-kyc-check-status]'),
                            taskNavigationElement = taskFormElement.querySelector('[data-kyc-task-navigation]'),
                            errorClassElement = checkElement.hasAttribute('data-kyc-errorclass') ? checkElement : checkElement.querySelector('data-kyc-errorclass'),
                            successClassElement = checkElement.hasAttribute('data-kyc-successclass') ? checkElement : checkElement.querySelector('data-kyc-successclass'),
                            errorClass = !!errorClassElement ? errorClassElement.getAttribute('data-kyc-errorclass') : null,
                            successClass = !!successClassElement ? errorClassElement.getAttribute('data-kyc-successclass') : null;


                        let newinput,
                            formname = check.id.trim(),
                            last = checkElement;
                        if (!!dossierTitleElement) {
                            dossierTitleElement.parentNode.replaceChild(document.createTextNode(dossier.customerName), dossierTitleElement);
                        }
                        if (!!taskTitleElement) {
                            taskTitleElement.parentNode.replaceChild(document.createTextNode(task.name), taskTitleElement);
                        }

                        if (!!checkStatusElement) {
                            checkStatusElement.parentNode.removeChild(checkStatusElement);
                        }
                        if (!!overviewElement) {
                            overviewElement.parentNode.removeChild(overviewElement);
                        }
                        const curCheck = checkElement.cloneNode(true),
                            curErrorClassElement = !!errorClass ? (checkElement == errorClassElement ? curCheck : curCheck.querySelector('data-kyc-errorclass')) : null,
                            curSuccessClassElement = !!successClass ? (checkElement == successClassElement ? curCheck : curCheck.querySelector('data-kyc-successclass')) : null,
                            inputElement = curCheck.querySelector('kyc-input');
                        let focusel;


                        ap.slice.call(curCheck.querySelectorAll('kyc-check-description')).map(function (e) {
                            if (!!check.definition.description) {
                                e.parentNode.replaceChild(document.createTextNode(translate(check.definition.description)), e);
                            } else {
                                e.parentNode.removeChild(e);
                            }

                        });
                        ap.slice.call(curCheck.querySelectorAll('kyc-check-longdescription')).map(function (e) {
                            if (!!check.definition.longDescription) {
                                e.parentNode.replaceChild(document.createTextNode(translate(check.definition.longDescription)), e);
                            } else {
                                e.parentNode.removeChild(e);
                            }

                        });

                        if (!!check.definition.method) {
                            curCheck.setAttribute('data-kyc-method', check.definition.method || null)
                        }
                        if (!!check.definition.valueFormat) {
                            curCheck.setAttribute('data-kyc-valueformat', check.definition.valueFormat || null)
                        }

                        /**
                         * Methods:
                         * MANUAL_TEXT_INPUT, MANUAL_SINGLE_CHOICE_ENUM, MANUAL_MULTIPLE_CHOICE_ENUM, MANUAL_DATE_INPUT, IDIN, RAW_DOCUMENT_SCAN, DOCUMENT_FILE_UPLOAD, SELFIE_CHECK
                         *
                         * Formats:
                         * SHORT_TEXT, LONG_TEXT, NATURAL_NUMBER, REAL_NUMBER, ALPHANUMERIC, EMAIL, PHONE_NUMBER, URL, IBAN
                         **/


                        switch (check.definition.method) {
                            case 'MANUAL_SINGLE_CHOICE_ENUM':
                            case 'MANUAL_MULTIPLE_CHOICE_ENUM':
                                newinput = inputElement.querySelector('[data-kyc-options]').cloneNode(false);

                                switch (check.definition.method) {
                                    case 'MANUAL_SINGLE_CHOICE_ENUM':
                                        if (check.definition.enumSpecification.length < 4) {
                                            (check.definition.enumSpecification || []).map(function (keyvalue) {
                                                const currentOption = inputElement.querySelector('[data-kyc-radiobutton]').cloneNode(true),
                                                    radio = currentOption.querySelector('[data-kyc-radio-input]');

                                                radio.setAttribute('type', 'radio')
                                                radio.setAttribute('name', formname)
                                                radio.setAttribute('value', keyvalue.name);
                                                radio.value = keyvalue.name;
                                                radio.checked = !!check.value && keyvalue.name.trim() === check.value.trim();
                                                ap.slice.call(currentOption.querySelectorAll('kyc-text')).map(function (e) {

                                                    e.parentNode.replaceChild(document.createTextNode(translate(!!keyvalue.explanation ? keyvalue.explanation : keyvalue.name)), e);

                                                });
                                                if (!focusel) {
                                                    focusel = currentOption;
                                                }
                                                newinput.appendChild(currentOption);

                                            });
                                        } else {

                                            newinput = inputElement.querySelector('[data-kyc-select-input]').cloneNode(false);

                                            let currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                            newinput.setAttribute('name', formname)
                                            if (!(!!check.value)) {
                                                currentOption.value = '';
                                                currentOption.innerHTML = translate("select an option");
                                                newinput.appendChild(currentOption);
                                            }
                                            (check.definition.enumSpecification || []).map(function (keyvalue) {
                                                currentOption = currentOption.cloneNode(true);


                                                currentOption.value = keyvalue.name;
                                                currentOption.selected = !!check.value && keyvalue.name.trim() === check.value.trim();
                                                currentOption.innerHTML = translate(!!keyvalue.explanation ? keyvalue.explanation : keyvalue.name);

                                                newinput.appendChild(currentOption);


                                            });
                                            if (!focusel) {
                                                focusel = newinput;
                                            }

                                        }

                                        break;
                                    case 'MANUAL_MULTIPLE_CHOICE_ENUM':
                                        formname = check.id.trim() + '[]';
                                        (check.definition.enumSpecification || []).map(function (keyvalue) {
                                            const currentOption = inputElement.querySelector('[data-kyc-checkbox]').cloneNode(true),
                                                checkbox = currentOption.querySelector('[data-kyc-checkbox-input]');
                                            checkbox.setAttribute('type', 'checkbox')
                                            checkbox.setAttribute('name', formname)

                                            checkbox.setAttribute('value', keyvalue.name);


                                            checkbox.checked = !!check.value && JSON.parse(check.value || '[]').filter(function (v) {
                                                return v.trim() == keyvalue.name.trim();
                                            }).length > 0;
                                            ap.slice.call(currentOption.querySelectorAll('kyc-text')).map(function (e) {

                                                e.parentNode.replaceChild(document.createTextNode(translate(!!keyvalue.explanation ? keyvalue.explanation : keyvalue.name)), e);

                                            });
                                            newinput.appendChild(currentOption);
                                            if (!focusel) {
                                                focusel = currentOption;
                                            }
                                        });
                                        break;
                                }


                                break;
                            default:
                                switch (check.definition.method) {
                                    case 'MANUAL_TEXT_INPUT':
                                    case 'MANUAL_DATE_INPUT':
                                        switch (check.definition.valueFormat) {
                                            case 'LONG_TEXT':
                                                newinput = inputElement.querySelector('[data-kyc-textarea]').cloneNode(true);
                                                newinput.setAttribute('placeholder', translate(check.definition.description));
                                                newinput.value = check.value || null;
                                                newinput.setAttribute('name', formname)
                                                newinput.required = !(!!check.definition.optional);
                                                if (!focusel) {
                                                    focusel = newinput;
                                                }
                                                break;
                                            default:
                                                newinput = inputElement.querySelector('[data-kyc-input]').cloneNode(true);
                                                switch (check.definition.valueFormat) {
                                                    case 'NATURAL_NUMBER':
                                                    case 'REAL_NUMBER':
                                                        newinput.setAttribute('type', 'number');
                                                        if (check.definition.valueFormat == 'NATURAL_NUMBER') {
                                                            newinput.setAttribute('step', 1);
                                                            newinput.setAttribute('min', 0);
                                                        }
                                                        break;
                                                    case 'EMAIL':
                                                        newinput.setAttribute('type', 'email');
                                                        break;
                                                    case 'URL':
                                                        newinput.setAttribute('type', 'url');
                                                        break;
                                                    case 'IBAN':
                                                        newinput.setAttribute('type', 'text');
                                                        break;
                                                    case 'PHONE_NUMBER':
                                                        newinput.setAttribute('type', 'tel');
                                                        break;
                                                    default:
                                                        switch (check.definition.method) {
                                                            case 'MANUAL_DATE_INPUT':
                                                                newinput.setAttribute('type', 'date');
                                                                break;
                                                            default:
                                                                newinput.setAttribute('type', 'text');
                                                                break;
                                                        }


                                                }
                                                newinput.setAttribute('placeholder', translate(check.definition.description));
                                                newinput.setAttribute('name', check.id)
                                                if (!!check.definition.method) {
                                                    newinput.setAttribute('data-method', check.definition.method)
                                                }
                                                if (!!check.definition.valueFormat) {
                                                    newinput.setAttribute('data-value-format', check.definition.valueFormat)
                                                }
                                                newinput.required = !(!!check.definition.optional);
                                                newinput.value = check.value || null;
                                                if (!focusel) {
                                                    focusel = newinput;
                                                }
                                                validateInputOnEvent({'type': 'prefill', 'target': newinput});


                                        }
                                        ['keypress', 'paste', 'change', 'input'].map(function (type) {
                                            newinput.addEventListener(type, function (event) {
                                                validateInputOnEvent(event)
                                                if (event.target.checkValidity()) {
                                                    if (!!curSuccessClassElement) {
                                                        curSuccessClassElement.classList.add(successClass);
                                                    }
                                                    if (!!curErrorClassElement) {
                                                        curErrorClassElement.classList.remove(errorClass);
                                                    }

                                                } else {
                                                    if (!!curSuccessClassElement) {
                                                        curSuccessClassElement.classList.remove(successClass);
                                                    }
                                                    if (!!curErrorClassElement) {
                                                        curErrorClassElement.classList.add(errorClass);
                                                    }
                                                }
                                            });
                                        })

                                        break;
                                    case 'IDIN':


                                        if (!(!!check.value)) {

                                            /**/
                                            if (!!KycSdkReference && !!KycSdkReference.IDIN) {
                                                const IdinCallback = function (idin) {
                                                    //status = open|success|cancelled|failure|expired
                                                    if (!!idin && !!idin.status && !!idin.transactionId) {

                                                        switch (idin.status) {
                                                            case 'open':
                                                                //wait a bit...

                                                                setTimeout(function () {
                                                                    getIdinTransaction(idin.transactionId, IdinCallback);
                                                                }, 1000);
                                                                break;
                                                            case 'success':
                                                                //save the value;
                                                                delete KycSdkReference.IDIN;
                                                                target['kyc'].context.checkId = null;
                                                                target['kyc'].context.taskId = null;
                                                                target['kyc'].context.dossierId = null;
                                                                check.value = idin.transactionId;
                                                                gotoNext(next);
                                                                break;
                                                            case 'expired':
                                                            case 'cancelled':
                                                            case 'failure':
                                                            default:
                                                                //not ok
                                                                delete KycSdkReference.IDIN;
                                                                buildTaskForm(target, dossier, task, checkid);
                                                                return;
                                                                break;


                                                        }
                                                        return;

                                                    }
                                                    delete KycSdkReference.IDIN;
                                                    buildTaskForm(target, dossier, task, checkid);
                                                    return;


                                                }
                                                IdinCallback(KycSdkReference.IDIN);

                                                return;
                                            }

                                            if (!issuers.IDIN) {


                                                getIdinIssuers(function (result) {
                                                    if (!!result) {
                                                        buildTaskForm(target, dossier, task, checkid);
                                                    } else {
                                                        throwError(
                                                            'A templating error has occured while building the dossier task check form! No IDIN Issuers could be fetched',
                                                            'taskform',
                                                            {'description': 'No IDIN Issuers'},
                                                            {
                                                                template: target['kyc'].template,
                                                                dossier: dossier,
                                                                task: task,
                                                                checkid: checkid
                                                            },
                                                            target);

                                                    }

                                                })
                                                return;
                                            }

                                            newinput = document.createElement('div');

                                            if (!!issuers.IDIN && (issuers.IDIN || []).length > 0) {
                                                if (!!issuers.IDIN && (issuers.IDIN || []).length > 1) {
                                                    const countryinput = inputElement.querySelector('[data-kyc-select-input]').cloneNode(false);

                                                    let currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);

                                                    currentOption.value = '';
                                                    currentOption.innerHTML = translate("select a country");
                                                    countryinput.appendChild(currentOption);

                                                    (issuers.IDIN || []).map(function (ci) {
                                                            if (!!ci['country']) {

                                                                currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);

                                                                currentOption.value = ci['country'] || '';
                                                                currentOption.innerHTML = translate(ci['country'] || '');
                                                                countryinput.appendChild(currentOption);
                                                            }

                                                        }
                                                    );


                                                    if (!focusel) {
                                                        focusel = countryinput;
                                                    }
                                                    newinput.appendChild(countryinput);
                                                    countryinput.addEventListener('change', function (event) {
                                                        if (!!event.target.value) {
                                                            const idininput = inputElement.querySelector('[data-kyc-select-input]').cloneNode(false);

                                                            let currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);

                                                            currentOption.value = '';
                                                            currentOption.innerHTML = translate("select a issuer");
                                                            idininput.appendChild(currentOption);

                                                            (issuers.IDIN || []).slice(0, 1).map(function (ci) {
                                                                    if (!!ci['issuers']) {
                                                                        (ci['issuers'] || []).map(function (issuer) {
                                                                            currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);

                                                                            currentOption.value = issuer['id'] || '';
                                                                            currentOption.innerHTML = translate(issuer['name'] || '');
                                                                            idininput.appendChild(currentOption);
                                                                        })

                                                                    }

                                                                }
                                                            );


                                                            event.target.parentNode.appendChild(idininput);
                                                            event.target.parentNode.removeChild(event.target);
                                                            idininput.focus();

                                                            idininput.addEventListener('change', function (event) {
                                                                if (!!event.target.value) {
                                                                    const issuer = event.target.value.trim(),
                                                                        keys = check.definition.requestedIdinKeys,
                                                                        secret = makeId(32),
                                                                        storage = {
                                                                            KYCToken: KYCToken,
                                                                            context: JSON.parse(JSON.stringify(target['kyc'].context))
                                                                        }
                                                                    buildLoader(target);
                                                                    storage.context.taskId = task.id
                                                                    storage.context.dossierId = dossier.id
                                                                    storage.context.checkId = checkid


                                                                    startIdinTransaction(issuer, keys, {
                                                                        KYCSECRET: secret,
                                                                        KYCStorage: storage
                                                                    });
                                                                    //buildTaskForm(target, dossier, task, checkid);


                                                                }
                                                            })
                                                        }
                                                    })

                                                } else {
                                                    const idininput = inputElement.querySelector('[data-kyc-select-input]').cloneNode(false);

                                                    let currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);

                                                    currentOption.value = '';
                                                    currentOption.innerHTML = translate("select a issuer");
                                                    idininput.appendChild(currentOption);

                                                    (issuers.IDIN || []).slice(0, 1).map(function (ci) {

                                                            if (!!ci['issuers']) {
                                                                (ci['issuers'] || []).map(function (issuer) {
                                                                    currentOption = (inputElement.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);

                                                                    currentOption.value = issuer['id'] || '';
                                                                    currentOption.innerHTML = translate(issuer['name'] || '');
                                                                    idininput.appendChild(currentOption);
                                                                })

                                                            }

                                                        }
                                                    );


                                                    if (!focusel) {
                                                        focusel = idininput;
                                                    }
                                                    newinput.appendChild(idininput);
                                                    idininput.addEventListener('change', function (event) {
                                                        if (!!event.target.value) {
                                                            const issuer = event.target.value.trim(),
                                                                keys = check.definition.requestedIdinKeys,
                                                                secret = makeId(32),
                                                                storage = {
                                                                    KYCToken: KYCToken,
                                                                    context: JSON.parse(JSON.stringify(target['kyc'].context))
                                                                }
                                                            buildLoader(target);
                                                            storage.context.taskId = task.id
                                                            storage.context.dossierId = dossier.id
                                                            storage.context.checkId = checkid


                                                            startIdinTransaction(issuer, keys, {
                                                                KYCSECRET: secret,
                                                                KYCStorage: storage
                                                            });

                                                        }
                                                    })


                                                }

                                            } else {
                                                newinput.innerHTML = translate('No IDIN issuers');
                                            }
                                        } else {
                                            newinput = document.createElement('div');
                                            newinput.setAttribute('class', inputElement.querySelector('[data-kyc-input]').getAttribute('class'))
                                            newinput.innerHTML = 'The IDIN check is Completed';
                                        }

                                        /*  newinput = document.createElement('div');
                                          newinput.setAttribute('class', inputElement.querySelector('[data-kyc-input]').getAttribute('class'))
                                          newinput.innerHTML = 'IDIN is coming soon to the web flow';*/
                                        break;
                                    case 'RAW_DOCUMENT_SCAN':
                                    case 'DOCUMENT_FILE_UPLOAD':
                                    case 'SELFIE_CHECK':
                                        newinput = inputElement.querySelector('[data-kyc-file]').cloneNode(true);

                                        const fileinput = newinput.querySelector('[data-kyc-file-input]'),
                                            placeholder = inputElement.querySelector('kyc-placeholder'),
                                            filepreview = newinput.querySelector('[data-kyc-file-preview]'),
                                            realinput = document.createElement('input');


                                        realinput.setAttribute('type', 'hidden');
                                        realinput.required = !(!!check.definition.optional);
                                        realinput.value = check.value || null;
                                        realinput.setAttribute('name', formname)
                                        newinput.appendChild(realinput);

                                        if (!!check.definition.method) {
                                            realinput.setAttribute('data-method', check.definition.method)
                                        }
                                        if (!!check.definition.valueFormat) {
                                            realinput.setAttribute('data-value-format', check.definition.valueFormat)
                                        }

                                        fileinput.setAttribute('type', 'file');
                                        fileinput.setAttribute('placeholder', translate(check.definition.description));
                                        if (!focusel) {
                                            focusel = fileinput;
                                        }
                                        filepreview.innerHTML = translate(check.definition.description);
                                        fileinput.addEventListener('change', function (event) {
                                            if (event.target.files && event.target.files[0]) {
                                                const reader = new FileReader();
                                                reader.onload = function (fileEvent) {

                                                    //filepreview
                                                    if (!!fileEvent && !!fileEvent.target && !!fileEvent.target['result']) {
                                                        //filepreview.setAttribute('style', 'background-image:url("' + fileEvent.target['result']+ '")');

                                                        /*UPLOAD FILE*/

                                                        saveUpload(fileEvent.target['result'], target, function (result) {
                                                            if (!!result.success && !!result.success.uuid) {
                                                                uploads[result.success.uuid] = !!fileEvent && !!fileEvent.target && fileEvent.target['result'] ? fileEvent.target['result'] : '';
                                                                filepreview.setAttribute('style', 'background-image:url("' + uploads[result.success.uuid] + '")');
                                                                realinput.value = result.success.uuid;
                                                                realinput.setAttribute('value', result.success.uuid);
                                                                validateInputOnEvent({
                                                                    target: realinput,
                                                                    type: 'change'
                                                                });
                                                                if (realinput.checkValidity()) {
                                                                    if (!!curSuccessClassElement) {
                                                                        curSuccessClassElement.classList.add(successClass);
                                                                    }
                                                                    if (!!curErrorClassElement) {
                                                                        curErrorClassElement.classList.remove(errorClass);
                                                                    }

                                                                } else {
                                                                    if (!!curSuccessClassElement) {
                                                                        curSuccessClassElement.classList.remove(successClass);
                                                                    }
                                                                    if (!!curErrorClassElement) {
                                                                        curErrorClassElement.classList.add(errorClass);
                                                                    }
                                                                }
                                                            }
                                                        })


                                                    }


                                                }
                                                filepreview.innerHTML = event.target.files[0].name;
                                                reader.readAsDataURL(event.target.files[0]);
                                            }
                                        })
                                        if (!!check.value) {
                                            if (!!uploads[check.value]) {
                                                filepreview.setAttribute('style', 'background-image:url("' + uploads[check.value] + '")');
                                            } else {
                                                getUpload(check.value, target, function (result) {
                                                    if (!!result.success) {
                                                        filepreview.setAttribute('style', 'background-image:url("' + uploads[check.value] + '")');
                                                        if (realinput.checkValidity()) {
                                                            if (!!curSuccessClassElement) {
                                                                curSuccessClassElement.classList.add(successClass);
                                                            }
                                                            if (!!curErrorClassElement) {
                                                                curErrorClassElement.classList.remove(errorClass);
                                                            }

                                                        } else {
                                                            if (!!curSuccessClassElement) {
                                                                curSuccessClassElement.classList.remove(successClass);
                                                            }
                                                            if (!!curErrorClassElement) {
                                                                curErrorClassElement.classList.add(errorClass);
                                                            }
                                                        }

                                                    }
                                                })


                                            }
                                        }

                                        break;


                                }


                                break;

                        }
                        inputElement.parentNode.replaceChild(newinput, inputElement);
                        /*last.parentNode.insertBefore(curCheck, last.nextSibling);
                        last = curCheck;
                        checkElement.parentNode.removeChild(checkElement);*/

                        checkElement.parentNode.replaceChild(curCheck, checkElement);


                        ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-dossiers]')).map(function (backbutton) {
                            if (target['kyc'].dossiers.length > 1) {
                                ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                    e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                                });

                                backbutton.addEventListener('click', function () {
                                    buildDossiersList(target);
                                })
                            } else {
                                backbutton.parentNode.removeChild(backbutton);
                            }

                        });
                        ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-tasks]')).map(function (backbutton) {
                            if (task.checks.length > 1) {
                                ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                    e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                                });

                                backbutton.addEventListener('click', function () {
                                    buildTaskList(target, dossier);
                                })
                            } else {
                                backbutton.parentNode.removeChild(backbutton);
                            }


                        });
                        if (target['kyc'].history.back.length > 0) {
                            ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-previous]')).map(function (backbutton) {
                                ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                    e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                                });

                                backbutton.addEventListener('click', function () {
                                    goBack(target);
                                })

                            });

                        } else {
                            ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-navigation] [data-kyc-task-previous]')).map(function (backbutton) {
                                backbutton.parentNode.removeChild(backbutton);
                            });
                        }


                        ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-next]')).map(function (nextbutton) {

                            nextbutton.disabled = !!taskFormElement && !taskFormElement.checkValidity()

                            ap.slice.call(nextbutton.querySelectorAll('kyc-text')).map(function (e) {
                                e.parentNode.replaceChild(document.createTextNode(translate('Next')), e);

                            });
                            nextbutton.addEventListener('click', function () {
                                const values = {};
                                if (!!taskFormElement && taskFormElement.checkValidity()) {

                                    check.value = (formname == check.id)
                                        ? validateInputOnEvent({
                                            'type': 'tokyc',
                                            'target': taskFormElement.querySelector('[name="' + formname + '"]')
                                        })
                                        : JSON.stringify(ap.slice.call(taskFormElement.querySelectorAll('[name="' + formname + '"]')).map(function (field) {
                                            return validateInputOnEvent({'type': 'tokyc', 'target': field});
                                        }));


                                    gotoNext(next);
                                    return;
                                }
                            })

                        });


                        target.innerHTML = '';
                        target.appendChild(dossierElement);
                        target.setAttribute('kyc-sdk-status', 'task')
                        if (focusel) {
                            focusel.focus();
                        }
                        notify('taskform', target);


                    }
                    catch
                        (error) {

                        throwError(
                            'A templating error has occured while building the dossier task check form!',
                            'taskform',
                            error,
                            {template: target['kyc'].template, dossier: dossier, task: task, checkid: checkid},
                            target);
                    }
                    return
                }

                throwError(
                    'The check could not be determined!',
                    'taskform',
                    {description: 'check is undefined'},
                    {dossier: dossier, task: task, checkid: checkid},
                    target);

            },
            safeKyc = function (element: HTMLElement) {
                return {
                    context: element['kyc'].context,
                    status: element['kyc'].status
                };
            },
            init = function (elementId?: string, inContext?: object) {

                const ref = getKycSdkReference();
                if (!!ref && ref.context) {
                    inContext = ref.context;
                }

                const view = document.createElement('kyc-view'),
                    checked = checkSdkConditions(elementId, inContext);

                let status, element, context, event;
                if (!checked) {
                    return false;
                }
                if (!!elementId) {
                    showWarning = true;
                }

                element = checked.element;
                context = checked.context;

                if (!!element) {
                    if (!element.kyc) {
                        status = {
                            initialised: new Date(),
                            version: version
                        }

                        event = createEvent('initialised', {status: status, context: context});

                        element.kyc = {
                            context: checked.context,
                            status: status,
                            template: template(element.innerHTML.trim()),
                            history: {
                                back: [],
                                next: []
                            }
                        };

                        if (!!element.setAttribute) {
                            element.setAttribute('kyc-sdk-status', 'ready')
                            buildLoader(element);
                            element.appendChild(view);
                        }


                    } else {
                        if (!!element.setAttribute) {
                            element.setAttribute('kyc-sdk-status', 'ready')
                        }
                        element.kyc.status.reset = new Date(),
                            element.kyc.context = context,
                            event = createEvent('reset', safeKyc(element));
                    }
                }
                notify(event, element);
                getToken(element);

                return element;
            };
        if (!window[kyc_sdk]) {
            window[kyc_sdk] = {
                get initialised() {
                    return initialised
                },
                get version() {
                    return version
                },

                init: init,
                getOrigLocation() {
                    return origLocation;
                },

                getToken() {
                    return getToken();
                },
                getMe() {
                    if (!!KYCToken) {
                        return getMe();
                    }
                    throwError(
                        'no valid Identification',
                        'getDossiers',
                        {description: 'missing KYCToken'}
                    );
                },
                getDossiers() {
                    if (!!KYCToken) {
                        return getDossiers();
                    }
                    throwError(
                        'no valid Identification',
                        'getDossiers',
                        {description: 'missing KYCToken'}
                    );
                },
                getTasks(dossierId) {
                    if (!!KYCToken) {
                        return getTasks(dossierId);
                    }
                    throwError(
                        'no valid Identification',
                        'getTasks',
                        {description: 'missing KYCToken'}
                    );

                },
                getTask(taskId) {
                    if (!!KYCToken) {
                        return getTask(taskId);
                    }
                    throwError(
                        'no valid Identification',
                        ' getTask',
                        {description: 'missing KYCToken'}
                    );

                },
                getUpload(uploadId) {
                    if (!!KYCToken) {
                        return getUpload(uploadId);
                    }
                    throwError(
                        'no valid Identification',
                        ' getTask',
                        {description: 'missing KYCToken'}
                    );
                },
                saveUpload(content) {
                    if (!!KYCToken) {
                        return saveUpload(content);
                    }
                    throwError(
                        'no valid Identification',
                        ' getTask',
                        {description: 'missing KYCToken'}
                    );
                },
                saveTask(task) {
                    if (!!KYCToken) {
                        return saveTask(task);
                    }
                    throwError(
                        'no valid Identification',
                        'saveTask',
                        {description: 'missing KYCToken'}
                    );

                }
            };
            const event = createEvent('ready', {status: {initialised: initialised, version: version}});
            notify(event, window);
            // showWarning = true;
            domReady(function () {
                getKycSdkReference();
                if (checkSdkConditions()) {
                    init();
                }

            })

        }
    }
)
();