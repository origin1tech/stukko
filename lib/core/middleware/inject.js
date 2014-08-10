'use strict';
var handlers = require('../handlers'),
	errorHandlers = handlers.errors,
    utils = require('../../utils');

module.exports = Inject;

/**
 * Injects various helpers into the middleware stack.
 * @constructor
 */
function Inject() {

	var self = this,
		errorHandlers = handlers.errors.call(this);

	return function inject (req, res, next) {

		var year = new Date().getFullYear();

		// no need to handle static routes.
		// add app config to locals.
		res.locals.settings = $$SETTINGS;
        res.locals.pkg = $$PKG;
        res.locals.pkgstr = JSON.stringify($$PKG);

		// store csrf token to local
		if(self.options.middleware.csrf.enabled && (!req.get('origin') || utils.helpers.sameOrigin(req)))
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

		// inject response helpers.
		res.badRequest = _.bind(BadRequestError, self);
		res.unauthorized = _.bind(UnauthorizedError, self);
		res.forbidden = _.bind(ForbiddenError, self);
		res.notFound = _.bind(NotFoundError, self);
		res.serverError = _.bind(ServerError, self);
		res.dispatch = handlers.dispatch.apply(self, arguments);
		// IMPORTANT: call next and continue down stack.
		next();


	}
}