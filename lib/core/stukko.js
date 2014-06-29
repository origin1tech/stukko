'use strict';

var util = require('util'),
	Events = require('./events'),
	express = require('express'),
	http = require('http'),
	path = require('path'),
	_ = require('lodash'),
	configure = require('./configure'),
	utils = require('../utils/index'),
	commands = require('./commands'),
	readline = require('readline'),
	mware = require('./middleware'),
	diag = require('./diag'),
	Db = require('./db'),
	defaults = require('./defaults');
module.exports = Stukko;

/**
 * Stukko instance, options passed overwrite options.json options.
 * @class Stukko
 * @param {object|string} [options] - options for initializing server see constructor source for options.
 * @param {string} [config] - the directory of the config to load. default is used if not specified.
 * @constructor
 */
function Stukko(options, config) {
	//some comment.
	if(Stukko.instance)
		return Stukko.instance;
	Events.call(this);
	var self = this,
		cwd = process.cwd();
	if(!this)
		throw new Error('Stukko must be instantiated with new Stukko()');
	this.inspect = util.inspect;
	this.format = util.format;
	this.pid = process.pid;                                             // get the process id for the current process.
	this.directory = path.basename(cwd);                                // working directory name.
	this.debug = typeof(v8debug) === 'object';                          // application is debugging.
	this.utils = utils;                                                 // make utilities accessible in instance.
	this.rootdir = path.join(__dirname, '../../');                      // the root directory of stukko.
	this.cwd = cwd;                                                     // the current working directory.
	this.pkg = undefined;                                               // stukko package.json
	this.pkgapp = undefined;                                            // the application package.json.
	this.platform = process.platform;                                   // the platform stukko is running on.
	this.diag = diag.call(this);                                        // calling .get() returns current diagnostics.
	this.log = {};                                                      // winston loggers.
	this.config = 'development';                                        // the loaded config name.
	this.listening = false;                                             // Stukko's listening state.
	this.exiting = false;                                               // Stukko's exit state.
	this.local = options === 'local';                                   // enables Stukko to load itself for quick
																		// testing. local server.js file requried.

	this.app = express();                                               // the express instance.
	this.server = undefined;                                            // express server populated on listen.
	this.express = express;                                             // express lib for creating routers etc.
	this.router = express.Router();                                     // the express router.
	this.sessionStore = undefined;                                      // the store for web sessions.
	this.origins = undefined;                                           // whitelisted array of origins. ignored if cors is disabled or origins is undefined. ex: ['http://mydomain.com'].
	this.connections = [];                                              // stores http connections to server.
	this.maxConnections = 50;                                           // maximum allowed connections.
	this.modules = {};                                                  // container for required modules.
	this.children = [];                                                 // child workers e.g. gulp.
	this.options = {};

	// get Stukko defaults.
	this.defaults = defaults.call(this);
	// call configure applying context.
	this.configure = configure.apply(this, arguments);
	// parse any command line args.
	this.commands = commands.call(this);
	// return for chaining.
	// set instance.
	Stukko.instance = this;
	this.emit('stukko:initialized');
	return this;
}
// inherit Node Events/Emitter.
util.inherits(Stukko, Events);

/**
 * Initialize Stukko.
 * @param {function} [cb] - the callback function after build.
 */
