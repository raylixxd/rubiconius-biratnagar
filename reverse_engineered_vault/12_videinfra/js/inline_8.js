if (document.cookie.indexOf('cookieConsentStatus=1') !== -1 && document.querySelector('#cookie-consent')) {
            document.querySelector('#cookie-consent').className += ' is-hidden';
        } else {
            document.documentElement.classList.add('with-cookie-consent');
        }