'use strict';
var _ = require('lodash');
module.exports = Gulp;
/**
 * Forks process to build project assets.
 * @returns {{build: build, backup: backup}}
 * @constructor
 */
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
		loaded = false,
		shutdownMessage;
	shutdownMessage = 'error:[gulp] Application failed to build, Stukko has been shutdown gracefully.\n       ' +
		'You may wish to run "gulp build" in your terminal/console for additional information.';
	function formatMessage(msg, shutdown, build) {
		build = build || false;
		// remove line breaks, last line concats, iterate array pretty up output.
		msg = msg.toString().replace(/(\r\n|\n|\r)/gm, '');
		msg = msg.split('[gulp] ');
		msg.forEach(function (m) {
			if(m && m.length){
				$DEBUG('[gulp]' + m);
				if(/errored/gi.test(m) || /No gulpfile found/.test(m)) {
					$LOG.error('[gulp] ' + m);
					if(shutdown)
						self.shutdown(shutdownMessage);
				} else {
					if(!/(starting|finished)/gi.test(m))
						$LOG.console.info('[gulp] ' + m);
					if(loaded === false){
						if(build){
							$LOG.info('[gulp] Application has been successfully built with Gulp.');
							build();
						}
						loaded = true;
					}
				}
			}
		});
	}
	this.emit('gulp:initialized');

	return {

		/**
		 * Executes build actions for assets via Gulp.
		 * @param {function} cb - on fork created calls back to configure.
		 */
		build: function build(cb) {
			self.emit('gulp:executed');
			if(!self.options.assets) return;
			var child = childProc.fork(module, args, options);
			child.stdout.on('data', function(msg) {
				formatMessage(msg, true, cb);
			});
			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				$LOG.error(err);
				self.shutdown(shutdownMessage);
			});
			child.unexpectedExit = function (code) {
				if(code !== 0 && code !== null && code !== undefined) {
					$LOG.error('Gulp process terminated with code: ' + code);
					// make sure we exit here.
					self.shutdown(shutdownMessage);
				} else {
					$LOG.console.info('[gulp] Shutting down Gulp...');
				}
			};
			child.on("exit", child.unexpectedExit);
			self.children.push(child);
		},

		/**
		 * Backs up an application via Gulp
		 * @param {function} [cb] - callback on completion of backup
		 */
		backup: function backup(cb) {
			self.emit('gulp:backup');
			if(!self.options.backup) return;
			var bkupArgs = _.clone(args),
				child;
			bkupArgs[0] = 'backup';
			$LOG.info('[gulp] Starting backup please be patient.');
			child = childProc.fork(module, bkupArgs, options);
			child.stdout.on('data', function(msg) {
				formatMessage(msg);
			});
			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				$LOG.error(err);
			});
			child.unexpectedExit = function (code) {
				if(code !== 0 && code !== null && code !== undefined) {
					$LOG.error('Gulp process terminated with code: ' + code);
				} else {
					$LOG.console.info('[gulp] Backup completed, shutting down Gulp...');
					if(cb) cb();
				}
			};
			child.on("exit", child.unexpectedExit);
			self.children.push(child);
		},

		/**
		 * Restores an application via Gulp
		 * @param {function} [cb] - callback on completion of restore
		 */
		restore: function restore(cb) {
			self.emit('gulp:restore');
			if(!self.options.backup) return;
			var bkupArgs = _.clone(args),
				child;
			bkupArgs[0] = 'restore';
			$LOG.info('[gulp] Starting restore please be patient.');
			child = childProc.fork(module, bkupArgs, options);
			child.stdout.on('data', function(msg) {
				formatMessage(msg);
			});
			child.stderr.on('data', function (err) {
				err = err.toString().replace(/(\r\n|\n|\r)/m, '');
				$LOG.error(err);
			});
			child.unexpectedExit = function (code) {
				if(code !== 0 && code !== null && code !== undefined) {
					$LOG.error('Gulp process terminated with code: ' + code);
				} else {
					$LOG.console.info('[gulp] Restore completed, shutting down Gulp...');
					if(cb) cb();
				}
			};
			child.on("exit", child.unexpectedExit);
			self.children.push(child);
		}
	};
}