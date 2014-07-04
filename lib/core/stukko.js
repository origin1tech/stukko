'use strict';

var util = require('util'),
	express = require('express'),
	http = require('http'),
	p = require('path'),
	childProc = require('child_process'),
    conf = require('./configuration'),
    Events = require('events'),
	configure = conf.configure,
	utils = require('../utils'),
	commands = require('./commands'),
	readline = require('readline'),
	diag = utils.diag,
	Db = require('./configuration/db'),
	defaults = require('./configuration/defaults');

// make lodash globally accessible.
GLOBAL._ = require('lodash');

module.exports = Stukko;

/**
 * Stukko instance, options passed overwrite options.json options.
 * @class Stukko
 * @param {object|string} [options] - options for initializing server see constructor source for options.
 * @param {string} [config] - the directory of the config to load. default is used if not specified.
 * @constructor
 */
function Stukko(options, config) {

	Events.EventEmitter.call(this);

	var self = this,
		cwd = process.cwd();

	if(!this)
		throw new Error('Stukko must be instantiated with new Stukko()');

	this.inspect = util.inspect;
	this.format = util.format;
	this.pid = process.pid;                                             // get the process id for the current process.
	this.directory = p.basename(cwd);                                   // working directory name.
	this.debug = typeof(v8debug) === 'object';                          // application is debugging.
	this.utils = utils;                                                 // make utilities accessible in instance.
	this.rootdir = p.join(__dirname, '../../');                         // the root directory of stukko.
	this.cwd = cwd;                                                     // the current working directory.
	this.pkg = undefined;                                               // stukko package.json
	this.pkgapp = undefined;                                            // the application package.json.
	this.platform = process.platform;                                   // the platform stukko is running on.
	this.diag = diag.call(this);                                        // calling .get() returns current diagnostics.
	this.log = {};                                                      // winston loggers.
	this.config = 'development';                                        // the loaded config name.
	this.start = false;													// When true start has been requested.
	this.listening = false;                                             // Stukko's listening state.
	this.exiting = false;                                               // Stukko's exit state.

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
	this.options = {};                                                  // store config options.
    this.onListening = undefined;                                       // called after server is ready & listening if provided.

	// get Stukko defaults.
	this.defaults = defaults.call(this);

	// call configure applying context.
	this.configure = configure.apply(this, arguments);

	// parse any command line args.
	this.commands = commands.call(this);

	// return for chaining.
	return this;

}
// inherit Node Events/Emitter.
util.inherits(Stukko, Events.EventEmitter);

Stukko.prototype.userCommands = {};

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

	var self = this,
		ssl = this.options.ssl,
		server;

	// allow passing callback as first arg.
	if(_.isFunction(port)){
		cb = port;
		port = undefined;
	}

	if(_.isFunction(host)){
		cb = host;
		host = undefined;
	}

    if(cb)
        this.onListening = cb;

	this.options.host = host || this.options.host;
	this.options.port = port || this.options.port;


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

        $DEBUG('Creating listeners for termination signals.');
        self.emit('listening');
		self.listening = true;
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
			connection.on('close', function () {
				self.connections.splice(self.connections.indexOf(connection), 1);
			});
		}
	});

	$DEBUG('Starting server to listen for connections.');

    // start the server.
	server.listen(this.options.port, this.options.host);
	this.server = server;


};

/**
 * Shutsdown the Stukko server.
 * @param {number} [code] - the exit code to supply for process exit, defaults to 0.
 * @param {string} [msg] - an additional message to log/display.
 */
Stukko.prototype.shutdown = function shutdown(code, msg) {

	var self = this,
		server = this.server,
		exit = process.exit,
		msgType = 'info';
	if(this.exiting) return;
	this.exiting = true;
	this.emit('shutdown');
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
			self.db.destroy(function(err) {
				if(err)
					$LOG.error(err);
			});
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
Stukko.prototype.generate = function generate() {

	var self = this,
		npm = utils.npm.call(this),
		packages = [],
		dependencies = [
			'gulp',
			'gulp-if',
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
	appPath = this.flags.path || p.join(this.cwd,  '/' + name);
	structure = p.join(this.rootdir, '/lib/structure');
	npmConfig.save = true;
    npmConfig.prefix = appPath;

	// get the default app package.
	pkg = utils.helpers.tryParseJson(utils.io.read(structure + '/package.json'));
	if(!name)
		return $LOG.error('Stukko was unable to generate the application with name: undefined. ex: stukko generate todos');

	if(!pkg)
		return $LOG.error('Unable to load template package.json. Verify the template exists. You may need to reinstall Stukko.');

	if(utils.io.exists(appPath) && !this.flags.overwrite)
		return $LOG.error('Application path already exists. Backup and delete the directory or use the --overwrite option.');

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

			// install npm packages.
			$LOG.info('Please be patient installing application packages via npm.');
			npm.install(packages, npmConfig, function (err, data) {
				if(err) {
					$LOG.error(err.message);
					$LOG.error('Stukko was unable to auto install npm packages.' +
						'\n       Option 1: run npm cache clean then run generate again with the --overwrite flag.' +
						'\n       Option: 2: Install manually by cd /to/your/app/path then run npm install.' +
						'\n       Windows Users: you may need to specify the --msvs_version flag for packages requiring node-gyp.' +
						'\n       ex: stukko generate appName --msvs_version=<version> where <version> is your version of Visual Stuido.\n');
				}
                // save the updated package.
                utils.io.write(appPath + '/package.json', JSON.stringify(pkg, null, '\t'));
				// show success message.
				$LOG.info('[' + name + '] was successfully created.');
				self.emit('created');

			});
		}
	});

};

