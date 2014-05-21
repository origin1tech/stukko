'use strict';

var npm = require("npm"),
	_ = require('lodash');

module.exports = Npm;

function Npm(modules, cwd, config, cb){

	var defaults = { loaded: false };

	// change dir to the application path.
	process.chdir(cwd);

	if(_.isFunction(config)){
		cb = config;
		config = {};
	}

	config = _.extend(defaults, config);

	if(_.isString(modules))
		modules = [modules];

	npm.load(config, function (err) {

		if(err)
			throw err;

		npm.commands.install(modules, function (err, data) {
			if(err)
				cb(err);
			if(_.isFunction(cb))
				cb();
		});

		npm.on("log", function (message) {
			console.log(message.toString());
		});

	});

}
