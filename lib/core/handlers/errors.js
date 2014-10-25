'use strict';

module.exports = Errors;

/**
 * Helper to handle errors within Express stack.
 * @returns {{handle: handle}}
 * @constructor
 */
function Errors() {
	var self = this,
		defaults = {
			400: {
                title: 'Bad Request', message: 'Request cannot be completed, malformed or missing data.',
                returnUrl: '/'
            },
			401: {
                title: 'Unauthorized', message: 'The attempted request has failed as it is unauthorized.',
                returnUrl: '/'
            },
			403: {
                title: 'Forbidden', message: 'The request is forbidden using the provided credentials.',
                returnUrl: '/'
            },
			404: {
                title: 'Not Found', message: 'The resource requested could not be found.',
                returnUrl: '/'
            },
			500: {
                title: 'Server Error', message: 'The server has encountered an unknown exception.',
                returnUrl: '/'
            },
			501: {
                title: 'Not Implemented', message: 'The request or method is not currently implemented.',
                returnUrl: '/'
            }
		},
		errors;

    /**
     * Normalizes error using Winston.
     * @param {error} err
     * @private
     * @returns {object}
     */
	function normalizeError(err){
		var errDef, winstErr;
		winstErr = $$LOG.winston.exception.getAllInfo(err);
		if(winstErr && winstErr.stack) {
			winstErr.stack.forEach(function(s, idx) {
				// remove unnecessary trace from stack.
				if(idx > 0 &&
                    /(BadRequestError|UnauthorizedError|ForbiddenError|NotFoundError|ServerError|NotImplementedError)/i.test(s))
					winstErr.stack.splice(idx, 2);
			});
			if(winstErr.stack[1]){
				err.stack = '\n' + winstErr.stack.splice(1,winstErr.stack.length).join('\n');
			}
		}
		err.status = err.status || 500;
		errDef = defaults[err.status];
		err.title = err.title || errDef.title;
		err.message = err.message  || errDef.message;
        err.returnUrl = err.returnUrl || errDef.returnUrl;
        err.name = err.name || 'UnknownException';
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
		result += ('<h2>' + err.status + ' - ' + err.title + '</h2>');
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

	errors = {

		handle: function (err, req, res, next) {

			var fallbackError;
			err = normalizeError(err);

			// log the error.
            // delay so we don't clobber
            // logging via morgan to console.
            setTimeout(function () {
                if(err.status === 404 || err.status === 501)
                    $$LOG.warn(err.message, err.stack);
                else
                    $$LOG.error(err.message, err.stack);
            },200);

			// remove the stack trace if not in development.
			if(self.env !== 'development')
				err.stack = '';

			fallbackError = formatError(err);

			// in case the app is missing the error handler
			// make sure we catch it and respond.
			try{
				self.modules.handlers.error.call(self, err, req, res, next);
				// add a response timeout in case the app
				// error handler is improperly formatted.
				res.setTimeout(1200, function () {
					res.send(err.status, fallbackError);
				});
			} catch(ex){
				res.send(err.status, fallbackError);
			}

		}
	};

	return errors;
}