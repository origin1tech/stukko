'use strict';

var _ = require('lodash');

module.exports = Errors;

function Errors() {

	var self = this,
		defaults = {
			400: { title: 'Bad Request', message: 'Request cannot be completed, malformed or missing data.' },
			401: { title: 'Unauthorized', message: 'The attempted request has failed as it is unauthorized.'},
			403: { title: 'Forbidden', message: 'The request is forbidden using the provided credentials.' },
			404: { title: 'Not Found', message: 'The resource requested could not be found.' },
			500: { title: 'Server Error', message: 'The server has encountered an unknown exception.' },
			501: { title: 'Not Implemented', message: 'The request or method is not currently implemented.' }
		},
		errors;

	function normalizeError(err){
		var errDef, winstErr;
		winstErr = log.winston.exception.getAllInfo(err);
		winstErr.stack.forEach(function(s, idx) {
			// remove unnecessary trace from stack.
			if(idx > 0 && /(BadRequestError|UnauthorizedError|ForbiddenError|NotFoundError|ServerError|NotImplementedError)/i.test(s))
				winstErr.stack.splice(idx, 1);
		});
		if(winstErr.stack[1]){
			err.stack = '\n' + winstErr.stack.splice(1,winstErr.stack.length).join('\n');
		}
		err.status = err.status || 500;
		errDef = defaults[err.status];
		err.title = err.title || errDef.title;
		err.message = err.message  || errDef.message;
		return err;
	}

	function formatError(err) {
		var result = '',
			stack;
		result += ('<h2>' + err.status + ' - ' + err.title + '</h2>');
		result += '<h4>Message:</h4>';
		result += ('<p>' + err.message + '</p>');
		if(self.env === 'development'){
			result += '<h4>Stack Trace:</h4>';
			stack = err.stack.split('\n');
			result += '<p>';
			stack.forEach(function (s) {
				result += (s + '<br/>');
			});
			result += '</p>';
		}
		return result;

	}

	errors = {

		handle: function (err, req, res, next) {

			var fallbackError;

			err = normalizeError(err);

			// log the error.
			if(err.status === 404 || err.status === 501)
				log.warn(err.message, err.stack);
			else
				log.error(err.message, err.stack);

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