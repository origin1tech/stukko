'use strict';

/**
 * Helper to handle errors within Express stack.
 * @returns {{handle: handle}}
 * @constructor
 */
function Errors() {

	var self = this,
		defaults = {
			400: {
                name: 'Bad Request', message: 'Request cannot be completed, malformed or missing data.',
                returnUrl: '/'
            },
			401: {
                name: 'Unauthorized', message: 'The attempted request has failed as it is unauthorized.',
                returnUrl: '/'
            },
			403: {
                name: 'Forbidden', message: 'The request is forbidden using the provided credentials.',
                returnUrl: '/'
            },
			404: {
                name: 'Not Found', message: 'The resource requested could not be found.',
                returnUrl: '/'
            },
			500: {
                name: 'Server Error', message: 'The server has encountered an unknown exception.',
                returnUrl: '/'
            },
			501: {
                name: 'Not Implemented', message: 'The request or method is not currently implemented.',
                returnUrl: '/'
            }
		},
		errors;

    function removeProperty(obj, key) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                if (typeof obj[prop] == "object")
                    removeProperty(obj[prop]);
                else
                    if(prop === key)
                        delete obj[prop];
            }
        }
        return obj;
    }

    function normalizeName(err, alt) {
        if(!err.name)
            return alt;
        err.name = err.name.replace(/error/i, '');
        return err.name.match(/([A-Z]?[^A-Z]*)/g).slice(0,-1).join(' ');
    }

    /**
     * Normalizes error using Winston.
     * @param {error} err
     * @private
     * @returns {object}
     */
	function normalizeError(err){
		var errDef, stack;
        stack = err.stack;
		err.status = err.status || 500;	
        errDef = defaults[err.status || 500];
		err.message = err.message  || errDef.message;
        err.returnUrl = err.returnUrl || errDef.returnUrl;
        err.displayName = normalizeName(err, errDef.name);
        
        try{
            // convert to plain object.
            err = JSON.parse(JSON.stringify(err));
        } catch(ex){
        }

        err.stack = stack;

        if(_.contains(['BadRequest', 'NotImplemented',
                'NotFound', 'Unauthorized',
                'Forbidden', 'Server'], err.name)){
            var tmpStack = [];

            _.forEach(err.stack.split('\n'), function (v,k) {
                if(k < 1)
                    tmpStack.push(v);
                else if(v.indexOf('exceptions.js') !== -1 && k > 2)
                    tmpStack.push(v);
                else
                    tmpStack.push(v);
                
            });
            err.stack = tmpStack.join('\n'); ;
        }
     
        return err;
	}

    /**
     * Formats error as string.
     * @param {error} err
     * @private
     * @returns {string}
     */
	function formatError(err) {
		var result = '',
			stack;
		result += ('<h2>' + err.status + ' - ' + err.name + '</h2>');
		result += '<h4>Message:</h4>';
		result += ('<p>' + err.message + '</p>');
        result += ('<p><a href="' + err.returnUrl + '">Return</a>');
		if(self.env === 'development'){
			result += '<h4>Stack Trace:</h4>';
			stack = err.stack ? err.stack.split('\n') : '';
			result += '<p>';
            if(stack && stack.length){
                stack.forEach(function (s) {
                    result += (s + '<br/>');
                });
            }
			result += '</p>';
		}
		return result;
	}

    function errorHandler(err, req, res, next) {

        var fallbackError, errView;
        err = normalizeError(err);

        // log the error.
        // delay so we don't clobber
        // logging via morgan to console.
        setTimeout(function () {
            if(err.status === 404 || err.status === 501){
                $$LOG.warn(err.stack || (err.name + ': ' + err.message));
                //$$LOG.file.warn(err.name, err.message, err.stack);
                $$LOG.warn(err);
            } else {
                $$LOG.error(err.stack || (err.name + ': ' + err.message));
                //$$LOG.file.error(err.name, err.message, err.stack);
            }
        },200);

        // remove the stack trace if not in development.
        if(self.env !== 'development')
            err.stack = '';

        fallbackError = formatError(err);

        // split stack to make more presentable in views.
        errView = _.clone(err);
        errView.stack = errView.stack ? errView.stack.split('\n') : '';

        // in case the app is missing the error handler
        // make sure we catch it and respond.
        try{
            self.modules.handlers.error.call(self, errView, req, res, next);
            // add a response timeout in case the app
            // error handler is improperly formatted.
            res.setTimeout(1200, function () {
                res.status(err.status || 500).send(fallbackError);
            });
        } catch(ex){
            ex.name = normalizeName(ex.name || 'UnknownException');
            $$LOG.error(ex.stack || (ex.name && ex.message));
            res.status(500).send(formatError(ex));
        }

    }

	return errorHandler;

}

module.exports = Errors;