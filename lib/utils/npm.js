'use strict';

var npm = require("npm");

module.exports = Npm;

function Npm(){

	var self = this,
		cmd = undefined;

    /**
     * Normalizes modules before running npm.
     * @private
     * @param {string|array} modules - the modules to process.
     * @param {object} config - the npm configuration object/options.
     * @returns {{modules: array, config: object}}
     */
	function normalize(modules, config) {
		var defaults = { loaded: false };
		if(_.isString(modules))
			modules = [modules];
		// change dir to the application path.
		process.chdir(self.cwd);
		config = _.extend(defaults, config);
		return { modules: modules, config: config };
	}

    /**
     * Runs the requested npm command.
     * @private
     * @param {array} modules - an array of modules to process.
     * @param {object} config - the configuration object/options.
     * @param {function} cb - callback on completion.
     */
	function run(modules, config, cb) {
		var normalized;
		if(_.isFunction(config)){
			cb = config;
			config = {};
		}
		normalized = normalize(modules, config);
		modules = normalized.modules;
		config = normalized.config;
		npm.load(config, function (err) {
			if(err)
				throw err;
			npm.commands[cmd](modules, function (err, data) {
				cmd = undefined;
				if(_.isFunction(cb))
					cb(err, data);
			});
			npm.on("log", function (message) {
				$LOG.info(message.toString());
			});
		});
	}

    /**
     * Npm install command.
     * @param {array} modules - an array of modules to process.
     * @param {object} config - the configuration object/options.
     * @param {function} cb - callback on completion.
     */
	function install(modules, config, cb) {
		cmd = 'install';
		run.apply(null, arguments);
	}

    /**
     * Npm update command.
     * @param {array} modules - an array of modules to process.
     * @param {object} config - the configuration object/options.
     * @param {function} cb - callback on completion.
     */
	function update(modules, config, cb) {
		cmd = 'update';
		run.apply(null, arguments);
	}

    /**
     * Npm uninstall command.
     * @param {array} modules - an array of modules to process.
     * @param {object} config - the configuration object/options.
     * @param {function} cb - callback on completion.
     */
	function uninstall(modules, config, cb) {
		cmd = 'uninstall';
		run.apply(null, arguments);
	}

	return {
		install: install,
		update: update,
		uninstall: uninstall
	};
}