Stukko.prototype.build = function build(cb) {
	this.emit('stukko:build');
	var self = this,
		configure = this.configure,
		minimal = !_.contains(['start', 'run'], this.cmd),
		verCompare;
	if(this.cli && minimal){
		// get our packages.
		configure.packages();
		// merge default options, stukko.json and any options passed.
		configure.options(true);
		// get our logger
		configure.loggers();
		// catch uncaught exceptions;
		configure.uncaughtException();
		this.emit('stukko:completed');
		if(cb) cb();
	} else {
		// get our packages.
		configure.packages();
		// before continuing make sure we have a valid app/version
		if(!this.pkgapp)
			throw new Error('Please verify ' + this.cwd + ' contains a package.json file and that it is valid.');	
		var ver;
		if(!this.local && (!this.pkgapp.dependencies || !this.pkgapp.dependencies.stukko))
			throw new Error('Invalid Stukko application. The package.json loaded does not contain a "Stukko" dependency.');
		ver = this.local ? 'local' : this.pkgapp.dependencies.stukko ;
		// if stukko is pulled from git master don't version check.
		if(!ver)
				throw new Error('Stukko version could not be obtained from package. Verify your dependencies include stukko: "version" ');
		if(!this.local){
			verCompare = utils.helpers.compareVersions(this.pkg.version, ver);
			// there is a version mismatch.
			if(verCompare !== 0){
				if(verCompare < 0)
					throw new Error('Stukko attempted to start using version ' + ver + ' but requries ' + this.pkg.version + '. The application must be upgraded to run using this version of Stukko.');
				if(verCompare > 0)
					throw new Error('The application requires version ' + ver + '. Update Stukko to the required version to run this application.');
			}
		}
		// merge default options, stukko.json and any options passed.
		configure.options();
		// normalize all urls prefixing with cwd.
		// must be called after merge.
		configure.paths();
		// configure our loggers.
		configure.loggers();
		// now that we have our options/log handle uncaught exceptions.
		configure.uncaughtException();
		// initialize database configuration.
		configure.database(function() {
			// use require to load module exports.
			configure.modules();
			// update application settings.
			configure.express();
			// configures management app.
			// TODO work on managment interface later, tabled for now, remove packages (cap, windows-cpu, ip & usage).
			if(self.options.manage)
				configure.management();
			// add middleware
			configure.middleware();
			// add routes.
			configure.routes();
			configure.assets();
			$DEBUG('Stukko configuration completed.');
			self.emit('stukko:completed');
		});
	}
};

/**
 * Expose database client, connection, destroy publicly.
 * @returns {database}
 */
Stukko.prototype.database = function database() {
	return Db.call(this);
};

/**
 * Creates the http server and listens at the specified host/port.
 * @memberOf Stukko
 * @param {string} [port] - the optional port.
 * @param {string} [host] - the optional host directory.
 * @param {function} [cb] - callback upon listening.
 * @returns {stukko}
 */
Stukko.prototype.listen = function listen(port, host, cb) {
	this.emit('stukko:listen');
	var self = this,
		options = this.options,
		ssl = options.ssl,
		server,
		logo;
	// allow passing callback as first arg.
	if(_.isFunction(port)){
		cb = port;
		port = undefined;
	}
	if(_.isFunction(host)){
		cb = host;
		host = undefined;
	}
	options.host = host || options.host;
	options.port = port || options.port;
	$DEBUG('Creating http/https server.');
	if(ssl){
		if(!ssl.cert || !ssl.secret)
			throw new Error('Invalid ssl configuration. SSL requires both certificate and secret.');
		ssl.cert = utils.io.read(ssl.cert);
		ssl.secret = utils.io.read(ssl.secret);
		var https = require('https');
		server = https.createServer(ssl, this.app);
	} else {
		server = http.createServer(this.app);
	}
	// set maxConnections
	server.maxConnections = this.maxConnections;
	// when server is listening listen for shutdown/termination.
	server.on('listening', function () {
		self.emit('express:listening');
		self.listening = true;
		$DEBUG('\nConfiguring listeners for process signals.');
		if(self.platform === 'win32'){
			var line = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			line.on ("SIGINT", function (){
				process.emit('SIGINT');
			});
		}
		process.on('SIGINT', function() {
			self.shutdown();
		});
		process.on('SIGTERM', function() {
			self.shutdown();
		});

	});
	server.on('connection', function (connection){
		// too many connections destroy.
		// although express is also set to maxConnections
		// handle warnings/monitor connections manually.
		if(self.connections.length + 1 > self.maxConnections){
			$LOG.warn(connection.remoteAddress || 'Unknown' + ' - connection was destroyed. Maximum connections exceeded.');
		} else {
			// save the connection to get.
			self.connections.push(connection);
			$DEBUG('Connections: ' + self.connections.length + ' Max Connections: ' + self.maxConnections);
			connection.on('close', function () {
				self.connections.splice(self.connections.indexOf(connection), 1);
			});
		}

	});
	$DEBUG('Listen for server connections.');
	server.listen(this.options.port, this.options.host, function () {
		self.emit('express:listen');
		var session = self.options.middleware.session,
			ver = self.pkgapp.dependencies.stukko;
		$LOG.console.info('Application [' + self.pkgapp.name + ' ' + self.pkgapp.version + ' ] has started successfully.');
		$LOG.console.info('Version: [' + self.pkg.version.replace('^', '') + '] Configuration: [' + self.config + ']');
		if((session.enabled || undefined === session.enabled) && session.options.name)
			$LOG.console.info('Session Store: ' + self.options.middleware.session.options.name);
		if(self.options.db.module !== 'sequelize'){
			$LOG.console.info('Database Engine: ' + self.options.db.module);
		} else {
			$LOG.console.info('Database Engine: ' + self.options.db.module + ' (' + self.options.db.options.dialect + ')');
		}
		$LOG.console.info('View application at http://' + options.host + ':' + options.port + '\n');

		if(self.db && self.db.connected)
			$LOG.info(utils.helpers.stringToCase(self.options.db.module) + ' database [' + self.options.db.options.database + '] ' +
				'has successfully connected.');

		// log to file only that app started.
		$LOG.file.info('Application [' + self.pkgapp.name + '] started at http:// ' + options.host + ':' + options.port );
		if(self.options.browser)
			utils.goto('http://' + options.host + ':' + options.port);
		self.emit('stukko:listening');
		if(_.isFunction (cb)){
			cb.call(self);
		}

	});
	// save to obj instance.
	self.server = server;
	return self;

};

