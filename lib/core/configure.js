'use strict';

var _ = require('lodash'),
	fs = require('fs'),
	_path = require('path'),
	con = require('consolidate'),
	handlers = require('./handlers'),
	extensions = require('./extensions'),
	Gulp = require('./gulp'),
	Db = require('./db'),
	_global = GLOBAL;

module.exports = Configure;

/**
 * Main configuration module for Stukko.
 * @param opts
 * @param config
 * @returns {object}
 * @constructor
 */
function Configure(opts, config) {

	var self = this,
		utils = this.utils,
		helpers = utils.helpers,
		logger = utils.logger,
		saveConfig = (opts && config),
		errorHandlers = handlers.errors.call(this);

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

			var hasDefault = true,
				defaultOptions,
				jsonConfig,
				sessionOptions,
				secret;

			// set config default.
			config = config || 'development';

			// check for specific config in flags.
			self.config = config = self.flags.config ? self.flags.config : config;
			defaultOptions = _.clone(self.options);
			jsonConfig = self.cwd + '/server/configuration/' + config + '.json';

			saveConfig = self.flags.save ? true : saveConfig;
			delete self.flags.save;

			// if a <config>.json file exists loaded/merge it.
			if(utils.io.exists(jsonConfig)){
				jsonConfig = utils.io.read(jsonConfig);
				jsonConfig = utils.helpers.tryParseJson(jsonConfig, {});
				hasDefault =! _.isEmpty(jsonConfig);
			} else {
				hasDefault = false;
			}

			// merge all the options.
			// in order of:
			//      default options,
			//      loaded stukko.json options,
			//      options passed to new instance if any.
			//      finally any matching flags from cmd line.
			_.merge(self.options, jsonConfig, opts, self.flags);

			// make sure we have session key/secret if enabled.
			if(self.options.middleware.session.enabled || self.options.middleware.session.enabled === undefined){

				sessionOptions = self.options.middleware.session.options;

				// add session key if doesn't exist.
				if(!sessionOptions.key){
					sessionOptions.key = self.pkgapp.name + '.sid';
					saveConfig = true;
				}

				// create session secret if doesn't exist.
				if(!sessionOptions.secret){
					secret = utils.helpers.chance('hash', 32);
					sessionOptions.secret = secret;
					self.options.middleware.cookieParser.options = secret;
					saveConfig = true;
				}

				// add secret for cookie parser using same hash as session.
				if(!self.options.middleware.cookieParser.options){
					self.options.middleware.cookieParser.options = sessionOptions.secret;
					saveConfig = true;
				}

			}

			// set default options for cors.
			if(self.options.middleware.cors.enabled) {
				if(!self.options.middleware.cors.options){
					self.options.middleware.cors.options = {
						origin: true,
						credentials: true,
						methods: 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
						allowedHeaders: 'Content-Type, Authorization'
					}
				}
			}

			// set default options for localization.
			if(self.options.middleware.i18n.enabled) {
				if(!self.options.middleware.i18n.options){
					self.options.middleware.i18n.options = {
						locales:['en', 'es'],
						directory: '/server/locales',
						defaultLocale: 'en'
					};
					saveConfig = true;
				}
			}

			// save options to json file.
			self.options.version = self.pkg.version;
			self.optionsOriginal = _.cloneDeep(self.options);
			utils.io.write(self.cwd + '/server/configuration/' + config + '.json', JSON.stringify(self.optionsOriginal, null, '\t'));

			// create ref to environment.
			self.env = self.options.env;

		},

		/**
		 * Normalize path with prefixed working directory.
		 */
		paths: function paths(){

			var obj = self.options,
				cwdEsc = self.cwd.replace(/\\/g, '\\');

			function recurse(obj){
				_.forEach(obj, function(v, k){
					if(_.isObject(v))
						recurse(v);
					if(_.isString(v) && v.indexOf('/') !== -1){
						// remove working dir path if already exists.
						v = v.replace(cwdEsc, '');
						obj[k] = self.cwd + v;
					}
				});
			}

			recurse(obj);

		},

		/**
		 * Configure loggers.
		 */
		loggers: function loggers() {

			var isStart = self.cmd === 'start' || !self.cli,
				_logger;

			// if debugging set log level.
			if(self.debug || self.flags.debug) self.options.logs.level = 'debug';

			_logger = logger(self.options.logs, !isStart);
			self.log = isStart ? _logger.loggers.log : _logger.loggers.console;
			self.log.console = _logger.loggers.console;
			self.log.winston = _logger.winston;

			// set file logging if we have an installed app.
			if(isStart)
				self.log.file = _logger.loggers.file;

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
				log.error(msg, stack );
				process.exit(1);
			});
		},

		/**
		 * Build and require modules.
		 */
		modules: function modules() {

			log.debug('Requiring application modules.');

			_.forEach(self.options.modules, function (v,k) {
				var module = utils.reqeach(v),
					keys = Object.keys(module),
					obj = {};

				// merge routes.
				if(k === 'routes'){
					_.forEach(keys, function(key) {
						_.extend(obj, module[key])
					});
					module = obj;
				}

				// make models global apply context is required.
				if(k === 'models'){
					_.forEach(keys, function(key) {
						var globalKey = utils.helpers.stringToCase(key, self.options.db.modelCase);
						GLOBAL[globalKey] = undefined;
						// if wrapped returning get apply context.
						// TODO: not the best way to detect this, need to revisit, may need to be db specific.
						if(_.isFunction(module[key]) && !Object.keys(module[key]).length){
							module[key] = module[key].call(self);
							GLOBAL[globalKey] = module[key];
						} else {
							GLOBAL[globalKey] = module[key];
						}
					});
				}
				self.modules[k]	= module;

			});
		},

		/**
		 * Configure Express settings.
		 */
		express: function express() {

			var supported = [
					'ejs',
					'hogan',
					'jade',
					'haml'
				],
				engine = self.options.express.engine,
				views;

			log.debug('Configure Express settings.');

			if(supported.indexOf(engine) === -1)
				throw new Error('The engine ' + engine + ' is not supported by Stukko by default.');

			// update the consolidate view engine.
			self.app.engine(self.options.express['view engine'], con[self.options.express.engine]);

			// add management views path.
			views = [self.options.express.views];
			views.push(self.cwd + '/manage/views');

			// enable multi-view capability.
			extensions.multiview(self.app);

			//configure settings.
			_.forEach(self.options.express, function (v, k) {
				if(k !== 'views')
					self.app.set(k, v);
				else
					self.app.set(k, views);
			});

		},

		/**
		 * Configure middleware
		 */
		middleware: function middleware() {

			log.debug('Configuring Express middleware.');
			var merged, defMiddleware, custMiddleware, defKeys,
				ctr,
				custKeys;

			ctr = 0;

			// extend all middleware to single object.
			merged = _.extend({}, self.options.middleware, self.modules.middleware);

			// CONFIGURE MORGAN/LOGGER
			if(merged.logger) {
				merged.logger.enabled = (merged.logger.enabled === undefined && self.env === 'development') || merged.logger.enabled ? true : false;
				// if no user defined options use winston.
				if(!merged.logger.options){
					merged.logger.options = {
						format: 'short',
						stream: {
							write: function (message, encoding) {
								message = message.toString().replace(/(\r\n|\n|\r)/gm, '');
								log.info(message);
							}
						}
					}
				}
			}

			// CONFIGURE SESSION
			if(merged.session.enabled || merged.session.enabled === undefined){

				var MemoryStore, RedisStore, MongoStore, dbName,
					mongoDefaults, redisDefaults, mysqlDefaults,
					sessionOptions, expressSession, MySQLStore;

				// check if user has specified a custom database name.
				// this will be overwritten by the session config if db name is specified there.
				dbName = self.pkgapp.name + 'db';

				if(self.options.db && self.options.db.options && self.options.db.options.database)
					dbName = self.options.db.options.database.split('.')[0];

				mongoDefaults = {
					db: dbName,
					get: 'Session',
					host: 'localhost',
					port: 27017
				};

				redisDefaults = {
					db: dbName,
					host: 'localhost',
					port: 6379
				};

				mysqlDefaults = {
					table: 'Session',
					config: {
						host: 'localhost',
						port: 3306,
						database: dbName
					}
				};

				// reference express session, store name and options.
				expressSession = require('express-session');
				sessionOptions = self.options.middleware.session.options;

				// if we don't have a key, secret or store we must save changes.
				if(!sessionOptions.key || !sessionOptions.secret || !sessionOptions.store)
					saveConfig = true;

				// if string config store otherwise assume
				// user configuration.
				// NOTE: chose to use configured connection instead of possible existing database connection.
				if(sessionOptions.name){
					if(sessionOptions.name === 'memory'){
						MemoryStore = expressSession.MemoryStore;
						self.sessionStore = new MemoryStore(sessionOptions.storeOptions);
					} else if(sessionOptions.name === 'redis'){
						RedisStore = require('connect-redis')(expressSession);
						self.sessionStore = new RedisStore(_.merge(redisDefaults, sessionOptions.storeOptions));
					} else if (/mongo/gi.test(sessionOptions.name)){
						MongoStore = require('connect-mongo')(expressSession);
						self.sessionStore = new MongoStore(_.merge(mongoDefaults, sessionOptions.storeOptions));
					} else if(sessionOptions.name === 'mysql')  {
						if(!sessionOptions.storeOptions || !sessionOptions.storeOptions.config)
							throw new Error('Connect-mysql requires storeOptions object.');
						var storeConf = sessionOptions.storeOptions.config;
						storeConf.user = storeConf.username || storeConf.user;
						storeConf.database = storeConf.db || storeConf.database;
						if(!storeConf.user || !storeConf.password)
							throw new Error('User and password are required to use connect-mysql.');
						MySQLStore = require('connect-mysql')(expressSession);
						self.sessionStore = new MySQLStore(_.merge(mysqlDefaults, sessionOptions.storeOptions))
					} else {
						throw new Error('Sessions could not be configured using store ' + sessionOptions.name);
					}
				}

			}

			// CONFIGURE CORS
			if(merged.cors.enabled){

			}

			// CONFIGURE i18n
			if(merged.i18n.enabled){
				var i18n = require('i18n');
				i18n.configure(merged.i18n.options);
				merged.i18n.use = i18n.init;
			}

			// normalize middleware
			_.forEach(merged, function (v,k) {
				if(_.isFunction(v))
					merged[k] = { use: v };
			});

			_.forEach(self.options.middleware, function(v,k){
				if(!v.order) {
					v.order = ctr;
					ctr +=1;
				}
			});

			// get the order of our middleware keys.
			defMiddleware = self.options.middleware;
			custMiddleware = self.modules.middleware;
			defKeys = Object.keys(defMiddleware)
				.sort(function(a, b) {
					a = defMiddleware[a];
					b = defMiddleware[b];
					return (a.order - b.order);
				});
			custKeys = Object.keys(custMiddleware)
				.sort(function(a, b) {
					a = custMiddleware[a];
					b = custMiddleware[b];
					return ((a.order || 9999) - (b.order || 9999));
				});


			// concat all the sorted keys.
			defKeys = defKeys.concat(custKeys);

			// finally add middleware to stack by order.
			_.forEach(defKeys, function (k) {

				var m = merged[k];

				// don't throw error if empty just return;
				if(_.isEmpty(m)) return;

				// normalize enabled.
				m.enabled = m.enabled !== false;

				if(_.isString(m.use)){
					if(!utils.helpers.canRequire(m.use)){
						m.use = require(utils.io.resolve('./node_modules/' + m.use));
					} else {
						m.use = require(m.use);
					}
				}

				if(m.enabled && (!m.use || !_.isFunction(m.use)))
					throw new Error('Middleware ' + k + ' could not be loaded.');

				// if options & is string convert to array.
				m.options = m.options || [];
				if(_.isString(m.options))
					m.options = [m.options];

				// done called add middleware.
				function done(opts) {
					var signature = utils.helpers.getSignature(m.use);
					m.options = opts || m.options || [];
					// if the use signature contains req, res etc.
					// we need to wrap it to maintain context.
					if(signature.indexOf('req') !== -1){
						self.app.use(utils.helpers.wrapMiddleware(m.use), self);
					} else {
						// only apply/call if an object or an array.
						if(!_.isArray(m.options) && _.isObject(m.options))
							self.app.use(m.use.call(self, m.options));
						if(_.isArray(m.options))
							self.app.use(m.use.apply(self, m.options));
					}
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


		},

		management: function management() {

			var router = self.express.Router(),
				morganConf = 	{
					format: 'short',
					stream: {
						write: function (message, encoding) {
							message = message.toString().replace(/(\r\n|\n|\r)/gm, '');
							log.info(message);
						}
					}
				},
				inject = require('./middleware').inject.call(self);

			function isDevelopment(req, res, next) {
				var err = undefined;
				if(self.env !== 'development')
					err = new BadRequestError('The requested resource ' + req.url + ' can ONLY be accessed in development mode.');
				next(err);
			}

			/* middleware
			****************************************/
			router.use(require('morgan')(morganConf));
			router.use(require('body-parser')());
			router.use(isDevelopment);
			router.use(inject);
			router.use(self.express.static(self.cwd + '/manage/public'));
			router.use(self.express.static(self.cwd + '/manage/public/partials'));

			/* routes
			****************************************/
			router.get('/', function (req, res, next) {
				res.redirect('/manage/dashboard');
			});
			router.get('/dashboard', function (req, res, next) {
				var model = {
					config: JSON.stringify(self.optionsOriginal),
					pkg: JSON.stringify(self.pkgapp),
					diag: JSON.stringify(self.diag.get()),
					os: require('os')
				};
				res.render('manage',model);
			});
			router.post('/config/update', function (req, res, next) {
				var data = req.body || undefined,
					confName = data.name || self.config,
					confPath = self.cwd + '/server/configuration/' + confName + '.json';
				if(!data || !data.config)
					return res.badRequest();
				utils.io.write(confPath, JSON.stringify(data.config, null, '\t'));
				utils.io.write(self.cwd + '/server/configuration/' + 'nodemon.restart', 'DO NOT REMOVE!\n\n- triggers nodemon restart on configuration change rather than watching/ignoring .json files.');
				res.json({message: 'Configuration [' + confName + '] was successfully updated.'});
			});

			router.use(function notFoundHandler(req, res, next) {
				if(!self.gulped) return next();
				var err = new NotFoundError('The requested resource ' + req.url + ' could not be found.');
				next(err);
			});
			router.use(function errorHandler(err, req, res, next) {
				errorHandlers.handle.apply(self, arguments);
			});

			// set router to handle management.
			self.app.use('/manage', router);
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

			function getKeys(path) {
				var keys = [],
					tmp;
				tmp = path.slice(1,path.length).split('/');
				tmp.forEach(function (k) {
					if(k && k.length && /^:.+\??$/gi.test(k))
						keys.push(k);
				});
				return keys;
			}

			function lookupAction(arg) {
				var found = undefined,
					validKeys = ['controllers', 'security'];
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

			return { method: method, path: path, keys: getKeys(path), args: ctxArgs };

		},

		/**
		 * Adds routes to the application
		 */
		routes: function routes(){

			var sortedRoutes = [];

			log.debug('Normalize routes and add to Express.');
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
					sortedRoutes.push(route);
			});

			sortedRoutes.sort(function (a,b) {
				return a.keys.length - b.keys.length;
			});

			sortedRoutes.forEach(function (r) {
				app[r.method](r.path, r.args);
			});


			// if enabled catch status errors.
			if(self.options.statusErrors){

				// add route to handle 404's
				app.use(function notFoundHandler(req, res, next) {
					if(!self.gulped) return next();
					var err = new NotFoundError('The requested resource ' + req.url + ' could not be found.');
					next(err);
				});

				// unhandled errors.
				app.use(function errorHandler(err, req, res, next) {
					errorHandlers.handle.apply(self, arguments);
				});

			}

		},

		/**
		 * Configures assets using Gulp.
		 */
		assets: function assets() {
			var gulp = Gulp.call(self);
			if(!self.options.assets) return;
			gulp.execute();
		},

		/**
		 * Configures the database client and connection.
		 * @params {function} cb - callback after database has been initialized.
		 */
		database: function database(cb) {
			var db = Db.call(self);
			db.connect(function (db) {
				self.db = db;
				GLOBAL.DB = self.db;
				if(cb) cb();
			});
		}


	}


}