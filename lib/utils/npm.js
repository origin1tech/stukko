var npm = require("npm"),
	_ = require('lodash');

module.exports = Npm;

function Npm(modules, cwd, config, cb){

	var defaults = { loaded: false };

	config = _.extend(defaults, config);

	if(_.isString(modules))
		modules = [modules];

	// change dir to the application path.
	process.chdir(cwd);

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
			console.log(message);
		});

	});

}
