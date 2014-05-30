"use strict";

var _ = require('lodash');

module.exports = DeleteKeys;

function DeleteKeys(object, keys) {

	var result;

	// clone the original object;
	result = _.clone(object);

	if (arguments.length !== 2)
		throw new Error('Please provide an object and keys to delete.');

	if (typeof result === 'undefined' || _.isEmpty(object))
		throw new Error('Unable to delete keys object is not valid or empty.');

	if(!_.isArray(keys) && !_.isString(keys))
		throw new Error ('Keys must be an array, string or comma separated string.');

	// convert string to array.
	if(_.isString(keys))
		keys = keys.split(',');

	keys.forEach(function(k) {
		for(var prop in result) {
			if(result.hasOwnProperty(prop)) {
				if (k === prop) {
					delete result[prop];
				} else {
					if (_.isObject(result[prop]) && !_.isArray(result[prop])) {
						result[prop] = DeleteKeys(result[prop], keys);
					}
				}
			}
		}
	});

	return result;

}

