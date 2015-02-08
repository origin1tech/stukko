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
		errorHandler = handlers.errors.call(this),
        hooks = handlers.hooks,
        defaultsAll = conf.defaultsAll.call(this),
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

		var pkg, appPkg;       
        
		if(utils.io.exists(p.join(self.rootdir + '/package.json')))	{
			pkg = helpers.tryParseJson(utils.io.read(self.rootdir + '/package.json'));
			if(pkg) 
                self.pkg = pkg;
		}        
        
		if(utils.io.exists(p.join(self.cwd, '/package.json')))	{
			appPkg = helpers.tryParseJson(utils.io.read(self.cwd + '/package.json'));
			if(appPkg){              
                self.pkgapp = appPkg;
                if(self.start){
                    console.log('\nPlease wait ' + self.pkgapp.name + ' is booting...');
                }
            } else {
                var err = new Error('Invalid Stukko application, package.json could not be found.');     
                err.name = 'InvalidApplication';
                throw err;
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
				if(!self.options.middleware.cookieParser || self.options.middleware.cookieParser.options){
                    self.options.middleware.cookieParser = _.extend({ options: {}}, self.options.middleware.cookieParser)
					self.options.middleware.cookieParser.options = sessionOptions.secret;
				}

			}
			// set default options for cors.
            self.options.middleware.cors = _.extend({}, self.options.middleware.cors);
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
            self.options.middleware.i18n = _.extend({}, self.options.middleware.i18n);
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
			//self.options.version = self.pkg.version;
			self.optionsOriginal = _.cloneDeep(self.options);

            // merge missing defaults and any flags.
            self.flags = helpers.stringToType(self.flags);
            self.options = _.merge(defaultsAll, self.options, self.flags);

            // TODO: temp fix.
            //self.optionsOriginal.version = self.pkg.version;
            // ensure version
            var valVer = helpers.compareVersions(self.pkg.version, self.options.version);          
            if(valVer.value !== 0){
                var err = new Error(valVer.msg);
                err.name = 'InvalidVersion';
                throw err;
            }               
      
            // save the defined config flags/session settings may have changed.
			utils.io.write(p.join(self.cwd, '/server/configuration/', config + '.json'), JSON.stringify(self.optionsOriginal, null, '\t'));

            // save the running config.
            utils.io.write(p.join(self.cwd, '/server/configuration/active.json'), JSON.stringify(self.options, null, '\t'));

            GLOBAL.$$SETTINGS = self.options;
            GLOBAL.$$PKG = self.pkgapp;

		} else {
            self.options = _.merge(defaultsAll, self.options);
        }       
        
        // convert modules filter
        self.options.modulesFilter = self.options.modulesFilter || '^[^_](.+)\\.js$';
        self.options.modulesFilter = new RegExp(self.options.modulesFilter);    
        
        // backward compatability
        if(self.options.statusErrors)
            self.options.errors = _.extend(self.options.errors, self.options.statusErrors);
        if(self.options.catchAll)
            self.options.errors.spa = true;

		self.emit('options:ready');
	}

	/**
	 * Normalize path with prefixed working directory.
	 * @private
	 */
	function paths(){

		var obj = self.options,
			cwdEsc = self.cwd.replace(/\\\\/g, '\\'),
			replacers = {
				'rootdir': self.rootdir,
				'cwd': self.cwd,
				'internal': self.rootdir + '/lib/core'
			},
			replacerKeys = Object.keys(replacers),
            excluded = ['routing', 'assets'],
			regexp;

		replacerKeys = replacerKeys.join('|');

		function recurse(obj){
			_.forEach(obj, function(v, k){
               if(_.contains(excluded, k))
                    return;
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
        else
            self.log.file = _logger.loggers.console;

		// set global reference for log.
		GLOBAL.$$LOG = self.log;
		GLOBAL.$$DEBUG = self.log.debug;
		// loggers are loaded and configured indicate running config.
        
		self.emit('loggers:ready');
	}

    /**
     * Configures the database client and connection.
     * @private
     * @params {function} cb - callback after database has been initialized.
     */
    function database() {       
        var db;
        if(self.cmd === 'git')
            self.emit('command');
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
        var userCmds = utils.reqeach({ 
                dirname: self.options.cli, 
                filter: self.options.modulesFilter 
            }),
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
            self.modules.services = utils.reqeach({
                    dirname: self.options.modules.services, 
                    filter: self.options.modulesFilter
                });
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
            // can't set keys for sqlite.
            if(dbConf.options.dialect === 'sqlite'){
                if(cb) cb();
            } else {
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
        }
        
        // normalize non-sequelize models.
        function normalizeModel(model) {
            
            
        }

        // adds models globally.
        function globalizeModel(name, model) {
            // must have name & model as well as globalize set to true.
            if(!name || !model || self.options.db.globalize === false) return;
            name = self.options.db.modelPrefix + name;
            GLOBAL[name] = model;
        }

        // TODO: change to promises when loading modules.
        function afterModels() {

            // add global ref to Controllers.
            if(self.options.modules.controllers) {
                var tmpCtrls = utils.reqeach({
                    dirname: self.options.modules.controllers,
                    filter: self.options.modulesFilter
                });
                self.modules.controllers = {};
                _.forEach(tmpCtrls, function (v,k) {
                    if(_.isFunction(v)){
                        var tmpCtrl = v.call(self); //_.bind(v, self);
                        if(_.isPlainObject(tmpCtrl)){
                            if(tmpCtrl.as && (tmpCtrl.as !== k)) 
                                self.modules.controllers[tmpCtrl.as] = tmpCtrl;
                            else    
                                self.modules.controllers[k] = tmpCtrl;
                        }                  
                    } else {
                        self.modules.controllers[v.as ||k] = v;
                    }                      
                });
                GLOBAL.$$CONTROLLERS = self.modules.controllers || {};
            }

            // merge routes.
            if(self.options.modules.routes) {
                var routes = {},
                    keys;

                self.modules.routes = utils.reqeach({
                    dirname: self.options.modules.routes, 
                    filter: self.options.modulesFilter 
                });
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
                if(!_.contains(['models', 'controllers', 'routes', 'services', 'seeds'], k)){
                    var flatten = (k === 'policies');                  
                    self.modules[k]	= utils.reqeach({
                        dirname: v, 
                        filter: self.options.modulesFilter
                    });
                    if(flatten){
                        var tmp = {},
                            modules = self.modules[k];
                        _.forEach(modules, function (mod,key) {
                            tmp = _.extend(tmp, mod);
                        });
                        self.modules[k] = tmp;              
                    }                    
                }                   
            });

            self.emit('modules:ready');
        }

        if(self.options.modules.models) {

            var dbConf = self.options.db || {},
                keys;

            self.modules.models = utils.reqeach({
                dirname: self.options.modules.models,
                filter: self.options.modulesFilter
            });
            keys = Object.keys(self.modules.models);

            if(dbConf.load !== false) {
                
                // require each seed.
                if(self.options.modules.seeds)
                    self.modules.seeds = utils.reqeach({
                        dirname: self.options.modules.seeds, 
                        filter: self.options.modulesFilter 
                    });
                
                if(dbConf.module === 'sequelize'){

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
                            if(dbConf.seed)
                                self.seed();
                            afterModels();
                        });

                    });

                } else {

                    // iterate and add to models object;
                    _.forEach(keys, function(key) {

                        var globalKey = helpers.stringToCase(key, dbConf.modelCase),
                            tmpModel, modelName, _module, nameKey;
                        
                        _module = self.modules.models[key];

                        // set default modelName by key.
                        modelName = globalKey;
                        
                        if(_.isFunction(_module) || !_.isEmpty(_module)){

                            if(self.options.db.module === 'mongoose')    
                                nameKey = 'modelName';                       
                                
                            if(self.options.db.module === 'mongodb')
                                nameKey = 'collectionName';

                            if(self.options.db.module === 'dirty')
                                nameKey = '_name';                    
                            
                            if(self.options.db.module === 'redis')
                                nameKey = '_name';

                            //add the module by name to Global and context modules.
                            if(_module){
                                try {
                                    if(_.isFunction(_module)) {
                                        // native module no injection.
                                        if(_module[nameKey])
                                            tmpModel = _module;
                                        // inject dependency.
                                        else
                                            tmpModel = _module.call(self, self.db.connection, self.db.Schema, self.db.model);
                                    }
                                    if(_.isPlainObject(_module)){
                                        _.forEach(_module, function (v,k) {
                                            if(v[nameKey])
                                                tmpModel = v;
                                            else
                                                tmpModel = v.call(self, self.db.connection, self.db.Schema, self.db.model);
                                        });
                                    }
                                    if(tmpModel){
                                        modelName = tmpModel[nameKey] || modelName;
                                        globalizeModel(modelName, tmpModel);
                                    }
                                } catch(ex) {
                                    $$LOG.console.warn('Error loading model/file ' + modelName);
                                    $$LOG.file.error(ex);                                    
                                }
                            }
                        }
                    });

                    if(dbConf.seed)
                        self.seed();

                    // bind other modules.
                    afterModels();

                }
                
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
            // check req session properties
            if(sessionOptions.resave === undefined)
                sessionOptions.resave = true;
            if(sessionOptions.saveUninitialized === undefined)
                sessionOptions.saveUninitialized = true;

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
					MongoStore = helpers.resolveModule('connect-mongo');
					if(!MongoStore) moduleNotFound('connect-mongo');
					MongoStore = MongoStore(expressSession);
					if(/mongo/gi.test(self.options.db.module)){
                        dbOptions = self.options.db.options;
                        sessionOptions.storeOptions.db = sessionOptions.storeOptions.db  || dbOptions.database;
                    }                    
					sessionOptions.storeOptions =_.merge(mongoDefaults, sessionOptions.storeOptions, dbOptions);
                    if(sessionOptions.mongooseConnection && /mongo/gi.test(self.options.db.module)){
                        //sessionOptions.storeOptions = { mongooseConnection: self.db.connection };   
                        $$LOG.warn('Mongoose connections cannot be used due to bug in connect-mongo, ' +
                        'falling back to manual connection.');
                    }               
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
		defKeys = Object.keys(defMiddleware).concat(Object.keys(custMiddleware || {}))
			.sort(function(a, b) {
				a = defMiddleware[a] || custMiddleware[a];
				b = defMiddleware[b] || custMiddleware[b];
				return (a.order - b.order);
			});
        
        // add before middleware hook.
        var hookMiddleware = hooks.call(self).beforeMiddleware;
        self.app.use(_.bind(hookMiddleware, self));

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
     * Recursive func for validating policy 
     * filter exists and is accessible.
     * @param obj - the current object to parse.
     * @private 
     */
    function validatePolicies(obj){
        _.forEach(obj, function (v,k) {
            if(_.isPlainObject(v)) {
                validatePolicies(v);
            } else {
                var pol = v;
                if(!_.isArray(pol))
                    pol = [pol];
                _.forEach(pol, function (p) {
                    if(_.isString(p)) {
                        var exists = (helpers.findByNotation(self.modules.filters, p) !== undefined);
                        if(!exists){
                            if(self.options.routing.policyStrict)
                                throw new Error('Policy "' + v + '" is invalid or unaccessible.');
                            else
                                $$LOG.warn('Policy "' + v + '" is invalid or unaccessible. ' +
                                'For strict mode see: routing: { policyStrict: true }');
                        }
                    }
                });
            }
        });
    }

    /**
     * Normalize controllers with default map. 
     * @param name - the name of the controller. 
     * @private 
     */
    function normalizeController(name) {
        
        var map = {
                methods: ['get'],
                params: []
            }

        var ctrl = self.modules.controllers[name],
            actions;
        // only extend normalize if map exists.
        if(ctrl && ctrl.map) {
            actions = _.keys(ctrl.map);               
            _.forEach(actions, function (key) {
                var action = ctrl.map[key];
                action.methods = action.methods || map.methods;
                action.params = action.params || map.params;
                action.name = action.name || key;
                action.as = action.as || key;
                if(_.isString(action.methods))
                    action.methods = [action.methods];
                if(_.isString(action.params))
                    action.params = [action.params];                  
            });           
        }     

    }

    /**
     * Looks up a policy(s) by controller name.
     * @param name
     * @param action
     * @returns array
     */
    function lookupPolicy(name, action) {

        var policies = self.modules.policies || {},
            controllers = self.modules.controllers || {},
            policyFilter = self.options.routing.filter,
            result = [],
            defaultPolicy;
        
        // make sure we have default policy.
        defaultPolicy = policies['*'] = policies['*'] === undefined ? true : policies['*'];

        // normalize the policy returning
        // default filter, definded filter
        // or empty array.
        function normalizePolicy(pol){
            // if false return policyFilter.
            if(pol === false)
                return [policyFilter];
            // return defined string filter as array.
            else if(_.isString(pol))
                return [pol]
            // return the filter array.
            else if(_.isArray(pol))
                return pol;
            else
                return [];
        }

        // set default policy.
        result = normalizePolicy(defaultPolicy);
        
        // if not name or action supplied
        // return the default policy.
        if(!name && !action)
            return result;

        // check if global to controller
        // or is specified for ea. action.
        var curPolicy = policies[name];

        if(curPolicy !== undefined){

            // if not an object is string, bool or array.
            if(!_.isPlainObject(curPolicy)){
                result = result.concat(normalizePolicy(curPolicy));
            }

            // policy is object specifying
            // individual filters per action.
            else {

                // check if has global filter for controller.
                if(curPolicy['*'] !== undefined)
                    result = result.concat(normalizePolicy(curPolicy['*']));

                // if has matching action
                if(curPolicy[action] !== undefined)
                    result = result.concat(normalizePolicy(curPolicy[action]));
            }

        }

        // return unique filters.
        return _.uniq(result);
    }

	/**
	 * Normalize routes convert args to array for apply.
	 * @private
	 * @param {string} path
	 * @param {array|object|string} args
	 * @returns {object}
	 */
	function normalizeRoute(path, args, model) {

		var validMethods = ['get', 'put', 'post', 'del', 'delete', 'all', 'render', 'options', 'param', 'redirect'],
			origPath = path,
			ctxArgs = [],
            fullPath,
            keys,
			isRedirect,
			isRender,
			origKey,
			method,
            defaultCtrl;
        
        defaultCtrl = self.modules.controllers[self.options.routing.generator];

		if(!path || !args) return undefined;
        if(self.options.routing.lower !== false)
		    path = path.toLowerCase();
        path = path.split(' ');
		method = origKey = path[1] ? path[0] : 'get';
        method = method === 'del' ? 'delete' : method;
		path = path[1] ? path[1] : path[0];
		isRedirect = method === 'redirect';
		isRender = (method === 'render') || (method === 'view');
		// check for 'view' and 'redirect' method types.
		method = isRedirect ? 'get' : method;
		method = isRender ? 'render' : method;

		if(validMethods.indexOf(method) === -1) {
			$$LOG.warning('Invalid method in route ' + origPath + ' could not be added.');
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

		function lookupFilter(arg) {
			var validKeys = ['controllers', 'filters'],
                val;
            
			_.forEach(validKeys, function(k) {   
                if(!val)
                    val = helpers.findByNotation(self.modules[k], arg);
                if(val)
                    return false;
			});

            return val;	
		}

		function applyContext(arg) {
    
			if(!isRedirect && !isRender){
                
                if(_.isString(arg))
                    arg = lookupFilter(arg);

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
						arg = lookupFilter(arg);
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
		return { method: method, path: path, keys: getKeys(path), args: ctxArgs, fullPath: method + ' ' + path };
	}

	/**
	 * Adds routes to the application.
	 * @private
	 */
	function routes(){

		$$DEBUG('Building application routes.');
        
		var app = self.app,
            sortedRoutes = [],
            routeOptions = self.options.routing,
			routes = self.modules.routes || {},
			layout = self.options.express.layout,      
            routePaths = [], generatedRoutes = [],
            beforeActions, beforeFilters,
            hookRoutes;
        
        hookRoutes = hooks.call(self);
        beforeActions = hookRoutes.beforeActions;
        beforeFilters = hookRoutes.beforeFilters;
        
        // ensure policy filters are valid.
        validatePolicies(self.modules.policies);        
        
        // prevents duplicate routes.
        function validateRoutePath(route, coll){
            coll = coll || sortedRoutes;       
            if(!_.contains(routePaths, route.fullPath)){
                routePaths.push(route.fullPath);
                coll.push(route);                
            }            
        }	
        
        // iterate and normalize defined routes.
        _.forEach(routes, function (args, path) {
            var	route, pols;
            // must have args to add route.
            if(args) {
                if(!_.isArray(args))
                    args = [args];
                // get default policy.
                pols = [beforeFilters];
                pols = pols.concat(lookupPolicy());
                pols = pols.concat(args);
                pols.push(beforeActions);
                route = normalizeRoute(path, args);             
                if(!route || !route.args) {
                    if(!route)
                        $$LOG.warn('Route ' + path + ' failed to initialize.');
                    else
                        $$LOG.warn('Route ' + path + ' has invalid arguments: ' + pols.toString());
                } else {
                    validateRoutePath(route);
                }
            }
        });
     
        // ensure we have a default route.
        if(!sortedRoutes || !_.contains(routePaths, 'get /')){
            var route, pols
            pols = lookupPolicy();
            pols.push(function (req, res, next){
                res.render(layout);
            });
            route = normalizeRoute('/', pols);  
            // don't validate just push.
            sortedRoutes.push(route);
        }

        $$DEBUG('Generating routes.');
        var generatorName = routeOptions.generator,
            generator = self.modules.controllers[generatorName],
            isRedis = /redis/gi.test(self.options.db.module),
            generatorMap;       
        generatorName = generatorName.replace("'", '').replace('.js', '');
        
        // gernate routes based on controllers if enabled.
        if(routeOptions.controllers !== false){
            $$DEBUG('Generating controller CRUD routes.');
            _.forEach(self.modules.controllers, function (v,k) {
                // don't generate default controller routes.
                if(k !== generatorName && v.map) {
                    normalizeController(k);
                    var curCtrl = v,
                        baseCtrlPath;                    
                    _.forEach(curCtrl.map, function (action, key) {
                        _.forEach(action.methods, function (m) {
                            var baseCtrlPath = m + ' /' + k + '/' + action.as,
                                route, pols;
                            if(action.params.length)
                                baseCtrlPath += ('/' + action.params.join('/'));     
                            pols = [beforeFilters];
                            pols = pols.concat(lookupPolicy(k, action.name));
                            pols.push(beforeActions);
                            pols.push(k + '.' + action.name);
                            route = normalizeRoute(baseCtrlPath, pols);                                
                            if(!route || !route.args) {
                                if(!route)
                                    $$LOG.warn('Route ' + baseCtrlPath + ' failed to initialize.');
                                else
                                    $$LOG.warn('Route ' + baseCtrlPath + ' has invalid arguments: ' + pols.toString());
                            } else {                                    
                                validateRoutePath(route);
                            }
                        });
                    });                    
                }
            });
        }
    
        // generate routes based on models if enabled. 
        if(routeOptions.models !== false && !isRedis){

            // normalize generator controller.
            normalizeController(routeOptions.generator);
            generatorMap = generator ? generator.map : undefined;

            // cannot create routes without
            // default controller and map.
            if(generatorMap) {

                var dbModels = helpers.findByNotation(self.db.connection, self.db.modelsKey),
                    modelKeys = _.keys(dbModels)

                _.forEach(modelKeys, function (k) {
                    var baseRestPath, baseCrudPath, generatorActions, Model;

                    // get the database model.
                    Model = dbModels[k];

                    generatorActions = generator.get.call(self, Model);
                    routeOptions.prefix = routeOptions.prefix.replace(/^\//, '');
                    baseRestPath = '/' + routeOptions.prefix + '/' + k;
                    // make sure we don't have any double slashes.
                    baseRestPath = baseRestPath.replace(/\/\//g, '/');
                    baseCrudPath = '/' + k;

                    // generate model rest routes.
                    if(routeOptions.rest !== false){

                        $$DEBUG('Generating REST routes for models.');

                        var findAll, find, create, update, destroy,
                            restPaths = [];

                        findAll = routeOptions.generatorActions['findAll'];
                        find = routeOptions.generatorActions['find'];
                        create = routeOptions.generatorActions['create'];
                        update = routeOptions.generatorActions['update'];
                        destroy = routeOptions.generatorActions['destroy'];
                        restPaths.push({path: 'get ' + baseRestPath, action: findAll});
                        restPaths.push({path: 'get ' + baseRestPath + '/:id?', action: find});
                        restPaths.push({path: 'post ' + baseRestPath, action: create});
                        restPaths.push({path: 'put ' + baseRestPath + '/:id?', action: update});
                        restPaths.push({path: 'del ' + baseRestPath + '/:id?', action: destroy});

                        _.forEach(restPaths, function (rest, key) {
                            var pols,
                                route;
                            pols = [beforeFilters];
                            pols = pols.concat(lookupPolicy(k, generatorMap[rest.action].name));
                            pols.push(beforeActions);
                            pols.push(generatorActions[rest.action]);
                            route = normalizeRoute(rest.path, pols);
                            if(!route || !route.args) {
                                if(!route)
                                    $$LOG.warn('Route ' + rest.path + ' failed to initialize.');
                                else
                                    $$LOG.warn('Route ' + rest.path + ' has invalid arguments: ' + pols.toString());
                            } else {                              
                                validateRoutePath(route);
                            }
                        });
                    }

                    if(routeOptions.crud !== false){
                        $$DEBUG('Generating CRUD routes for models.');
                        _.forEach(generatorMap, function (action, key) {
                            _.forEach(action.methods, function(m) {
                                var crudPath = m + ' ' + baseCrudPath + '/' + action.as;
                                if(action.params.length)
                                    crudPath += ('/' + action.params.join('/'));
                                var route, pols;
                                pols = [beforeFilters];
                                pols = pols.concat(lookupPolicy(k, action.name));
                                pols.push(beforeActions);
                                pols.push(generatorActions[action.name])
                                route = normalizeRoute(crudPath, pols);
                                if(!route || !route.args) {
                                    if(!route)
                                        $$LOG.warn('Route ' + crudPath + ' failed to initialize.');
                                    else
                                        $$LOG.warn('Route ' + crudPath + ' has invalid arguments: ' + pols.toString());
                                } else {
                                    validateRoutePath(route);
                                }

                            });
                        });
                    }

                });

            }

        } else {
            if(isRedis) $$LOG.warn('Generated model routes are not valid for Redis.');
        }
        
        // order the routes.    
        helpers.sort(sortedRoutes, 'method, path, keys');

        // add routes to application.
		_.forEach(sortedRoutes, function (v,k) {
			app[v.method](v.path, v.args);
		});
        
        app.get('/stukko', function (req, res, next) {
            var info = '';
            function addKey(k, v, t){
                v = v || '';
                t = t || '';
                info += (t + k + ' ' + v + '<br/>');
            }
            if(self.env !== 'development'){
                next();
            } else {
                try{
                    addKey('version:', self.pkg.version);
                    addKey('session:', self.options.middleware.session.options.module);
                    addKey('database:', self.options.db.module);
                    addKey('dbname:', self.options.db.options.database);
                    addKey('log level:', self.options.logs.level);
                    addKey('route options:');
                    _.forEach(self.options.routing, function (v,k){
                        
                        
                    });
                    addKey('routes:');
                    _.forEach(app._router.stack, function (v,k){
                        if(v.route){
                            var methods = _.keys(v.route.methods).join(',');
                            addKey(methods + ':', v.route.path, '&emsp;');
                        }
                    });
                    res.status(200).send(info);
                }catch(ex){
                    next(ex);
                }
            }
        });
       
        var errors = self.options.errors;
        // 404 errors
        app.use(function notFoundHandler(req, res, next) {
            var err = new NotFoundError('The requested resource ' + req.url + ' could not be found.');
            $$DEBUG('404 route error handler handled ' + req.url);
            if(self.options.errors.spa && (!req.JSON || !req.JSONP))
                next();
            else if(!req.JSON && !req.JSONP && !/\.[0-9a-z]+$/i.test(req.url))       
                next();                    
            else                    
                next();
            
        });
        
        // 500 errors.
        app.use(function errorHandlerWrapper(err, req, res, next){
            $$DEBUG('Route error handler handled ' + req.url);
            if(!err) 
                next();
            else 
                errorHandler.apply(self, arguments);
        });

        // catch all route typically used with client side frameworks.        
        if(self.options.errors.spa) {
            app.get('*', function catchAll(req, res) {
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
		if(!self.options.assets || self.options.assets.enabled === false)
            return self.emit('assets:ready');
        $$DEBUG('Compiling assets for your application.');
		gulp.run('build');
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
        if(options.logo !== false  && this.start)
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
            isUserCommand = _.contains(userCommands, this.ocmd),
            stukkoCommands = _.functions(this),
            isStukkoCommand = _.contains(stukkoCommands, this.cmd);

        if(isUserCommand) {
            this.userCommands[this.ocmd].call(this);
        } else {
            if(!this.cmd || !isStukkoCommand){
                $$LOG.console.warn('Stukko could not process command ' + this.ocmd + '. Try stukko help for list of commands.');
                process.exit();
            }
            if(this.cmd === 'npm')
                return this.npm(this.ocmd);
            this[this.cmd]();
        }

    });

}