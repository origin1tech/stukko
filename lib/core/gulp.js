'use strict';

module.exports = Gulp;

function Gulp() {

	var self = this,
		childProc = require('child_process'),
		module = self.cwd + '/node_modules/gulp/bin/gulp.js',
		args = ['build', '--config', self.config],
		options = {
			cwd: self.cwd,
			silent: true,
			stdio: 'pipe'
		},
		fork;


	return {

		execute: function execute() {

			var child = childProc.fork(module, args, options);

			self.gulped = false;

			child.stdout.on('data', function(msg) {
				// remove line breaks.
				// last line concats for some reason split
				// to array and iterate so each event is on
				// single line.
				// TODO: look into why last gulp event concats.
				msg = msg.toString().replace(/(\r\n|\n|\r)/gm, '');
				msg = msg.split('[gulp] ');
				msg.forEach(function (m) {
					if(m && m.length){
						log.debug('[gulp] ' + m);
						if(m.indexOf('Finished') !== -1 && m.indexOf('build') !== -1){
							if(self.options.assets.watch)
								log.console.info('Gulp successfully built and is watching application [' + self.pkgapp.name + '].');
							else
								log.console.info('Gulp successfully built application [' + self.pkgapp.name + '].');
							self.gulped = true;
						}
					}
				});

			});

			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				log.error(err);
			});

			child.unexpectedExit = function (code, signal) {
				if(code !== 0 && code !== null && code !== undefined) {
					log.error('Gulp process terminated with code: ' + code);
					// make sure we exit here.
					process.exit(1);
				} else {
					log.console.info('Shutting down Gulp...');
				}
			};
			child.on("exit", child.unexpectedExit);

			self.children.push(child);

		}

	};



}