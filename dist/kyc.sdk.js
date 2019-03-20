"use strict";
(function () {
    if (!window["console"] || typeof console == "undefined") {
        console = console || {};
        ["assert", "clear", "count", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "table", "time", "timeEnd", "trace", "warn"].map(function (e) {
            console[e] = function () {
            };
        });
    }
    var kycTemplate, showWarning = false, authorisationEndPoint, kycApiEndPoint, returnUrl, KYCToken, KycSdkReference, KYCStorage;
    var kyc_sdk = 'kyc_sdk', version = '0.0.1', origLocation = JSON.parse(JSON.stringify(window.location)), uploads = {}, issuers = { IDIN: null, IBAN: null }, initialised = new Date(), defaultTemplateString = '/*<!-- Define the template for the dossier-list --><ul data-kyc-dossier-list><li data-kyc-dossier-none><span><kyc-dossier-error></kyc-dossier-error></span></li><li data-kyc-dossier-item><span><kyc-dossier-name></kyc-dossier-name></span><span><kyc-dossier-status></kyc-dossier-status></span><span><kyc-dossier-created></kyc-dossier-created></span></li></ul><!-- Define the template for the task-list in a dossier--><div data-kyc-task-list><h1 data-kyc-dossier-title><button data-kyc-to-dossiers></button><kyc-text></kyc-text></h1><ul><li data-kyc-task-item><span><kyc-task-name></kyc-task-name></span><span><kyc-task-status></kyc-task-status></span></li></ul></div><!-- Define the template for a single dossier --><div data-kyc-dossier><h1 data-kyc-dossier-title><button data-kyc-to-dossiers></button><kyc-text></kyc-text></h1><!-- Define the template for a single task in a dossier --><form data-kyc-task><h2 data-kyc-task-title><button data-kyc-to-tasks></button><kyc-text></kyc-text></h2><!-- Define the template for a single check in a task in a dossier --><div data-kyc-check data-kyc-errorclass="error" data-kyc-successclass="success"><label><kyc-check-description></kyc-check-description></label><kyc-input><input data-kyc-input> <textarea data-kyc-textarea></textarea> <select data-kyc-select-input></select><div data-kyc-options><div data-kyc-checkbox><label><input type="checkbox" data-kyc-checkbox-input><kyc-text></kyc-text></label></div><div data-kyc-radiobutton><label><input type="radio" data-kyc-radio-input><kyc-text></kyc-text></label></div></div><div data-kyc-file><input type="file" class="form-control" data-kyc-file-input><div class="filepreview" data-kyc-file-preview></div></div></kyc-input><small><kyc-check-longdescription></kyc-check-longdescription></small></div><!-- Define the template for the check overview in a task in a dossier --><div data-kyc-check-overview><label><kyc-check-description></kyc-check-description></label><p><data-kyc-check-value></data-kyc-check-value></p></div><!-- Define the template the navigation between tasks in a dossier --><div data-kyc-task-navigation><button data-kyc-task-previous><kyc-text></kyc-text></button> <button data-kyc-task-next><kyc-text></kyc-text></button></div></form></div><!-- Define the template the loader --><div data-kyc-loader></div>*/', ap = Array.prototype, domReady = function (fn) {
        if (document.readyState === 'complete') {
            fn();
        }
        else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', fn);
        }
        else if (document['attachEvent']) {
            document['attachEvent']('onreadystatechange', function () {
                if (document.readyState === 'complete')
                    fn();
            });
        }
    }, jwtDecode = function (token) {
        try {
            var base64HeaderUrl = token.split('.')[0];
            var base64Header = base64HeaderUrl.replace('-', '+').replace('_', '/');
            var headerData = JSON.parse(window.atob(base64Header));
            var base64Url = token.split('.')[1];
            var base64 = base64Url.replace('-', '+').replace('_', '/');
            var dataJWT = JSON.parse(window.atob(base64));
            dataJWT.header = headerData;
            return dataJWT;
        }
        catch (err) {
            return false;
        }
    }, http = function (options) {
        if (!!options && typeof (options) == 'string') {
            options = {
                url: options.trim()
            };
        }
        options.method = options.method || 'GET';
        var callback = function (params) {
            if (!!options.callback && typeof options.callback == 'function') {
                options.callback(params);
            }
        }, xhr = new XMLHttpRequest();
        var params = options.params, response;
        try {
            xhr.open(options.method, options.url);
        }
        catch (e) {
            callback({ error: e, xhr: xhr });
            return;
        }
        xhr.withCredentials = options.withCredentials || false;
        xhr.addEventListener("load", function () {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        response = JSON.parse(xhr.response || xhr.responseText);
                    }
                    catch (e) {
                        response = (xhr.response || xhr.responseText);
                    }
                    callback({ success: response || 'OK', xhr: xhr });
                }
                else {
                    try {
                        response = JSON.parse(xhr.response || xhr.responseText);
                    }
                    catch (e) {
                        response = 'invalid http status';
                    }
                    callback({ error: response || 'ERROR', xhr: xhr });
                }
            }
        });
        xhr.addEventListener("error", function () {
            callback({ error: 'invalid http status', xhr: xhr });
        });
        if (options.headers) {
            for (var key in options.headers) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }
        if (options.method == 'GET' && !!options.params && typeof options.params === 'object') {
            params = [];
            for (var key in options.params) {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
            params = params.join('&');
        }
        try {
            xhr.send(params);
        }
        catch (e) {
            callback({ error: e, xhr: xhr });
        }
    }, getLocation = function (href, parts) {
        var l = document.createElement("a");
        l.href = href;
        return parts ? l : (l.origin + l.pathname + l.search + l.hash);
    }, callApi = function (options) {
        options.headers = { 'Authorization': 'Bearer ' + KYCToken.userToken };
        http(options);
    }, makeId = function (length) {
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var text = "", datesalt = new Date().valueOf().toString().split('');
        while (text.length < length) {
            if (datesalt.length > 0) {
                text += possible.charAt(Math.floor(Math.max(possible.length, parseInt(datesalt.shift() + ' ' + datesalt.shift()))));
            }
            else {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
        }
        return text;
    }, encrypt = function (value, salt) {
        var textToChars = function (text) {
            return text.split('').map(function (c) { return c.charCodeAt(0); });
        }, byteHex = function (n) {
            return ("0" + Number(n).toString(16)).substr(-2);
        }, applySaltToChar = function (code) {
            return textToChars(salt).reduce(function (a, b) { return a ^ b; }, code);
        };
        return value.split('').map(textToChars)
            .map(applySaltToChar)
            .map(byteHex)
            .join('');
    }, decrypt = function (value, salt) {
        var textToChars = function (text) { return text.split('').map(function (c) { return c.charCodeAt(0); }); }, saltChars = textToChars(salt), applySaltToChar = function (code) { return textToChars(salt).reduce(function (a, b) { return a ^ b; }, code); };
        return ((value || '').match(/.{1,2}/g) || [])
            .map(function (hex) {
            return parseInt(hex, 16);
        })
            .map(applySaltToChar)
            .map(function (charCode) {
            return String.fromCharCode(charCode);
        })
            .join('');
    }, getCookie = function (cname) {
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
    }, setCookie = function (cname, cvalue, exdatetime) {
        if (!exdatetime) {
            exdatetime = new Date();
            exdatetime.setTime(exdatetime.getTime() + (15 * 60 * 10000));
        }
        document.cookie = cname + "=" + cvalue + ";" + "expires=" + exdatetime.toUTCString() + ";path=/";
    }, clearKycStorage = function () {
        if (typeof (Storage) !== "undefined") {
            if (!!sessionStorage['KYCStorage']) {
                sessionStorage.removeItem('KYCStorage');
            }
        }
        else {
            setCookie('KYCStorage', '', new Date(0));
        }
    }, getKycStorage = function (KYCSecret) {
        var temp;
        if (typeof (Storage) !== "undefined") {
            if (!!sessionStorage['KYCStorage']) {
                temp = JSON.parse(decrypt(sessionStorage['KYCStorage'] || '', KYCSecret));
            }
        }
        else {
            temp = JSON.parse(decrypt(getCookie('KYCStorage') || '', KYCSecret));
        }
        if (!!temp && temp instanceof Object) {
            KYCStorage = temp;
            return KYCStorage;
        }
        return null;
    }, setKycStorage = function (KYCSecret, value) {
        var _value = encrypt(JSON.stringify(value), KYCSecret);
        if (typeof (Storage) !== "undefined") {
            sessionStorage['KYCStorage'] = _value;
        }
        else {
            setCookie('KYCStorage', _value);
        }
    }, getKycSdkReference = function () {
        if (!!KycSdkReference) {
            return KycSdkReference;
        }
        var keys = {};
        if (!!origLocation && !!origLocation.search) {
            var search = origLocation.search.substr(1).split('&').map(function (val) {
                val = val.split('=');
                if (val.length > 1) {
                    var key = val.shift();
                    if (key == 'trxid') {
                        keys['IDIN'] = { transactionId: val.join('=').trim() };
                    }
                    if (key == 'testkyc') {
                        keys['TESTKYC'] = { testkyc: val.join('=').trim() };
                    }
                    if (key.split('kycs_').shift() == 'kycs_' && key.split('kycs_').length == 2) {
                        var temp = getKycStorage((key.split('kycs_').pop().trim()));
                        if (!!temp) {
                            for (var i in temp) {
                                if (i == 'KYCToken') {
                                    KYCToken = temp[i];
                                }
                                else {
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
                if (!!KycSdkReference['IDIN'].transactionId
                    && !!keys['IDIN']
                    && !!keys['IDIN'].transactionId
                    && !!keys['IDIN'].transactionId === !!KycSdkReference['IDIN'].transactionId) {
                    getIdinTransaction(KycSdkReference['IDIN'].transactionId, function (ret) {
                        if (!!ret) {
                            KycSdkReference['IDIN'] = ret;
                        }
                    });
                }
                else {
                    delete (KycSdkReference['IDIN']);
                }
            }
        }
        return KycSdkReference;
    }, getToken = function (element) {
        if (KYCToken && KYCToken.userToken) {
            if (!element) {
                var event_1 = createEvent('getToken', { KYCToken: KYCToken });
                notify(event_1, window);
                return;
            }
            getMe(element);
        }
        else {
            var base = element || window;
            if (!base || (!(!!base['kyc'] && !!base['kyc'].context) && !(!!base['kyc_config'] && !!base['kyc_config'].context))) {
                throwError("No kyc config found", 'getToken', { description: 'invalid KYC configuration' }, { config: !!base ? (base['kyc_config'] || base['kyc']) : null }, element);
                return;
            }
            var options = {
                url: authorisationEndPoint,
                method: 'POST',
                withCredentials: true,
                headers: { 'Content-Type': 'application/json;charset=UTF-8' },
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
                            var event_2 = createEvent('getToken', { KYCToken: KYCToken });
                            notify(event_2, window);
                            return;
                        }
                        notify('login', element);
                        getMe(element);
                    }
                    else {
                        throwError("No kyc Token could be retrieved from " + authorisationEndPoint + "!", 'getToken', result, { authorisationEndPoint: authorisationEndPoint }, element);
                    }
                }
            };
            http(options);
        }
    }, getMe = function (element) {
        var options = {
            'url': kycApiEndPoint + '/api/v1/users/me',
            callback: function (result) {
                if (!!result.success) {
                    if (!element) {
                        var event_3 = createEvent('me', { me: result.success });
                        notify(event_3, window);
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
                var errorMessage = "KYC identity could not be verified!", action = 'getMe';
                console.warn(errorMessage, result.error);
                if (!element) {
                    var event_4 = createEvent('error', {
                        action: action,
                        'message': errorMessage,
                        'error': result.error
                    });
                    notify(event_4, window);
                    return;
                }
                var details = safeKyc(element);
                details['action'] = action;
                details['message'] = errorMessage;
                details['error'] = result.error;
                notify('error', element, details);
            }
        };
        callApi(options);
    }, getIdinIssuers = function (callback) {
        if (!!issuers.IDIN) {
            if (!!callback) {
                callback(issuers.IDIN);
                return;
            }
            var event_5 = createEvent('IDIN', { issuers: issuers.IDIN });
            notify(event_5, window);
            return;
        }
        var options = {
            'url': kycApiEndPoint + '/api/v1/identityservices/idin/issuers',
            callback: function (result) {
                if (!!result.success) {
                    issuers.IDIN = result.success;
                    if (!callback) {
                        var event_6 = createEvent('IdinIssuers', { issuers: issuers.IDIN });
                        notify(event_6, window);
                        return;
                    }
                    callback(issuers.IDIN);
                    return;
                }
                var errorMessage = "KYC could retrieve IDIN ISSUERS!", action = 'getIdinIssuers';
                throwError(errorMessage, action, result.error);
                if (!!callback) {
                    callback(null);
                }
            }
        };
        callApi(options);
    }, startIdinTransaction = function (issuerId, idinKeys, ref) {
        var _location = getLocation(ref.returnUrl || (!!returnUrl ? returnUrl : (location.href)), true), search = _location.search.toString().substring(1).split('&').filter(function (q) {
            return ['trxid', 'ec'].indexOf(q.toLowerCase().split('=').shift() || '') === -1 &&
                !((q.toLowerCase().split('=').shift() || '').split('kycs_').shift() == 'kycs_'
                    && (q.toLowerCase().split('=').shift() || '').split('kycs_').length == 2);
        }).join('&').trim(), idinReturnUrl = _location['origin'] +
            _location['pathname'] +
            (!!search ? '?' + search + (!!ref.KYCSECRET && !!ref.KYCStorage ? '&kycs_' + ref.KYCsecret + '=1' : '') : (!!ref.KYCSECRET && !!ref.KYCStorage ? '?kycs_' + ref.KYCSECRET + '=1' : '')) +
            _location['hash'], options = {
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
                                setKycStorage(ref.KYCSECRET, ref.KYCStorage);
                            }
                        }
                        window.location.replace(result.issuerAuthenticationUrl);
                        return;
                    }
                }
                var errorMessage = "KYC could retrieve IDIN AuthenticationUrl", action = 'getIdinIssuers';
                throwError(errorMessage, action, result.error || { 'error': result.success });
            }
        };
        callApi(options);
    }, getIdinTransaction = function (transactionId, callback) {
        var options = {
            'url': kycApiEndPoint + '/api/v1/identityservices/idin/transaction/transactionId',
            callback: function (result) {
                if (!!result.success) {
                    if (!callback) {
                        var event_7 = createEvent('IdinTransaction', { transaction: result.success });
                        notify(event_7, window);
                        return;
                    }
                    callback(result.success);
                    return;
                }
                var errorMessage = "KYC could retrieve IDIN ISSUERS!", action = 'getIdinIssuers';
                throwError(errorMessage, action, result.error);
                if (!!callback) {
                    callback(null);
                }
            }
        };
        callApi(options);
    }, getDossiers = function (element) {
        var options = {
            'url': kycApiEndPoint + '/api/v1/users/' + KYCToken.data.uuid + '/dossiers',
            callback: function (result) {
                if (!!result.success) {
                    var ref_1 = getKycSdkReference(), dossiers = (result.success.filter(function (client) {
                        return !!KYCToken.data.clientId && client.clientId == KYCToken.data.clientId;
                    }).shift() || { dossiers: [] }).dossiers;
                    if (!element) {
                        var event_8 = createEvent('dossiers', { dossiers: dossiers });
                        notify(event_8, window);
                        return;
                    }
                    element['kyc'].status.changed = new Date();
                    element['kyc'].dossiers = dossiers.filter(function (dossier) {
                        if (!!ref_1 && !!ref_1.dossierId) {
                            return dossier.id == ref_1.dossierId;
                        }
                        if (!!dossier.templateId && !!element['kyc'].context.templateId) {
                            return dossier.templateId == element['kyc'].context.templateId;
                        }
                        if (!!dossier.id && !!element['kyc'].context.dossierId) {
                            return dossier.id == element['kyc'].context.dossierId;
                        }
                        return true;
                    });
                    var details = safeKyc(element);
                    details['dossiers'] = dossiers;
                    notify('dossiers', element, details);
                    switch (element['kyc'].dossiers.length) {
                        case 0:
                            buildNoDossiersList(element);
                            break;
                        case 1:
                            getTasks(element['kyc'].dossiers[0].id, element);
                            break;
                        default:
                            buildDossiersList(element);
                            break;
                    }
                    return;
                }
                throwError("KYC dossiers could not be fetched!", 'getDossiers', result.error, null, element);
            }
        };
        callApi(options);
    }, getTasks = function (dossierId, element) {
        var curDossier = !!element ? element['kyc'].dossiers.filter(function (dossier) {
            return dossier.id == dossierId;
        }).shift() : null;
        var options = {
            'url': kycApiEndPoint + '/api/v1/dossiers/' + dossierId + '/tasks',
            callback: function (result) {
                if (!!result.success) {
                    var tasks = result.success.filter(function (task) {
                        return task.visible;
                    });
                    if (!element) {
                        var event_9 = createEvent('tasks', { tasks: tasks });
                        notify(event_9, window);
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
                                buildTaskList(element, curDossier);
                                break;
                        }
                    }
                    var details = safeKyc(element);
                    details['tasks'] = tasks;
                    notify('tasks', element, details);
                    return;
                }
                throwError("KYC dossier tasks could not be fetched!", 'getTasks', result.error, { dossierId: dossierId }, element);
            }
        };
        if (!!element) {
            if (!!curDossier) {
                if (!!curDossier.tasks) {
                    buildTaskList(element, curDossier);
                    return;
                }
                callApi(options);
                return;
            }
            else {
                console.warn("KYC dossier could not be fetched!");
            }
        }
        callApi(options);
        return;
    }, getTask = function (taskId, dossierId, element) {
        var curTask;
        var curDossier = !!element && element['kyc'] ? element['kyc'].dossiers.filter(function (dossier) {
            return dossier.id == dossierId;
        }).shift() : null, options = {
            'url': kycApiEndPoint + '/api/v1/tasks/' + taskId,
            callback: function (result) {
                if (!!result.success) {
                    var task_1 = result.success;
                    if (!element) {
                        var event_10 = createEvent('task', { task: task_1 });
                        notify(event_10, window);
                        return;
                    }
                    if (typeof element == 'function') {
                        element(task_1);
                        return;
                    }
                    if (!!element && element['kyc']) {
                        element['kyc'].status.changed = new Date();
                        if (!!curDossier && curTask) {
                            if (!!window['kyc_config'] && !!window['kyc_config'].prefill && typeof window['kyc_config'].prefill == 'function') {
                                var metaData_1;
                                task_1.checks.map(function (check) {
                                    if (!!check && !(!!check.value) && !!check.definition && !!check.definition.metaDataKey) {
                                        if (!(!!metaData_1)) {
                                            metaData_1 = {};
                                        }
                                        metaData_1[check.definition.metaDataKey] = '';
                                    }
                                });
                                if (!!metaData_1) {
                                    window['kyc_config'].prefill(metaData_1, function (retMetaData) {
                                        if (!!retMetaData) {
                                            task_1.checks = task_1.checks.map(function (check) {
                                                if (!!check && !(!!check.value) && !!check.definition && !!check.definition.metaDataKey) {
                                                    if (!!retMetaData[check.definition.metaDataKey]) {
                                                        check.value = retMetaData[check.definition.metaDataKey];
                                                    }
                                                }
                                                return check;
                                            });
                                        }
                                        element['kyc'].status.changed = new Date();
                                        curTask = task_1;
                                        buildTaskForm(element, curDossier, curTask);
                                        notify('task', element);
                                        return;
                                    });
                                }
                            }
                            element['kyc'].status.changed = new Date();
                            curTask = task_1;
                            buildTaskForm(element, curDossier, curTask);
                        }
                        notify('task', element);
                    }
                    return;
                }
                if (typeof element == 'function') {
                    element({ error: result.error });
                    return;
                }
                throwError("KYC dossier task could not be fetched!", 'getTask', result.error, { taskId: taskId, dossierId: dossierId }, element);
            }
        };
        if (!!element && element['kyc']) {
            if (!!curDossier) {
                if (!!curDossier.tasks) {
                    curTask = curDossier.tasks.filter(function (task) {
                        return task.id == taskId;
                    }).shift();
                    if (curTask) {
                        if (curTask.checks) {
                            buildTaskForm(element, curDossier, curTask);
                            return;
                        }
                        callApi(options);
                    }
                    return;
                }
                else {
                    throwError("KYC dossier could not be fetched!", 'getTask', { description: 'invalid KYC dossier' }, { taskId: taskId, dossierId: dossierId }, element);
                    return;
                }
            }
        }
        callApi(options);
        return;
    }, getUpload = function (uploadId, element, callback) {
        var options = {
            'url': kycApiEndPoint + '/api/v1/uploads/' + uploadId,
            method: 'GET',
            callback: function (result) {
                if (!!result.success) {
                    uploads[uploadId] = result.success;
                    if (!element) {
                        var event_11 = createEvent('uploadId', { uploadId: uploadId, content: result.success });
                        notify(event_11, window);
                        return;
                    }
                    if (!!callback) {
                        callback({ 'success': result.success });
                    }
                    return;
                }
                throwError("No upload with the id " + uploadId + " could be retrieved!", 'getUpload', result.error, { uploadId: uploadId }, element);
                if (!!callback) {
                    callback({ 'error': result.error });
                }
            }
        };
        callApi(options);
    }, saveUpload = function (content, element, callback) {
        var options = {
            'url': kycApiEndPoint + '/api/v1/uploads/',
            params: content,
            method: 'POST',
            callback: function (result) {
                if (!!result.success && !!result.success.uuid) {
                    uploads[result.success.uuid] = content;
                    if (!element) {
                        var event_12 = createEvent('saveUpload', {
                            uploadId: result.success.uuid,
                            content: content
                        });
                        notify(event_12, window);
                        return;
                    }
                    if (!!callback) {
                        callback({ 'success': result.success });
                    }
                    return;
                }
                throwError("The upload could not be saved!", 'saveUpload', result.error || { description: 'no uploadId returned' }, { contant: content }, element);
                if (!!callback) {
                    callback({ 'error': result.error || { description: 'no uploadId returned' } });
                }
            }
        };
        callApi(options);
    }, saveTask = function (task, element, callback) {
        var options = {
            'url': kycApiEndPoint + '/api/v1/tasks/' + task.id,
            method: 'POST',
            params: JSON.stringify(task),
            callback: function (result) {
                if (!!result.success) {
                    getTask(task.id, '', function (result) {
                        if (!!result.error) {
                            throwError("The task could not be fetched!", 'getTask', result.error, { task: task }, element);
                            if (!!callback) {
                                callback({ 'error': result.error });
                            }
                        }
                        task.checks = result.checks || task.checks;
                        task.status = result.status || task.status;
                        task.visible = result.visible || task.visible;
                        task.shared = result.shared || task.shared;
                        if (!element) {
                            var event_13 = createEvent('saveTask', { task: task });
                            notify(event_13, window);
                            return;
                        }
                        element['kyc'].status.changed = new Date();
                        var details = safeKyc(element);
                        details['task'] = task;
                        notify('savetask', element, details);
                        if (!!callback) {
                            callback({ 'success': task });
                        }
                    });
                    return;
                }
                throwError("The task could not be saved!", 'saveTask', result.error, { task: task }, element);
                if (!!callback) {
                    callback({ 'error': result.error });
                }
            }
        };
        callApi(options);
    }, checkSdkConditions = function (elementId, inContext) {
        if (!window['kyc_config']) {
            if (!!showWarning) {
                console.warn("No kyc_config object found on window!");
            }
            return false;
        }
        var origwarning = showWarning;
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
        returnUrl = !!window['kyc_config'].returnUrl ? getLocation(window['kyc_config'].returnUrl) : null;
        if (!inContext) {
            if (!window['kyc_config'].context) {
                if (!!showWarning) {
                    console.warn("No context object found on the kyc_config object!");
                }
                return false;
            }
            inContext = window['kyc_config'].context;
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
            }
            else {
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
            }
            else if (!!showWarning) {
                console.warn("The HTML element with id '" + elementId + "'  is not present in the DOM tree!");
            }
            return false;
        }
    }, createEvent = function (type, detail) {
        var event;
        if (typeof (Event) === 'function') {
            event = new Event(type);
        }
        else {
            event = document.createEvent('Event');
            event.initEvent(type, true, true);
        }
        if (!!detail) {
            event['detail'] = detail;
        }
        return event;
    }, triggerLoadEvent = function (target, type, detail) {
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
    }, throwError = function (errorMessage, action, error, details, element) {
        console.warn(errorMessage, action, error, details);
        var errorDetial = {
            action: action,
            message: errorMessage,
            error: error
        };
        if (!!details) {
            for (var i in details) {
                if (!(!!errorDetial[i])) {
                    errorDetial[i] = details[i];
                }
            }
        }
        if (!element) {
            console.info('throw', errorDetial);
            var event_14 = createEvent('error', errorDetial);
            notify(event_14, window);
            return;
        }
        details = safeKyc(element);
        for (var i in details) {
            if (!(!!errorDetial[i])) {
                errorDetial[i] = details[i];
            }
        }
        notify('error', element, errorDetial);
    }, formatDate = function (date) {
        if (!!window['kyc_config'] && !!window['kyc_config'].formatDate && typeof window['kyc_config'].formatDate == 'function') {
            return window['kyc_config'].formatDate(date);
        }
        return;
        date.getFullYear() + '-' + (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate();
    }, translate = function (str) {
        str = str || '';
        if (!!window['kyc_config'] && !!window['kyc_config'].translate && typeof window['kyc_config'].translate == 'function') {
            return window['kyc_config'].translate(str);
        }
        return str;
    }, notify = function (inEvent, target, details) {
        var event;
        if (!!inEvent && typeof inEvent == 'string' && !!target && !!target['kyc']) {
            inEvent = createEvent(inEvent.trim(), details || safeKyc(target));
        }
        try {
            event = JSON.parse(JSON.stringify(inEvent));
        }
        catch (err) {
            console.warn(err, inEvent, typeof inEvent);
            return;
        }
        event.isTrusted = true;
        event.type = inEvent.type.toString();
        if (!!target) {
            event.target = target;
            triggerLoadEvent(target, event.type, event.detail);
        }
        else {
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
    }, template = function (custom) {
        kycTemplate = document.createElement('kyc-template');
        var customTemplate = document.createElement('kyc-custom-template'), defaultTemplate = document.createElement('kyc-default-template');
        defaultTemplate.innerHTML = defaultTemplateString;
        customTemplate.innerHTML = custom;
        kycTemplate.appendChild(customTemplate);
        kycTemplate.appendChild(defaultTemplate);
        return kycTemplate.cloneNode(true);
    }, getPartial = function (selector, source) {
        var sourcetoUse = !!source ? source : kycTemplate, partial = sourcetoUse.querySelector(selector);
        if (!!partial) {
            return partial.cloneNode(true);
        }
        console.warn('A templating error has occured.!', {
            selector: selector,
            template: sourcetoUse.innerHTML
        });
        return null;
    }, goBack = function (element) {
        var lasthistory = element['kyc'].history.back.pop();
        if (!!lasthistory) {
            element['kyc'].history.next.push(lasthistory);
            if (typeof lasthistory == 'function') {
                lasthistory();
            }
        }
    }, Validators = {
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
            var iban = String(input).toUpperCase().replace(/[^A-Z0-9]/g, ''), code = iban.match(/^([A-Z]{2})(\d{2})([A-Z\d]+)$/), digits;
            if (!code || iban.length !== CODE_LENGTHS[code[1]]) {
                return false;
            }
            digits = (code[3] + code[1] + code[2]).replace(/[A-Z]/g, function (letter) {
                return ((letter || '').toString().charCodeAt(0) - 55).toString();
            });
            return Validators.mod97(digits);
        },
        mod97: function (string) {
            var checksum = string.slice(0, 2), fragment;
            for (var offset = 2; offset < string.length; offset += 7) {
                fragment = String(checksum) + string.substring(offset, offset + 7);
                checksum = parseInt(fragment, 10) % 97;
            }
            return checksum;
        }
    }, validateInputOnEvent = function (event) {
        var valueFormat = event.target.getAttribute('data-value-format');
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
                    validateInputOnEvent({ target: event.target, type: 'prefill' });
                }
                break;
            case 'keypress':
                var code = event.keyCode || event.which, character = String.fromCharCode(code);
                var allowedKeys = void 0;
                switch (valueFormat) {
                    case 'PHONE_NUMBER':
                        allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", 8, 37, 39];
                        if ((/[\s\+]|\./.test(character) && !!event.target.value.trim())
                            || (!/[0-9\s\+]|\./.test(character)
                                && allowedKeys.indexOf(code) < 0)) {
                            event.preventDefault();
                            return;
                        }
                        break;
                    case 'IBAN':
                        allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", 8, 37, 39];
                        if (!/[A-Z0-9\-\s]|\./.test(character.toUpperCase())
                            && allowedKeys.indexOf(code) < 0) {
                            event.preventDefault();
                            return;
                        }
                        break;
                }
                break;
        }
        var curform = (event.path || []).filter(function (el) {
            return !!el && !!el.tagName && el.tagName === 'FORM';
        }).shift();
        if (!!curform && curform.tagName) {
            ap.slice.call(curform.querySelectorAll('[data-kyc-task-next]')).map(function (nextbutton) {
                nextbutton.disabled = !!curform && !curform.checkValidity();
            });
        }
    }, buildLoader = function (target) {
        if (!target || !target.appendChild) {
            return;
        }
        target.innerHTML = '';
        var loader = getPartial('[data-kyc-loader]', target['kyc'].template);
        if (!!loader) {
            target.appendChild(loader);
        }
        target.setAttribute('kyc-sdk-status', 'loading');
    }, buildNoDossiersList = function (target) {
        if (!target) {
            return;
        }
        try {
            var dossierlist = getPartial('[data-kyc-dossier-list]', target['kyc'].template), dossierrow = dossierlist.querySelector('[data-kyc-dossier-item]'), errorrow = dossierlist.querySelector('[data-kyc-dossier-none]'), errornode = errorrow.querySelector('kyc-dossier-error');
            if (!!errornode) {
                errornode.parentNode.replaceChild(document.createTextNode(translate('No dossiers found')), errornode);
            }
            else {
                errorrow.appendChild(document.createTextNode(translate('No dossiers found')));
            }
            dossierrow.parentNode.removeChild(dossierrow);
            target.innerHTML = '';
            target.appendChild(dossierlist);
            target.setAttribute('kyc-sdk-status', 'dossiers');
            notify('dossierlist', target);
        }
        catch (error) {
            throwError('A templating error has occured while building the dossier list!', 'dossierlist', error, { template: target['kyc'].template }, target);
            return;
        }
    }, buildDossiersList = function (target) {
        if (!target || !target.appendChild) {
            return;
        }
        try {
            var dossierlist = getPartial('[data-kyc-dossier-list]', target['kyc'].template), dossierrow_1 = dossierlist.querySelector('[data-kyc-dossier-item]'), errorrow = dossierlist.querySelector('[data-kyc-dossier-none]'), ap_1 = Array.prototype;
            var last_1 = dossierrow_1;
            errorrow.parentNode.removeChild(errorrow);
            target['kyc'].dossiers.map(function (dossier) {
                var curDossierrow = dossierrow_1.cloneNode(true), namenode = curDossierrow.querySelector('kyc-dossier-name'), statusnode = curDossierrow.querySelector('kyc-dossier-status'), datenode = curDossierrow.querySelector('kyc-dossier-created');
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
                last_1.parentNode.insertBefore(curDossierrow, last_1.nextSibling);
                curDossierrow.addEventListener('click', function (event) {
                    buildLoader(target);
                    target['kyc'].history.back = [];
                    target['kyc'].history.next = [];
                    getTasks(dossier.id, target);
                });
                last_1 = curDossierrow;
            });
            dossierrow_1.parentNode.removeChild(dossierrow_1);
            target.innerHTML = '';
            target.appendChild(dossierlist);
            target.setAttribute('kyc-sdk-status', 'dossiers');
            notify('dossierlist', target);
        }
        catch (error) {
            throwError('A templating error has occured while building the dossier list!', 'dossierlist', error, { template: target['kyc'].template }, target);
            return;
        }
    }, buildTaskList = function (target, dossier) {
        if (!target || !target.appendChild) {
            return;
        }
        try {
            var tasklist = getPartial('[data-kyc-task-list]', target['kyc'].template), dossierTitleElement = tasklist.querySelector('[data-kyc-dossier-title] kyc-text'), taskrow_1 = tasklist.querySelector('[data-kyc-task-item]'), backbuttons = tasklist.querySelectorAll('[data-kyc-to-dossiers]'), overrulestatus_1 = ['ACCEPTED', 'SUBMITTED'].indexOf(dossier.status) > -1 ? dossier.status : null;
            var last_2 = taskrow_1;
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
                    });
                }
                else {
                    backbutton.parentNode.removeChild(backbutton);
                }
            });
            dossier.tasks.map(function (task) {
                var curTaskrow = taskrow_1.cloneNode(true), namenode = curTaskrow.querySelector('kyc-task-name'), statusnode = curTaskrow.querySelector('kyc-task-status');
                curTaskrow.setAttribute('data-kyc-status', overrulestatus_1 || task.status);
                if (!!namenode) {
                    namenode.parentNode.replaceChild(document.createTextNode(task.name), namenode);
                }
                if (!!statusnode) {
                    statusnode.parentNode.replaceChild(document.createTextNode(translate(overrulestatus_1 || task.status)), statusnode);
                }
                last_2.parentNode.insertBefore(curTaskrow, last_2.nextSibling);
                curTaskrow.addEventListener('click', function (event) {
                    buildLoader(target);
                    target['kyc'].history.back = [];
                    target['kyc'].history.next = [];
                    getTask(task.id, dossier.id, target);
                });
                last_2 = curTaskrow;
            });
            taskrow_1.parentNode.removeChild(taskrow_1);
            target.innerHTML = '';
            target.appendChild(tasklist);
            target.setAttribute('kyc-sdk-status', 'tasks');
            notify('tasklist', target);
        }
        catch (error) {
            throwError('A templating error has occured while building the dossier task list!', 'tasklist', error, { template: target['kyc'].template }, target);
            return;
        }
    }, buildTaskOverView = function (target, dossier, task) {
        if (!target || !target.appendChild) {
            return;
        }
        try {
            var dossierElement = getPartial('[data-kyc-dossier]', target['kyc'].template);
            ap.slice.call(dossierElement.querySelectorAll('[name]')).map(function (e) {
                e.removeAttribute('name');
            });
            var dossierTitleElement = dossierElement.querySelector('[data-kyc-dossier-title] kyc-text'), dossierNavigationElement = dossierElement.querySelector(' [data-kyc-dossier-tasks-navigation]'), taskFormElement = dossierElement.querySelector('[data-kyc-task]'), taskTitleElement = taskFormElement.querySelector('[data-kyc-task-title] kyc-text'), checkElement = taskFormElement.querySelector('[data-kyc-check]'), checkStatusElement = taskFormElement.querySelector('[data-kyc-check-status]'), statusnode = checkStatusElement.querySelector('kyc-task-status'), overviewElement = taskFormElement.querySelector('[data-kyc-task-overview]'), overviewCheckElement_1 = overviewElement.querySelector('[data-kyc-task-overview-check]'), taskNavigationElement = taskFormElement.querySelector('[data-kyc-task-navigation]'), validatorInput_1 = document.createElement('input'), textinput = checkElement.querySelector('[data-kyc-input]').cloneNode(true), overrulestatus = ['ACCEPTED', 'SUBMITTED'].indexOf(dossier.status) > -1 ? dossier.status : (['ACCEPTED', 'SUBMITTED'].indexOf(task.status) > -1 ? task.status : null);
            var newinput_1, last_3 = overviewCheckElement_1;
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
                overviewElement.setAttribute('data-kyc-status', overrulestatus || task.status);
            }
            if (!!taskFormElement) {
                taskFormElement.setAttribute('data-kyc-status', overrulestatus || task.status);
            }
            task.checks.map(function (check) {
                if (!!(check.value || '').trim()) {
                    var curCheck = overviewCheckElement_1.cloneNode(true), valueElement = curCheck.querySelector(' data-kyc-check-value');
                    ap.slice.call(curCheck.querySelectorAll('kyc-check-description')).map(function (e) {
                        if (!!check.definition.description) {
                            e.parentNode.replaceChild(document.createTextNode(translate(check.definition.description)), e);
                        }
                        else {
                            e.parentNode.removeChild(e);
                        }
                    });
                    curCheck.setAttribute('data-kyc-check-value', check.value);
                    if (!!check.definition.method) {
                        curCheck.setAttribute('data-kyc-method', check.definition.method || null);
                    }
                    if (!!check.definition.valueFormat) {
                        curCheck.setAttribute('data-kyc-valueformat', check.definition.valueFormat || null);
                    }
                    switch (check.definition.method) {
                        case 'RAW_DOCUMENT_SCAN':
                        case 'DOCUMENT_FILE_UPLOAD':
                        case 'SELFIE_CHECK':
                            newinput_1 = document.createTextNode('');
                            if (!!check.value) {
                                newinput_1 = document.createElement('img');
                                if (!!uploads[check.value]) {
                                    newinput_1.setAttribute('src', uploads[check.value]);
                                }
                                else {
                                    getUpload(check.value, target, function (result) {
                                        if (!!result.success) {
                                            newinput_1.setAttribute('src', result.success);
                                        }
                                    });
                                }
                            }
                            break;
                        default:
                            validatorInput_1.value = check.value || null;
                            switch (check.definition.valueFormat) {
                                case 'NATURAL_NUMBER':
                                case 'REAL_NUMBER':
                                    validatorInput_1.setAttribute('type', 'number');
                                    if (check.definition.valueFormat == 'NATURAL_NUMBER') {
                                        validatorInput_1.setAttribute('step', '1');
                                        validatorInput_1.setAttribute('min', '0');
                                    }
                                    break;
                                case 'EMAIL':
                                    validatorInput_1.setAttribute('type', 'email');
                                    break;
                                case 'URL':
                                    validatorInput_1.setAttribute('type', 'url');
                                    break;
                                case 'PHONE_NUMBER':
                                case 'IBAN':
                                    validatorInput_1.setAttribute('type', 'tel');
                                    break;
                                default:
                                    validatorInput_1.setAttribute('type', 'text');
                                    break;
                            }
                            validateInputOnEvent({ 'type': 'prefill', 'target': validatorInput_1 });
                            newinput_1 = document.createTextNode(validatorInput_1.value);
                    }
                    valueElement.parentNode.replaceChild(newinput_1, valueElement);
                    last_3.parentNode.insertBefore(curCheck, last_3.nextSibling);
                    last_3 = curCheck;
                }
            });
            checkElement.parentNode.removeChild(checkElement);
            overviewCheckElement_1.parentNode.removeChild(overviewCheckElement_1);
            ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-dossiers]')).map(function (backbutton) {
                if (target['kyc'].dossiers.length > 1) {
                    ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {
                        e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);
                    });
                    backbutton.addEventListener('click', function () {
                        buildDossiersList(target);
                    });
                }
                else {
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
                    });
                }
                else {
                    backbutton.parentNode.removeChild(backbutton);
                }
            });
            ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-previous]')).map(function (backbutton) {
                ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {
                    e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);
                });
                backbutton.addEventListener('click', function () {
                    buildTaskList(target, dossier);
                });
            });
            ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-next]')).map(function (nextbutton) {
                nextbutton.parentNode.removeChild(nextbutton);
            });
            target.innerHTML = '';
            target.appendChild(dossierElement);
            target.setAttribute('kyc-sdk-status', 'task');
            notify('taskoverview', target);
        }
        catch (error) {
            throwError('A templating error has occured while building the dossier task check overview!', 'taskoverview', error, { template: target['kyc'].template }, target);
            return;
        }
    }, buildTaskForm = function (target, dossier, task, checkid) {
        if (!target || !target.appendChild) {
            return;
        }
        var overrulestatus = ['ACCEPTED', 'SUBMITTED'].indexOf(dossier.status) > -1 ? dossier.status : (['ACCEPTED', 'SUBMITTED'].indexOf(task.status) > -1 ? task.status : null);
        if (!!overrulestatus) {
            buildTaskOverView(target, dossier, task);
            return;
        }
        checkid = !!checkid ? checkid : task.sequence.initialCheckId;
        var check = task.checks.filter(function (check) {
            return check.id == checkid;
        }).shift();
        if (!!check && check.id) {
            var next_1 = task.sequence.transitions.filter(function (transition) {
                return transition.from == checkid;
            }).map(function (transition) {
                return transition;
            }).shift(), gotoNext_1 = function (next) {
                if (!!next) {
                    var nextCHeckID_1 = next.defaultGoTo;
                    if (!!next.conditionalBranches) {
                        var conditionDidValidate_1 = false;
                        next.conditionalBranches.map(function (condition) {
                            if (!conditionDidValidate_1) {
                                switch (condition.relation) {
                                    case 'EQUAL':
                                        if (check.value.trim() === condition.value.trim()) {
                                            conditionDidValidate_1 = true;
                                            nextCHeckID_1 = condition.goTo || null;
                                            return;
                                        }
                                        break;
                                    case 'NOT_EQUAL':
                                        if (check.value.trim() != condition.value.trim()) {
                                            conditionDidValidate_1 = true;
                                            nextCHeckID_1 = condition.goTo || null;
                                            return;
                                        }
                                        break;
                                    case 'GREATER_THAN':
                                        if (parseFloat(check.value.trim()) > parseFloat(condition.value.trim())) {
                                            conditionDidValidate_1 = true;
                                            nextCHeckID_1 = condition.goTo || null;
                                            return;
                                        }
                                        break;
                                    case 'LESS_THAN':
                                        if (parseFloat(check.value.trim()) < parseFloat(condition.value.trim())) {
                                            conditionDidValidate_1 = true;
                                            nextCHeckID_1 = condition.goTo || null;
                                            return;
                                        }
                                        break;
                                    case 'INCLUDES':
                                        if (check.value instanceof Array && check.value.indexOf(condition.value.trim())) {
                                            conditionDidValidate_1 = true;
                                            nextCHeckID_1 = condition.goTo || null;
                                            return;
                                        }
                                        break;
                                    case 'EXCLUDES':
                                        if (check.value instanceof Array && !check.value.indexOf(condition.value.trim())) {
                                            conditionDidValidate_1 = true;
                                            nextCHeckID_1 = condition.goTo || null;
                                            return;
                                        }
                                        break;
                                }
                            }
                        });
                    }
                    if (!!nextCHeckID_1) {
                        buildLoader(target);
                        target['kyc'].history.back.push(function () {
                            buildLoader(target);
                            buildTaskForm(target, dossier, task, check.id);
                        });
                        buildTaskForm(target, dossier, task, nextCHeckID_1);
                        return;
                    }
                }
                buildLoader(target);
                saveTask(task, target, function (result) {
                    if (!!result.success) {
                        task = result.success;
                        buildTaskList(target, dossier);
                    }
                    else {
                    }
                });
            };
            try {
                var dossierElement = getPartial('[data-kyc-dossier]', target['kyc'].template);
                ap.slice.call(dossierElement.querySelectorAll('[name]')).map(function (e) {
                    e.removeAttribute('name');
                });
                var dossierTitleElement = dossierElement.querySelector('[data-kyc-dossier-title] kyc-text'), dossierNavigationElement = dossierElement.querySelector(' [data-kyc-dossier-tasks-navigation]'), taskFormElement_1 = dossierElement.querySelector('[data-kyc-task]'), overviewElement = taskFormElement_1.querySelector('[data-kyc-task-overview]'), taskTitleElement = taskFormElement_1.querySelector('[data-kyc-task-title] kyc-text'), checkElement = taskFormElement_1.querySelector('[data-kyc-check]'), checkStatusElement = taskFormElement_1.querySelector('[data-kyc-check-status]'), taskNavigationElement = taskFormElement_1.querySelector('[data-kyc-task-navigation]'), errorClassElement = checkElement.hasAttribute('data-kyc-errorclass') ? checkElement : checkElement.querySelector('data-kyc-errorclass'), successClassElement = checkElement.hasAttribute('data-kyc-successclass') ? checkElement : checkElement.querySelector('data-kyc-successclass'), errorClass_1 = !!errorClassElement ? errorClassElement.getAttribute('data-kyc-errorclass') : null, successClass_1 = !!successClassElement ? errorClassElement.getAttribute('data-kyc-successclass') : null;
                var newinput_2, formname_1 = check.id.trim(), last = checkElement;
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
                var curCheck = checkElement.cloneNode(true), curErrorClassElement_1 = !!errorClass_1 ? (checkElement == errorClassElement ? curCheck : curCheck.querySelector('data-kyc-errorclass')) : null, curSuccessClassElement_1 = !!successClass_1 ? (checkElement == successClassElement ? curCheck : curCheck.querySelector('data-kyc-successclass')) : null, inputElement_1 = curCheck.querySelector('kyc-input');
                var focusel_1;
                ap.slice.call(curCheck.querySelectorAll('kyc-check-description')).map(function (e) {
                    if (!!check.definition.description) {
                        e.parentNode.replaceChild(document.createTextNode(translate(check.definition.description)), e);
                    }
                    else {
                        e.parentNode.removeChild(e);
                    }
                });
                ap.slice.call(curCheck.querySelectorAll('kyc-check-longdescription')).map(function (e) {
                    if (!!check.definition.longDescription) {
                        e.parentNode.replaceChild(document.createTextNode(translate(check.definition.longDescription)), e);
                    }
                    else {
                        e.parentNode.removeChild(e);
                    }
                });
                if (!!check.definition.method) {
                    curCheck.setAttribute('data-kyc-method', check.definition.method || null);
                }
                if (!!check.definition.valueFormat) {
                    curCheck.setAttribute('data-kyc-valueformat', check.definition.valueFormat || null);
                }
                switch (check.definition.method) {
                    case 'MANUAL_SINGLE_CHOICE_ENUM':
                    case 'MANUAL_MULTIPLE_CHOICE_ENUM':
                        newinput_2 = inputElement_1.querySelector('[data-kyc-options]').cloneNode(false);
                        switch (check.definition.method) {
                            case 'MANUAL_SINGLE_CHOICE_ENUM':
                                if (check.definition.enumSpecification.length < 4) {
                                    (check.definition.enumSpecification || []).map(function (keyvalue) {
                                        var currentOption = inputElement_1.querySelector('[data-kyc-radiobutton]').cloneNode(true), radio = currentOption.querySelector('[data-kyc-radio-input]');
                                        radio.setAttribute('type', 'radio');
                                        radio.setAttribute('name', formname_1);
                                        radio.setAttribute('value', keyvalue.name);
                                        radio.value = keyvalue.name;
                                        radio.checked = !!check.value && keyvalue.name.trim() === check.value.trim();
                                        ap.slice.call(currentOption.querySelectorAll('kyc-text')).map(function (e) {
                                            e.parentNode.replaceChild(document.createTextNode(translate(!!keyvalue.explanation ? keyvalue.explanation : keyvalue.name)), e);
                                        });
                                        if (!focusel_1) {
                                            focusel_1 = currentOption;
                                        }
                                        newinput_2.appendChild(currentOption);
                                    });
                                }
                                else {
                                    newinput_2 = inputElement_1.querySelector('[data-kyc-select-input]').cloneNode(false);
                                    var currentOption_1 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                    newinput_2.setAttribute('name', formname_1);
                                    if (!(!!check.value)) {
                                        currentOption_1.value = '';
                                        currentOption_1.innerHTML = translate("select an option");
                                        newinput_2.appendChild(currentOption_1);
                                    }
                                    (check.definition.enumSpecification || []).map(function (keyvalue) {
                                        currentOption_1 = currentOption_1.cloneNode(true);
                                        currentOption_1.value = keyvalue.name;
                                        currentOption_1.selected = !!check.value && keyvalue.name.trim() === check.value.trim();
                                        currentOption_1.innerHTML = translate(!!keyvalue.explanation ? keyvalue.explanation : keyvalue.name);
                                        newinput_2.appendChild(currentOption_1);
                                    });
                                    if (!focusel_1) {
                                        focusel_1 = newinput_2;
                                    }
                                }
                                break;
                            case 'MANUAL_MULTIPLE_CHOICE_ENUM':
                                formname_1 = check.id.trim() + '[]';
                                (check.definition.enumSpecification || []).map(function (keyvalue) {
                                    var currentOption = inputElement_1.querySelector('[data-kyc-checkbox]').cloneNode(true), checkbox = currentOption.querySelector('[data-kyc-checkbox-input]');
                                    checkbox.setAttribute('type', 'checkbox');
                                    checkbox.setAttribute('name', formname_1);
                                    checkbox.setAttribute('value', keyvalue.name);
                                    checkbox.checked = !!check.value && JSON.parse(check.value || '[]').filter(function (v) {
                                        return v.trim() == keyvalue.name.trim();
                                    }).length > 0;
                                    ap.slice.call(currentOption.querySelectorAll('kyc-text')).map(function (e) {
                                        e.parentNode.replaceChild(document.createTextNode(translate(!!keyvalue.explanation ? keyvalue.explanation : keyvalue.name)), e);
                                    });
                                    newinput_2.appendChild(currentOption);
                                    if (!focusel_1) {
                                        focusel_1 = currentOption;
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
                                        newinput_2 = inputElement_1.querySelector('[data-kyc-textarea]').cloneNode(true);
                                        newinput_2.setAttribute('placeholder', translate(check.definition.description));
                                        newinput_2.value = check.value || null;
                                        newinput_2.setAttribute('name', formname_1);
                                        newinput_2.required = !(!!check.definition.optional);
                                        if (!focusel_1) {
                                            focusel_1 = newinput_2;
                                        }
                                        break;
                                    default:
                                        newinput_2 = inputElement_1.querySelector('[data-kyc-input]').cloneNode(true);
                                        switch (check.definition.valueFormat) {
                                            case 'NATURAL_NUMBER':
                                            case 'REAL_NUMBER':
                                                newinput_2.setAttribute('type', 'number');
                                                if (check.definition.valueFormat == 'NATURAL_NUMBER') {
                                                    newinput_2.setAttribute('step', 1);
                                                    newinput_2.setAttribute('min', 0);
                                                }
                                                break;
                                            case 'EMAIL':
                                                newinput_2.setAttribute('type', 'email');
                                                break;
                                            case 'URL':
                                                newinput_2.setAttribute('type', 'url');
                                                break;
                                            case 'IBAN':
                                                newinput_2.setAttribute('type', 'text');
                                                break;
                                            case 'PHONE_NUMBER':
                                                newinput_2.setAttribute('type', 'tel');
                                                break;
                                            default:
                                                switch (check.definition.method) {
                                                    case 'MANUAL_DATE_INPUT':
                                                        newinput_2.setAttribute('type', 'date');
                                                        break;
                                                    default:
                                                        newinput_2.setAttribute('type', 'text');
                                                        break;
                                                }
                                        }
                                        newinput_2.setAttribute('placeholder', translate(check.definition.description));
                                        newinput_2.setAttribute('name', check.id);
                                        if (!!check.definition.method) {
                                            newinput_2.setAttribute('data-method', check.definition.method);
                                        }
                                        if (!!check.definition.valueFormat) {
                                            newinput_2.setAttribute('data-value-format', check.definition.valueFormat);
                                        }
                                        newinput_2.required = !(!!check.definition.optional);
                                        newinput_2.value = check.value || null;
                                        if (!focusel_1) {
                                            focusel_1 = newinput_2;
                                        }
                                        validateInputOnEvent({ 'type': 'prefill', 'target': newinput_2 });
                                }
                                ['keypress', 'paste', 'change', 'input'].map(function (type) {
                                    newinput_2.addEventListener(type, function (event) {
                                        validateInputOnEvent(event);
                                        if (event.target.checkValidity()) {
                                            if (!!curSuccessClassElement_1) {
                                                curSuccessClassElement_1.classList.add(successClass_1);
                                            }
                                            if (!!curErrorClassElement_1) {
                                                curErrorClassElement_1.classList.remove(errorClass_1);
                                            }
                                        }
                                        else {
                                            if (!!curSuccessClassElement_1) {
                                                curSuccessClassElement_1.classList.remove(successClass_1);
                                            }
                                            if (!!curErrorClassElement_1) {
                                                curErrorClassElement_1.classList.add(errorClass_1);
                                            }
                                        }
                                    });
                                });
                                break;
                            case 'IDIN':
                                if (!(!!check.value)) {
                                    if (!!KycSdkReference && !!KycSdkReference.IDIN) {
                                        var IdinCallback_1 = function (idin) {
                                            if (!!idin && !!idin.status && !!idin.transactionId) {
                                                switch (idin.status) {
                                                    case 'open':
                                                        setTimeout(function () {
                                                            getIdinTransaction(idin.transactionId, IdinCallback_1);
                                                        }, 1000);
                                                        break;
                                                    case 'success':
                                                        delete KycSdkReference.IDIN;
                                                        target['kyc'].context.checkId = null;
                                                        target['kyc'].context.taskId = null;
                                                        target['kyc'].context.dossierId = null;
                                                        check.value = idin.transactionId;
                                                        gotoNext_1(next_1);
                                                        break;
                                                    case 'expired':
                                                    case 'cancelled':
                                                    case 'failure':
                                                    default:
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
                                        };
                                        IdinCallback_1(KycSdkReference.IDIN);
                                        return;
                                    }
                                    if (!issuers.IDIN) {
                                        getIdinIssuers(function (result) {
                                            if (!!result) {
                                                buildTaskForm(target, dossier, task, checkid);
                                            }
                                            else {
                                                throwError('A templating error has occured while building the dossier task check form! No IDIN Issuers could be fetched', 'taskform', { 'description': 'No IDIN Issuers' }, {
                                                    template: target['kyc'].template,
                                                    dossier: dossier,
                                                    task: task,
                                                    checkid: checkid
                                                }, target);
                                            }
                                        });
                                        return;
                                    }
                                    newinput_2 = document.createElement('div');
                                    if (!!issuers.IDIN && (issuers.IDIN || []).length > 0) {
                                        if (!!issuers.IDIN && (issuers.IDIN || []).length > 1) {
                                            var countryinput_1 = inputElement_1.querySelector('[data-kyc-select-input]').cloneNode(false);
                                            var currentOption_2 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                            currentOption_2.value = '';
                                            currentOption_2.innerHTML = translate("select a country");
                                            countryinput_1.appendChild(currentOption_2);
                                            (issuers.IDIN || []).map(function (ci) {
                                                if (!!ci['country']) {
                                                    currentOption_2 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                                    currentOption_2.value = ci['country'] || '';
                                                    currentOption_2.innerHTML = translate(ci['country'] || '');
                                                    countryinput_1.appendChild(currentOption_2);
                                                }
                                            });
                                            if (!focusel_1) {
                                                focusel_1 = countryinput_1;
                                            }
                                            newinput_2.appendChild(countryinput_1);
                                            countryinput_1.addEventListener('change', function (event) {
                                                if (!!event.target.value) {
                                                    var idininput_1 = inputElement_1.querySelector('[data-kyc-select-input]').cloneNode(false);
                                                    var currentOption_3 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                                    currentOption_3.value = '';
                                                    currentOption_3.innerHTML = translate("select a issuer");
                                                    idininput_1.appendChild(currentOption_3);
                                                    (issuers.IDIN || []).slice(0, 1).map(function (ci) {
                                                        if (!!ci['issuers']) {
                                                            (ci['issuers'] || []).map(function (issuer) {
                                                                currentOption_3 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                                                currentOption_3.value = issuer['id'] || '';
                                                                currentOption_3.innerHTML = translate(issuer['name'] || '');
                                                                idininput_1.appendChild(currentOption_3);
                                                            });
                                                        }
                                                    });
                                                    event.target.parentNode.appendChild(idininput_1);
                                                    event.target.parentNode.removeChild(event.target);
                                                    idininput_1.focus();
                                                    idininput_1.addEventListener('change', function (event) {
                                                        if (!!event.target.value) {
                                                            var issuer = event.target.value.trim(), keys = check.definition.requestedIdinKeys, secret = makeId(32), storage = {
                                                                KYCToken: KYCToken,
                                                                context: JSON.parse(JSON.stringify(target['kyc'].context))
                                                            };
                                                            buildLoader(target);
                                                            storage.context.taskId = task.id;
                                                            storage.context.dossierId = dossier.id;
                                                            storage.context.checkId = checkid;
                                                            startIdinTransaction(issuer, keys, {
                                                                KYCSECRET: secret,
                                                                KYCStorage: storage
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                        else {
                                            var idininput_2 = inputElement_1.querySelector('[data-kyc-select-input]').cloneNode(false);
                                            var currentOption_4 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                            currentOption_4.value = '';
                                            currentOption_4.innerHTML = translate("select a issuer");
                                            idininput_2.appendChild(currentOption_4);
                                            (issuers.IDIN || []).slice(0, 1).map(function (ci) {
                                                if (!!ci['issuers']) {
                                                    (ci['issuers'] || []).map(function (issuer) {
                                                        currentOption_4 = (inputElement_1.querySelector('[data-kyc-select-input]').querySelector('option') || document.createElement('option')).cloneNode(false);
                                                        currentOption_4.value = issuer['id'] || '';
                                                        currentOption_4.innerHTML = translate(issuer['name'] || '');
                                                        idininput_2.appendChild(currentOption_4);
                                                    });
                                                }
                                            });
                                            if (!focusel_1) {
                                                focusel_1 = idininput_2;
                                            }
                                            newinput_2.appendChild(idininput_2);
                                            idininput_2.addEventListener('change', function (event) {
                                                if (!!event.target.value) {
                                                    var issuer = event.target.value.trim(), keys = check.definition.requestedIdinKeys, secret = makeId(32), storage = {
                                                        KYCToken: KYCToken,
                                                        context: JSON.parse(JSON.stringify(target['kyc'].context))
                                                    };
                                                    buildLoader(target);
                                                    storage.context.taskId = task.id;
                                                    storage.context.dossierId = dossier.id;
                                                    storage.context.checkId = checkid;
                                                    startIdinTransaction(issuer, keys, {
                                                        KYCSECRET: secret,
                                                        KYCStorage: storage
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        newinput_2.innerHTML = translate('No IDIN issuers');
                                    }
                                }
                                else {
                                    newinput_2 = document.createElement('div');
                                    newinput_2.setAttribute('class', inputElement_1.querySelector('[data-kyc-input]').getAttribute('class'));
                                    newinput_2.innerHTML = 'The IDIN check is Completed';
                                }
                                break;
                            case 'RAW_DOCUMENT_SCAN':
                            case 'DOCUMENT_FILE_UPLOAD':
                            case 'SELFIE_CHECK':
                                newinput_2 = inputElement_1.querySelector('[data-kyc-file]').cloneNode(true);
                                var fileinput = newinput_2.querySelector('[data-kyc-file-input]'), placeholder = inputElement_1.querySelector('kyc-placeholder'), filepreview_1 = newinput_2.querySelector('[data-kyc-file-preview]'), realinput_1 = document.createElement('input');
                                realinput_1.setAttribute('type', 'hidden');
                                realinput_1.required = !(!!check.definition.optional);
                                realinput_1.value = check.value || null;
                                realinput_1.setAttribute('name', formname_1);
                                newinput_2.appendChild(realinput_1);
                                if (!!check.definition.method) {
                                    realinput_1.setAttribute('data-method', check.definition.method);
                                }
                                if (!!check.definition.valueFormat) {
                                    realinput_1.setAttribute('data-value-format', check.definition.valueFormat);
                                }
                                fileinput.setAttribute('type', 'file');
                                fileinput.setAttribute('placeholder', translate(check.definition.description));
                                if (!focusel_1) {
                                    focusel_1 = fileinput;
                                }
                                filepreview_1.innerHTML = translate(check.definition.description);
                                fileinput.addEventListener('change', function (event) {
                                    if (event.target.files && event.target.files[0]) {
                                        var reader = new FileReader();
                                        reader.onload = function (fileEvent) {
                                            if (!!fileEvent && !!fileEvent.target && !!fileEvent.target['result']) {
                                                saveUpload(fileEvent.target['result'], target, function (result) {
                                                    if (!!result.success && !!result.success.uuid) {
                                                        uploads[result.success.uuid] = !!fileEvent && !!fileEvent.target && fileEvent.target['result'] ? fileEvent.target['result'] : '';
                                                        filepreview_1.setAttribute('style', 'background-image:url("' + uploads[result.success.uuid] + '")');
                                                        realinput_1.value = result.success.uuid;
                                                        realinput_1.setAttribute('value', result.success.uuid);
                                                        validateInputOnEvent({
                                                            target: realinput_1,
                                                            type: 'change'
                                                        });
                                                        if (realinput_1.checkValidity()) {
                                                            if (!!curSuccessClassElement_1) {
                                                                curSuccessClassElement_1.classList.add(successClass_1);
                                                            }
                                                            if (!!curErrorClassElement_1) {
                                                                curErrorClassElement_1.classList.remove(errorClass_1);
                                                            }
                                                        }
                                                        else {
                                                            if (!!curSuccessClassElement_1) {
                                                                curSuccessClassElement_1.classList.remove(successClass_1);
                                                            }
                                                            if (!!curErrorClassElement_1) {
                                                                curErrorClassElement_1.classList.add(errorClass_1);
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        };
                                        filepreview_1.innerHTML = event.target.files[0].name;
                                        reader.readAsDataURL(event.target.files[0]);
                                    }
                                });
                                if (!!check.value) {
                                    if (!!uploads[check.value]) {
                                        filepreview_1.setAttribute('style', 'background-image:url("' + uploads[check.value] + '")');
                                    }
                                    else {
                                        getUpload(check.value, target, function (result) {
                                            if (!!result.success) {
                                                filepreview_1.setAttribute('style', 'background-image:url("' + uploads[check.value] + '")');
                                                if (realinput_1.checkValidity()) {
                                                    if (!!curSuccessClassElement_1) {
                                                        curSuccessClassElement_1.classList.add(successClass_1);
                                                    }
                                                    if (!!curErrorClassElement_1) {
                                                        curErrorClassElement_1.classList.remove(errorClass_1);
                                                    }
                                                }
                                                else {
                                                    if (!!curSuccessClassElement_1) {
                                                        curSuccessClassElement_1.classList.remove(successClass_1);
                                                    }
                                                    if (!!curErrorClassElement_1) {
                                                        curErrorClassElement_1.classList.add(errorClass_1);
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                                break;
                        }
                        break;
                }
                inputElement_1.parentNode.replaceChild(newinput_2, inputElement_1);
                checkElement.parentNode.replaceChild(curCheck, checkElement);
                ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-dossiers]')).map(function (backbutton) {
                    if (target['kyc'].dossiers.length > 1) {
                        ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {
                            e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);
                        });
                        backbutton.addEventListener('click', function () {
                            buildDossiersList(target);
                        });
                    }
                    else {
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
                        });
                    }
                    else {
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
                        });
                    });
                }
                else {
                    ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-navigation] [data-kyc-task-previous]')).map(function (backbutton) {
                        backbutton.parentNode.removeChild(backbutton);
                    });
                }
                ap.slice.call(dossierElement.querySelectorAll('[data-kyc-task-next]')).map(function (nextbutton) {
                    nextbutton.disabled = !!taskFormElement_1 && !taskFormElement_1.checkValidity();
                    ap.slice.call(nextbutton.querySelectorAll('kyc-text')).map(function (e) {
                        e.parentNode.replaceChild(document.createTextNode(translate('Next')), e);
                    });
                    nextbutton.addEventListener('click', function () {
                        var values = {};
                        if (!!taskFormElement_1 && taskFormElement_1.checkValidity()) {
                            check.value = (formname_1 == check.id)
                                ? validateInputOnEvent({
                                    'type': 'tokyc',
                                    'target': taskFormElement_1.querySelector('[name="' + formname_1 + '"]')
                                })
                                : JSON.stringify(ap.slice.call(taskFormElement_1.querySelectorAll('[name="' + formname_1 + '"]')).map(function (field) {
                                    return validateInputOnEvent({ 'type': 'tokyc', 'target': field });
                                }));
                            gotoNext_1(next_1);
                            return;
                        }
                    });
                });
                target.innerHTML = '';
                target.appendChild(dossierElement);
                target.setAttribute('kyc-sdk-status', 'task');
                if (focusel_1) {
                    focusel_1.focus();
                }
                notify('taskform', target);
            }
            catch (error) {
                throwError('A templating error has occured while building the dossier task check form!', 'taskform', error, { template: target['kyc'].template, dossier: dossier, task: task, checkid: checkid }, target);
            }
            return;
        }
        throwError('The check could not be determined!', 'taskform', { description: 'check is undefined' }, { dossier: dossier, task: task, checkid: checkid }, target);
    }, safeKyc = function (element) {
        return {
            context: element['kyc'].context,
            status: element['kyc'].status
        };
    }, init = function (elementId, inContext) {
        var ref = getKycSdkReference();
        if (!!ref && ref.context) {
            inContext = ref.context;
        }
        var view = document.createElement('kyc-view'), checked = checkSdkConditions(elementId, inContext);
        var status, element, context, event;
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
                };
                event = createEvent('initialised', { status: status, context: context });
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
                    element.setAttribute('kyc-sdk-status', 'ready');
                    buildLoader(element);
                    element.appendChild(view);
                }
            }
            else {
                if (!!element.setAttribute) {
                    element.setAttribute('kyc-sdk-status', 'ready');
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
                return initialised;
            },
            get version() {
                return version;
            },
            init: init,
            getOrigLocation: function () {
                return origLocation;
            },
            getToken: function () {
                return getToken();
            },
            getMe: function () {
                if (!!KYCToken) {
                    return getMe();
                }
                throwError('no valid Identification', 'getDossiers', { description: 'missing KYCToken' });
            },
            getDossiers: function () {
                if (!!KYCToken) {
                    return getDossiers();
                }
                throwError('no valid Identification', 'getDossiers', { description: 'missing KYCToken' });
            },
            getTasks: function (dossierId) {
                if (!!KYCToken) {
                    return getTasks(dossierId);
                }
                throwError('no valid Identification', 'getTasks', { description: 'missing KYCToken' });
            },
            getTask: function (taskId) {
                if (!!KYCToken) {
                    return getTask(taskId);
                }
                throwError('no valid Identification', ' getTask', { description: 'missing KYCToken' });
            },
            getUpload: function (uploadId) {
                if (!!KYCToken) {
                    return getUpload(uploadId);
                }
                throwError('no valid Identification', ' getTask', { description: 'missing KYCToken' });
            },
            saveUpload: function (content) {
                if (!!KYCToken) {
                    return saveUpload(content);
                }
                throwError('no valid Identification', ' getTask', { description: 'missing KYCToken' });
            },
            saveTask: function (task) {
                if (!!KYCToken) {
                    return saveTask(task);
                }
                throwError('no valid Identification', 'saveTask', { description: 'missing KYCToken' });
            }
        };
        var event_15 = createEvent('ready', { status: { initialised: initialised, version: version } });
        notify(event_15, window);
        domReady(function () {
            getKycSdkReference();
            if (checkSdkConditions()) {
                init();
            }
        });
    }
})();