/**
 * Shutsdown the Stukko server.
 * @param {number} [code] - the exit code to supply for process exit, defaults to 0.
 * @param {string} [msg] - an additional message to log/display.
 */
Stukko.prototype.shutdown = function shutdown(code, msg) {
	this.emit('stukko:shutdown');
	var self = this,
		server = this.server,
		exit = process.exit,
		msgType = 'info';
	if(this.exiting) return;
	this.exiting = true;
	console.log(' ');
	$DEBUG('Server shutdown emitted.');
	if(typeof code === 'string'){
		msg = code;
		code = 0;
	}
	code = code === undefined || code === null ? 0 : code;
	if(msg) {
		if(/^(error|info|debug|warn|verbose):/.test(msg)){
			msg = msg.split(':');
			msgType = msg[0];
			msg = msg[1];
		}
	}
	/* if there's no server exit */
	if (!server) {
		exit(1);
	} else {
		// unref server
		server.unref();
		// iterate connections and destroy them.
		// otherwise server may delay in closing.
		_.forEach(this.connections, function (c) {
			c.destroy();
		});
		// kill child processes.
		_.forEach(this.children, function (c) {
			c.kill();
		});
		// close database connection.
		if(this.db) {
			$LOG.console.info('Disconnecting ' + self.options.db.module + ' database ' + self.options.db.options.database || '');
//			self.db.destroy(function(err) {
//				if(err)
//					$LOG.error(err);
//			});
		}
		// slight timeout can prevent minor errors when closing.
		setTimeout(function () {
			server.close(function () {
				$LOG.info('[' + self.directory + '] shutdown successfully.');
				if(msg)
					$LOG[msgType](msg);
				exit(code);
			});
		},500);
	}
};

/**
 * Creates a new Stukko application.
 */
