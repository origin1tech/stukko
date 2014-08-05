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

	// make lodash globally accessible.
	GLOBAL._ = require('lodash');

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
    this.running = false;                                               // indicates Stukko is processing a command.

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


	$$DEBUG('Creating http/https server.');

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

        $$DEBUG('Creating listeners for termination signals.');
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
			$$LOG.warn(connection.remoteAddress || 'Unknown' + ' - connection was destroyed. Maximum connections exceeded.');
		} else {
			// save the connection to get.
			self.connections.push(connection);
			connection.on('close', function () {
				self.connections.splice(self.connections.indexOf(connection), 1);
			});
		}
	});

	$$DEBUG('Starting server to listen for connections.');

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
	$$DEBUG('Server shutdown emitted.');

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
			$$LOG.console.info('Disconnecting ' + self.options.db.module + ' database ' + self.options.db.options.database || '');
			self.db.destroy(function(err) {
				if(err)
					$$LOG.error(err);
			});
		}

		// slight timeout can prevent minor errors when closing.
		setTimeout(function () {
			server.close(function () {
				$$LOG.info('[' + self.directory + '] shutdown successfully.');
				if(msg)
					$$LOG[msgType](msg);
				exit(code);
			});
		},500);

	}
};

/**
 * Used to pass message & code for exiting process.
 * @memberof Stukko
 * @param {string} [msg] - the message to display on exit.
 * @param {string} [type] - the message type to display.
 * @param {number} [code] - the process exit code, defaults to 0.
 */
Stukko.prototype.exit = function exit(msg, type, code) {

    code = code || 0;
    type = type || 'info';

    // log message if supplied.
    if(msg)
        $$LOG[type](msg);

    // exit the application.
    process.exit(code);
    
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
			'gulp-html-minifier',
            'gulp-browserify'
		],
		npmConfig = this.flags || {},
		pkg, name, appPath, structure, manage, force;

	// get the app name, the path and the dir for the new app file structure.
	name = this.commands[1] || undefined;
	appPath = this.flags.path || this.flags.p || p.join(this.cwd, name);
	structure = p.join(this.rootdir, '/lib/structure');
	npmConfig.save = true;
    npmConfig.prefix = appPath;
    force = this.flags.force || this.flags.f;

	// get the default app package.
	pkg = utils.helpers.tryParseJson(utils.io.read(p.join(structure,'/package.json')));
	if(!name)
		this.exit('Stukko was unable to generate the application with name: undefined. ex: stukko generate todos', 'error');

	if(!pkg)
		this.exit('Unable to load template package.json. Verify the template exists. You may need to reinstall Stukko.', 'error');

	if(utils.io.exists(appPath) && !force)
		this.exit('Application path already exists. Backup and delete the directory or use the --overwrite option.', 'error');

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
	$$LOG.info('Installing file structure.')
	utils.io.copy(structure, appPath, function (err) {

		delete pkg.dependencies.stukko; // shouldn't exist but in case.
		//packages.push('stukko@' + self.pkg.version);
		//pkg.dependencies.stukko = self.pkg.version;
		if(self.flags.local)
        	packages.push('origin1tech/stukko');
        pkg.dependencies.stukko = 'origin1tech/stukko';

		if(self.flags.packages)
			packages = packages.concat(self.flags.packages);
		if(!err){

			// install npm packages.
			$$LOG.info('Please be patient installing application packages via npm.');
			npm.install(packages, npmConfig, function (err, data) {
				if(err) {
					$$LOG.error(err.message, err.stack);
					$$LOG.console.error('Stukko was unable to auto install npm packages.' +
						'\n       Option 1: run npm cache clean then run generate again with the --overwrite flag.' +
						'\n       Option: 2: Install manually by cd /to/your/app/path then run npm install.' +
						'\n       Windows Users: you may need to specify the --msvs_version flag for packages requiring node-gyp.' +
						'\n       ex: stukko generate appName --msvs_version=<version> where <version> is your version of Visual Stuido.\n');
				} else {
                    // save the updated package.
                    utils.io.write(p.join(appPath,'/package.json'), JSON.stringify(pkg, null, '\t'));
                    // show success message.
                    $$LOG.info('[' + name + '] was successfully created.');
                    self.emit('created');
                }

			});
		}
	});

};

/**
 * Populates database with seed data.
 */