/**
 * Backs up a Stukko application.
 * @param {string} [bkupPath] - optional path or use options.backup for path.
 * @param {function} [cb] - a callback on backup completion.
 */
Stukko.prototype.backup = function backup(bkupPath, cb) {

	var gulp = require('./configuration/gulp');
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

/**
 * Restore application from backup.
 * @param {string} bkupPath - the root folder back of your backup.
 */
Stukko.prototype.restore = function restore(bkupPath) {

	var self = this,
		gulp = require('./configuration/gulp'),
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

			bkupPkgPath = p.join(bkupPath, '/package.json');
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

	info += '\nDIAGNOSTICS\n===============================================================\n\n';
	info += 'Application';
	info += newline + spacer + 'Stukko: ver ' + this.pkg.version;
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
    require('colors');
	help += '\nHELP\n===============================================================\n\n';
	help += 'Usage: stukko <command>\n';
	help += newline + 'where <command> is listed below:\n';
	help += newline + spacer + 'start:     '.green + ' starts an application. (alias: run)';
	help += newline + spacer + 'create:    '.green + ' creates a new application. (alias: new)';
	help += newline + spacer + 'upgrade:   '.green + ' upgrades an application to latest version.\n';
	help += newline + spacer + 'backup:    '.green + ' backs up application by specified location.';
	help += newline + spacer + 'restore:   '.green + ' restores application by specified location.';
	help += newline + spacer + 'install:   '.green + ' convenience wrapper to npm (same as npm install).';
	help += newline + spacer + 'uninstall: '.green + ' convenience wrapper to npm (same as npm uninstall).\n';
	help += newline + spacer + 'diag:      '.green + ' returns application information and diagnostics.';
	help += newline + spacer + 'processes: '.green + ' lists all Node processes.\n';
	help += newline + spacer + 'kill:      '.red + ' kills a node process or all processes.';
	//help += newline + spacer + 'help:      '.blue + ' shows help information and commands.';
	help += '\n\nVisit http://www.stukkojs.com. for additional documentation.';
	help += '\nControl C to shutdown your application.';
	console.log(help);
};

/**
 * Kill the current process or all if true is passed.
 * Use caution with this command.
 * @params {boolean|number} pid - if true kills all node processes.
 */
Stukko.prototype.kill = function kill(pid) {

    var child,
        hasErr = false;
    pid = pid || this.flags.pid;


	// if no pid kill the current process.
    function handleChild(err, stdout, stderr) {
        if(err || stderr){
            var msg = err ? err.message || 'Unknown exception' : stderr.message || 'Unknown exception.';
            hasErr = true;
            $LOG.error(msg);
        }
    }

	if(!pid){
		$LOG.info('Killing process: ' + process.pid);
		process.kill(process.pid, 'SIGINT');

	} else {

		if(pid === true) {
			$LOG.console.info('Killing all node processes.');
			if(this.platform === 'win32')
				child = childProc.exec('taskkill /F /IM node.exe', handleChild);
			else
				child = childProc.exec('killall node', handleChild);
		} else {
			$LOG.info('Killing process: ' + process.pid);
			process.kill(pid, 'SIGINT');
		}
	}

    // make sure the child is killed.
	child.on('close', function () {
		child.kill();
	});
};

/**
 * Displays active node processes.
 */
Stukko.prototype.processes = function processes() {

	var self = this,
        hasErr = false,
		child;
    function handleChild(err, stdout, stderr) {
        if(err || stderr){
            var msg = err ? err.message || 'Unknown exception' : stderr.message || 'Unknown exception.';
            hasErr = true;
            $LOG.error(msg);
        }
    }

	if(self.platform === 'win32'){
		child = childProc.exec('tasklist /fi "imagename eq node.exe"', handleChild);
	} else {
		child = childProc.exec('ps aux | grep node', handleChild);
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