Stukko.prototype.create = function create() {
	this.emit('stukko:creating');
	var self = this,
		npm = utils.npm.call(this),
		packages = [],
		dependencies = [
			'gulp',
			'gulp-if',
			'gulp-watch',
			'yargs',
			'event-stream',
			'gulp-rimraf',
			'gulp-concat',
			'gulp-inject',
			'gulp-uglify',
			'gulp-cssmin',
			'gulp-less',
			'gulp-sass',
			'gulp-html-minifier'
		],
		npmConfig = this.flags || {},
		pkg, name, appPath, structure, manage;

	// get the app name, the path and the dir for the new app file structure.
	name = this.commands[1] || undefined;
	appPath = this.flags.path || this.cwd + '/' + name;
	structure = this.rootdir + '/lib/structure';
	npmConfig.save = true;

	// get the default app package.
	pkg = utils.helpers.tryParseJson(utils.io.read(structure + '/package.json'));
	if(!name)
		throw new Error('Stukko was unable to create the application with name: undefined. ex: stukko create todos');
	if(!pkg)
		throw new Error('Unable to load template package.json. Verify the template exists or reinstall Stukko.');
	if(utils.io.exists(appPath) && !this.flags.overwrite)
		throw new Error('Application path already exists. Backup and delete the directory or use the --overwrite option.');
	// set platform tools if windows.
	if(this.platform === 'win32')
		npmConfig.msvs_version = (this.flags.msvs_version || 2012);
	// set dependencies and name.
	pkg.name = name;
	_.forEach(dependencies, function (d) {
		var dependency = self.pkg.devDependencies[d] || self.pkg.dependencies[d];
		pkg.dependencies[d] = dependency;
		packages.push(d + '@' + dependency);
	});
	// copy file app structure.
	$LOG.info('Installing file structure.')
	utils.io.copy(structure, appPath, function (err) {
		delete pkg.dependencies.stukko; // shouldn't exist but in case.
		packages.push('stukko@' + self.pkg.version);
		pkg.dependencies.stukko = self.pkg.version;
		if(self.flags.packages)
			packages = packages.concat(self.flags.packages);
		if(!err){
			// save the updated package.
			utils.io.write(appPath + '/package.json', JSON.stringify(pkg, null, '\t'));
			// install npm packages.
			$LOG.info('Please be patient installing application packages via npm.');
			npm.install(packages, npmConfig, function (err, data) {
				if(err) {
					$LOG.error(err.message);
					throw new Error('Stukko was unable to auto install npm packages.' +
						'\n       Option 1: run npm cache clean then run create again with the --overwrite flag.' +
						'\n       Option: 2: Install manually by cd /to/your/app/path then run npm install.' +
						'\n       Windows Users: you may need to specify the --msvs_version flag for packages requiring node-gyp.' +
						'\n       ex: stukko create appName --msvs_version=<version> where <version> is your version of Visual Stuido.\n');
				}
				// show success message.
				$LOG.info('[' + name + '] was successfully created.');
				self.emit('stukko:created');
			});
		}
	});

};

/**
 * Upgrades a Stukko application.
 */
Stukko.prototype.upgrade = function upgrade() {
	var self = this,
		prompt = require('prompt'),
		colors = require('colors'),
		bkupPath = this.options.backup || '../' + this.pkgapp.name + '-backup',
		appVer = this.pkgapp.dependencies.stukko.replace('~', '').replace('^', ''),
		updatePkgPath = self.rootdir + '/lib/updates/updatepkg-' +	self.pkg.version + '.js',
		verCompare,
		updatePkg,
		message,
		questions;
	if(appVer === this.pkg.version)
		return $LOG.info(this.pkgapp.name + ' is up to date. (ver: ' + this.pkg.version + ')');
	if(!utils.io.exists(updatePkgPath))
		throw new Error('Fatal unrecoverable error. You may file an issue at ' +
			'https://github.com/origin1tech/stukko/issues if the problem persists.');
	// make sure we can upgrade
	updatePkg = require(updatePkgPath);
	//verCompare = utils.helpers.compareVersions(self.pkg.version, appVer, { zeroExtend: true });
	// TODO: calculate how many version back.
//	if(verCompare > updatePkg.diff)
//		return $LOG.error('Unable to upgrade from version ' + appVer + '. You need version ' + updatePkg.min +
//			' or greater to upgrade.');
	message = '\nPlease backup before upgrading from version [' + appVer + '] to [' + this.pkg.version + ']';
	console.log(message.blue);
	questions = {
		properties: {
			backup: {
				description: 'Backup location:'.blue,
				"default":	bkupPath
			},
			confirm: {
				description: 'Continue and upgrade yes/no:'.blue,
				"default": 'no'
			}
		}
	};
	prompt.start();
	prompt.message = '';
	prompt.delimiter = '';
	prompt.get(questions, function(err, result) {
		if(err){
			if(err.message === 'canceled'){
				console.log(' ');
				$LOG.warn('Upgrade has been aborted.');
			} else {
				$LOG.error(err);
			}
		} else {
			if(!/yes/g.test(result.confirm)){
				console.log(' ');
				$LOG.warn('Upgrade canceled.');
			}else {
				// backup the application.
				self.backup(bkupPath, function() {

					// update to new package versions via Stukko dev
					// dependencies, add new stukko pkg. manually.
					_.forEach(self.pkg.devDependencies, function (v,k) {
						self.pkgapp.dependencies[k] = v;
					});
					self.pkgapp.dependencies.stukko = '^' + self.pkg.version;
					// see if there are any files that need to be updated.
					if(updatePkg.files){
						_.forEach(updatePkg.files, function (v,k) {
							utils.io.copy(self.rootdir + v.src, self.cwd + v.dest);
						});
					}
					// even though we are updating actually call install
					// to ensure all packages are installed to current version.
					self.npm('install', function () {
						$LOG.info(self.pkgapp.name + ' has been successfully upgraded.');
					});
				});
			}
		}
	});
};