Stukko.prototype.seed = function seed() {

    var self = this,
        Chance = require('chance'),
        Promise = require('bluebird'),
        promises = [],
        chance;

    // try to load seeds if not already.
    if(!this.modules.seeds)
        this.modules.seeds = self.options.modules.seeds ? utils.reqeach(self.options.modules.seeds) : undefined;

    // check for seeds when in development environment.
    if(this.options.env === 'development' && this.modules.seeds
        && Object.keys(this.modules.seeds).length) {

        // create instance of chance.
        chance = new Chance();

        // iterate each seed and update table.
        _.forEach(this.modules.seeds, function(v,k) {
            var fn;
            if(_.isFunction(v)){

                if(self.options.db.module === 'sequelize'&& self.db.models
                    && Object.keys(self.db.models).length){
                    fn = v.call(self, self.db.connection, self.db.client, chance);
                }
                if(self.options.db.module === 'mongoose' && self.db.models
                    && Object.keys(self.db.models).length){
                    fn = v.call(self, self.db.Schema, self.db.model, chance);
                }
                if(self.options.db.module === 'mongodb'){
                    fn = v.call(self, self.db.connection, chance);
                }
                if(self.options.db.module === 'dirty'){
                   fn = v.call(self, self.db.connection, chance);
                }
                if(self.options.db.module === 'redis'){
                    fn =v.call(self, self.db.connection, chance);
                }
                // add the promise to the collection.
                promises.push(fn);

            }
        });

        // apply promise and call seeds.
        Promise.all(promises).then(function () {
            this.exit('Succesfully processed (' + promises.length + ') seeds.');
        });

    }
};

/**
 * Copies files/folder source to output destination.
 * @memberof Stukko
 * @param {string} source - the source path relative to templates directory.
 * @param {string} dest - the destination path relative to root of application.
 * @param {boolean} [force] - when true if destination exists it will be overwritten.
 */
Stukko.prototype.copy = function copy(source, dest, force) {

    var self = this,
        running,
        tempRoot, srcStat, destStat;

    if(!this.options.templates)
        this.exit('Templates are not defined', 'warn');
    
    source = source || this.commands[1] || this.flags.source || this.flags.s || undefined;
    dest = dest || this.commands[2] || this.flags.dest || this.flags.d || undefined;
    force = force || this.flags.force || this.flags.f;
    
    if(!source || !dest)
        this.exit('Boilerplate templating cannot run without both a source and destination.', 'warn');
    
    // get the template root.
    tempRoot = p.join(this.options.templates);
    
    // get full path to source and destination.
    source = p.join(tempRoot, source);
    dest = p.join(this.cwd, dest);

    srcStat = utils.io.stat(source);
    destStat = utils.io.stat(dest);

    if(srcStat.isFile())
        dest = p.join(dest, p.basename(source));
    
    // make sure both above exist.
    if(!utils.io.exists(source))
       this.exit('The path ' + source + ' could not be found.', 'warn');

    if(utils.io.exists(dest) && srcStat.isFile() && !force)
        this.exit('The path ' + dest + ' exists, use flag --force if you wish to overwrite.', 'warn');

    utils.io.copy(source, dest, function (err) {
        if(err)
            self.exit(err, 'error');
        self.exit('Successful output to: ' + dest, 'info');
    });

};

// updates application from git allowing checkout of specific commit.
// uses "master
/**
 * Checkout will pull down the master by default.
 * If you specify the --release flag it will pull it instead.
 * You can also pass the --url flag, Stukko will use the url specified.
 * @example stukko checkout or stukko checkout --release v1.0.1 or stukko checkout --url "the full https url or git uri"
 */
Stukko.prototype.checkout = function checkout() {

    var uri = "origin1tech/stukko",
        release = this.flags.release,
        url = this.flags.url;

    if(url)
        uri = url;
    else
        if(release)
            uri = 'git://github.com/origin1tech/stukko.git#' + release;

    console.log('\n');
    $$LOG.console.info('Installing from git repository: ' + uri + '\n');
    this.npm('install', [uri], function () {
        $$LOG.console.info('Checkout done.');
        process.exit(0);
    });
};

/**
 * Returns information about the Stukko instance and application loaded.
 * @param {string} [key] - when key is passed returns only that key of the info object.
 */
Stukko.prototype.diagnostics = function diagnostics(key) {

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
    process.exit(0);

};

/**
 * Displays Stukko help.
 */
