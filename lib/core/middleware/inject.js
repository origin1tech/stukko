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

        var errorHandler = handlers.errors.call(self);
        req.url = req.url || '/';
        res.locals._settings = res.locals._settings || {};

        // grab some params from
        // our package that we may want
        // to display. for example we may
        // want to put the application's
        // version number in the bottom
        // right corner, or something
        // similar.
        if(req.session) {
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
        }

        // store csrf token to locals
        // NOTE: it is trivial to disable
        // this in your config. you may
        // then create your own custom
        // middleware for handling csrf
        // token generation, this is here
        // for convenience to get you up
        // and running quickly with basic
        // configuration, requires session.
		if(self.options.middleware.csrf.enabled && !req.get('origin') && utils.helpers.sameOrigin(req)){
            if(req.session && req.csrfToken)
                res.locals.csrf_token = req.session.csrf_token = (req.session.csrf_token || req.csrfToken());
        } else {
            res.locals.csrf_token = null;
        }

        // TODO: extend req & res instead of wiring up here.

		// get request type.
		req.HTML = (req.get('accept') || '').indexOf('html') !== -1;
		req.JSON = req.is('json') || req.is('application/json') || /application\/json/.test(req.get('accept'))
            || /application\/json/.test(req.get('content-type'));
		req.AJAX = req.xhr;
        req.JSONP = /callback=/.test(req.url);
        req.JSON_TYPE = req.JSONP ? 'jsonp' : 'json';

		// create alt params which we
        // will merge with req.query & req.params.
        // see before actions for params merge.
		req._query = req._params = req.query;

        // convert string to object.
        // fixes issue when object/query string
        // needs to be converted to object.
        function normalizeParams(obj){
            for(var prop in obj){
                if(obj.hasOwnProperty(prop)){
                    var val = obj[prop];
                    if(_.isArray(val)){
                        var tmpArr = [];
                        for(var i = 0; i < val.length; i++){
                            if(_.isString(val[i])){
                                tmpArr.push(utils.helpers.tryParseJson(val[i]))
                            } else {
                                tmpArr.push(normalizeParams(val[i]))
                            }
                        }
                        obj[prop] = tmpArr;
                    }
                    else if(_.isPlainObject(val)) {
                        normalizeParams(val);
                    } else {
                        if(_.isString(val) && /{/g.test(val)){
                            obj[prop] = utils.helpers.tryParseJson(val);
                        }
                    }
                }
            }
            return obj;
        }

        req._params = normalizeParams(req._params);

        // wrapper for injecting res error helpers.
        function httpErrorResponseWrapper(status){
            return function httpErrorResponse(msg, returnUrl) {
                var Err;
                status = status || 500;
                if(status === 400)
                    Err = BadRequestError;
                else if(status === 401)
                    Err = UnauthorizedError;
                else if(status === 403)
                    Err = ForbiddenError;
                else if(status === 404)
                    Err = NotFoundError;
                else if(status === 501)
                    Err = NotImplementedError;
                else
                    Err = ServerError;
                Err = new Err(msg, returnUrl);
                errorHandler.call(self, Err, req, res, next);
            }
        }

		// inject response helpers.
		res.badRequest = httpErrorResponseWrapper(400);
		res.unauthorized = httpErrorResponseWrapper(401);
		res.forbidden = httpErrorResponseWrapper(403);
		res.notFound = httpErrorResponseWrapper(404);
		res.serverError = httpErrorResponseWrapper(500);
        res.notImplemented = httpErrorResponseWrapper(501);
		res.dispatch = handlers.dispatch.apply(self, arguments);

		// IMPORTANT: call next and continue down stack.
		next();

	}
}
