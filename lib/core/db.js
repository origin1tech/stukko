'use strict';

module.exports = Db;

function Db() {

	var self = this,
		utils = self.utils,
		dbconf = self.options.db;

	self.db = {};
	self.db.get = get;
	self.db.connect = connect;

	/**
	 * Gets the client/module for the database.
	 * @param {string} moduleName - the name of the module to load/require.
	 * @returns {object} node database client.
	 */
	function get(moduleName) {

		var reqPath;
		moduleName = moduleName || dbconf.module;

		reqPath = moduleName === 'dirty' ? moduleName
			: self.cwd + '/node_modules/' + moduleName;
		if(!utils.helpers.canRequire(reqPath))
			throw new Error('Invalid database client provided. Ensure the module ' + moduleName + ' is loaded.');

		if(dbconf.module === 'mongodb')
			return require(reqPath).MongoClient;
		return require(reqPath);
	}

	/**
	 * Connects to database.
	 * @param {object|string} options - database client options for connection.
	 * @returns {object} returns db object.
	 */
	 function connect(options) {

		var method, methods;

		// allow options to be passed.
		// expose public stukko prototype for
		// connecting to database.
		dbconf = options || dbconf;

		// get the init method for the provided client.
		methods = {
			dirty: 'Dirty',
			mongodb: 'connect',
			mongoose: 'createConnection',
			mysql: 'createConnection',
			sqlite: 'Database',
			redis: 'createClient'
		};

		// the method to call to init client/client.
		method = methods[dbconf.module];

		// for sqlite and dirty make sure we have
		// a valid directory for the database.
		if(dbconf.module === 'dirty' || dbconf.module === 'sqlite'){
			var dir = self.cwd + '/.tmp';
			if(!utils.io.exists(dir))
				utils.io.mkdir(dir);
			dbconf.options = dir + '/' + self.pkgapp.name + '.db';
		}

		self.db.client = get();
		if(dbconf.module === 'riak')
			self.db.connection = new self.db.client(dbconf.options);
		self.db.connection = self.db.client[method](dbconf.options);

		return self.db;

	}

	return {
		get: get,
		connect: connect
	}


}