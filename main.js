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
/**
 * Client-side guest part.
 *
 * @author DarkPark
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

/**
 * @constructor
 *
 * @param {Object} [options] set of initialization parameters (host, port, name)
 */
function ProxyGuest ( options ) {
	// prepare
	var name;

	// connection with server
	this.active = false;

	/**
	 * proxy instance configuration
	 * @namespace
	 */
	this.config = {
		// node.js server address
		host: '127.0.0.1',

		// http server port
		port: 8800,

		// session name
		name: 'anonymous',

		// cached url for posting requests
		urlPost: '',

		// cached url for info collecting
		urlInfo: ''
	};

	// single ajax object for performance
	this.xhr = new XMLHttpRequest();

	// validate and iterate input
	if ( options && typeof options === 'object' ) {
		for ( name in options ) {
			// rewrite defaults
			if ( options.hasOwnProperty(name) ) {
				this.config[name] = options[name];
			}
		}
	}

	// there may be some special chars
	name = encodeURIComponent(this.config.name);

	// cache final request urls
	this.config.urlPost = 'http://' + this.config.host + ':' + this.config.port + '/' + name;
	this.config.urlInfo = 'http://' + this.config.host + ':' + this.config.port + '/info/' + name;

	// check initial connection status
	this.active = this.info().active;

	console.log('%c[core]\t%c%s\t%c0\t%cconnection to the host %c(%s:%s): %c%s',
		'color:grey',
		'color:purple', this.config.name,
		'color:grey',
		'color:black',
		'color:grey', this.config.host, this.config.port,
		'color:' + (this.active ? 'green' : 'red'), this.active ? 'available' : 'not available'
	);
}


/**
 * Sends a synchronous request to the host system.
 *
 * @param {Object} request JSON data to send
 * @return {*} execution result from the host
 */
ProxyGuest.prototype.send = function ( request ) {
	// prepare
	var time = +new Date(),
		response;

	// mandatory init check
	if ( !this.config.urlPost ) {
		return false;
	}

	// make request
	this.xhr.open('post', this.config.urlPost, false);
	this.xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	this.xhr.send(JSON.stringify(request));

	// proceed the result
	try {
		response = JSON.parse(this.xhr.responseText);
	} catch ( e ) {
		response = {error: e};
	}

	// update connection status
	this.active = !response.error;

	// detailed report
	console.groupCollapsed('%c[%s]\t%c%s\t%c%s\t%c%s',
		'color:grey;font-weight:normal', request.type,
		'color:purple;font-weight:normal', this.config.name,
		'color:grey;font-weight:normal', +new Date() - time,
		'color:' + (response.error ? 'red' : 'green'), request.method || request.code
	);
	if ( request.params !== undefined ) { console.log('%c%s:\t', 'font-weight:bold', 'Params', request.params); }
	if ( response.data  !== undefined ) { console.log('%c%s:\t', 'font-weight:bold', 'Result', response.data); }
	if ( response.error !== undefined ) { console.error(response.error); }
	console.groupEnd();

	// ready
	return response.data;
};


/**
 * Wrapper to send a line of js code to eval on the host.
 *
 * @param {String} code javascript source code to execute on the device
 * @return {*} execution result from the host
 */
ProxyGuest.prototype.eval = function ( code ) {
	return this.send({
		type: 'eval',
		code: code
	});
};


/**
 * Wrapper to send one function of js code with arguments to eval on the host.
 *
 * @param {String} method javascript function name (like "encodeURIComponent")
 * @param {Array} params list of the function arguments
 * @param {String} [context=window] remote call context
 * @return {*} execution result from the host
 */
ProxyGuest.prototype.call = function ( method, params, context ) {
	return this.send({
		type:    'call',
		method:  method,
		params:  params,
		context: context
	});
};


/**
 * Wrapper to send a var name to get json.
 *
 * @param {String} name javascript var name to serialize
 * @return {*} execution result from the host
 */
ProxyGuest.prototype.json = function ( name ) {
	var data = this.send({
		type: 'json',
		code: name
	});

	return data ? JSON.parse(data) : null;
};


/**
 * Wrapper to send a var name to get json.
 *
 * @param {String} name javascript var name to serialize
 * @return {*} execution result from the host
 */