Stukko.prototype.help = function help() {

	var	help = '',
		nl = '\n',
		spacer = '   ';
    require('colors');
	help += '\nHELP\n===============================================================\n\n';
	help += 'Usage: stukko <command>\n';
	help += nl + 'where <command> is listed below:\n';
	help += nl + spacer + 'start:     '.green + ' starts an application. (alias: run)';
	help += nl + spacer + 'create:    '.green + ' creates a new application. (alias: new)';
    help += nl + spacer + 'seed:      '.green + ' runs seed data against your database. (alias: populate)';
    help += nl + spacer + 'template:  '.green + ' copies boilerpalate to area in application (alias: boiler, boilerplate, area)';
    help += nl + spacer + 'install:   '.green + ' convenience wrapper to npm (same as npm install).';
    help += nl + spacer + 'uninstall: '.green + ' convenience wrapper to npm (same as npm uninstall).\n';
	help += nl + spacer + 'upgrade:   '.green + ' upgrades an application to latest version.\n';
	help += nl + spacer + 'backup:    '.green + ' backs up application by specified location.';
	help += nl + spacer + 'restore:   '.green + ' restores application by specified location.';
    help += nl + spacer + 'checkout:  '.green + ' checkout master or release from source repository.\n';
	help += nl + spacer + 'diag:      '.green + ' returns application information and diagnostics.';
	help += nl + spacer + 'processes: '.green + ' lists all Node processes, hand for ADDRESS IN USE error.\n';
	help += nl + spacer + 'kill:      '.red +   ' kills a node process or all processes.';
	help += '\n\nVisit http://www.stukkojs.com. for additional documentation.';
	help += '\nControl C to shutdown your application.';
	console.log(help);
    process.exit(0);
};

/**
 * Kill the current process or all if true is passed.
 * Use caution with this command.
 * @params {boolean|number} pid - if true kills all node processes.
 */
Stukko.prototype.kill = function kill(pid) {

    var child,
        hasErr = false;
    pid = pid || this.flags.pid || this.flags.all;


	// if no pid kill the current process.
    function handleChild(err, stdout, stderr) {
        if(err || stderr){
            var msg = err ? err.message || 'Unknown exception' : stderr.message || 'Unknown exception.';
            hasErr = true;
            $$LOG.error(msg);
        }
    }

	if(!pid){
		$$LOG.info('Killing process: ' + process.pid);
		process.kill(process.pid, 'SIGINT');

	} else {

		if(pid === true) {
			$$LOG.console.info('Killing all node processes.');
			if(this.platform === 'win32')
				child = childProc.exec('taskkill /F /IM node.exe', handleChild);
			else
				child = childProc.exec('killall node', handleChild);
		} else {
			$$LOG.info('Killing process: ' + process.pid);
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
            $$LOG.error(msg);
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
Stukko.prototype.npm = function (cmd, modules, cb) {

	var self = this,
		npm = utils.npm.call(this),
		npmConfig = this.flags,
		commands = _.clone(this.commands || []).slice(1, (this.commands || []).length);

    if(_.isFunction(modules)) {
        cb = modules;
        modules = undefined;
    }

    if(modules) commands = undefined;
    modules = modules || [];

	npmConfig.save = true;
	if(!this.pkgapp){
		$$LOG.warn('Oops doesn\'t look like there\'s anything to do. Are you sure this is a Stukko application?');
		return;
	}

    if(!modules.length && !commands){
        _.forEach(this.pkgapp.dependencies || [], function (v,k) {
            if(cmd === 'install')
                modules.push(k + '@' + v);
            else
                modules.push(k);
        });
          // if checkout is passed also install stukko from source.
        if(this.flags.checkout){
            var idx = _.findIndex(modules, function (m) {
                return /^stukko.+/.test(m);
            });
            modules.splice(idx, 1);
            modules.push('origin1tech/stukko');
        }
    } else {
        if(!modules.length)
            modules = commands;
    }

	function removeAll() {
		$$LOG.info('Removing directory files.');
		utils.io.removeFiles(self.cwd);
		$$LOG.warn('All files in the directory have been removed! \n      However the directory folder must be ' +
			'removed manually.');
	}

    if(!modules.length)
      this.exit('Nothing to update exiting npm...', 'warn');

	npm[cmd](modules, npmConfig, function (err, data) {
		if(err) {
			$$LOG.error(err.message);
			$$LOG.error('See "https://github.com/origin1tech/stukko/issues" to report issues.');
		} else {
			$$LOG.info(cmd + ' of (' + modules.length + ') module(s) was successfull.');
			if(self.flags.all && cmd === 'uninstall')
				removeAll();
			if(cb) cb();
		}
	});

};
