'use strict';
var handlers = require('../handlers'),
    utils = require('../../utils');

module.exports = Inject;

/**
 * Injects various helpers into the middleware stack.
 * @constructor
 */
function Inject() {

	var self = this,
        params = {};

	return function inject (req, res, next) {

        var tmpPkg = {},
            tmpConfig = {},
            tmpSession,
            pkgKeys,
            configKeys;

        req.url = req.url || '/';
        if(req.session._settings){
            tmpSession = req.session._settings;
            res.locals._settings = {
                'package': tmpSession.package,
                config: tmpSession.config,
                packageStr: JSON.stringify(tmpSession.package),
                configStr: JSON.stringify(tmpSession.config)
            }
        } else {

            pkgKeys = self.options.locals.package || [];
            configKeys = self.options.locals.config || [];        
          
            // add pkg/config to locals.
            req.session._settings = {}

            // iterate user package properties.
            _.forEach(pkgKeys, function (k) {
                var value = utils.helpers.findByNotation(self.pkgapp, k)
                if(value)
                    tmpPkg[k] = value;
            });

            // iterate user config properties.
            _.forEach(configKeys, function (k) {
                var value = utils.helpers.findByNotation(self.options, k)
                if(value)
                    tmpConfig[k] = value;
            });

            req.session._settings = {
                'package': tmpPkg,
                config: tmpConfig
            };
            res.locals._settings = {
                'package': tmpPkg,
                config: tmpConfig,
                packageStr: JSON.stringify(tmpPkg),
                configStr: JSON.stringify(tmpConfig)
            }
        }

        // store csrf token to local
		if(self.options.middleware.csrf.enabled && (!req.get('origin') || utils.helpers.sameOrigin(req)))
			res.locals._csrf = req.session._csrf;
		else
			res.locals._csrf = null;

		// get request type.
		req.HTML = (req.get('accept') || '').indexOf('html') !== -1;
		req.JSON = req.is('json') || req.is('application/json') || /application\/json/.test(req.get('accept'))
            || /application\/json/.test(req.get('content-type'));
		req.AJAX = req.xhr;
        req.JSONP = /callback=/.test(req.url);
        req.JSON_TYPE = req.JSONP ? 'jsonp' : 'json';

		// merge req.query, req.body etc.
		req._params = _.extend({}, req.query, req.body);

        // convert string to object.
        // fixes issue when object/query string
        // needs to be converted to object.
        function normalizeParams(obj){
            for(var prop in obj){
                if(obj.hasOwnProperty(prop)){
                    var val = obj[prop];
                    if(_.isObject(val)) {
                        normalizeParams(val);
                    } else {
                        if(_.isString(val) && /{/g.test(val))
                            obj[prop] = utils.helpers.tryParseJson(val);
                    }
                }
            }
            return obj;
        }
        req._params = normalizeParams(req._params);

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