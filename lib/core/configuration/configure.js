'use strict';
var fs = require('fs'),
	p = require('path'),
    conf = require('./'),
	con = require('consolidate'),
	handlers = require('../handlers'),
    colors = require('colors'),
    Chance = require('chance'),
    chance = new Chance();

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
        Progress = utils.progress,
		errorHandlers = handlers.errors.call(this),
        defaultsAll = conf.defaultsAll.call(self),
		ver, verCompare;

    /**
     * Simple method to start chain of event listeners.
     * @private
     */
    function init() {
        packages();
    }

	/**
	 * Load app package and Stukko packages.
	 * @private
	 */
	function packages() {

		var pkg;

		if(utils.io.exists(p.join(self.rootdir + '/package.json')))	{
			pkg = helpers.tryParseJson(utils.io.read(self.rootdir + '/package.json'));
			if(pkg) self.pkg = pkg;
		}
		if(utils.io.exists(p.join(self.cwd, '/package.json')))	{
			pkg = helpers.tryParseJson(utils.io.read(self.cwd + '/package.json'));
			if(pkg){
                self.pkgapp = pkg;
                if(self.start){
                    console.log('\nPlease wait...' + self.pkgapp.name + ' is booting.');
                }
            }
		}

		self.emit('packages:ready');

	}

	/**
	 * Merge all options.
	 * @private
	 */
	function options() {

		var jsonConfig,
			sessionOptions,
            saveConfig,
			secret;

		// check for specific config in flags.
		config = config || self.flags.config || 'development';
		jsonConfig = p.join(self.cwd, '/server/configuration/', config + '.json');
		saveConfig = self.flags.save ? true : false;
        self.config = config;

        // flags get merged so remove save if present.
		delete self.flags.save;

		// if a <config>.json file exists loaded/merge it.
		if(utils.io.exists(jsonConfig)){
			jsonConfig = utils.io.read(jsonConfig);
			jsonConfig = helpers.tryParseJson(jsonConfig, {});
			if(_.isEmpty(jsonConfig))
				jsonConfig = self.defaults;
		} else {
			jsonConfig = self.defaults;
		}
		// merge options.
        self.options = _.merge(jsonConfig, opts, saveConfig ? self.flags : {});

        // specify the environment now that all options are merged.
        process.env.NODE_ENV = self.env = self.options.env;

		// make sure we have session key/secret if enabled.
		if(self.start) {

			if(self.options.middleware.session.enabled || self.options.middleware.session.enabled === undefined){

				sessionOptions = self.options.middleware.session.options;

				// add session key if doesn't exist.
				if(!sessionOptions.key){
					sessionOptions.key = self.pkgapp.name + '.sid';
				}

				// create session secret if doesn't exist.
				if(!sessionOptions.secret){
					secret = chance.hash({length: 32});
					sessionOptions.secret = secret;
					self.options.middleware.cookieParser.options = secret;
				}

				// add secret for cookie parser using same hash as session.
				if(!self.options.middleware.cookieParser.options){
					self.options.middleware.cookieParser.options = sessionOptions.secret;
				}

			}
			// set default options for cors.
			if(self.options.middleware.cors.enabled) {
				if(!self.options.middleware.cors.options){
					self.options.middleware.cors.options = {
						origin: true,
						credentials: true,
						methods: 'GET, POST, PUT, DELETE, OPTIONS', 
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
				}
			}

			// create backup path location if not disabled.
			if(self.options.backup !== false && (self.options.backup === undefined || self.options.backup === null || self.options.backup === ''))
				self.options.backup = '../' + self.pkgapp.name + '-backup';

			// save options to json file.
			self.options.version = self.pkg.version;
			self.optionsOriginal = _.cloneDeep(self.options);

            // merge missing defaults and any flags.
            self.flags = helpers.stringToType(self.flags);
            self.options = _.merge(defaultsAll, self.options, self.flags);

            // temp fix.
            self.optionsOriginal.version = self.pkg.version;

            // save the defined config flags/session settings may have changed.
			utils.io.write(p.join(self.cwd, '/server/configuration/', config + '.json'), JSON.stringify(self.optionsOriginal, null, '\t'));

            // save the running config.
            utils.io.write(p.join(self.cwd, '/server/configuration/active.json'), JSON.stringify(self.options, null, '\t'));

			GLOBAL.$SETTINGS = {
				pkg: self.pkgapp,
				config: self.options
			};

		} else {
            self.options = _.merge(defaultsAll, self.options);
        }

		self.emit('options:ready');
	}

	/**
	 * Normalize path with prefixed working directory.
	 * @private
	 */
	function paths(){

		var obj = self.options,
			cwdEsc = self.cwd.replace(/\\/g, '\\'),
			replacers = {
				'rootdir': self.rootdir,
				'cwd': self.cwd,
				'internal': self.rootdir + '/lib/core'
			},
			replacerKeys = Object.keys(replacers),
			regexp;

		replacerKeys = replacerKeys.join('|');

		function recurse(obj){
			_.forEach(obj, function(v, k){
				var match;
				if(_.isObject(v))
					recurse(v);
				if(_.isString(v)){
					// remove double \\ slashes if exist.
					v = v.replace(cwdEsc, '');
					regexp = new RegExp('^{{(' + replacerKeys + ')}}', 'gi');
					match = v.match(regexp);
					if(/^\//.test(v)) {
						obj[k] = self.cwd + v;
					}
					if (match){
						_.forEach(match, function(m) {
							var stripped = m.replace('{{', '').replace('}}', '');
							v = v.replace(m, replacers[stripped]);
						});
						obj[k] = v;
					}
				}
			});
		}
		recurse(obj);

		self.emit('paths:ready');
	}

	/**
	 * Configure loggers.
	 * @private
	 */
	function loggers() {

		var _logger;

		// if debugging set log level.
		if(self.debug || self.flags.debug)
			self.options.logs.level = 'debug';

		_logger = logger(self.options.logs, !self.start);
		self.log = self.start ? _logger.loggers.log : _logger.loggers.console;
		self.log.console = _logger.loggers.console;
		self.log.winston = _logger.winston;

		// set file logging if we have an installed app.
		if(self.start)
			self.log.file = _logger.loggers.file;

		// set global reference for log.
		GLOBAL.$LOG = self.log;
		GLOBAL.$DEBUG = self.log.debug;
		// loggers are loaded and configured indicate running config.

		// now that we have our logging setup
		// set to handle uncaughtExceptions.
		// TODO: pass all errors through a normalizer.
		process.on('uncaughtException', function (err) {
			$LOG.error(err.stack || err.message || 'An unknown exception occurred.');
			process.exit(1);
		});
		self.emit('loggers:ready');
	}

    /**
     * Configures the database client and connection.
     * @private
     * @params {function} cb - callback after database has been initialized.
     */
    function database() {
        var db;
        if(self.cmd === 'generate')
            return self.emit('database:ready');
        db = conf.db.call(self);
        $DEBUG('Defining global for database connection.');
        db.connect();
    }

    /**
     * Load user command line methods.
     * @private
     */
    function cli() {

        var userCmds = utils.reqeach(self.options.cli),
            proto = self.userCommands;

        // iterate each file.
        _.forEach(userCmds, function(v,k) {
            // check if function.
            if(_.isFunction(v)){
                v.call(self, proto);
            }
            //check if object return functions.
            if(_.isObject(v)){
                // iterate each func.
                _.forEach(v, function(func,cmd) {
                    if(_.isFunction(func)){
                        proto[cmd] = _.bind(func,self);
                    }
                });
            }
        });
        if(!self.start)
            return self.emit('command');
        self.emit('cli:ready')
    }

	/**
	 * Build and require modules.
	 * @private
	 */
	function modules() {

		$DEBUG('Requiring application modules.');

        // hack for Sequelize to temporarily disable
        // constraint checks.
        function constraintFix(force, cb) {
            var db = self.db.connection;
            db.query('SET FOREIGN_KEY_CHECKS = 0')
                .then(function(){                   
                    return db.sync({ force: force });
                })
                .then(function(){
                    return db.query('SET FOREIGN_KEY_CHECKS = 1')
                })
                .then(function(){
                    if (cb) cb();
                }, function(err){
                    throw err;
                });
        }

        function globalizeModel(name, model){
            if(!name || !model) return;
            GLOBAL[name] = model;
        }

        function seed() {
            // check for seeds when in development environment.
            if(self.options.env === 'development' && self.modules.seeds && Object.keys(self.modules.seeds).length && self.options.db.seed) {

                // iterate each seed and update table.
                _.forEach(self.modules.seeds, function(v,k) {

                    if(_.isFunction(v)){
                        if(self.options.db.module === 'sequelize'&& self.db.models && Object.keys(self.db.models).length)
                            v.call(self, self.db.connection, self.db.client, chance);

                        if(self.options.db.module === 'mongoose' && self.db.models && Object.keys(self.db.models).length)
                            v.call(self, self.db.Schema, self.db.model, chance);

                        if(self.options.db.module === 'mongodb'){
                            db.collectionNames(function(err, collection) {
                                if(err)
                                    $LOG.warn(err.message, err.stack);
                                if(collection.length)
                                    v.call(self, self.db.connection, chance);
                            });
                        }

                        if(self.options.db.module === 'dirty')
                            v.call(self, self.db.connection, chance);

                        if(self.options.db.module === 'redis')
                            v.call(self, self.db.connection, chance);
                    }
                });

            }
        }

		_.forEach(self.options.modules, function (v,k) {

			var module = utils.reqeach(v),
				keys = Object.keys(module),
                dbConf = self.options.db || {},
				obj = {};

			// merge routes.
			if(k === 'routes'){
				_.forEach(keys, function(key) {
					_.extend(obj, module[key])
				});
				module = obj;
			}

			// make models global.
			if(k === 'models' && dbConf.load){

                if(dbConf.module === 'sequelize'){

                    var models;

                    // although Sequelize will add new tables,
                    // you'll need to enable "drop" in your db
                    // configuration to reflect changes in
                    // altered tables. Constraint fix disables
                    // constraint checks temporarily then re-enables
                    // to avoid warnings.
                    constraintFix(dbConf.drop, function () {

                        // iterate apply context inject dependencies;
                        _.forEach(keys, function(key) {
                            if(_.isFunction(module[key])){
                                module[key].call(self, self.db.connection, self.db.client);
                            }
                        });

                        models = self.db.connection.models || {};

                        Object.keys(models).forEach(function(modelName) {
                            if ('associate' in models[modelName]) {
                                try{
                                    models[modelName].associate(models);
                                } catch(err) {
                                   $LOG.warn(err.message, '\n' + err.stack);
                                }
                            }
                            globalizeModel(modelName, models[modelName]);
                        });

                        // we need to sync everything to the database.
                        self.db.connection.sync({force: dbConf.drop}).then(function() {
                            // check for seeds.
                            seed();
                        });
                   });

                } else {

                    // iterate and add to models object;
                    _.forEach(keys, function(key) {

                        var globalKey = helpers.stringToCase(key, dbConf.modelCase),
                            tmpModel, modelName;

                        // set default modelName by key.
                        modelName = globalKey;

                        if(self.options.db.module === 'mongoose'){
                            tmpModel = module[key].call(self, self.db.Schema, self.db.model);
                            if(tmpModel)
                                modelName = tmpModel.modelName || modelName;
                        }

                        if(self.options.db.module === 'mongodb'){
                            tmpModel = module[key].call(self, self.db.connection);
                            if(tmpModel)
                                modelName = tmpModel.collectionName || modelName;
                        }

                        if(self.options.db.module === 'dirty'){
                            tmpModel = module[key].call(self, self.db.connection);
                            if(tmpModel)
                                modelName = tmpModel._name || modelName;
                        }

                        if(self.options.db.module === 'redis'){
                            tmpModel = module[key].call(self, self.db.connection);
                            if(tmpModel)
                                modelName = tmpModel._name || modelName;
                        }

                        // add the module by name to Global and context modules.
                        if(tmpModel)
                            globalizeModel(modelName, tmpModel);

                    });

                   // check for seeds.
                   seed();

                }

			}

            // set the module.
			self.modules[k]	= module;

            // add global ref to Services.
            if(k === 'services')
                GLOBAL.$SERVICES = self.modules.services || {};

		});

		self.emit('modules:ready');
	}

	/**
	 * Configure Express settings.
	 * @private
	 */
	function express() {		
	
		var supported = [
				'ejs',
				'hogan',
				'jade',
				'haml'
			],
			engine = self.options.express.engine,
			views;

		$DEBUG('Configure Express settings.');
		if(supported.indexOf(engine) === -1)
			throw new Error('The engine ' + engine + ' is not supported by Stukko by default.');
		// update the consolidate view engine.
		self.app.engine(self.options.express['view engine'], con[self.options.express.engine]);
		// add management views path.
		views = [self.options.express.views];
		views.push(self.cwd + '/manage/views');
		// enable multi-view capability.
		conf.multiview(self.app);
		//configure settings.
		_.forEach(self.options.express, function (v, k) {
			if(k !== 'views')
				self.app.set(k, v);
			else
				self.app.set(k, views);
		});

		self.emit('express:ready');
	}

	/**
	 * Configure middleware
	 * @private
	 */
	function middleware() {

		$DEBUG('Applying Express middleware.');
		var merged, defMiddleware, custMiddleware, defKeys,
			ctr,
			custKeys;
		ctr = 0;
		// extend all middleware to single object.
		merged = _.extend({}, self.options.middleware, self.modules.middleware);
		// CONFIGURE MORGAN/LOGGER
        merged.morgan = merged.morgan || merged.logger;
        merged.morgan.options = merged.morgan.options || {};
		if(merged.morgan) {
			merged.morgan.enabled = (merged.morgan.enabled === undefined && self.env === 'development') || merged.morgan.enabled ? true : false;
			// if no user defined options use winston.
			if(!merged.morgan.options || _.isEmpty(merged.morgan.options)){
                var fmt;
                merged.morgan.options = {
                    stream: {
                        write: function (message, encoding) {
                            message = message.toString().replace(/(\r\n|\n|\r)/gm, '');
                            $LOG.info(message);
                        }
                    }
                };
                fmt = merged.morgan.options.format || 'short';
                merged.morgan.options = [ fmt, merged.morgan.options ];
			}
		}

		function moduleNotFound(module) {
			throw new Error('The requested module ' + module + ' could not be found. Verify the module is loaded in your project.');
		}

		// CONFIGURE SESSION
		if(merged.session.enabled || merged.session.enabled === undefined){
			var MemoryStore, RedisStore, MongoStore, SequelizeStore, dbName,
				mongoDefaults, redisDefaults, dbConn,
				sessionOptions, expressSession, sequelizeDefaults;
			// check if user has specified a custom database name.
			// this will be overwritten by the session config if db name is specified there.
			dbName = self.pkgapp.name + 'db';
			if(self.options.db) {
				// use the database name from our config options.
				if(self.options.db.options && self.options.db.options.database)
					dbName = self.options.db.options.database.split('.')[0];
				// use the existing connection for connect-session.
				if(self.db && self.db.connection)
					dbConn = self.db.connection;
			}
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
			sequelizeDefaults = {
				database: dbName,
				username: undefined,
				password: undefined,
				dialect: 'mysql',
				host: 'localhost',
				port: 3306
			};
			// reference express session, store name and options.
			expressSession = require('express-session');
			sessionOptions = self.options.middleware.session.options;
			// if we don't have a key, secret or store we must save changes.
			if(!sessionOptions.key || !sessionOptions.secret || !sessionOptions.store)
				saveConfig = true;
			// if string config store otherwise assume
			// user configuration.
			// NOTE: only connect-mongo and connect-session-sequelize support
			// using existing database connection if present.
			// TODO: consider moving session creation to its own module.
			if(sessionOptions.module){
				if(sessionOptions.module === 'memory'){
					MemoryStore = expressSession.MemoryStore;
					self.sessionStore = new MemoryStore(sessionOptions.storeOptions);
				} else if(sessionOptions.module === 'redis'){
					RedisStore = helpers.resolveModule('connect-redis');
					if(!RedisStore) moduleNotFound('connect-redis');
					RedisStore = RedisStore(expressSession);
					self.sessionStore = new RedisStore(_.merge(redisDefaults, sessionOptions.storeOptions));
				} else if (/mongo/gi.test(sessionOptions.module)){
					var dbOptions = {};
					//MongoStore = require('connect-mongo')(expressSession);
					MongoStore = helpers.resolveModule('connect-mongo');
					if(!MongoStore) moduleNotFound('connect-mongo');
					MongoStore = MongoStore(expressSession);
					if(/mongo/gi.test(self.options.db.module))
						dbOptions = self.options.db.options;
					sessionOptions.storeOptions =_.merge(mongoDefaults, sessionOptions.storeOptions, dbOptions);
					self.sessionStore = new MongoStore(sessionOptions.storeOptions);
				}  else if(/sequelize/gi.test(sessionOptions.module)){
					var tmpOptions, storeConf, Sequelize;
					storeConf = sessionOptions.storeOptions || sequelizeDefaults;
					if(!dbConn) {
						if(!storeConf.user && !storeConf.username)
							throw new Error('Sequelize session requres a username to be specified.');
						// some connect-session modules use "user" and "db" save someone some pain here!
						storeConf.userername = storeConf.user || storeConf.username;
						storeConf.password = storeConf.password || null;
						storeConf.database = storeConf.db || storeConf.database;
						storeConf.tableName = storeConf.table || storeConf.tableName;
						Sequelize = helpers.resolveModule('sequelize');
						dbConn = new Sequelize(storeConf.database, storeConf.username, storeConf.password, storeConf);
					}
					SequelizeStore = helpers.resolveModule('connect-sequelize');
					if(!SequelizeStore) moduleNotFound('connect-sequelize');
					SequelizeStore = SequelizeStore(expressSession);
					self.sessionStore = new SequelizeStore(dbConn, storeConf);
				} else {
					throw new Error('Sessions could not be configured using store ' + sessionOptions.module);
				}
				if(self.sessionStore)
					sessionOptions.store = self.sessionStore;
			}
		}

		// CONFIGURE i18n
		if(merged.i18n.enabled){
			var i18n = require('i18n');
			i18n.configure(merged.i18n.options);
			merged.i18n.use = i18n.build;
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
				var origUse = m.use;
				m.use = helpers.resolveModule(m.use);
				// if still undefined try to lookup via
				// dot notation.
				m.use = m.use || helpers.findByNotation(self, origUse);
			}
			if(m.enabled && (!m.use || !_.isFunction(m.use)))
				throw new Error('Middleware ' + k + ' could not be loaded.');
			// if options & is string convert to array.
			m.options = m.options || [];
			if(_.isString(m.options))
				m.options = [m.options];
			// done called add middleware.
			function done(opts) {
				var signature = helpers.getSignature(m.use);
				m.options = opts || m.options || [];
				// if the use signature contains req, res etc.
				// we need to wrap it to maintain context.
				if(signature.indexOf('req') !== -1){
					self.app.use(helpers.wrapMiddleware(m.use), self);
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
        self.emit('middleware:ready');
	}

	/**
	 * Normalize routes convert args to array for apply.
	 * @private
	 * @param {string} path
	 * @param {array|object|string} args
	 * @returns {object}
	 */
	function normalizeRoute(path, args) {

		var validMethods = ['get', 'put', 'post', 'del', 'delete', 'all', 'render', 'options', 'param', 'redirect'],
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
				found = helpers.findByNotation(self.modules[k], arg);
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
	}

	/**
	 * Adds routes to the application.
	 * @private
	 */
	function routes(){
	
		var sortedRoutes = [];

		$DEBUG('Normalizing routes for Express.');
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
			var	route = normalizeRoute(path, args);
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
				var err = new NotFoundError('The requested resource ' + req.url + ' could not be found.');
				next(err);
			});
			// unhandled errors.
			app.use(function errorHandler(err, req, res, next) {
				errorHandlers.handle.apply(self, arguments);
			});
		}
		self.emit('routes:ready');
	}

	/**
	 * Configures assets using Gulp.
	 * @private
	 */
	function assets() {
		var gulp = conf.gulp.call(self);
		if(!self.options.assets || !self.options.assets.enabled)
            return self.emit('assets:ready');
        $DEBUG('Compiling assets for your application.');
		gulp.build();
	}

    /**
     * Called when Stukko has been initialized, configured and is listening.
     * @private
     */
    function listening() {

        var options = this.options,
            session = options.middleware.session,
            logo = this.utils.io.read(this.rootdir + '/lib/core/icon.txt');

        // only show logo if enabled.
        // disable logo if debugging to conserve space for viewing debug messages.
        if((options.logo === true || options.logo === undefined) && this.start)
            if(!this.debug && !this.flags.debug)
                console.log(logo);

        $LOG.console.info('Application ' + this.pkgapp.name.green + ' (' + this.pkgapp.version + ') has started successfully.');
        $LOG.console.info('Stukko: ' + this.pkg.version.replace('^', '') + ' Configuration: ' + this.config + '');

        if((session.enabled || undefined === session.enabled) && session.options.module)
            $LOG.console.info('Session Store: ' + session.options.module);

        if(self.options.db.module !== 'sequelize')
            $LOG.console.info('Database Engine: ' + this.options.db.module);
         else
            $LOG.console.info('Database Engine: ' + this.options.db.module + ' (' + this.options.db.options.dialect + ')');

        $LOG.console.info('Build Assets: ' + (this.options.assets && this.options.assets.enabled ? true : false).toString() );

        $LOG.console.info('View application at http://' + options.host + ':' + options.port);

        // log to file only this app started.
        $LOG.file.info('Application [' + this.pkgapp.name + '] started at http:// ' + options.host + ':' + options.port );

        if(options.browser)
            utils.goto('http://' + options.host + ':' + options.port);

        if(_.isFunction (self.onListening))
            this.onListening();

    }

	/* Initialize Stukko, listen for events.
	******************************************************/
	this.on('init', init);
	this.on('packages:ready', options);
	this.on('options:ready', paths);
	this.on('paths:ready', loggers);
    this.on('loggers:ready', database);
	this.on('database:ready', cli);
    this.on('cli:ready', modules);
    this.on('modules:ready', express);
    this.on('express:ready', middleware);
    this.on('middleware:ready', routes);
    this.on('routes:ready', assets);
    this.on('assets:ready', function() { this.emit('ready'); });

    // triggered when server is listening.
    this.on('listening', function () {
        // set a timeout to make sure
        // debug/console logs don't clobber each other.
        // purely for cosmetic reasons.
        setTimeout(function () {
            listening.call(self);
        }, 100);
    });

    // listens for commands other than start.
    this.on('command', function () {

        // should never hit this.
        if(this.start || this.running) return;
        //this.running = true;

        // get user commands.
        var userCommands = _.functions(this.userCommands),
            isUserCommand = _.contains(userCommands, this.ocmd);

        //make sure we have a valid command.
        if(!this.cmd && !isUserCommand){
            $LOG.console.warn('Stukko could not process command ' + this.ocmd + '. Try stukko help for list of commands.');
            process.exit();
        }

        if(isUserCommand) {
            this.userCommands[this.ocmd]();
        } else {
            if(this.cmd === 'npm')
                return this.npm(this.ocmd);
            this[this.cmd]();
        }

    });

}