/**
 * Backs up a Stukko application.
 * @param {string} [bkupPath] - optional path or use options.backup for path.
 * @param {function} [cb] - a callback on backup completion.
 */
Stukko.prototype.backup = function backup(bkupPath, cb) {
	var gulp = require('./gulp');
	bkupPath = bkupPath || this.commands[1] || this.options.backup;
	gulp = gulp.call(this);
	if(!_.isString(bkupPath)){
		if(bkupPath === false)
			return $LOG.warn('Backup is set to false. To backup set "backup" in your configuration to a valid path.');
		else
			return $LOG.error('The path ' + bkupPath + ' is not valid.');
	}
	bkupPath = utils.helpers.pathToAbsolute(bkupPath);
	if(utils.helpers.containsDirectory(bkupPath, this.directory))
		return $LOG.error('You CANNOT backup to a directory within your project.');
	if(!utils.io.exists(bkupPath))
		utils.io.mkdir(bkupPath);
	this.options.backup = bkupPath;
	gulp.backup(cb);
};

Stukko.prototype.restore = function restore(bkupPath) {
	var self = this,
		gulp = require('./gulp'),
		prompt = require('prompt'),
		colors = require('colors'),
		primaryDepends = this.pkgapp.dependencies,
		merge = true,
		compareDepends,
		result,
		bkupPkgPath;
	bkupPath = bkupPath || this.commands[1] || this.options.backup;
	merge = self.flags.merge === undefined || self.flags.merge;
	if(!_.isString(bkupPath)){
		if(bkupPath === false)
			return $LOG.warn('Backup is set to false. To backup set "backup" in your configuration to a valid path.');
		else
			return $LOG.error('The path ' + bkupPath + ' is not valid.');
	}
	bkupPath = utils.helpers.pathToAbsolute(bkupPath);
	if(!utils.io.exists(bkupPath))
		return $LOG.error('Unable to locate the specified backup path.');
	gulp = gulp.call(this);
	prompt.start();
	prompt.message = '';
	prompt.delimiter = '';
	prompt.get({
		properties: {
			confirm: {
				description: 'Are you sure? This cannot be undone yes/no:'.blue,
				"default": 'no'
			}
		}
	}, function(err, result) {
		if(err)
			if(err.message === 'canceled')
				$LOG.warn('\nRestore has been aborted.');
			else
				throw(err);
		else
		if(!/yes/g.test(result.confirm)){
			$LOG.error('Restore canceled.');
		}else {
			bkupPkgPath = path.join(bkupPath, '/package.json');
			compareDepends = utils.io.read(bkupPkgPath);
			compareDepends = utils.helpers.tryParseJson(utils.io.read(bkupPkgPath));
			if(!compareDepends)
				return $LOG.error('Unable to restore. Restore path ' + bkupPkgPath + ' does not contain a valid package.json file.');
			compareDepends = compareDepends.dependencies;
			if(merge)
				result = utils.helpers.mergeDependencies(primaryDepends, compareDepends);
			gulp.restore(function() {
				// dependencies were updated re-install
				// to ensure current package versions.
				if(result.merged){
					self.pkgapp.dependencies = result.dependencies;
					$LOG.info('Application restore requires package updates please wait...');
					self.npm('install', function () {
						$LOG.info('Application ' + self.pkgapp.name + ' has been successfully restored.');
					});
				} else {
					$LOG.info('Application ' + self.pkgapp.name + ' has been successfully restored.');
				}
			});
		}
	});
};

/**
 * Returns information about the Stukko instance and application loaded.
 * @param {string} [key] - when key is passed returns only that key of the info object.
 */
Stukko.prototype.info = function info(key) {
	var	self = this,
		ver = utils.helpers.getVersion(this.pkgapp.dependencies.stukko),
		info = '',
		newline = '\n',
		spacer = '   ',
		proc,
		oper;
	if(!this.pkgapp)
		throw new Error('Unable to load application package. Try cd /path/to/your/application then run stukko info again.');
	proc = this.diag.get(null).process;
	oper = this.diag.get(null, ['cpus', 'network']).os;
	ver = ver === 'master'? 'git master' : ver || 'Unknown';

	info += '\nINFO\n===============================================================\n\n';
	info += 'Application';
	info += newline + spacer + 'Stukko: ver ' + ver;
	info += newline + spacer + 'Application: ' + this.pkgapp.name;
	info += '\n\nProcess';

	_.forEach(proc, function (v,k){
		if(_.contains(['memory', 'heap total', 'heap used'], k))
			v = self.diag.format(v);
		info += newline + spacer + k + ': ' + v;
	});
	info += '\n\nSystem';
	_.forEach(oper, function (v,k){
		if(_.contains(['total memory', 'free memory', 'used memory'], k))
			v = self.diag.format(v);
		info += newline + spacer + k + ': ' + v;
	});
	console.log(info);
};

