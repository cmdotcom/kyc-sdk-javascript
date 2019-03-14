/* KYC SERVERSIDE AND CONFIG PREPARATION*/
var formisLoaded = false,
    formfields =
        [
            {
                label: 'API Endpoints',
                type: 'seperator',


            },
            {
                label: 'authorisationEndPoint',
                type: 'url',
                value: '',
                link: my_kyc_config,
                required: true,
            },
            {
                label: 'kycApiEndPoint',
                type: 'url',
                value: '',
                link: my_kyc_config,
                required: true,
            },
            {
                label: 'Enduser Identification',
                type: 'seperator',


            },
            {
                label: 'clientId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },

            {
                label: 'customerName',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },
            {
                label: 'externalReference',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },
            {
                label: 'firstName',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },
            {
                label: 'lastName',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },
            {
                label: 'msisdn',
                type: 'tel',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },
            {
                label: 'userIdentifier',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: true,
            },

            {
                label: 'Optional Values',
                type: 'seperator',


            },
            {
                label: 'templateId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: false,
            },
            {
                label: 'dossierId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: false,
            },
            {
                label: 'taskidId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: false,
            },
            {
                label: 'checkId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
                required: false,
            }
        ],
    validateLoginFrom = function () {
        var form = document.querySelector('form#login');
        if (!!form && form.checkValidity()) {
            formfields.map(function (field) {
                if (!!field.link) {

                    var value = (form.querySelector('[name="' + field.label + '"]') || {value: ''}).value || '';
                    if (field.type == 'tel') {
                        value = (value || '').replace(/[\+]/g, '00').replace(/[^0-9]/g, '').trim();


                    }
                    field.link[field.label] = value;
                }

            });


            kyc_config = my_kyc_config;
            kyc_sdk.init();
        }
    },
    validateKeypress = function (event) {
        var code = event.keyCode || event.which,
            character = String.fromCharCode(code),
            allowedKeys;
        if (event.target.type == 'tel') {
            //PHONE NUMBER


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


        }


    },
    validateInput = function (event) {

        if (event.target.type == 'tel') {
            //PHONE NUMBER

            event.target.setCustomValidity(!(!!((event.target.value || '').replace(/[\+]/g, '00').replace(/[^0-9]/g, '').trim())) ? 'Invalid PhoneNumber' : '');


        }

        if (event.target.checkValidity()) {
            event.target.parentNode.classList.remove('error');
            event.target.parentNode.classList.add('success');
        } else {
            event.target.parentNode.classList.add('error');
            event.target.parentNode.classList.remove('success');
        }
        var form = document.querySelector('form#login');
        if (!!form && form.checkValidity()) {
            form.querySelector('button').removeAttribute('disabled');
        }
    },
    buildStartform = function () {
        if (!formisLoaded) {

            var form = document.querySelector('form#login'),
                formrows = document.querySelector('form#login .rows'),
                button = document.querySelector('form#login button');


            if (!formrows) {

                setTimeout(function () {
                    buildStartform()
                }, 500);
                return;
            }
            formisLoaded = true;
            document.querySelector('form#login').setAttribute('style', '');
            innerHTML = '';
            formrows.innerHTML = innerHTML;
            var endHtml = ''
            formfields.map(function (field) {
                if (field.type == 'seperator') {
                    innerHTML +=
                        endHtml +
                        '   <div class="col-12 form-group-box">' +
                        '       <h2>' + field.label + '</h2>' +
                        ' <div class="row ">';

                    endHtml = '</div> </div>';


                } else {
                    innerHTML +=
                        '   <div class="col-12 col-md-6 p-r-16">' +
                        '      <div class="form-group" align="left">' +
                        '          <div class="form-row">' +
                        '              <div class="form-input">' +
                        '                  <input onkeypress="validateKeypress(event)" oninput="validateInput(event)"  inkeyup="" onchange="validateInput(event)" name="' + field.label + '" ' + (field.required ? 'required' : '') + ' type="' + (field.type || 'text') + '" value="' + (field.value || '') + '" class="form-control"  placeholder="enter ' + field.label + '">' +
                        '                 <label >' + field.label + (field.required ? '<sup class="required">*</sup>' : '') + '</label>' +
                        '              </div>' +
                        '          </div>' +
                        '      </div>' +
                        '   </div>';
                }

            })
            innerHTML += endHtml

            formrows.innerHTML = innerHTML;
            if (formrows.querySelector('input[value=""][required]')) {
                formrows.querySelector('input[value=""][required]').focus();
            }
            button.disabled = !!form && !form.checkValidity();


        }
    }

/*ToggleCSS functionality*/

var toggableCSS = [],
    istoggling = false;
toggleisReady = false;

function toggleCssReady() {

    document.querySelector('body').classList.remove('csstoggling')
}


function toggleCss(pageload) {
    if (!istoggling) {
        istoggling = true;

        if (toggableCSS.length == 0 && !!document.querySelector('link[data-toggle-css]')) {
            [].slice.call(document.querySelectorAll('link[data-toggle-css]')).map(function (link) {
                toggableCSS.push({name: link.getAttribute('data-toggle-css'), href: link.getAttribute('href')});
                link.parentNode.removeChild(link);
            })
        }

        if (toggableCSS.length > 0 && (!toggleisReady || !pageload)) {
            document.querySelector('body').removeAttribute('data-toggle-css');
            var checked = document.querySelector('.togglecss input[type="radio"]:checked');
            if (!checked) {
                checked = document.querySelector('.togglecss input[type="radio"]');
                checked.checked = true;
            }
            checked = checked.getAttribute('value') || null;

            toggleisReady = true;

            if (!!checked) {
                [].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).map(function (link) {
                    if (toggableCSS.filter(function (css) {
                        return css.href == link.getAttribute('href')
                    }).length > 0) {

                        link.parentNode.removeChild(link);
                    }
                })

                toggableCSS.map(function (css) {
                    if (css.name == checked) {
                        var link = document.createElement('link');
                        link.type = 'text/css';
                        link.rel = 'stylesheet';
                        link.href = css.href;

                        document.getElementsByTagName('head')[0].appendChild(link);
                        var img = document.createElement('img');
                        img.onerror = function (event) {
                            istoggling = false;
                            setTimeout(function () {
                                document.querySelector('body').setAttribute('data-toggle-css', css.name);
                            }, 200)


                        }

                        img.src = css.href;
                    }
                })
                return;
            }


        }
        istoggling = false;
    }


}


/* INITIALIZE OUR login from when the page is loadedIS LOADED*/

window.addEventListener('load', function (e) {
    toggleCss(true);
    buildStartform();
    // test if the event has a property kyctype an it equals to 'ready'
    if (!!e && !!e.kyctype && e.kyctype == 'ready') {
        //KYC SDK is Loaded
        console.log('KYC SDK is Loaded');


    }
})


