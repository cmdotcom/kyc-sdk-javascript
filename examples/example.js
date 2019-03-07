var formisLoaded = false,
    formfields =
        [
            {
                label: 'clientId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'templateId',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'customerName',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'externalReference',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'firstName',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'lastName',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'msisdn',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'userIdentifier',
                type: 'text',
                value: '',
                link: my_kyc_config.context,
            },
            {
                label: 'authorisationEndPoint',
                type: 'url',
                value: '',
                link: my_kyc_config
            },
            {
                label: 'kycApiEndPoint',
                type: 'url',
                value: '',
                link: my_kyc_config
            }
        ],
    validateLoginFrom = function () {
        var form = document.querySelector('form#login');
        if (!!form && form.checkValidity()) {
            var formData = new FormData(form)
            formfields.map(function (field) {
                field.value = field.label
                field.link[field.label] = formData.get(field.label)

            });


            kyc_config = my_kyc_config;
            kyc_sdk.init();
        }
    },
    validiateInput = function (event) {

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
            formisLoaded=true;
            document.querySelector('form#login').setAttribute('style', '');
            innerHTML = '';
            formrows.innerHTML = innerHTML;

            formfields.map(function (field) {
                innerHTML +=

                    '   <div class="col-12 col-md-6 p-r-16">' +
                    '      <div class="form-group" align="left">' +
                    '          <div class="form-row">' +
                    '              <div class="form-input">' +
                    '                  <input oninput="validiateInput(event)"  onchange="validiateInput(event)" name="' + field.label + '" required type="' + (field.type || 'text') + '" value="' + (field.value || '') + '" class="form-control"  placeholder="enter ' + field.label + '">' +
                    '                 <label >' + field.label + '</label>' +
                    '              </div>' +
                    '          </div>' +
                    '      </div>' +
                    '   </div>';

            })

            formrows.innerHTML = innerHTML;

            button.disabled = !!form && !form.checkValidity();

        }


    }

/* INITIALIZE OUR login from when the page is loadedIS LOADED*/

window.addEventListener('load', function (e) {
    buildStartform();
    // test if the event has a property kyctype an it equals to 'ready'
    if (!!e && !!e.kyctype && e.kyctype == 'ready') {
        //KYC SDK is Loaded
        console.log('KYC SDK is Loaded');

    }
})


