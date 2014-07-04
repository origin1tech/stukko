'use strict';

var exec = require('child_process').exec,
	p = require('path');

module.exports = Goto;

/**
 * @class
 * @classdesc Goto instance for opening a file or uri.
 * @constructor
 * @param {string} target - required target file or uri.
 * @param {string} [app] - optional application directory other than default assoc.
 * @param {function} [cb] - optional callback on opened or error.
 */
function Goto(target, app, cb) {

	var goto;
	if (typeof(app) === 'function') {
		cb = app;
		app = null;
	}

	function escape(str) {
		return str.replace(/"/, '\\\"');
	}

	switch (process.platform) {

		case 'win32':
			// if the first parameter to start is quoted, it uses that as the title
			// so we pass a blank title so we can quote the file we are opening
			if (!app)
				goto = 'start ""';
			else
				goto = 'start "" "' + escape(app) + '"';
			break;
		case 'darwin':
			if (!app)
				goto = 'open';
			else
				goto = 'open -a "' + escape(app) + '"';
			break;
		default:
			if (!app)
				goto = p.join(__dirname, '../vendor/xdg-open');
			else
				goto = escape(app);
			break;
	}

	return exec(goto + ' "' + escape(target) + '"', cb);

}
