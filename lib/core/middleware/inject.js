'use strict';
var handlers = require('../handlers'),
	//errorHandlers = handlers.errors,
    utils = require('../../utils');

module.exports = Inject;

/**
 * Injects various helpers into the middleware stack.
 * @constructor
 */
function Inject() {

	var self = this,
        pkg = this.pkgapp,
        config = this.options,
        pkgkeys = this.options.locals.package,
        configKeys = this.options.locals.config;

	return function inject (req, res, next) {

        var tmpPkg = {},
            tmpConfig = {};
        req.url = req.url || '/';

        // add pkg to locals.
        res.locals.package = $$PKG;
        res.locals.package.env = self.options.env;
        tmpPkg.env = self.options.env;

        // iterate user package properties.
        _.forEach(pkgkeys, function (k) {
            var value = utils.helpers.findByNotation(pkg, k)
            if(value)
                tmpPkg[k] = value;
        });

        // iterate user config properties.
        _.forEach(configKeys, function (k) {
            var value = utils.helpers.findByNotation(config, k)
            if(value)
                tmpConfig[k] = value;
        });

        res.locals.packageStr = JSON.stringify(tmpPkg);
        res.locals.configStr = JSON.stringify(tmpConfig);

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