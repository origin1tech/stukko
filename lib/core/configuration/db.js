'use strict';

var utils = require('../../utils'),
    p = require('path');

module.exports = Db;

function Db() {

	var self = this,
		delKey = utils.deletekey,
		dbconf = _.clone(self.options.db),
		db;
	db = { modelsKey: 'models' };
	db.get = client;
	db.connect = connect;

	/**
	 * Gets the client/module for the database.
	 * @param {string} moduleName - the name of the module to load/require.
	 * @returns {object} node database client.
	 */
	function client(moduleName) {

		var reqPath, client, origName;
		moduleName = moduleName || dbconf.module;
        origName = moduleName;
        moduleName = moduleName === 'dirty' ? 'stukko-dirty' : moduleName;

		reqPath = moduleName === 'stukko-dirty' ? moduleName
			: p.join(self.cwd, '/node_modules/', moduleName);

		if(!utils.helpers.canRequire(reqPath))
			throw new Error('Invalid database client provided. Ensure the module ' + origName + ' is loaded.');

		if(moduleName === 'mongodb')
			client = require(reqPath).MongoClient;
		else
			client = require(reqPath);
		return client;
	}

	/**
	 * Connects to database.
	 * @param {object|string} options - database client options for connection.
	 * @param {function} cb - callback on connected.
	 * @returns {object} returns db object.
	 */
	function connect(options) {

		var method, methods, defaults, args, tmpDatabase, cb;
		if(!dbconf) return;
		args = [];
		if(_.isFunction(options)){
			cb = options;
			options = undefined;
		}
		defaults = {
			dirty: { database: self.pkgapp.name + '.db' },
			mongodb: { host: 'localhost', port: 27017, database: self.pkgapp.name + 'db' },
			mongoose: { host: 'localhost', port: 27017, database: self.pkgapp.name + 'db' },
			redis: { host: 'localhost', port: 6379, database: 'instance' },
			sequelize: {
				host: 'localhost',
				port: 3306,
                database: self.pkgapp.name + 'db',
                username: 'root',
                password: null,
				dialect: 'mysql',
                omitNull: true,
				logging: function (str) {
                    // only log 'Executing' messages if debugging.
                    if(self.debug)
                        $$LOG.info(str);
					else if(str.indexOf('Executing') !== 0)
                        $$LOG.info(str);
				}
			}
		};
		// get the build method for the provided client.
		methods = {
			dirty: 'connect',
			mongodb: 'connect',
			mongoose: 'connect',
			redis: 'createClient'
		};

		// quick fix for my absent mindedness...lol
		if(dbconf.module === 'mongo') dbconf.module = 'mongodb';
		// merge defaults/options.  
		dbconf.options = _.extend({}, defaults[dbconf.module], dbconf.options, options);
        if(!dbconf.options.db)
            dbconf.options.db = dbconf.options.database;
		self.options.db.options = dbconf.options;
		// the method to call to build client/client.
		method = methods[dbconf.module];
		// get the database client.
		db.client = client();
		db.connection = undefined;
        // key where models are stored in
        // db.connection.
		// make sure we have
		// a valid directory for the database.
		if(dbconf.module === 'dirty'){
			var dir = self.cwd + '/.tmp';
			if(!utils.io.exists(dir))
				utils.io.mkdir(dir);
			args.push(dir + '/' + dbconf.options.database);
		}
		// if is mongodb or mongoose normalize args.
		if(dbconf.module === 'mongoose'){      
			if(dbconf.options.url){
				args.push(dbconf.options.url);
			} else {
				if(dbconf.options.username) {
					args.push(utils.helpers.format('mongodb://{0}:{1}@{2}:{3}/{4}',  dbconf.options.username, dbconf.options.password, dbconf.options.host, dbconf.options.port, dbconf.options.database));
				} else {
					args.push(utils.helpers.format('mongodb://{0}:{1}/{2}',  dbconf.options.host, dbconf.options.port, dbconf.options.database));
				}
			}
            dbconf.options = utils.helpers.deleteKeys(dbconf.options, ['host', 'port', 'database', 'db']);
			args.push(dbconf.options);
			args.push(function (err) {
				if(err)
					throw err;
				db.connected = true;
				// we need to bind the connection instance.
				db.Schema = _.bind(db.client.Schema, db.connection);
                db.model = _.bind(db.client.model, db.connection);
				db.get = _.bind(db.client.get, db.connection);
				db.destroy = _.bind(db.connection.disconnect, db.connection);
				done();
			});         
		}
		if(dbconf.module === 'mongodb'){
			if(dbconf.options.url){
				args.push(dbconf.options.url);
			} else {
				if(dbconf.options.username) {
					args.push(utils.helpers.format('mongodb://{0}:{1}@{2}:{3}/{4}',  dbconf.options.username, dbconf.options.password || undefined, dbconf.options.host, dbconf.options.port, dbconf.options.database));
				} else {
					args.push(utils.helpers.format('mongodb://{0}:{1}/{2}',  dbconf.options.host, dbconf.options.port, dbconf.options.database));
				}
			}          
            db.modelsKey = 'collections';
			args.push(dbconf.options);
			args.push(function (err, conn) {
				if(err)
					throw err;
				db.connection = conn;
				db.connected = true;
				db.destroy = _.bind(conn.close, conn);
				done();
			});
		}
		if(dbconf.module === 'sequelize'){
			if(!dbconf.options.storage && (!dbconf.options.username || !dbconf.options.database))
				throw new Error('Sequelize requires a username and database name, passwords may be null.');
            if(dbconf.options.storage){
                dbconf.options.dialect = 'sqlite';
                dbconf.options.username = undefined;
                dbconf.options.password = undefined;
                dbconf.options.database = undefined;
            }
		}
		if(dbconf.module === 'redis'){
            // not supported.
            db.modelsKey = undefined;
			if(dbconf.options.password)
				dbconf.options.auth_pass = dbconf.options.password;
			args.push(dbconf.options.port);
			args.push(dbconf.options.host);
			args.push(dbconf.options);
		}
  
		// if connect is true create it otherwise
		// return client only so app can define.
		if(dbconf.connect !== false) {
			if (dbconf.module === 'dirty' || dbconf.module === 'redis') {
				db.connection = db.client[method].apply(db.client, args);
				if(dbconf.module === 'redis'){
					db.destroy = _.bind(db.connection.end, db.connection);
					db.connection.on('ready', function () {
                        db.connected = true;
                        done();
					});
				} else {
					db.destroy = _.bind(db.connection.close, db.connection);
                    db.connection.on('load', function () {
                        db.connected = true;
                    });
                    done(); // don't wait just call done w/ Dirty.
				}
			} else {
				if(dbconf.module === 'sequelize'){
                    if(dbconf.options.dialect === 'sqlite'){
                        db.connection = new db.client(null, null, null, dbconf.options);
                        db.connection
                            .sync()
                            .complete(function(err) {
                                if (err){
                                    $$LOG.error(err.message || 'Unknown error prevented connecting to your database.', err.stack);
                                } else {
                                    var mgr = db.connection.connectionManager || db.connection.connectorManager;
                                    db.connected = true;
                                    db.destroy = function () {};
                                    $$DEBUG('Sequelize connection to database ' + dbconf.options.storage
                                        + ' using SQL engine/dialect ' + dbconf.options.dialect + ' has been established successfully.');
                                    done();
                                }
                            });
                    } else {
                        db.connection = new db.client(dbconf.options.database, dbconf.options.username, 
                            dbconf.options.password, dbconf.options);
                        db.connection
                            .authenticate()
                            .complete(function(err) {
                                if (!!err) {
                                    $$LOG.error(err.message || 'Unknown error prevented connecting to your database.', err.stack)
                                } else {
                                    var mgr = db.connection.connectionManager || db.connection.connectorManager;
                                    db.connected = true;
                                    db.destroy = function () {};
                                    if(!db.client.Promise && _.contains(['mysql', 'postgres', 'mariadb'], dbconf.options.dialect))
                                        db.destroy = _.bind(mgr.disconnect, db.client);
                                    $$DEBUG('Sequelize connection to database ' + dbconf.options.database
                                        + ' using SQL engine/dialect ' + dbconf.options.dialect + ' has been established successfully.');
                                    done();
                                }
                            });
                    }
				} else {
					db.connection = db.client[method].apply(db.client, args);               
				}
			}
		}

        function done() {
            self.db = db;
            GLOBAL.$$DB = self.db;       
            self.emit('database:ready');
        }
	}
	return {
		get: client,
		connect: connect
	};
}