'use strict';

var _ = require('lodash'),
	fs = require('fs'),
	con = require('consolidate');

module.exports = Configure;

/**
 * Main configuration module for Stukko.
 * @param opts
 * @param config
 * @returns {{packages: packages, options: options, paths: paths, loggers: loggers, uncaughtException: uncaughtException, modules: modules, express: express, normalizeRoute: normalizeRoute, routes: routes, middleware: middleware}}
 * @constructor
 */
function Configure(opts, config) {

	var self = this,
		utils = this.utils,
		helpers = utils.helpers,
		logger = utils.logger,
		saveConfig = (opts && config);

	if(_.isString(opts)){
		config = opts;
		opts = {};
	}

	return {

		/**
		 * Load app package and Stukko packages.
		 * @param path
		 * @returns {object|undefined}
		 */
		packages: function packages(path) {

			var pkg;

			// if path specified load it otherwise get app/stukko packages & save to instance.
			if(path) {
				if(utils.io.exists(path))	{
					pkg = utils.helpers.tryParseJson(utils.io.read(path));
					return pkg || undefined;
				}
			} else {
				if(utils.io.exists(self.rootdir + '/package.json'))	{
					pkg = utils.helpers.tryParseJson(utils.io.read(self.rootdir + '/package.json'));
					if(pkg) self.pkg = pkg;
				}
				if(utils.io.exists(self.cwd + '/package.json'))	{
					pkg = utils.helpers.tryParseJson(utils.io.read(self.cwd + '/package.json'));
					if(pkg) self.pkgapp = pkg;
				}
			}

		},

		/**
		 * Merge all options.
		 */
		options: function options() {

			config = config || 'default';

			var loadedConfigs = self.cwd + '/stukko.json',
				emptyConfig = false,
				defaultOptions = _.clone(self.options),
				hasDefault = true,
				configOptions;

			// extend ignore for ignoring static paths in middleware.
			self.options.ignore = [
				'^\/.+$'
			];

			// if a stukko.json file exists loaded/merge it.
			if(utils.io.exists(loadedConfigs)){
				loadedConfigs = utils.io.read(loadedConfigs);
				loadedConfigs = utils.helpers.tryParseJson(loadedConfigs, {});
				emptyConfig = _.isEmpty(loadedConfigs);
				if(!loadedConfigs['default']) hasDefault = false;
			} else {
				hasDefault = false;
			}

			// check for specific environment.
			if(config || self.flags.config){
				config = self.flags.config ? self.flags.config : config;
				if(loadedConfigs[config])
					configOptions = loadedConfigs[config];
			}

			// merge all the options.
			// in order of:
			//      default options,
			//      loaded stukko.json options,
			//      options passed to new instance if any.
			//      finally any matching flags from cmd line.
			_.merge(self.options, configOptions, opts, self.flags);

			// save options to json file.
			if(emptyConfig || self.flags.save === true || !hasDefault || saveConfig){
				delete self.options.save;
				loadedConfigs[config] = self.options;
				utils.io.write(self.cwd + '/stukko.json', JSON.stringify(loadedConfigs, null, 4));
			} else {
				loadedConfigs[config] = _.merge(configOptions, defaultOptions);
				utils.io.write(self.cwd + '/stukko.json', JSON.stringify(loadedConfigs, null, 4));
			}

			// create a regexp to test for static routes and ignoring in middleware.
			self.static = utils.helpers.joinRegex(self.options.ignore, 'i');

		},

		/**
		 * Normalize path with prefixed working directory.
		 */
		paths: function paths(){

			var obj = self.options;

			function recurse(obj){
				_.forEach(obj, function(v, k){
					if(_.isObject(v))
						recurse(v);
					if(_.isString(v) && v.indexOf('/') !== -1)
						obj[k] = helpers.join(v, self.cwd, true);
				});
			}

			recurse(obj);

		},

		/**
		 * Configure loggers.
		 */
		loggers: function loggers() {

			var isStart = self.cmd === 'start',
				_logger;

			// if debugging set log level.
			if(self.debug) self.options.logs.level = 'debug';

			_logger = logger(self.options.logs, !isStart);
			self.log = isStart ? _logger.loggers.log : _logger.loggers.console;
			self.log.console = _logger.loggers.console;
			self.log.winston = _logger.winston;

			// set global reference for debugging.
			if(isStart){
				self.log.file = _logger.loggers.file;
				GLOBAL.debug = function (){
					self.log.debug.apply(null, arguments);
				};
			}

			// set global reference for log.
			GLOBAL.log = self.log;

		},

		/**
		 * Handle uncaught exceptions.
		 */
		uncaughtException: function uncaughtException() {
			process.on('uncaughtException', function (err) {
				var msg = 'Unknown Exception',
					stack = '';
				err = log.winston.exception.getAllInfo(err);
				msg = err.stack[0] || 'Unknown Exception';
				if(err.stack[1])
					stack = '\n' + err.stack.splice(1,err.stack.length).join('\n');
				log.console.error(msg, stack );
				process.exit(1);
			});
		},

		/**
		 * Build and require modules.
		 */
		modules: function modules() {
			debug('Requiring application modules.');
			_.forEach(self.options.modules, function (v,k) {
				var module = utils.reqeach(v),
					keys = Object.keys(module),
					obj = {};
				if(k === 'routes'){
					_.forEach(keys, function(key) {
						_.extend(obj, module[key])
					});
					module = obj;
				}
				self.modules[k]	= module;
			});

			// add reference to helpers.
			if(self.modules && self.modules.helpers)
				self.helpers = self.modules.helpers;
		},

		/**
		 * Configure Express settings.
		 */
		express: function express() {
			debug('Configure Express settings.');
			// update the consolidate view engine.
			self.app.engine(self.options.express['view engine'], con[self.options.express.engine]);

			//configure settings.
			_.forEach(self.options.express, function (v, k) {
				self.app.set(k, v);
			});

		},

		session: function session() {
			var store;
			if(!self.options.session) return;
			if(self.options.session.store === 'memory'){

			} else if (self.options.session.store === 'mongo'){

			} else if (self.options.session.store === 'redis'){

			} else {
				throw new Error('The requested session store ' + self.options.session.store + ' could not be configured.');
			}
		},

		/**
		 * Normalize routes convert args to array for apply.
		 * @param {string} path
		 * @param {array|object|string} args
		 * @returns {object}
		 */
		normalizeRoute: function normalizeRoute(path, args) {

			var validMethods = ['get', 'put', 'post', 'del', 'all', 'render', 'options', 'param', 'redirect'],
				origPath = path,
				ctxArgs = [],
				isRedirect,
				isRender,
				origKey,
				method;

			if(!path || !args) return undefined;

			path = path.toLowerCase().split(' ');
			method = origKey = path[1] ? path[0] : 'get';
			path = path[1] ? path[1] : path[0];
			isRedirect = method === 'redirect';
			isRender = (method === 'render') || (method === 'view');

			// check for 'view' and 'redirect' method types.
			method = isRedirect ? 'get' : method;
			method = isRender ? 'render' : method;

			if(validMethods.indexOf(method) === -1) {
				log('Route could not be added using ' + origPath);
				return;
			}

			function lookupAction(arg) {
				var found = undefined,
					validKeys = ['controllers', 'middleware', 'security'];
				_.forEach(validKeys, function(k) {
					if(found) return;
					found = utils.helpers.findByNotation(self.modules[k], arg);
				});
				return found;
			}

			function applyContext(arg) {

				if(!isRedirect && !isRender){
					if(_.isString(arg))
						arg = lookupAction(arg);
					if(_.isFunction(arg))
						return _.bind(arg, self);
				} else {
					if(isRender && _.isString(arg)){
						if(method === 'render' && arg.charAt(0) === '/')
							arg = arg.slice(1);
						return arg;
					}
					if(isRedirect && _.isString(arg)) {
						if(arg.charAt(0) === '/'){
							var redir = arg;
							arg = function redirect(req, res, next) {
								res.redirect(redir);
							};
							return _.bind(arg, self);
						} else {
							arg = lookupAction(arg);
							if(_.isFunction(arg))
								return _.bind(arg, self);
						}
					}
				}
				return undefined;
			}

			if(!_.isArray(args))
				args = [args];

			_.forEach(args, function(a) {
				var result = applyContext(a);
				if(result)
					ctxArgs.push(result);
			});

			return { method: method, path: path, args: ctxArgs };

		},

		/**
		 * Adds routes to the application
		 */
		routes: function routes(){
			debug('Normalize routes and add to Express.');
			var app = self.app,
				routes = self.modules.routes,
				layout = self.options.express.layout;

			// make sure we have a default route.
			if(_.isEmpty(routes) || !routes['/']){
				routes['/'] = function (req, res, next){
					res.render(layout);
				}
			}

			// iterate routes, normalize and add to application.
			_.forEach(routes, function (args, path) {
				var	route = self.configure.normalizeRoute(path, args);
				if(route && route.args)
					app[route.method](route.path, route.args);
			});


		},

		/**
		 * Configure middleware
		 */
		middleware: function middleware() {

			debug('Configuring Express middleware.');
			var merged, after, idx, before, custom,
				customKeys;

			if(_.isEmpty(self.modules.middlware) && !self.options.middleware['placeholder'])
				throw new Error('Middlware options must contain a placeholder when injecting custom middlware.');

			// extend all middleware to single object.
			merged = _.extend({}, self.options.middleware, self.modules.middleware);

			// normalize middleware
			_.forEach(merged, function (v,k) {
				if(_.isFunction(v))
					merged[k] = { use: v };
			});

			delete merged.placeholder;

			// check session configuration.
//			if(self.options.middleware.session && self.options.middleware.session.enabled){
//				var MemoryStore, RedisStore, MongoStore, sessionStore;
//				// if no store is implemented create memory store.
//				if(!self.options.middleware.session.store){
//					MemoryStore = require('express-session').MemoryStore;
//					self.sessionStore = sessionStore = new MemoryStore();
//				} else {
//
//				}
//			}

			after = Object.keys(self.options.middleware);
			idx = after.indexOf('placeholder');
			before = after.splice(0, idx);
			custom = self.modules.middleware;
			customKeys = Object.keys(custom)
						.sort(function(a, b) {
							a = custom[a];
							b = custom[b];
							return ((a.order || 9999) - (b.order || 9999));
						});

			// remove the placeholder key.
			after.splice(0,1);

			// concat the array of ordered keys.
			before = before.concat(customKeys).concat(after);

			// finally add middleware to stack by order.
			_.forEach(before, function (k) {

				var m = merged[k];

				// don't throw error if empty just return;
				if(_.isEmpty(m)) return;

				if(m.require && _.isString(m.use)){
					if(!utils.helpers.canRequire(m.use)){
						m.use = require(utils.io.resolve('./node_modules/' + m.use));
					} else {
						m.use = require(m.use);
					}
				}

				if(!m.use || !_.isFunction(m.use))
					throw new Error('Middleware ' + k + ' could not be loaded.');

				// if options & is string convert to array.
				m.options = m.options || [];
				if(_.isString(m.options))
					m.options = [m.options];

				// set enabled default to true.
				m.enabled = !!(m.enabled === undefined || m.enabled === true);

				// done called add middleware.
				function done(opts) {
					m.options = opts || m.options;
					// only apply/call if an object or an array.
					if(!_.isArray(m.options) && _.isObject(m.options))
						self.app.use(m.use.call(self, m.options));
					if(_.isArray(m.options))
						self.app.use(m.use.apply(self, m.options));
				}

				// add middleware only if enabled.
				if(m.enabled){
					// if options is function call and pass done callback.
					if (_.isFunction(m.options)) {
						m.options.call(self, m, done);
					} else {
						done();
					}
				}

			});

		}


	}


}