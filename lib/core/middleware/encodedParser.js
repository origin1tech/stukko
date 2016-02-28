'use strict';

var bodyParser = require('body-parser');

module.exports = EncodedParser;

/**
 * Parses url encoded body.
 * @returns {object}
 * @constructor
 */
function EncodedParser() {
	return bodyParser.urlencoded({extended: true });
}
