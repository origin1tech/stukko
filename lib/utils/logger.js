'use strict';

var winston = require('winston'),
	io = require('./io');

/**
 * Configures Loggers.
 * @param options
 * @param consoleOnly
 * @returns {{loggers: {}, winston: (*|exports)}}
 * @constructor
 */
function Logger (options, consoleOnly) {

	var loggers = {},
		defaultTransports,
		transports;

	defaultTransports = {
		console: {
			level: options.level,
			colorize: true,
			prettyPrint: true,
			transport: 'Console', // the winston transport type.
			configOnly: false // when true, used only as config transport for other loggers.
		},
		file: {
			level: options.level,
			timestamp: true,
			filename: options.path + '/app.log',
			maxsize: 1024 * 1024 * 10,
			prettyPrint: true,
			transport: 'File', // the winston transport type.
			configOnly: false // when true, used only as config transport for other loggers.
		},
		log: ['console', 'file']
	};

	// make sure directory exists.
	if(!io.exists(options.path))
		io.mkdir(options.path);

	// merge loggers.
	transports = _.merge({}, defaultTransports, options.transports);

	_.forEach(transports, function (v,k) {

		// we only want the console logger as we're
		// not running an app but using help, create, info
		// or other methods.
		if(consoleOnly && k !== 'console') return;
		var transport;
		// do not create loggers for transport configs
		// marked as config only.
		if(v.configOnly) return;
		if(_.isString(v) && transports[v] && transports[v].transport) {
			transport = new (winston.transports[transports[v].transport])(transports[v]);
			loggers[k] = new (winston.Logger)({transports: [transport]});
		} else if(_.isArray(v)) {
			var trans = [];
			_.forEach(v, function (t) {
				if(_.isObject(t) && t.transport)
					trans.push(new (winston.transports[t.transport])(t));
				else if(_.isString(t) && transports[t] && transports[t].transport)
					trans.push(new (winston.transports[transports[t].transport])(transports[t]));
			});
			loggers[k] = new (winston.Logger)({transports: trans});
		} else if(_.isObject(v) && !_.isArray(v)) {
			transport = new (winston.transports[v.transport])(v);
			loggers[k] = new (winston.Logger)({transports: [transport]});
		} else {
			console.log('Logger ' + k + ' could not be instantiated, verify transport options.');
		}

	});

	// return both loggers and winston.
	return {
		loggers: loggers,
		winston: winston
	};
}

module.exports = Logger;