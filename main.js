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
/**
 * Main server configuration.
 *
 * @author DarkPark
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

module.exports = {
	// listening HTTP port to serve proxy files
	portHttp: 8800,

	// listening WebSocket port to serve requests
	portWs: 8900,

	// time between connection/sending attempts (in ms)
	retryDelay: 100,

	// amount of connection/sending attempts before give up
	retryLimit: 30,

	// full logging
	logging: true,

	// session name
	name: 'anonymous'
};
/**
 * Console logger for http/ws communication.
 *
 * @author DarkPark
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

var config = require('./config');


// enable colors in console
require('tty-colors');


/**
 * Output detailed log for HTTP communications.
 *
 * @param {String} type
 * @param {String} method
 * @param {String} name
 * @param {String} message
 */
module.exports.http = function ( type, method, name, message ) {
	if ( config.logging ) {
		console.log('%s\t%s\t%s\t%s',
			type.toUpperCase().cyan, method.toUpperCase().green, name.grey, message || ''
		);
	}
};


/**
 * Output detailed log for HTTP communications.
 *
 * @param {String} type
 * @param {String} method
 * @param {String} name
 * @param {String} message
 */
module.exports.ws = function ( type, method, name, message ) {
	if ( config.logging ) {
		console.log('%s\t%s\t[%s]\t%s',
			type.toUpperCase().cyan, method.toUpperCase().green, name.magenta, message || ''
		);
	}
};
/**
 * WebSocket pool.
 * Wraps all the work with ws instances.
 *
 * @author DarkPark
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

var log = require('./logger').ws,
	// named WebSocket list
	pool = {};


// exports the wrapper object
module.exports = {{
	"env": {
		"browser": true,
		"node": true
	},

	"globals": {},

	"rules": {
		"comma-dangle": [2, "never"],
		"no-cond-assign": 2,
		"no-constant-condition": 2,
		"no-dupe-args": 2,
		"no-dupe-keys": 2,
		"no-duplicate-case": 2,
		"no-empty": 2,
		"no-ex-assign": 2,
		"no-extra-boolean-cast": 2,
		"no-extra-parens": 0,
		"no-extra-semi": 2,
		"no-func-assign": 2,
		"no-inner-declarations": [2, "both"],
		"no-invalid-regexp": 2,
		"no-irregular-whitespace": 2,
		"no-negated-in-lhs": 2,
		"no-obj-calls": 2,
		"no-reserved-keys": 2,
		"no-sparse-arrays": 2,
		"no-unreachable": 2,
		"use-isnan": 2,
		"valid-jsdoc": [2, {
			"prefer": {
				"returns": "return"
			},
			"requireReturn": false
		}],
		"valid-typeof": 2,

		"consistent-return": 1,
		"curly": [2, "all"],
		"dot-notation": 0,
		"eqeqeq": 1,
		"no-alert": 1,
		"no-caller": 1,
		"no-else-return": 1,
		"no-eval": 1,
		"no-extend-native": [2, {"exceptions": []}],
		"no-fallthrough": 1,
		"no-floating-decimal": 1,
		"no-implied-eval": 1,
		"no-lone-blocks": 1,
		"no-loop-func": 1,
		"no-multi-spaces": 0,
		"no-native-reassign": 1,
		"no-new-func": 1,
		"no-new-wrappers": 1,
		"no-octal": 1,
		"no-octal-escape": 1,
		"no-redeclare": 1,
		"no-return-assign": 1,
		"no-script-url": 1,
		"no-self-compare": 1,
		"no-sequences": 1,
		"no-unused-expressions": 1,
		"no-useless-call": 2,
		"no-void": 1,
		"no-with": 1,
		"radix": 1,
		"vars-on-top": 1,

		"strict": [2, "global"],

		"no-delete-var": 1,
		"no-label-var": 1,
		"no-shadow": 0,
		"no-shadow-restricted-names": 1,
		"no-undef": 1,
		"no-undefined": 0,
		"no-unused-vars": [1, {"vars": "all", "args": "all"}],
		"no-use-before-define": [1, "nofunc"],
		"no-mixed-requires": 0,
		"no-new-require": 0,
		"no-path-concat": 1,

		"no-process-exit": 0,

		"array-bracket-spacing": [2, "never"],
		"block-spacing": [2, "always"],
		"brace-style": [1, "1tbs", {"allowSingleLine": true}],
		"camelcase": 1,
		"comma-spacing": [1, {"before": false, "after": true}],
		"comma-style": [1, "last"],
		"computed-property-spacing": [2, "never"],
		"consistent-this": [1, "self"],
		"eol-last": 1,
		"func-names": 0,
		"indent": [2, "tab", {"SwitchCase": 1, "VariableDeclarator": 1}],
		"key-spacing": [0, { "align": "colon" }],
		"linebreak-style": [2, "unix"],
		"new-cap": 1,
		"new-parens": 1,
		"newline-after-var": [1, "always"],
		"no-array-constructor": 1,
		"no-lonely-if": 0,
		"no-mixed-spaces-and-tabs": 1,
		"no-multiple-empty-lines": [1, {"max": 2}],
		"no-nested-ternary": 1,
		"no-new-object": 1,
		"no-spaced-func": 1,
		"no-trailing-spaces": [2, {"skipBlankLines": true}],
		"no-unneeded-ternary": 1,
		"object-curly-spacing": [2, "never"],
		"one-var": [1, "always"],
		"quote-props": [1, "as-needed"],
		"quotes": [1, "single", "avoid-escape"],
		"semi": [1, "always"],
		"semi-spacing": [2, {"before": false, "after": true}],
		"space-after-keywords": [1, "always"],
		"space-before-blocks": [1, "always"],
		"space-before-function-paren": [1, {"anonymous": "always", "named": "always"}],
		"space-in-parens": [0, "always"],
		"space-infix-ops": 1,
		"space-return-throw-case": 1,
		"space-unary-ops": [1, {"words": true, "nonwords": false}],
		"spaced-line-comment": [0, "always"]
	}
}

	/**
	 * New WebSocket creation.
	 *
	 * @param {String} name unique identifier for session
	 * @param {Object} socket websocket resource
	 * @return {Boolean} true if was deleted successfully
	 */
	add: function ( name, socket ) {
		var self = this;

		// check input
		if ( name && socket ) {
			log('ws', 'init', name, 'connection');

			// main data structure
			pool[name] = {
				socket: socket,
				time: +new Date(),
				count: 0,
				active: true
			};

			// disable link on close
			pool[name].socket.on('close', function () {
				self.remove(name);
			});

			// await for an answer
			pool[name].socket.on('message', function ( message ) {
				// has link to talk back
				if ( pool[name].response ) {
					log('ws', 'get', name, message);
					pool[name].response.end(message);
				}
			});
			return true;
		}

		// failure
		log('ws', 'init', name, 'fail to connect (wrong name or link)');
		return false;
	},

	/**
	 * Clear resources on WebSocket deletion.
	 *
	 * @param {String} name session name
	 * @return {Boolean} true if was deleted successfully
	 */
	remove: function ( name ) {
		// valid connection
		if ( name in pool ) {
			log('ws', 'exit', name, 'close');
			return delete pool[name];
		}

		// failure
		log('ws', 'del', name, 'fail to remove (invalid connection)');
		return false;
	},

	/**
	 * Detailed information of the named WebSocket instance.
	 *
	 * @param {String} name session name
	 *
	 * @return {{active:Boolean, count:Number}|{active:Boolean}} info
	 */
	info: function ( name ) {
		// valid connection
		if ( name in pool ) {
			return {
				active: pool[name].active,
				count:  pool[name].count
			};
		}

		// failure
		return {active: false};
	},

	/**
	 * Forward the request to the given session.
	 *
	 * @param {String} name session name
	 * @param {String} data post data from guest to host
	 * @param {ServerResponse} response link to HTTP response object to send back data
	 */
	send: function ( name, data, response ) {
		log('ws', 'send', name, data);
		// store link to talk back when ready
		pool[name].response = response;
		// actual post
		pool[name].socket.send(data);
		pool[name].count++;
	}
};
# detect all text files and automatically normalize them (convert CRLF to LF)
* text=auto

# definitively text files
*.js   text
*.json text
*.html text
*.css  text
*.txt  text
*.po   text
*.md   text
/.idea
/node_modules
