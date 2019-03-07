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
        var kycTemplate,
            showWarning = false,
            authorisationEndPoint,
            kycApiEndPoint,
            KYCToken;
        const
            kyc_sdk = 'kyc_sdk',
            version = '0.0.1',
            uploads = {},
            initialised = new Date(),
            defaultTemplateString = '/*REPLACE_WITH_TEMPLATE_HTML*/',

            domReady = function (fn) {
                if (document.readyState != 'loading') {
                    fn();
                } else if (document.addEventListener) {
                    document.addEventListener('DOMContentLoaded', fn);
                } else if (document['attachEvent']) {
                    document['attachEvent']('onreadystatechange', function () {
                        if (document.readyState != 'loading')
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
                /* Native XMLHttpRequest as Promise
                 * @see https://stackoverflow.com/a/30008115/933951
                 * @param {Object} options - Options object
                 * @param {String} options.method - Type of XHR
                 * @param {String} options.url - URL for XHR
                 * @param {String|Object} options.params - Query parameters for XHR
                 * @param {Object} options.headers - Query parameters for XHR
                 * @return {Promise} Promise object of XHR
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
                    console.log(xhr);
                    if (xhr.readyState == 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                response = JSON.parse(xhr.response || xhr.responseText);
                            } catch (e) {
                                response = (xhr.response || xhr.responseText);
                            }
                            callback({success: response, xhr: xhr});

                        } else {
                            callback({error: 'invalid http status', xhr: xhr})
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
            callApi = function (options) {
                options.headers = {'Authorization': 'Bearer ' + KYCToken.userToken};
                http(options);
            },
            getToken = function (element: HTMLElement) {
                if (KYCToken && KYCToken.userToken) {
                    getMe(element)

                } else {
                    const options = {
                        url: authorisationEndPoint,
                        method: 'POST',
                        withCredentials: true,
                        headers: {'Content-Type': 'application/json;charset=UTF-8'},
                        params: JSON.stringify({

                            "clientId": element['kyc'].context.clientId,
                            "templateId": element['kyc'].context.templateId,
                            "customerName": element['kyc'].context.customerName,
                            "externalReference": element['kyc'].context.externalReference,
                            "firstName": element['kyc'].context.firstName,
                            "lastName": element['kyc'].context.lastName,
                            "msisdn": element['kyc'].context.msisdn,
                            "userIdentifier": element['kyc'].context.userIdentifier,
                        }),
                        callback: function (result) {
                            if (!!result.success) {
                                notify('login', element);
                                KYCToken = result.success;
                                KYCToken.data = jwtDecode(KYCToken.userToken);
                                getMe(element);
                                //getDossiers(element);
                            } else {
                                const errorMessage="No kyc Token could be retrieved from " + authorisationEndPoint + "!";
                                notify('error', element,{error:{ 'message': errorMessage,'object':result}});
                                console.warn(errorMessage, result);

                            }
                        }
                    }

                    http(options);


                }
            },
            getMe = function (element: HTMLElement) {
                const options = {
                    'url': kycApiEndPoint + '/api/v1/users/me',
                    callback: function (result) {
                        if (!!result.success) {
                            element['kyc'].status.changed = new Date();
                            element['kyc'].context.firstName = result.success.firstName;
                            element['kyc'].context.lastName = result.success.lastName;
                            element['kyc'].context.msisdn = result.success.msisdn;


                            notify('identification', element);


                            getDossiers(element);
                        } else {
                            const errorMessage="KYC identity could not be verified!";
                            notify('error', element,{error:{ 'message': errorMessage,'object':result}});
                            console.warn("KYC identity could not be verified!", result.error);

                        }

                    }
                }

                callApi(options);
            },
            getDossiers = function (element: HTMLElement) {
                const options = {
                    'url': kycApiEndPoint + '/api/v1/users/' + KYCToken.data.uuid + '/dossiers',
                    callback: function (result) {
                        if (!!result.success) {
                            element['kyc'].status.changed = new Date();
                            //filter the dossiers on the clientId and customerName/externalReference
                            element['kyc'].dossiers = ((result.success.filter(function (client) {
                                return true;//!!element['kyc'].context.clientId && client.clientId == element['kyc'].context.clientId;
                            }) || []).map(function (client) {
                                return client.dossiers;
                            }).shift() || []).filter(function (dossier) {
                                return true;//(!!element['kyc'].context.customerName && dossier.customerName == element['kyc'].context.customerName) || (!!element['kyc'].context.externalReference && dossier.externalReference == element['kyc'].context.externalReference);
                            });
                            notify('dossiers', element);
                            if (element['kyc'].dossiers.length > 0) {
                                buildDossiersList(element);
                            }


                        } else {
                            console.warn("KYC dossiers could not be fetched!", result.error);

                        }
                    }
                }
                callApi(options);
            },
            getTasks = function (element: HTMLElement, dossierId: string) {
                const curDossier = element['kyc'].dossiers.filter(function (dossier) {

                    return dossier.id == dossierId

                }).shift();
                if (!!curDossier) {
                    if (!!curDossier.tasks) {
                        buildTaskList(element, curDossier);
                        return;
                    }


                    const options = {
                        // 'url': kycApiEndPoint + '/api/v1/users/' + KYCToken.data.uuid + '/dossiers/'+dossierid+'/tasks',
                        'url': kycApiEndPoint + '/api/v1/dossiers/' + dossierId + '/tasks',
                        callback: function (result) {

                            if (!!result.success) {

                                /*  element['kyc'].status.changed = new Date();
                                  element['kyc'].dossierId = dossierId;
                                  notify('dossier', element);*/
                                curDossier.tasks = result.success;
                                buildTaskList(element, curDossier);


                            } else {
                                console.warn("KYC dossier tasks could not be fetched!", result.error);

                            }
                        }
                    }
                    callApi(options);
                    return
                }
                console.warn("KYC dossier could not be fetched!");
            },
            getTask = function (element: HTMLElement, dossierId: string, taskId: string) {
                let curDossier, curTask;
                curDossier = element['kyc'].dossiers.filter(function (dossier) {

                    return dossier.id == dossierId

                }).map(function (dossier) {
                    return dossier
                }).shift();
                if (curDossier) {
                    if (!!curDossier.tasks) {
                        curTask = curDossier.tasks.filter(function (task) {
                            return task.id == taskId
                        }).shift();
                        if (curTask) {
                            if (curTask.checks) {
                                buildTaskForm(element, curDossier, curTask);
                                return;
                            }
                            const options = {
                                'url': kycApiEndPoint + '/api/v1/tasks/' + taskId,
                                callback: function (result) {
                                    if (!!result.success) {
                                        /* element['kyc'].status.changed = new Date();
                                         element['kyc'].context.dossierId = dossierId;
                                         element['kyc'].context.taskId = taskId;*/

                                        curTask = result.success;
                                        setTimeout(function () {
                                            buildTaskForm(element, curDossier, curTask);
                                        }, 1000)


                                    } else {
                                        console.warn("KYC dossier tasks could not be fetched!", result.error);

                                    }
                                }
                            }
                            callApi(options);
                            return;

                        }
                    }
                }
                console.warn("KYC dossier could not be fetched!");


            },
            checkSdkConditions = function (elementId?: string, inContext?: object) {
                if (!window['kyc_config']) {
                    if (!!showWarning) {
                        console.warn("No kyc_config object found on window!");
                    }
                    return false;
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
                        if (!!showWarning) {
                            console.warn("No elementId object found on the kyc_config object!");
                        }
                        return false;
                    }
                    elementId = window['kyc_config'].elementId;
                }

                if (!(!!elementId)) {
                    if (!!showWarning) {
                        console.warn("No elementId is given!");
                    }
                    return false;
                }
                if (document.getElementById(elementId)) {
                    return {
                        element: document.getElementById(elementId),
                        context: JSON.parse(JSON.stringify(inContext))
                    };
                }
                if (!(!!elementId)) {
                    if (!!showWarning) {
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
            triggerLoadEvent = function (target: any, type: string) {
                if (target != window) {
                    target['kyc'].eventType = type;
                }
                if ("createEvent" in document) {
                    var event = document.createEvent("HTMLEvents");

                    event.initEvent("load", false, true);
                    event['kyctype'] = type;
                    target.dispatchEvent(event);
                    return;
                }
                target['fireEvent']("onload");


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
            notify = function (inEvent, target?: any,details?:any) {
                let event;

                if (!!inEvent && typeof inEvent == 'string' && !!target && !!target['kyc']) {

                    inEvent = createEvent(inEvent.trim(), details||safeKyc(target))
                }
                try {
                    event = JSON.parse(JSON.stringify(inEvent));
                } catch (err) {
                    console.log(err, inEvent, typeof inEvent);
                    return;
                }
                event.isTrusted = true;
                event.type = inEvent.type.toString();

                if (!!target) {
                    event.target = target
                    triggerLoadEvent(target, event.type);
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
                console.warn('A templating error has occured.!', {selector: selector, template: sourcetoUse.innerHTML});
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
            submit = function (element: HTMLElement) {

                const form = element.querySelector('form'),
                    values = {};
                if (!!form && !!form.elements) {
                    ([].slice.call(form.elements) || []).map(function (e) {
                        if (!!e['name']) {
                            values[encodeURIComponent(e['name'])] = !!e['value'] ? encodeURIComponent(e['value']) : null;
                        }
                    });
                }
                console.log(values)
            },
            buildLoader = function (target: HTMLElement) {
                target.innerHTML = '';
                const
                    loader = getPartial('[data-kyc-loader]', target['kyc'].template);
                if (!!loader) {
                    target.appendChild(loader);
                }
                target.setAttribute('kyc-sdk-status', 'loading')

            },
            buildDossiersList = function (target: HTMLElement) {
                try {
                    const
                        dossierlist = getPartial('[data-kyc-dossier-list]', target['kyc'].template),
                        dossierrow = dossierlist.querySelector('[data-kyc-dossier-item]'),
                        ap = Array.prototype;
                    let last = dossierrow;

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
                            getTasks(target, dossier.id);

                        })
                        last = curDossierrow;
                    });
                    dossierrow.parentNode.removeChild(dossierrow);
                    target.innerHTML = '';
                    target.appendChild(dossierlist);
                    target.setAttribute('kyc-sdk-status', 'dossiers')
                } catch (error) {
                    console.warn('A templating error has occured while building the dossier list!', error);
                    return
                }

            },
            buildTaskList = function (target: HTMLElement, dossier) {
                try {
                    const
                        tasklist = getPartial('[data-kyc-task-list]', target['kyc'].template),
                        dossierTitleElement = tasklist.querySelector('[data-kyc-dossier-title] kyc-text'),
                        taskrow = tasklist.querySelector('[data-kyc-task-item]'),
                        backbutton = tasklist.querySelector('[data-kyc-to-dossiers]'),
                        ap = Array.prototype;
                    let last = taskrow;

                    if (!!dossierTitleElement) {
                        dossierTitleElement.parentNode.replaceChild(document.createTextNode(dossier.customerName), dossierTitleElement);
                    }

                    ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                        e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                    });

                    backbutton.addEventListener('click', function () {
                        buildDossiersList(target);
                    })


                    dossier.tasks.map(function (task) {

                        const curTaskrow = taskrow.cloneNode(true),
                            namenode = curTaskrow.querySelector('kyc-task-name'),
                            statusnode = curTaskrow.querySelector('kyc-task-status');


                        curTaskrow.setAttribute('data-kyc-status', task.status);
                        if (!!namenode) {
                            namenode.parentNode.replaceChild(document.createTextNode(task.name), namenode);
                        }
                        if (!!statusnode) {
                            statusnode.parentNode.replaceChild(document.createTextNode(translate(task.status)), statusnode);
                        }


                        last.parentNode.insertBefore(curTaskrow, last.nextSibling);
                        curTaskrow.addEventListener('click', function (event) {
                            buildLoader(target);
                            target['kyc'].history.back = [];
                            target['kyc'].history.next = [];
                            getTask(target, dossier.id, task.id);

                        })
                        last = curTaskrow;
                    });


                    taskrow.parentNode.removeChild(taskrow);
                    target.innerHTML = '';
                    target.appendChild(tasklist);
                    target.setAttribute('kyc-sdk-status', 'tasks')
                } catch (error) {
                    console.warn('A templating error has occured while building the dossier task list!', error);
                    return
                }

            },
            buildTaskForm = function (target: HTMLElement, dossier, task, checkid?: string) {

                checkid = !!checkid ? checkid : task.sequence.initialCheckId;

                let check = task.checks.filter(function (check) {
                    return check.id == checkid;
                }).shift();
                if (!!check && check.id) {

                    const next = task.sequence.transitions.filter(function (transition) {
                        return transition.from == checkid;
                    }).map(function (transition) {
                        return transition.defaultGoTo;
                    }).shift();

                    try {
                        const dossierElement = getPartial('[data-kyc-dossier]', target['kyc'].template),
                            ap = Array.prototype;

                        ap.slice.call(dossierElement.querySelectorAll('[name]')).map(function (e) {
                            e.removeAttribute('name');


                        });
                        const dossierTitleElement = dossierElement.querySelector('[data-kyc-dossier-title] kyc-text'),
                            dossierNavigationElement = dossierElement.querySelector(' [data-kyc-dossier-tasks-navigation]'),
                            taskFormElement = dossierElement.querySelector('[data-kyc-task]'),
                            taskTitleElement = taskFormElement.querySelector('[data-kyc-task-title] kyc-text'),
                            checkElement = taskFormElement.querySelector('[data-kyc-check]'),
                            taskNavigationElement = taskFormElement.querySelector('[data-kyc-task-navigation]');


                        let newinput,
                            formname = check.id.trim(),
                            last = checkElement;
                        if (!!dossierTitleElement) {
                            dossierTitleElement.parentNode.replaceChild(document.createTextNode(dossier.customerName), dossierTitleElement);
                        }
                        if (!!taskTitleElement) {
                            taskTitleElement.parentNode.replaceChild(document.createTextNode(task.name), taskTitleElement);
                        }

                        const curCheck = checkElement.cloneNode(true),
                            inputElement = curCheck.querySelector('kyc-input');


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
                                                    case 'PHONE_NUMBER':
                                                    case 'IBAN':
                                                        newinput.setAttribute('type', 'tel');
                                                        break;
                                                    default:
                                                        newinput.setAttribute('type', 'text');

                                                }
                                                newinput.setAttribute('placeholder', translate(check.definition.description));
                                                newinput.setAttribute('name', check.id)
                                                newinput.value = check.value || null;
                                        }

                                        break;
                                    case 'IDIN':
                                        newinput = document.createElement('div');
                                        newinput.setAttribute('class', inputElement.querySelector('[data-kyc-input]').getAttribute('class'))
                                        newinput.innerHTML = 'IDIN is coming soon to the web flow';
                                        break;
                                    case 'RAW_DOCUMENT_SCAN':
                                    case 'DOCUMENT_FILE_UPLOAD':
                                    case 'SELFIE_CHECK':
                                        newinput = inputElement.querySelector('[data-kyc-file]').cloneNode(true);
                                        const fileinput = newinput.querySelector('[data-kyc-file-input]'),
                                            placeholder = inputElement.querySelector('kyc-placeholder'),
                                            filepreview = newinput.querySelector('[data-kyc-file-preview]');
                                        fileinput.setAttribute('type', 'file');

                                        fileinput.setAttribute('placeholder', translate(check.definition.description));
                                        filepreview.innerHTML = translate(check.definition.description);
                                        fileinput.addEventListener('change', function (event) {
                                            if (event.target.files && event.target.files[0]) {
                                                const reader = new FileReader();
                                                reader.onload = function (fileEvent) {
                                                    console.log(fileEvent)
                                                    //filepreview
                                                }

                                                reader.readAsDataURL(event.target.files[0]);
                                            }
                                            console.log(event)
                                        })
                                        if (!!check.value) {
                                            if (!!uploads[check.value]) {
                                                filepreview.setAttribute('style', 'background-image:url("' + uploads[check.value] + '")');
                                            } else {
                                                const options = {
                                                    'url': kycApiEndPoint + '/api/v1/uploads/' + check.value,
                                                    method: 'POST',
                                                    callback: function (result) {
                                                        if (!!result.success) {
                                                            uploads[check.value] = result.success;
                                                            filepreview.setAttribute('style', 'background-image:url("' + uploads[check.value] + '")');

                                                        } else {
                                                            console.warn("No upload with the id " + check.value + " could be retrieved!", result.error);

                                                        }
                                                    }

                                                }
                                                callApi(options);

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
                            ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                            });

                            backbutton.addEventListener('click', function () {
                                buildDossiersList(target);
                            })

                        });
                        ap.slice.call(dossierElement.querySelectorAll('[data-kyc-to-tasks]')).map(function (backbutton) {
                            ap.slice.call(backbutton.querySelectorAll('kyc-text')).map(function (e) {

                                e.parentNode.replaceChild(document.createTextNode(translate('Back')), e);

                            });

                            backbutton.addEventListener('click', function () {
                                buildTaskList(target, dossier);
                            })

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
                            ap.slice.call(nextbutton.querySelectorAll('kyc-text')).map(function (e) {

                                e.parentNode.replaceChild(document.createTextNode(translate('Next')), e);

                            });
                            nextbutton.addEventListener('click', function () {
                                const form = target.querySelector('form'),
                                    values = {};

                                if (!!form) {

                                    const formData = new FormData(form)
                                    check.value = formname == check.id ? formData.get(formname) : JSON.stringify(formData.getAll(formname) || []);

                                }
                                if (!!next) {


                                    buildLoader(target);
                                    target['kyc'].history.back.push(function () {
                                        buildLoader(target);
                                        buildTaskForm(target, dossier, task, check.id);
                                    });
                                    buildTaskForm(target, dossier, task, next)
                                    return;
                                }
                                buildLoader(target);

                                target['kyc'].history.back.push(function () {
                                    buildLoader(target);
                                    buildTaskForm(target, dossier, task, check.id);
                                });
                                buildTaskList(target, dossier);
                                return;

                            })
                        });


                        target.innerHTML = '';
                        target.appendChild(dossierElement);
                        target.setAttribute('kyc-sdk-status', 'task')


                    } catch (error) {
                        console.warn('A templating error has occured while building the dossier task check form!', error);

                    }
                    return
                }
                console.warn('The check could not be determined!');
            },

            safeKyc = function (element: HTMLElement) {
                return {
                    context: element['kyc'].context,
                    status: element['kyc'].status
                };
            },
            init = function (elementId?: string, inContext?: object) {

                const view = document.createElement('kyc-view'),
                    checked = checkSdkConditions(elementId, inContext);

                let status, element, context, event;
                if (!checked) {
                    return false;
                }
                showWarning = true;

                element = checked.element;
                context = checked.context;

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
                    element.setAttribute('kyc-sdk-status', 'ready')
                    buildLoader(element);
                    element.appendChild(view);
                    /*   setTimeout(function () {
                           context.taskId = 'jaja';
                           status.changed = new Date();
                           event = createEvent('change', {status: status, context: context});
                           notify(event, element);

                       }, 1000)*/
                } else {
                    element.setAttribute('kyc-sdk-status', 'ready')
                    element.kyc.status.reset = new Date(),
                        element.kyc.context = context,
                        event = createEvent('reset', safeKyc(element));
                }

                /*  http({
                      url: '../moqup/task_multiplechecks.json',
                      callback: function (result) {
                          if (!!result.success) {
                              buildform(element, result.success.checks[0]);
                              console.info(result.success);
                          } else {
                              console.error(result.error);
                          }
                      }
                  });
              }
              http({
                  url: '../moqup/task_multiplechecks.json',
                  callback: function (result) {
                      if (!!result.success) {
                          buildform(element, result.success.checks[0]);
                          console.info(result.success);
                      } else {
                          console.error(result.error);
                      }
                  }
              });*/
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
                init: init
            };
            const event = createEvent('ready', {status: {initialised: initialised, version: version}});
            notify(event, window);
            showWarning = true;
            domReady(function () {
                if (checkSdkConditions()) {

                    init();
                }

            })

        }
    }
)
();