ProxyGuest.prototype.hook = function ( name ) {
	var data = this.send({
		type: 'hook',
		name: name
	});

	return data ? JSON.parse(data) : null;
};


/**
 * Gets the detailed info about the current connection.
 *
 * @return {{active:Boolean, count:Number}|{active:Boolean}|Boolean} info
 */
ProxyGuest.prototype.info = function () {
	// mandatory init check
	if ( !this.config.urlInfo ) {
		return false;
	}

	// make request
	this.xhr.open('get', this.config.urlInfo, false);
	this.xhr.send();

	return JSON.parse(this.xhr.responseText || false);
};


// CommonJS modules support
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = ProxyGuest;
}

/**
 * Client-side host part.
 *
 * @author DarkPark
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

/**
 * @constructor
 *
 * @param {Object} [options] set of initialization parameters (host, port, name)
 */
function ProxyHost ( options ) {
	// prepare
	var name;

	// connection with server
	this.active = false;

	/**
	 * proxy instance configuration
	 * @namespace
	 */
	this.config = {
		/** proxy server address */
		host : '127.0.0.1',

		/** proxy server websocket port */
		port : 8900,

		/** session name */
		name : 'anonymous',

		/** automatically try to restore connection on disconnect */
		reconnect : true,

		/** time between connection attempts (5s) */
		reconnectInterval : 5000
	};

	/**
	 * @type {WebSocket}
	 */
	this.socket = null;

	// validate and iterate input
	if ( options && typeof options === 'object' ) {
		for ( name in options ) {
			// rewrite defaults
			if ( options.hasOwnProperty(name) ) { this.config[name] = options[name]; }
		}
	}

	// try to establish connection
	this.connect();
}


/**
 * Connect to the proxy server
 */
ProxyHost.prototype.connect = function () {
	// prepare
	var self = this;

	// establish the connection
	// there may be some special chars in name
	this.socket = new WebSocket('ws://' + this.config.host + ':' + this.config.port + '/' + encodeURIComponent(this.config.name));

	/**
	 * event hook
	 * @callback
	 */
	this.socket.onopen = function () {
		self.log('core', 0, true, 'connection established');

		self.active = true;
	};

	/**
	 * event hook
	 * @callback
	 */
	this.socket.onclose = function () {
		self.log('core', 0, false, 'no connection');

		self.active = false;

		if ( self.config.reconnect ) {
			setTimeout(function () {
				self.connect();
			}, self.config.reconnectInterval);
		}
	};

	/**
	 * Message from a desktop browser.
	 *
	 * @callback
	 */
	this.socket.onmessage = function ( message ) {
		// prepare
		var response = {time:+new Date()},
			request, context;

		// proceed the message
		try {
			request = JSON.parse(message.data || false);
			switch ( request.type ) {
				case 'call':
					context = request.context ? eval(request.context) : window;
					response.data = eval(request.method).apply(context, request.params);
					break;
				case 'eval':
					response.data = eval(request.code);
					break;
				case 'json':
					response.data = JSON.stringify(eval(request.code));
					break;
				default:
					response.error = 'invalid incoming request';
			}
		} catch ( e ) {
			response.error = e.toString();
		}

		// time taken
		response.time = +new Date() - response.time;
		// wrap and send back
		this.send(JSON.stringify(response));

		// detailed report
		self.log(request.type, response.time, !response.error, request.method || request.code, request.params);
	};
};


/**
 * Finish the connection and strop reconnection if any.
 */
ProxyHost.prototype.disconnect = function () {
	// stop auto connection
	this.config.reconnect = false;
	this.socket.close();
};


/**
 * Logging wrapper.
 *
 * @param {String} type
 * @param {Number} time
 * @param {Boolean} status
 * @param {String} message
 * @param {*} [params]
 */
ProxyHost.prototype.log = function ( type, time, status, message, params ) {
	console.log('%c[%s]\t%c%s\t%c%s\t%c%s\t',
		'color:grey', type,
		'color:purple', this.config.name,
		'color:grey', time,
		'color:' + (status ? 'green' : 'red'), message,
		params || ''
	);
};


// CommonJS modules support
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = ProxyHost;
}
