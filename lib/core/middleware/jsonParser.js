'use strict';

var bodyParser = require('body-parser');

module.exports = JsonParser;

/**
 * Parses json from request body.
 * @returns {JSON}
 * @constructor
 */
function JsonParser() {
	return bodyParser.json();
}
