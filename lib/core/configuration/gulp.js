'use strict';

/**
 * Forks process to build project assets.
 * @returns {{build: build}}
 * @constructor
 */
function Gulp() {
	var self = this,
		childProc = require('child_process'),
		module = self.cwd + '/node_modules/gulp/bin/gulp.js',
		args = ['--config', self.config, '--configPath', self.configPath],
		options = {
			cwd: self.cwd,
			silent: true,
			stdio: 'pipe'
		},
		loaded = false,
		shutdownMessage;
	shutdownMessage = 'error:[gulp] Failed to build application, Stukko has been shutdown gracefully.\n       ' +
		'You may wish to run "gulp build" in your terminal/console for additional information.';
	function formatMessage(msg, task, verbose) {
		// remove line breaks, last line concats, iterate array pretty up output.
		msg = msg.toString().replace(/(\r\n|\n|\r)/gm, '');
		msg = msg.replace(/\[[^\]]*?\]/g, '').trim();
		if(msg && msg.length){
			$$DEBUG('[gulp]' + msg);
			if(/errored/gi.test(msg) || /No gulpfile found/.test(msg)) {
				$$LOG.error('[gulp] ' + msg);
				self.shutdown(shutdownMessage);
			} else {
				if(verbose)
					$$LOG.console.info('[gulp] ' + msg);
				else if(!/(starting|finished)/gi.test(msg))
					$$LOG.console.info('[gulp] ' + msg);
				if(/(finished 'build')/gi.test(msg) && task === 'build'){
					$$LOG.console.info('[gulp] Build completed.');
					self.emit('src:ready');
				}

			}
		}
	}

	return {

		/**
		 * Executes build actions for assets via Gulp.
		 * @param {string} task - the task to be run.
		 */
		run: function run(task, verbose) {

			args = [module, task].concat(args);
			// if debugging give child different port.
			if(self.debug)
				options.execArgv = ['--debug-brk'];
			// spawn instead of fork to support debugging.
			// TODO: consider fork instead of spawn.
			var child = childProc.spawn('node', args, options);
			child.stdout.on('data', function(msg) {
				formatMessage(msg, task, verbose);
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
					$$LOG.console.info('Shutting down Gulp.');
				}
			};
			child.on("exit", child.unexpectedExit);
			self.children.push(child);
		}
	};
}

module.exports = Gulp;