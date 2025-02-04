require('code-proxy')();
 
// or it's possible to redefine default options
require('code-proxy')({
    portHttp:   8800,
    portWs:     8900,
    retryDelay: 100,
    retryLimit: 30,
    logging:    true
})

<script type="text/javascript" src="host.js"></script>

// default host/port/session
var proxy = new ProxyHost();
 
// prepare for guest call
localStorage.setItem('test', 'localStorage test string on the host');
 
// test func for remote exec
function doSomething ( param ) {
    return 'some host work with "' + param + '" is done';
}
<script type="text/javascript" src="guest.js"></script>

// default host/port/session
var proxy = new ProxyGuest();
 
// examples
proxy.eval('1+1');
proxy.eval('window.navigator.userAgent');
proxy.json('screen');
proxy.call('localStorage.getItem', ['test'], 'localStorage');
proxy.call('doSomething', ['test data']);

var proxy = new ProxyGuest({
    host: '127.0.0.1',
    port: 8800,
    name: 'anonymous'
});
