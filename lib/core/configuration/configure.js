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
                    console.log('\nPlease wait ' + self.pkgapp.name + ' is booting...');
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

            // make sure bundle key exists in assets.
            self.options.assets.bundle = self.options.assets.bundle || {};

            // LEGACY: convert assets.framework to assets.bundle.framework;
            if(self.options.assets && self.options.assets.framework && !self.options.assets.bundle.framework){
                    self.options.assets.bundle.framework = self.options.assets.framework;
                    delete self.options.assets.framework;
                if(_.isEmpty(self.options.assets.bundle))
                    delete self.options.assets.bundle;
            }

            // LEGACY: add watching to each key other than like.
            if(self.options.assets && self.options.assets.watch !== undefined){
                _.forEach(self.options.assets, function (v,k) {
                    if(k !== 'link' && k !== 'bundle' && k !== 'preprocess')
                        self.options.assets[k].watch = self.options.assets.watch;
                    else if(k === 'bundle'){
                        _.forEach(self.options.assets.bundle, function (v,k) {
                            self.options.assets.bundle[k].watch = self.options.assets.watch;
                        });
                    }
                });
                delete self.options.assets.watch;
            }

			// save options to json file.
			self.options.version = self.pkg.version;
			self.optionsOriginal = _.cloneDeep(self.options);

            // merge missing defaults and any flags.
            self.flags = helpers.stringToType(self.flags);
            self.options = _.merge(defaultsAll, self.options, self.flags);

            // TODO: temp fix.
            self.optionsOriginal.version = self.pkg.version;

            // save the defined config flags/session settings may have changed.
			utils.io.write(p.join(self.cwd, '/server/configuration/', config + '.json'), JSON.stringify(self.optionsOriginal, null, '\t'));

            // save the running config.
            utils.io.write(p.join(self.cwd, '/server/configuration/active.json'), JSON.stringify(self.options, null, '\t'));

            GLOBAL.$$SETTINGS = self.options;
            GLOBAL.$$PKG = self.pkgapp;

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
		GLOBAL.$$LOG = self.log;
		GLOBAL.$$DEBUG = self.log.debug;
		// loggers are loaded and configured indicate running config.

		// now that we have our logging setup
		// set to handle uncaughtExceptions.
		// TODO: pass all errors through a normalizer.
		process.on('uncaughtException', function (err) {
			$$LOG.error(err.stack || err.message || 'An unknown exception occurred.');
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
        $$DEBUG('Defining global for database connection.');
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
                _.forEach(v, function(func, cmd) {
                    if(_.isFunction(func)){
                        proto[cmd] = _.bind(func, self);
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

		$$DEBUG('Requiring application modules.');

        self.options.modules = self.options.modules || {};

        // wire up services as we may use in Models etc.
        // add global ref to Services.
        if(self.options.modules.services) {
            self.modules.services = utils.reqeach(self.options.modules.services);
            _.forEach(self.modules.services, function (v,k) {
                // apply context if function.
                if(_.isFunction(v))
                    self.modules.services[k] = _.bind(v, self);

            });
            GLOBAL.$$SERVICES = self.modules.services || {};
        }

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

        // adds models globally.
        function globalizeModel(name, model) {
            // must have name & model as well as globalize set to true.
            if(!name || !model || !self.options.db.globalize) return;
            name = self.options.db.modelPrefix + name;
            GLOBAL[name] = model;
        }

        // TODO: change to promises when loading modules.
        function afterModels() {

            // add global ref to Controllers.
            if(self.options.modules.controllers) {
                self.modules.controllers = utils.reqeach(self.options.modules.controllers);
                _.forEach(self.modules.controllers, function (v,k) {
                    if(_.isFunction(v))
                        self.modules.controllers[k] = _.bind(v, self);
                });
                GLOBAL.$$CONTROLLERS = self.modules.controllers || {};
            }

            // merge routes.
            if(self.options.modules.routes) {
                var routes = {},
                    keys;

                self.modules.routes = utils.reqeach(self.options.modules.routes);
                keys = Object.keys(self.modules.routes);

                _.forEach(keys, function(key) {
                    if(_.isFunction(self.modules.routes[key]))
                        _.bind(self.modules.routes[key], self);
                    _.extend(routes, self.modules.routes[key]);
                });
                self.modules.routes = routes;
            }

            // require other modules.
            _.forEach(self.options.modules, function (v,k) {
                if(!_.contains(['models', 'controllers', 'routes', 'services', 'seeds'], k))
                    self.modules[k]	= utils.reqeach(v);
            });

            self.emit('modules:ready');
        }

        if(self.options.modules.models) {

            var dbConf = self.options.db || {},
                keys;

            self.modules.models = utils.reqeach(self.options.modules.models);
            keys = Object.keys(self.modules.models);

            if(!dbConf.load) return;

            // require each seed.
            if(self.options.modules.seeds)
                self.modules.seeds = utils.reqeach(self.options.modules.seeds);

            if(dbConf.module === 'sequelize' && dbConf.options.dialect !== 'sqlite'){

                var models;

                // although Sequelize will add new tables,
                // you'll need to enable "drop" in your db
                // configuration to reflect changes in
                // altered tables. Constraint fix disables
                // constraint checks temporarily then re-enables
                // to avoid warnings. this speeds up initial development
                // however you should consider using migrations.
                constraintFix(dbConf.drop, function () {

                    // iterate apply context inject dependencies;
                    _.forEach(keys, function(key) {
                        if(_.isFunction(self.modules.models[key])){
                            self.modules.models[key].call(self, self.db.connection, self.db.client);
                        }
                    });

                    models = self.db.connection.models || {};

                    Object.keys(models).forEach(function(modelName) {
                        if ('associate' in models[modelName]) {
                            try{
                                models[modelName].associate(models);
                            } catch(err) {
                                $$LOG.warn(err.message, '\n' + err.stack);
                            }
                        }
                        globalizeModel(modelName, models[modelName]);
                    });

                    // we need to sync everything to the database.
                    self.db.connection.sync({force: dbConf.drop}).then(function() {
                        // check for seeds.
                        if(dbConf.drop && dbConf.seed)
                            self.seed();
                        afterModels();
                    });
                });

            } else {

                // iterate and add to models object;
                _.forEach(keys, function(key) {

                    var globalKey = helpers.stringToCase(key, dbConf.modelCase),
                        tmpModel, modelName;

                    // set default modelName by key.
                    modelName = globalKey;

                    // return if not a function.
                    if(!_.isFunction(module[key]))return;

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

                self.seed();

                // bind other modules.
                afterModels();

            }

        } else {
            // bind other modules.
            afterModels();
        }
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

		$$DEBUG('Configure Express settings.');
		if(supported.indexOf(engine) === -1)
			throw new Error('The engine ' + engine + ' is not supported by Stukko by default.');
		// update the consolidate view engine.
		self.app.engine(self.options.express['view engine'], con[self.options.express.engine]);
		// add management views path.
		views = [self.options.express.views];
		views.push(self.cwd + '/manage/views');

		// enable multi-view capability.
        // Deprecated Express 4.10 now
        // supports multi view locations.
		//conf.multiview(self.app);

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

		$$DEBUG('Applying Express middleware.');
		var merged, defMiddleware, custMiddleware, defKeys,
			ctr,
            custCtr,
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
                            $$LOG.info(message);
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
			if(v.order === undefined) {
				v.order = ctr;
                // update by five, allows custom middlware
                // to preceed it in stack if desired.
				ctr +=5;
			}
		});
        // update the custom middleware counter to last ctr value.
        custCtr = ctr;
        _.forEach(self.modules.middleware, function(v,k){
            if(_.isFunction(v))
                v = { use: v };
            if(v.order === undefined) {
                v.order = custCtr;
                custCtr +=1;
            }
        });

		// get the order of our middleware keys.
		defMiddleware = self.options.middleware;
		custMiddleware = self.modules.middleware;
		defKeys = Object.keys(defMiddleware).concat(Object.keys(custMiddleware))
			.sort(function(a, b) {
				a = defMiddleware[a] || custMiddleware[a];
				b = defMiddleware[b] || custMiddleware[b];
				return (a.order - b.order);
			});

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
                    self.app.use(_.bind(m.use, self));
					//self.app.use(helpers.wrapMiddleware(m.use), self);
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
        method = method === 'del' ? 'delete' : method;
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

		$$DEBUG('Normalizing routes for Express.');
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
            self.options.statusErrors = self.options.statusErrors === true ? { 404: true, 500: true } :
                self.options.statusErrors
            app.use(function notFoundHandler(req, res, next) {
                var err = new NotFoundError('The requested resource ' + req.url + ' could not be found.');
                if(self.options.statusErrors['404'] && (/\.[0-9a-z]+$/i.test(req.url) || !self.options.catchAll))
                    next(err);
                else
                    next();
            });
			// unhandled errors.
            if(self.options.statusErrors['500'])
                app.use(function errorHandler(err, req, res, next) {
                    if(!err)
                        return next();
                    errorHandlers.handle.apply(self, arguments);
                });
		}
        // catch all route typically used with client side frameworks.
        if(self.options.catchAll) {
            app.get('*', function (req, res) {
               res.render(self.options.express.layout);
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
        $$DEBUG('Compiling assets for your application.');
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

        $$LOG.console.info('Application ' + this.pkgapp.name.green + ' (' + this.pkgapp.version + ') has started successfully.');
        $$LOG.console.info('Stukko: ' + this.pkg.version.replace('^', '') + ' Configuration: ' + this.config + '');

        if((session.enabled || undefined === session.enabled) && session.options.module)
            $$LOG.console.info('Session Store: ' + session.options.module);

        if(self.options.db.module !== 'sequelize')
            $$LOG.console.info('Database Engine: ' + this.options.db.module);
         else
            $$LOG.console.info('Database Engine: ' + this.options.db.module + ' (' + this.options.db.options.dialect + ')');

        $$LOG.console.info('Build Assets: ' + (this.options.assets && this.options.assets.enabled ? true : false).toString() );

        $$LOG.console.info('View application at http://' + options.host + ':' + options.port);

        // log to file only this app started.
        $$LOG.file.info('Application ' + this.pkgapp.name + ' started at http:// ' + options.host + ':' + options.port );

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
        }, 500);
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
            $$LOG.console.warn('Stukko could not process command ' + this.ocmd + '. Try stukko help for list of commands.');
            process.exit();
        }

        if(isUserCommand) {
            this.userCommands[this.ocmd].call(this);
        } else {
            if(this.cmd === 'npm')
                return this.npm(this.ocmd);
            this[this.cmd](this);
        }

    });

}