/**
 * Displays Stukko help.
 */
Stukko.prototype.help = function help() {
	var	help = '',
		newline = '\n',
		spacer = '   ';
	help += '\nHELP\n===============================================================\n\n';
	help += 'Usage: stukko <command>\n';
	help += newline + 'where <command> is listed below:';
	help += newline + spacer + 'start: starts an application. (alias: run)';
	help += newline + spacer + 'create: creates a new application. (alias: new)';
	help += newline + spacer + 'info: returns application information and diagnostics.';
	help += newline + spacer + 'help: shows help information and commands.';
	help += '\n\nOptions: to view further command options visit http://www.stukkojs.com.';
	help += '\n\nTo shutdown an application use ctrl C on your keyboard.';
	console.log(help);
};

/**
 * Kill the current process or all if true is passed.
 * Use caution with this command.
 * @params {boolean|number} pid - if true kills all node processes.
 */
Stukko.prototype.kill = function kill(pid) {
	self.emit('stukko:killing');
	// if no pid kill the current process.
	if(!pid){
		$LOG.info('Killing process: ' + process.pid + ' for application [' + this.directory + '].\n      This will ' +
			'immediately halt the application. A restart will be required.');
		process.kill(process.pid, 'SIGINT');
	} else {
		var childProc = require('child_process');
		if(pid === true) {
			$LOG.console.info('Killing all node processes.');
			if(this.platform === 'win32')
				childProc.exec('taskkill /F /IM node.exe');
			else
				childProc.exec('killall node');
		} else {
			$LOG.info('Killing process: ' + process.pid);
			process.kill(pid, 'SIGINT');
		}
	}
};

Stukko.prototype.processes = function processes() {
	var self = this,
		childProc = require('child_process'),
		child;
	function handleProcess(err, stdout, stderr) {
		if(err || stderr)
			$LOG.error(err || stderr);
		console.log(stdout.toString() || '');
	}
	if(self.platform === 'win32'){
		child = childProc.exec('tasklist /fi "imagename eq node.exe"', handleProcess);
	} else {
		child = childProc.exec('ps aux | grep node', handleProcess);
	}
	child.on('close', function () {
		child.kill();
	});
};

/**
 * Wrapper to npm to better facilitate install, update, uninstall with Stukko.
 * @param {string} cmd - the name of the npm command. (install, update, uninstall).
 * @param {function} [cb] - callback to call on completion.
 */
Stukko.prototype.npm = function (cmd, cb) {
	var self = this,
		npm = utils.npm.call(this),
		npmConfig = this.flags,
		commands = _.clone(this.commands || []).slice(1, (this.commands || []).length),
		modules = [];
	npmConfig.save = true;
	if(!this.pkgapp){
		$LOG.warn('Oops doesn\'t look like there\'s anything to do. Are you sure this is a Stukko application?');
		return;
	}
	_.forEach(this.pkgapp.dependencies || [], function (v,k) {
		if(cmd === 'install')
			modules.push(k + '@' + v);
		else
			modules.push(k);
	});
	// if specific modules were passed use instead of all listed dependencies.
	if(commands.length)
		modules = commands;
	function removeAll() {
		$LOG.info('Removing directory files.');
		utils.io.removeFiles(self.cwd);
		$LOG.warn('All files in the directory have been removed! \n      However the directory folder must be ' +
			'removed manually.');
	}
	npm[cmd](modules, npmConfig, function (err, data) {
		if(err) {
			$LOG.error(err.message);
			$LOG.error('See "https://github.com/origin1tech/stukko/issues" to report issues.');
		} else {
			$LOG.info(cmd + ' of (' + modules.length + ') module(s) was successfull.');
			if(self.flags.all && cmd === 'uninstall')
				removeAll();
			if(cb) cb();
		}
	});
};
