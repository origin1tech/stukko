'use strict';

module.exports = Gulp;

/**
 * Forks process to build project assets.
 * @returns {{build: build}}
 * @constructor
 */
function Gulp() {
	var self = this,
		childProc = require('child_process'),
		module = self.cwd + '/node_modules/gulp/bin/gulp.js',
		args = ['build', '--config', self.config ],
		options = {
			cwd: self.cwd,
			silent: true,
			stdio: 'pipe'
		},
		loaded = false,
		shutdownMessage;
	shutdownMessage = 'error:[gulp] Application failed to build, Stukko has been shutdown gracefully.\n       ' +
		'You may wish to run "gulp build" in your terminal/console for additional information.';
	function formatMessage(msg, build) {
		build = build || false;
		// remove line breaks, last line concats, iterate array pretty up output.
		msg = msg.toString().replace(/(\r\n|\n|\r)/gm, '');
		msg = msg.split('[gulp] ');
		msg.forEach(function (m) {
			if(m && m.length){
				$$DEBUG('[gulp]' + m);
				if(/errored/gi.test(m) || /No gulpfile found/.test(m)) {
					$$LOG.error('[gulp] ' + m);
				    self.shutdown(shutdownMessage);
				} else {
					if(!/(starting|finished)/gi.test(m) && !/using/gi.test(m))
						$$LOG.console.info('[gulp] ' + m);
				    if(/(finished 'build')/gi.test(m) && build){
                        self.emit('assets:ready');
                    }
				}
			}
		});
	}

	return {

		/**
		 * Executes build actions for assets via Gulp.
		 * @param {function} cb - on fork created calls back to configure.
		 */
		build: function build() {

            args = [module].concat(args);
            // if debugging give child different port.
            if(self.debug)
                options.execArgv = ['--debug-brk'];
			// spawn instead of fork to support debugging.
            var child = childProc.spawn('node', args, options);
			child.stdout.on('data', function(msg) {
				formatMessage(msg, true);
			});
			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				$$LOG.error(err);
				self.shutdown(shutdownMessage);
			});
			child.unexpectedExit = function (code) {
				if(code !== 0 && code !== null && code !== undefined && code !== -1073741510) {
					$$LOG.error('Gulp process terminated with code: ' + code);
					// make sure we exit here.
					self.shutdown(shutdownMessage);
				} else {
                    if(self.env !== 'production')
                        $$LOG.console.info('[gulp] shutting down Gulp.');
				}
			};
			child.on("exit", child.unexpectedExit);
			self.children.push(child);
		}
	};
}