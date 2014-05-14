'use strict';

var dispatch = require('../handlers/dispatch'),
	_ = require('lodash');

module.exports = Inject;

/**
 * Injects various helpers into the middleware stack.
 * @constructor
 */
function Inject() {

	var self = this;

	return function (req, res, next) {

		// if path is static ignore and return next.
		if(self.static.test(req.url))
			return next();

		// store csrf token to local
		if(self.options.middleware.csrf.enabled && (!req.get('origin') || self.utils.helpers.sameOrigin(req)))
			res.locals._csrf = req.session._csrf;
		else
			res.locals._csrf = null;

		// get request type.
		req.HTML = (req.get('accept') || '').indexOf('html') !== -1;
		req.JSON = req.is('json') || req.is('application/json') || req.is('application/*');
		req.JSONP = req.JSON && /callback=/.test(req.url);
		req.AJAX = req.xhr;

		// merge req.query, req.body etc.
		req.params = _.extend(req.query, req.body);

		//helper handler to dispatch response by req type.
		res.dispatch = dispatch.call(self, req, res, next);

		next();

	}

}