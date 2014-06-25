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
		shutdownMessage,
		fork;
	shutdownMessage = 'error:[gulp] Application failed to build, Stukko has been shutdown gracefully.\n       ' +
		'You may wish to run "gulp build" in your terminal/console for additional information.';
	return {
		execute: function execute(cb) {
			if(!self.options.assets) return;
			var child = childProc.fork(module, args, options),
				loaded = false;
			child.stdout.on('data', function(msg) {
				// remove line breaks last line concats for some, reason split
				// to array and iterate so each event is on single line.
				// TODO: look into why last gulp event concats.
				msg = msg.toString().replace(/(\r\n|\n|\r)/gm, '');
				msg = msg.split('[gulp] ');
				msg.forEach(function (m) {
					if(m && m.length){
						log.debug('[gulp]' + m);
						if(/errored/gi.test(m)) {
							log.error('[gulp] ' + m);
							self.shutdown(shutdownMessage);
						} else {
							if(!/(starting|finished)/gi.test(m))
								log.console.info('[gulp] ' + m);
							if(!loaded){
								log.info('[gulp] Application has been successfully built with Gulp.');
								loaded = true;
							}
						}
					}
				});
			});
			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				log.error(err);
				self.shutdown(shutdownMessage);
			});
			child.unexpectedExit = function (code) {
				if(code !== 0 && code !== null && code !== undefined) {
					log.error('Gulp process terminated with code: ' + code);
					// make sure we exit here.
					self.shutdown(shutdownMessage);
				} else {
					log.console.info('Shutting down Gulp...');
				}
			};
			child.on("exit", child.unexpectedExit);
			self.children.push(child);
			cb();
		}
	};
}