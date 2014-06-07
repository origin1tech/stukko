'use strict';

var _ = require('lodash');

module.exports = Db;

function Db() {

	var self = this,
		utils = self.utils,
		delKey = self.utils.deletekey,
		dbconf = self.options.db,
		_ = require('lodash'),
		db;

	db = {};
	db.get = client;
	db.connect = connect;

	/**
	 * Gets the client/module for the database.
	 * @param {string} moduleName - the name of the module to load/require.
	 * @returns {object} node database client.
	 */
	function client(moduleName) {

		var reqPath, client;
		moduleName = moduleName || dbconf.module;

		reqPath = moduleName === 'dirty' ? moduleName
			: self.cwd + '/node_modules/' + moduleName;

		if(!utils.helpers.canRequire(reqPath))
			throw new Error('Invalid database client provided. Ensure the module ' + moduleName + ' is loaded.');

		if(dbconf.module === 'mongodb')
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
	 function connect(options, cb) {

		var method, methods, defaults, args, tmpDatabase;

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
			mysql: { host: 'localhost', port: 3306, database: self.pkgapp.name + 'db' }
		};

		// get the init method for the provided client.
		methods = {
			dirty: 'Dirty',
			mongodb: 'connect',
			mongoose: 'connect',
			mysql: 'createConnection',
			redis: 'createClient'
		};

		// quick fix for my absent mindedness...lol
		if(dbconf.module === 'mongo') dbconf.module = 'mongodb';

		// merge defaults/options.
		dbconf.options = _.extend(defaults[dbconf.module], dbconf.options, options);
		self.options.db.options = dbconf.options;

		// the method to call to init client/client.
		method = methods[dbconf.module];

		// get the database client.
		db.client = client();
		db.connection = undefined;

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
			args.push(dbconf.options);
			args.push(function (err) {
				if(err)
					throw err;
				db.connected = true;
				// we need to bind the connection instance.
				db.Schema = _.bind(db.client.Schema, db.connection);
				db.get = _.bind(db.client.get, db.connection);
				db.destroy = _.bind(db.connection.disconnect, db.connection);
				cb(db);
			});
		}

		if(dbconf.module === 'mongodb'){
			if(dbconf.options.url){
				args.push(dbconf.options.url);
			} else {
				if(dbconf.options.username) {
					args.push(utils.helpers.format('mongodb://{0}:{1}@{2}:{3}/{4}',  dbconf.options.username, dbconf.options.password, dbconf.options.host, dbconf.options.port, dbconf.options.database));
				} else {
					args.push(utils.helpers.format('mongodb://{0}:{1}/{2}',  dbconf.options.host, dbconf.options.port, dbconf.options.database));
				}
			}
			args.push(dbconf.options);
			args.push(function (err, conn) {
				if(err)
					throw err;
				db.connection = conn;
				db.connected = true;
				db.destroy = _.bind(conn.close, conn);
				cb(db);
			});
		}

		if(dbconf.module === 'mysql') {
			if(dbconf.options.username)
				dbconf.options.user = dbconf.options.username;
			if(!dbconf.options.user && !dbconf.options.password)
				throw new Error('MySql connection requires both username and password.');
			tmpDatabase = dbconf.options.database;
			delete dbconf.options.database;
			args.push(dbconf.options);
		}

		if(dbconf.module === 'redis'){
			if(dbconf.options.password)
				dbconf.options.auth_pass = dbconf.options.password;
			args.push(dbconf.options.port);
			args.push(dbconf.options.host);
			args.push(dbconf.options);
		}

		// if connect is true create it otherwise
		// return client only so app can define.
		if(dbconf.connect) {
			if (dbconf.module === 'dirty' || dbconf.module === 'redis') {
				db.connection = db.client[method].apply(db.client, args);
				if(dbconf.module === 'redis'){
					db.destroy = _.bind(db.connection.end, db.connection);
					db.connection.on('ready', function () {
						if(!db.connected){
							db.connected = true;
							cb(db);
						}
					});
				} else {
					db.destroy = _.bind(db.connection.close, db.connection);
					db.connected = true;
					cb(db);
				}
			} else {
				if(dbconf.module === 'mysql'){
					db.connection = db.client[method].apply(db.client, args);
					db.connection.connect(function (err) {
						if(err) throw err;
						dbconf.options.database = tmpDatabase;
						db.connection.query('CREATE DATABASE IF NOT EXISTS ' + dbconf.options.database, function (err) {
							if(err)
								throw err;
							db.destroy = _.bind(db.connection.destroy, db.connection);
							db.connected = true;
							cb(db);
						});
					});
				} else {
					db.connection = db.client[method].apply(db.client, args);
				}
			}
		}

	}

	return {
		get: client,
		connect: connect
	}


}