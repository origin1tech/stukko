'use strict';
var util = require('util'),
	ResponseError,
	BadRequestError,
	UnauthorizedError,
	ForbiddenError,
	NotFoundError,
	ServerError,
	NotImplementedError;
ResponseError = function ResponseError(status, message, returnUrl, constr) {
	if (typeof status === 'string'){
	    message = status;
		status = 500;
        returnUrl = message;
        constr = returnUrl;
	}
	this.status = status;
	this.message = message;
    this.returnUrl = returnUrl;
	Error.captureStackTrace(this, constr || this);
};
util.inherits(ResponseError, Error);
ResponseError.prototype.name = 'ResponseError';
/**
 * Bad request error for status 400.
 * @param message
 * @param title
 * @constructor
 */
BadRequestError = function (message, returnUrl) {
	if(!(this instanceof BadRequestError)) throw new BadRequestError(message, returnUrl);
	BadRequestError.super_.call(this, 400, message, returnUrl, this.constructor);
};
util.inherits(BadRequestError, ResponseError);
BadRequestError.prototype.name = 'BadRequestError';
/**
 * Unauthorized error message for status 401
 * @param message
 * @param title
 * @constructor
 */
UnauthorizedError = function (message, returnUrl) {
    if(!(this instanceof UnauthorizedError)) throw new UnauthorizedError(message, returnUrl);
	UnauthorizedError.super_.call(this, 401, message, returnUrl, this.constructor);
};
util.inherits(UnauthorizedError, ResponseError);
UnauthorizedError.prototype.name = 'UnauthorizedError';
/**
 * Forbidden error message for status 403.
 * @param message
 * @param title
 * @constructor
 */
ForbiddenError = function (message, returnUrl) {
    if(!(this instanceof ForbiddenError)) throw new ForbiddenError(message, returnUrl);
	ForbiddenError.super_.call(this, 403, message, returnUrl, this.constructor);
};
util.inherits(ForbiddenError, ResponseError);
ForbiddenError.prototype.name = 'ForbiddenError';
/**
 * Not found error message for status 404.
 * @param message
 * @param title
 * @constructor
 */
NotFoundError = function (message, returnUrl) {
    if(!(this instanceof NotFoundError)) throw new NotFoundError(message, returnUrl);
	NotFoundError.super_.call(this, 404, message, returnUrl, this.constructor);
};
util.inherits(NotFoundError, ResponseError);
NotFoundError.prototype.name = 'NotFoundError';
/**
 * Server error message for status 500.
 * @param message
 * @param title
 * @constructor
 */
ServerError = function (message, returnUrl) {
    if(!(this instanceof ServerError)) throw new ServerError(message, returnUrl);
	ServerError.super_.call(this, 500, message, returnUrl, this.constructor);
};
util.inherits(ServerError, ResponseError);
ServerError.prototype.name = 'ServerError';
/**
 * Not implemented error for status 501.
 * @param message
 * @param title
 * @constructor
 */
NotImplementedError = function (message, returnUrl) {
    if(!(this instanceof NotImplementedError)) throw new NotImplementedError(message, returnUrl);
	NotImplementedError.super_.call(this, 403, message, returnUrl, this.constructor);
};
util.inherits(NotImplementedError, ResponseError);
NotImplementedError.prototype.name = 'NotImplementedError';

GLOBAL.ResponseError = ResponseError;
GLOBAL.BadRequestError =  BadRequestError;
GLOBAL.UnauthorizedError = UnauthorizedError;
GLOBAL.ForbiddenError = ForbiddenError;
GLOBAL.NotFoundError = NotFoundError;
GLOBAL.ServerError = ServerError;
GLOBAL.NotImplementedError = NotImplementedError;

