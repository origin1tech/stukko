'use strict';

module.exports = Gulp;

function Gulp() {

	var self = this,
		childProc = require('child_process'),
		module = self.cwd + '/node_modules/gulp/bin/gulp.js',
		args = ['--config', self.config],
		options = {
			cwd: self.cwd,
			silent: true,
			stdio: 'pipe'
		},
		fork;


	return {

		configure: function configure() {

		},

		execute: function execute() {

			fork = childProc.fork(module, args, options);

			fork.stdout.on('data', function(msg) {
				msg = msg.toString().replace(/(\r\n|\n|\r)/gm, '');
				log.console.info(msg);
			});

			// stdout errors.
			fork.stdout.on('error', function (err) {
				log.error(err);
			});

			// stderr errors.
			fork.stderr.on('error', function (err) {
				log.error(err);
			});

			// data errors.
			fork.stderr.on('data', function (err) {
				log.error(err);
			});

			// process error.
			fork.on('error', function(err){
				log.error(err);
			});

			self.children.push(fork);

		}

	};



}