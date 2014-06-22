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

		execute: function execute(cb) {

			if(!self.options.assets) return;

			var child = childProc.fork(module, args, options);

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
                        log.debug('[gulp]' + m);
						if(/errored/gi.test(m)) {
							log.error('[gulp] ' + m);
						} else {
							if(!/starting/gi.test(m))
								log.console.info('[gulp] ' + m);
						}
					}
				});

			});

			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				log.error(err);
			});

			child.unexpectedExit = function (code) {
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

			if(cb) cb();

		}

	};



}